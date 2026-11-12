// שרת ההכוונה של "מי המתחזה?" – רץ בענן חינמי (Render).
// 1) PeerJS: עוזר לשחקנים למצוא אחד את השני.
// 2) /ice: נותן לכל שחקן פרטי שרת ממסר (TURN) של Cloudflare, כדי שהקול והמשחק יעברו גם בין מדינות ורשתות סלולריות.
//    המפתחות נשמרים רק כאן (משתני סביבה ב-Render): CF_TURN_KEY_ID ו-CF_TURN_TOKEN. הם אף פעם לא נכנסים לאתר.
const http = require('http');
const express = require('express');
const { ExpressPeerServer } = require('peer');

const port = process.env.PORT || 9000;
const app = express();
const server = http.createServer(app);
const STUN = [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }];

let cache = null; // פרטי ממסר תקפים ל-24 שעות; מחדשים כל 12
app.get('/ice', async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Cache-Control', 'no-store');
  const id = process.env.CF_TURN_KEY_ID, token = process.env.CF_TURN_TOKEN;
  if (!id || !token) return res.json({ iceServers: STUN, relay: false });
  try {
    if (!cache || Date.now() - cache.t > 12 * 3600 * 1000) {
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

app.use('/', ExpressPeerServer(server, { path: '/', allow_discovery: false, proxied: true, key: 'peerjs' }));
server.listen(port, () => console.log('PeerJS signaling on port ' + port));
