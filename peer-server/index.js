// שרת ההכוונה של "מי המתחזה?" – רץ בענן חינמי (Render).
// 1) PeerJS: עוזר לשחקנים למצוא אחד את השני.
// 2) /ice: נותן לכל שחקן פרטי שרת ממסר (TURN) – Metered או Cloudflare, כדי שהקול והמשחק יעברו גם בין מדינות ורשתות סלולריות.
//    המפתחות נשמרים רק כאן (משתני סביבה ב-Render) ואף פעם לא נכנסים לאתר:
//    Metered:    METERED_DOMAIN (למשל myapp.metered.live) ו-METERED_API_KEY
//    Cloudflare: CF_TURN_KEY_ID ו-CF_TURN_TOKEN
const http = require('http');
const express = require('express');
const { ExpressPeerServer } = require('peer');

const port = process.env.PORT || 9000;
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
// מי רשאי לקבל פרטי ממסר: רק אתר המשחק (והרצה מקומית). אתרים אחרים לא יכולים לנצל את מכסת הממסר.
const okOrigin = o => /^https:\/\/liav-melamud\.github\.io$/.test(o) || /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(o);
const hits = new Map(); // הגבלת קצב: עד 120 בקשות בדקה מכל כתובת
setInterval(() => hits.clear(), 60 * 1000).unref();
const server = http.createServer(app);
const STUN = [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }];

let cache = null; // פרטי ממסר תקפים ל-24 שעות; מחדשים כל 12
app.get('/ice', async (req, res) => {
  const origin = String(req.headers.origin || '');
  res.set('Cache-Control', 'no-store');
  res.set('Vary', 'Origin');
  if (!okOrigin(origin)) { res.set('Access-Control-Allow-Origin', '*'); return res.json({ iceServers: STUN, relay: false }); }
  res.set('Access-Control-Allow-Origin', origin);
  const n = (hits.get(req.ip) || 0) + 1; hits.set(req.ip, n);
  if (n > 120) return res.status(429).json({ iceServers: STUN, relay: false });
  const id = process.env.CF_TURN_KEY_ID, token = process.env.CF_TURN_TOKEN;
  const mDomain = (process.env.METERED_DOMAIN || '').replace(/^https?:\/\//, '').replace(/\/.*$/, ''), mKey = process.env.METERED_API_KEY;
  if (!(mDomain && mKey) && !(id && token)) return res.json({ iceServers: STUN, relay: false });
  try {
    if (mDomain && mKey && (!cache || Date.now() - cache.t > 10 * 60 * 1000)) {
      const r = await fetch(`https://${mDomain}/api/v1/turn/credentials?apiKey=${encodeURIComponent(mKey)}`);
      if (!r.ok) throw new Error('metered ' + r.status);
      const list = await r.json();
      if (!Array.isArray(list) || !list.length) throw new Error('metered empty');
      cache = { t: Date.now(), iceServers: list };
    } else if (!(mDomain && mKey) && (!cache || Date.now() - cache.t > 12 * 3600 * 1000)) {
      const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${id}/credentials/generate-ice-servers`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttl: 86400 }),
      });
      if (!r.ok) throw new Error('cloudflare ' + r.status);
      const j = await r.json();
      const list = Array.isArray(j.iceServers) ? j.iceServers : [j.iceServers];
      cache = { t: Date.now(), iceServers: list };
    }
    res.json({ iceServers: STUN.concat(cache.iceServers), relay: true });
  } catch (e) {
    console.log('TURN error:', e.message);
    res.json({ iceServers: STUN, relay: false });
  }
});

app.use('/', ExpressPeerServer(server, { path: '/', allow_discovery: false, proxied: true, key: 'peerjs', concurrent_limit: 300 }));
server.listen(port, () => console.log('PeerJS signaling on port ' + port));
