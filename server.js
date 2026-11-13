// שרת בית – משחקים באותו Wi-Fi בלי אינטרנט ובלי חשבון.
// הפעלה (פעם ראשונה: npm install):  npm start
// מפעיל על פורט 3000 גם את המשחק וגם את שרת ההכוונה המקומי (בנתיב /signal).
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
// בפרויקט המקומי הקבצים בתיקייה public; במאגר ב-GitHub הם בתיקייה הראשית
const PUB = fs.existsSync(path.join(__dirname, 'public', 'index.html')) ? path.join(__dirname, 'public') : __dirname;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png',
};

// כתובות המחשב ברשת הביתית (מה שהחברים מקלידים בטלפון)
function lanAddrs() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces()))
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal) out.push(a.address);
  // כתובות ביתיות רגילות קודם
  return out.sort((a, b) => (/^192\.168\./.test(b) - /^192\.168\./.test(a)));
}

const handler = (req, res) => {
  let url; try { url = new URL(req.url, 'http://x'); } catch (e) { res.writeHead(400); return res.end(); }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (url.pathname === '/local.json') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ signal, signalPath: '/signal', port: PORT, addrs: lanAddrs() }));
  }
  let file; try { file = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1)); } catch (e) { res.writeHead(400); return res.end(); }
  const fp = path.join(PUB, path.normalize(file));
  if (file.includes('\0') || !(fp + path.sep).startsWith(PUB + path.sep) || /(^|[\\/])(\.|node_modules|android)/.test(path.relative(PUB, fp))) { res.writeHead(403); return res.end(); }
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
};

// שרת ההכוונה רץ על אותו פורט (פחות בעיות עם חומת אש וטלפונים)
let server, signal = false;
try {
  const express = require('express');
  const { ExpressPeerServer } = require('peer');
  const app = express();
  server = http.createServer(app);
  app.use('/signal', ExpressPeerServer(server, { path: '/', allow_discovery: false, key: 'peerjs' }));
  app.use(handler);
  signal = true;
} catch (e) {
  console.log('⚠️  שרת ההכוונה המקומי לא הופעל (צריך להריץ קודם: npm install). אפשר לשחק רק באונליין.');
  server = http.createServer(handler);
}
server.listen(PORT, () => {
  console.log('\nמי המתחזה? – שרת בית');
  console.log(`  במחשב הזה:   http://localhost:${PORT}`);
  for (const a of lanAddrs()) console.log(`  בטלפונים (אותו Wi-Fi):  http://${a}:${PORT}`);
  console.log(signal ? `  שרת הכוונה מקומי פועל  – בחרו "🏠 מקומי" במסך הפתיחה.\n` : '');
});
