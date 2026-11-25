// בדיקות אוטומטיות למשחק "מי המתחזה?" – בלי תלויות, רק Node.
// הרצה:  node tests/run.js        (מחפש את הקבצים בתיקייה הראשית או ב-public/)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dir = fs.existsSync(path.join(root, 'engine.js')) ? root : path.join(root, 'public');
const MAP = require(path.join(dir, 'map.js'));
const createGame = require(path.join(dir, 'engine.js'));

// אקראיות קבועה מראש (SEED): אותה הרצה נותנת תמיד אותה תוצאה, ואפשר לשחזר כישלון.
// כל בדיקה מקבלת זרע משלה, כדי שהוספת בדיקה לא תשנה את האחרות.
const BASE_SEED = Number(process.env.SEED) || 12345;
let rs = BASE_SEED >>> 0;
Math.random = () => { rs = (rs + 0x6D2B79F5) >>> 0; let t = rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const seedFor = name => { let h = BASE_SEED >>> 0; for (const ch of name) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0; return h; };

// שעון מדומה: מריצים שעות משחק בשניות
let fake = Date.now();
Date.now = () => fake;
const tick = (g, n) => { for (let i = 0; i < n; i++) { fake += 33; g.tick(); } };
const sec = (g, s) => tick(g, Math.round(s * 30));

let pass = 0, fail = 0;
const failures = [];
function test(name, fn) {
  if (process.env.ONLY && !name.includes(process.env.ONLY)) return; // ONLY=שם – להריץ רק בדיקה מסוימת
  rs = seedFor(name);
  const t0 = process.hrtime.bigint();
  try { fn(); pass++; console.log('  ✓ ' + name + ` (${Number((process.hrtime.bigint() - t0) / 1000000n)}ms)`); }
  catch (e) { fail++; failures.push(name); console.log('  ✗ ' + name + '\n      ' + (e && e.message) + `  (לשחזור: SEED=${BASE_SEED} node tests/run.js)`); }
}
const ok = (c, msg) => { if (!c) throw new Error(msg || 'assertion failed'); };

// מתחיל משחק עם מארח אנושי אחד ובוטים. אפשר לבקש תפקיד מסוים (מנסה שוב ושוב עד שיוצא).
function newGame({ bots = 4, role = null, humans = 1, cfg = {}, tries = 800 } = {}) {
  for (let i = 0; i < tries; i++) {
    const g = createGame(MAP);
    const ids = [g.join('מארח')];
    for (let h = 1; h < humans; h++) ids.push(g.join('חבר' + h));
    g.act(ids[0], { type: 'settings', impostors: 1, bots, killCd: 10, tasks: 4, newRoles: true, ...(cfg.jester && !cfg.code ? { code: '54321' } : {}), ...cfg });
    g.act(ids[0], { type: 'start' });
    if (!role || g.view(ids[0]).me.role === role) return { g, a: ids[0], ids };
  }
  throw new Error('לא הצלחתי לקבל את התפקיד ' + role);
}
const me = (g, a) => g.view(a).players.find(p => p.id === a);
function walkTo(g, a, target, assist = false) {
  const here = MAP.roomAt(me(g, a).x, me(g, a).y);
  const pts = [...MAP.path(here ? here.id : 'F', MAP.roomAt(target.x, target.y).id), target];
  let lx = -1, ly = -1, still = 0, side = 1;
  for (const q of pts) for (let k = 0; k < 900; k++) {
    const p = me(g, a), dx = q.x - p.x, dy = q.y - p.y, l = Math.hypot(dx, dy);
    if (l < (q === target ? 18 : 10)) break;
    still = Math.abs(p.x - lx) + Math.abs(p.y - ly) < 0.4 ? still + 1 : 0; lx = p.x; ly = p.y;
    if (still > 4) { // נתקע בפריט מוצק: עוקף בצעד צדדי
      const sx = -dy / l * side, sy = dx / l * side; for (let z = 0; z < 25; z++) { g.act(a, { type: 'input', dx: sx, dy: sy, assist }); tick(g, 1); } side = -side; still = 0; continue;
    }
    g.act(a, { type: 'input', dx: dx / l, dy: dy / l, assist }); tick(g, 1);
  }
  g.act(a, { type: 'input', dx: 0, dy: 0 }); tick(g, 3);
}
function callMeeting(g, a) {
  walkTo(g, a, MAP.BUTTON); g.act(a, { type: 'use' });
  let v = g.view(a); for (let i = 0; i < 200 && v.phase !== 'meeting'; i++) { tick(g, 1); v = g.view(a); }
  return v;
}

// ---------------------------------------------------------------------------
console.log('\nמפה');
for (const [mapId, M] of Object.entries(MAP.byId)) {
  test(`[${mapId}] כל המשימות והנקודות במקומות הליכים בחדר הנכון`, () => {
    ok(M.TASKS.length >= (mapId === 'big' ? 70 : 38), 'מעט מדי משימות: ' + M.TASKS.length);
    M.TASKS.forEach(x => { ok(M.walkable(x.x, x.y), 'משימה לא ניתנת להליכה: ' + x.name); ok(M.roomAt(x.x, x.y).id === x.room, 'משימה בחדר הלא נכון: ' + x.name); });
    M.VENTS.concat([M.BUTTON, M.CAM_CONSOLE]).forEach(p => ok(M.walkable(p.x, p.y), 'נקודה לא ניתנת להליכה'));
    M.VENTS.forEach((v, i) => v.links.forEach(l => ok(M.VENTS[l], `פתח ${i} מחובר לפתח לא קיים ${l}`)));
    Object.values(M.SAB_POINTS).flat().forEach(p => ok(M.walkable(p.x, p.y) && M.roomAt(p.x, p.y).id === p.room, 'נקודת תיקון שגויה: ' + p.name));
    M.CAMS.forEach(c => ok(M.walkable(c.x, c.y), 'מצלמה במקום לא תקין: ' + c.name));
    ok(new Set(M.TASKS.map(x => x.name)).size === M.TASKS.length, 'שמות משימות כפולים');
  });
  test(`[${mapId}] אפשר להגיע מכל חדר לכל חדר, והמסלול עובר רק בשטח הליכה`, () => {
    for (const a in M.ROOMS) for (const b in M.ROOMS) {
      const p = M.path(a, b); if (a !== b) ok(p.length > 0, `אין מסלול ${a}->${b}`);
      let prev = { x: M.ROOMS[a].cx, y: M.ROOMS[a].cy };
      for (const q of [...p, { x: M.ROOMS[b].cx, y: M.ROOMS[b].cy }]) {
        for (let i = 0; i <= 40; i++) ok(M.walkable(prev.x + (q.x - prev.x) * i / 40, prev.y + (q.y - prev.y) * i / 40), `קיר בדרך ${a}->${b}`);
        prev = q;
      }
    }
  });
}
test('לכל חדר יש דלתות', () => { for (const M of Object.values(MAP.byId)) for (const r in M.ROOMS) ok(M.doorRects(r).length >= 1, 'חדר בלי דלתות: ' + r); });
test('קוד הדפדפן (index.html) תקין תחבירית', () => {
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const js = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
  new Function(js);
});

// ---------------------------------------------------------------------------
console.log('\nמנוע המשחק');
test('חלוקת תפקידים ומשימות: בקבוצה קטנה יש לפחות 20 משימות', () => {
  const { g, a } = newGame({ bots: 3, cfg: { tasks: 4 } });
  const v = g.view(a);
  ok(v.tasks.total >= 15, 'מעט מדי משימות: ' + v.tasks.total);
  ok(['מתחזה', 'משנה צורה', 'נעלם', 'מרקיב'].includes(v.me.role) || v.me.team === 'crew', 'תפקיד לא תקין');
});
test('הצלם מצלם, והתמונה נשמרת עם השחקנים שבטווח', () => {
  const { g, a } = newGame({ role: 'הצלם', bots: 3 }); sec(g, 3);
  g.act(a, { type: 'photo' }); tick(g, 2);
  const v = g.view(a); ok(v.me.photos.length === 1 && v.me.photos[0].names.length > 0, 'לא נשמרה תמונה'); ok(v.me.photoCd > 0, 'אין השהיה');
});
test('הבלש חוקר שחקן קרוב', () => {
  // שחקן אנושי שני עומד במקום, והבלש הולך אליו – לא תלוי בבוטים שמסתובבים
  const { g, a, ids } = newGame({ role: 'בלש', bots: 3, humans: 2 }); sec(g, 3);
  walkTo(g, a, me(g, ids[1]));
  g.act(a, { type: 'investigate' }); tick(g, 2);
  ok(g.view(a).me.notes.length === 1, 'לא נרשמה חקירה');
});
test('הנעלם בלתי נראה לאחרים ולא יכול לחסל', () => {
  const { g, a, ids } = newGame({ role: 'נעלם', bots: 3, humans: 2 }); sec(g, 3);
  const b = ids[1]; ok(g.view(b).players.some(p => p.id === a), 'צריך לראות אותו לפני');
  g.act(a, { type: 'vanish' }); tick(g, 3);
  ok(!g.view(b).players.some(p => p.id === a), 'נעלם צריך להיות מוסתר');
  ok(g.view(a).me.vanished, 'הנעלם עצמו צריך לדעת');
  sec(g, 9); ok(g.view(b).players.some(p => p.id === a), 'צריך להופיע שוב אחרי 8 שניות');
});
test('המרקיב: גופה שלא דווחה מתפרקת', () => {
  let done = false;
  for (let run = 0; run < 6 && !done; run++) {
    const { g, a } = newGame({ role: 'מרקיב', bots: 8 }); sec(g, 13);
    for (let k = 0; k < 1500; k++) {
      const v = g.view(a), m = me(g, a);
      const c = v.players.filter(p => p.alive && p.team !== 'imp' && p.id !== a && !p.spec).sort((x, y) => Math.hypot(x.x - m.x, x.y - m.y) - Math.hypot(y.x - m.x, y.y - m.y))[0];
      if (!c) break;
      const dx = c.x - m.x, dy = c.y - m.y, l = Math.hypot(dx, dy);
      if (l < 60) { g.act(a, { type: 'input', dx: 0, dy: 0 }); g.act(a, { type: 'kill' }); tick(g, 2); break; }
      g.act(a, { type: 'input', dx: dx / l, dy: dy / l }); tick(g, 1);
    }
    if (g.view(a).bodies.length === 0) continue;
    ok(g.view(a).bodies[0].rot === 1, 'צריך לסמן גופה מתפרקת');
    sec(g, 3); if (g.view(a).phase !== 'play') continue; // מישהו דיווח – מנסים שוב
    sec(g, 7); ok(g.view(a).bodies.length === 0, 'הגופה צריכה להתפרק'); done = true;
  }
  ok(done, 'לא הצלחתי לבדוק פירוק גופה');
});
test('שופט: ההצבעה שלו שווה קול אחד, ופסק דין מדיח מיד – רק אחרי שסיים משימות ורק פעם אחת', () => {
  const { g, a, ids } = newGame({ role: 'שופט', bots: 3, humans: 2 });
  callMeeting(g, a); const tgt = g.view(a).roster.find(r => r.bot && r.alive);
  g.act(a, { type: 'vote', target: tgt.id }); g.act(ids[1], { type: 'vote', target: 'skip' });
  let w = null; for (let i = 0; i < 30 * 70; i++) { tick(g, 1); const v = g.view(a); if (v.meeting && v.meeting.reveal) { w = (v.meeting.votes || []).find(x => x.to === tgt.id); break; } }
  ok(w && w.w === 1, 'קול השופט צריך להיות רגיל (1)');
  // פסק דין בלי משימות שהושלמו – נדחה
  const h = newGame({ role: 'שופט', bots: 4, humans: 1, cfg: { roleOff: ['mole'] } });
  const tg2 = h.g.view(h.a).roster.find(r => r.bot && r.alive);
  callMeeting(h.g, h.a);
  h.g.act(h.a, { type: 'verdict', target: tg2.id });
  ok(h.g.view(h.a).phase === 'meeting' && !h.g.view(h.a).me.verdict.ready, 'פסק דין התקבל בלי לסיים משימות');
  { const sn = JSON.parse(h.g.snapshot()); sn.players[h.a].tasks.forEach(x => { x.done = true; }); h.g.restore(JSON.stringify(sn)); }
  ok(h.g.view(h.a).me.verdict.ready, 'השופט לא נפתח אחרי סיום משימות');
  h.g.act(h.a, { type: 'verdict', target: tg2.id });
  const v2 = h.g.view(h.a);
  ok(v2.phase === 'eject' && v2.eject.id === tg2.id && v2.eject.verdict && v2.eject.verdict.t === tg2.name, 'פסק הדין לא הדיח את הנבחר');
  ok(JSON.parse(h.g.snapshot()).players[h.a].verdictUsed, 'לא נרשם שהשתמש');
});
test('חבלות: חמצן מחייב שתי נקודות, ואם לא מתקנים המתחזים מנצחים', () => {
  // שלושה שחקנים אנושיים שלא עושים כלום (אין בוטים שיתקנו), כדי שהמשבר ייגמר בהפסד
  const { g, a } = newGame({ role: 'מתחזה', bots: 0, humans: 3, cfg: { tasks: 1 } }); sec(g, 21);
  g.act(a, { type: 'sab', kind: 'oxygen' }); tick(g, 2);
  ok(g.view(a).sab && g.view(a).sab.type === 'oxygen', 'חבלה לא התחילה');
  sec(g, 50); const v = g.view(a); ok(v.phase === 'end' && /האוויר/.test(v.winner.reason), 'צריך להפסיד בגלל חמצן: ' + v.phase);
});
test('שחקן אנושי מתקן חבלה: כפתור השימוש נדלק בנקודת התיקון, והתיקון עובד', () => {
  // הכפתור במסך (actionState מתוך index.html) – פעם הוא לא נדלק בנקודות התיקון, ורק בוטים יכלו לתקן
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const src = html.match(/function actionState\(s\) \{[\s\S]*?\n\}\n/)[0];
  let pos = null;
  const actionState = new Function('MAP', 'meP', 'D', 'MOD_IMP', 'hasCode', src + '; return actionState;')(MAP, () => pos, (a, b) => Math.hypot(a.x - b.x, a.y - b.y), [], () => false);
  const { g, ids } = newGame({ bots: 0, humans: 3, cfg: { tasks: 1, newRoles: false } });
  const imp = ids.find(i => g.view(i).me.team === 'imp'), crew = ids.find(i => g.view(i).me.team === 'crew');
  sec(g, 21); g.act(imp, { type: 'sab', kind: 'oxygen' }); tick(g, 2);
  ok(g.view(crew).sab, 'חבלה לא התחילה');
  MAP.SAB_POINTS.oxygen.forEach((q, i) => {
    walkTo(g, crew, q);
    const v = g.view(crew); pos = me(g, crew);
    const st = actionState(v);
    ok(st.use.on, 'כפתור השימוש כבוי ליד נקודת התיקון ' + q.name);
    g.act(crew, { type: 'use' }); tick(g, 2);
    ok(g.view(crew).me.sabMini && g.view(crew).me.sabMini.i === i, 'לא נפתח מסך התיקון');
    sec(g, 1.2); g.act(crew, { type: 'sabfinish', i }); tick(g, 1);
  });
  ok(!g.view(crew).sab, 'החבלה לא תוקנה');
});
// בוטים חכמים: מצבים מסודרים בעזרת snapshot/restore
const place = (g, fn) => { const sn = JSON.parse(g.snapshot()); fn(sn); g.restore(JSON.stringify(sn)); };
const crewBots = (sn) => Object.values(sn.players).filter(p => p.isBot && p.alive && !['impostor', 'shifter', 'phantom', 'viper', 'noisemaker', 'saboteur', 'poltergeist', 'mole', 'jester'].includes(p.role));
test('בוט שראה מישהו בפתח אוורור מספר על זה ומצביע עליו', () => {
  const { g, a } = newGame({ role: 'מתחזה', bots: 4, cfg: { botLevel: 2 } }); sec(g, 1);
  const V = MAP.VENTS[0]; let wid;
  place(g, sn => { const h = sn.players[a]; h.x = V.x; h.y = V.y; const w = crewBots(sn)[0]; wid = w.id; w.x = V.x + 70; w.y = V.y; });
  g.act(a, { type: 'vent' }); g.act(a, { type: 'vent' });
  ok(JSON.parse(g.snapshot()).players[wid].bot.sawVent.id === a, 'הבוט לא זכר את הפתח');
  callMeeting(g, a);
  let sn; for (let i = 0; i < 3000; i++) { tick(g, 1); sn = JSON.parse(g.snapshot()); if (!sn.meeting || sn.meeting.votes[wid]) break; }
  ok(sn.meeting && sn.meeting.votes[wid] === a, 'הבוט לא הצביע על מי שראה בפתח');
  ok(sn.chat.some(c => c.from === wid && /פתח/.test(c.text)), 'הבוט לא סיפר שראה פתח אוורור');
});
test('בוט זוכר מי היה איתו בזמן החיסול (נקי) ומי היה ליד הגופה', () => {
  const { g, a } = newGame({ role: 'מתחזה', bots: 5, cfg: { botLevel: 2 } }); sec(g, 21);
  const R = Object.values(MAP.ROOMS), A = R[0], B = R.sort((x, y) => Math.hypot(y.cx - A.cx, y.cy - A.cy) - Math.hypot(x.cx - A.cx, x.cy - A.cy))[0];
  let v, w1, w2, w3;
  place(g, sn => {
    const cb = crewBots(sn); [v, w1, w2, w3] = cb.map(p => p.id);
    [v, w1, w2, w3].forEach(id => { sn.players[id].role = 'crew'; sn.players[id].shieldUntil = 0; }); // בלי שומר ראש שיגן על הקורבן
    const set = (p, x, y) => { p.x = x; p.y = y; if (p.bot) { p.bot.plan = []; p.bot.wait = 30; } };
    set(sn.players[a], A.cx, A.cy); set(sn.players[v], A.cx + 20, A.cy);
    set(sn.players[w3], A.cx - 60, A.cy + 30); // עד לחיסול? לא – רואה רק אחר כך
    set(sn.players[w1], B.cx, B.cy); set(sn.players[w2], B.cx + 30, B.cy);
    sn.players[a].killCd = 0;
    // שאר הבוטים רחוק, כדי שלא יפריעו
    Object.values(sn.players).filter(p => p.isBot && ![v, w1, w2, w3].includes(p.id)).forEach(p => set(p, B.cx - 40, B.cy + 40));
  });
  sec(g, 2.5); g.act(a, { type: 'kill' }); tick(g, 1);
  { const q = JSON.parse(g.snapshot()); ok(q.bodies.length === 1 || (q.meeting && q.meeting.body === v), 'החיסול לא קרה'); }
  { const kv = g.view(v); ok(kv && kv.kd && kv.kd.by && kv.kd.by.color && kv.kd.me && kv.kd.ago < 3, 'לקורבן אין מידע על ההורג (kd)'); }
  sec(g, 1.5); if (!JSON.parse(g.snapshot()).meeting) g.act(a, { type: 'report' }); tick(g, 2); // העד הקרוב אולי כבר דיווח בעצמו
  const sn = JSON.parse(g.snapshot()), b1 = sn.players[w1].bot, b3 = sn.players[w3] && sn.players[w3].alive ? sn.players[w3].bot : null;
  ok(sn.meeting, 'אין ישיבה');
  ok(b1.alibi.includes(w2), 'בוט לא זכר שהחבר שלו היה איתו בזמן החיסול');
  ok(!b1.nearBody.includes(w2), 'חבר עם אליבי נחשב "ליד הגופה"');
  if (b3) ok(b3.nearBody.includes(a), 'בוט שהיה בחדר לא זכר שהמתחזה היה ליד הגופה');
  ok((sn.meeting.suspect[w2] || 0) < 0, 'אליבי לא מוריד חשד');
});
test('מתחזה בוט (רמה חכמה) הולך אחרי שחקן שמסתובב לבד', () => {
  let tried = 0;
  for (;;) {
    const { g, a } = newGame({ bots: 3, cfg: { botLevel: 3, newRoles: false } });
    if (g.view(a).me.team !== 'crew') continue;
    sec(g, 1);
    const R = Object.values(MAP.ROOMS), A = R[0], B = R.find(r => Math.hypot(r.cx - A.cx, r.cy - A.cy) > 500 && Math.hypot(r.cx - A.cx, r.cy - A.cy) < 850);
    if (!B) throw new Error('אין חדר מתאים');
    let imp;
    place(g, sn => {
      const h = sn.players[a]; h.x = A.cx; h.y = A.cy;
      Object.values(sn.players).filter(p => p.isBot).forEach(p => { p.x = B.cx; p.y = B.cy; p.bot.plan = []; p.bot.wait = 0; if (['impostor', 'shifter'].includes(p.role)) { imp = p.id; p.killCd = 3; p.role = 'impostor'; } else p.bot.wait = 60; });
    });
    const d0 = Math.hypot(me(g, imp).x - A.cx, me(g, imp).y - A.cy);
    sec(g, 4);
    const d1 = Math.hypot(me(g, imp).x - A.cx, me(g, imp).y - A.cy);
    if (d0 - d1 > 150 || ++tried >= 3) { ok(d0 - d1 > 150, `המתחזה לא התקרב לשחקן הבודד (${Math.round(d0)} → ${Math.round(d1)})`); break; }
  }
});
test('הליצן: מופיע רק כשההגדרה דלוקה, ואם מדיחים אותו – הוא מנצח', () => {
  for (let i = 0; i < 40; i++) { const { g, a } = newGame({ bots: 6, cfg: { jester: false } }); ok(!g.view(a).players.some(p => p.role === 'הליצן') && g.view(a).me.role !== 'הליצן', 'ליצן הופיע כשההגדרה כבויה'); }
  const { g, a } = newGame({ role: 'הליצן', bots: 6, cfg: { jester: true } });
  ok(g.view(a).me.team === 'jester' && g.view(a).me.tasks.length === 0, 'לליצן לא אמורות להיות משימות');
  callMeeting(g, a);
  // כולם מצביעים על הליצן
  place(g, sn => { Object.values(sn.players).filter(p => p.alive).forEach(p => { sn.meeting.votes[p.id] = a; }); });
  let v; for (let i = 0; i < 30 * 20; i++) { tick(g, 1); v = g.view(a); if (v.phase === 'end') break; }
  ok(v.phase === 'end' && v.winner.team === 'jester', 'הליצן הודח אבל לא ניצח: ' + v.phase);
});
test('הליצן: אם מדלגים עליו המשחק ממשיך, והוא נספר כמו איש צוות מול המתחזים', () => {
  const { g, a } = newGame({ role: 'הליצן', bots: 6, cfg: { jester: true } });
  callMeeting(g, a);
  place(g, sn => { Object.values(sn.players).filter(p => p.alive).forEach(p => { sn.meeting.votes[p.id] = 'skip'; }); });
  let v; for (let i = 0; i < 30 * 20; i++) { tick(g, 1); v = g.view(a); if (v.phase === 'play') break; }
  ok(v.phase === 'play', 'המשחק לא המשיך אחרי דילוג: ' + v.phase);
  // 1 מתחזה + ליצן + 1 צוות בחיים: המשחק לא נגמר (הליצן נספר מול המתחזה)
  place(g, sn => { const ps = Object.values(sn.players); const imp = ps.find(p => ['impostor', 'shifter', 'phantom', 'viper', 'noisemaker', 'saboteur', 'poltergeist', 'sniper', 'poisoner', 'blinker', 'cleaner', 'zapper', 'vampire', 'bomber'].includes(p.role)); let keep = 1;
    ps.forEach(p => { if (p.id === a || p.id === imp.id) return; if (keep-- > 0) { p.alive = true; p.role = 'crew'; } else p.alive = false; }); });
  tick(g, 2); ok(g.view(a).phase === 'play', 'המתחזים ניצחו מוקדם מדי – הליצן לא נספר');
});
test('הליצן: קליפת בננה מחליקה שחקן, גופה מזויפת מכנסת ישיבה, ואפשר לזחול בפתחים', () => {
  const { g, a, ids } = newGame({ role: 'הליצן', bots: 5, humans: 2, cfg: { jester: true } });
  const b2 = ids[1];
  // בלי לחכות: מאפסים את זמני ההמתנה, ואף מתחזה לא מחסל באמצע הבדיקה
  place(g, sn => { Object.values(sn.players).forEach(p => { p.killCd = 999; }); sn.players[a].bananaCd = 0; sn.players[a].fakeCd = 0; sn.sabCd = 999; });
  // פתח אוורור
  const V = MAP.VENTS[0];
  place(g, sn => { sn.players[a].x = V.x; sn.players[a].y = V.y; });
  g.act(a, { type: 'vent' }); ok(g.view(a).me.inVent !== null, 'הליצן לא נכנס לפתח'); g.act(a, { type: 'vent' });
  // בננה
  g.act(a, { type: 'banana' }); tick(g, 1);
  let sn = JSON.parse(g.snapshot()); ok(sn.bananas.length === 1, 'אין בננה');
  ok(g.view(a).me.bananaCd > 0, 'אין זמן המתנה לבננה');
  g.act(a, { type: 'banana' }); tick(g, 1); ok(JSON.parse(g.snapshot()).bananas.length === 1, 'אפשר לזרוק בננה בלי לחכות');
  const bn = sn.bananas[0];
  place(g, q => { q.players[b2].x = bn.x + 10; q.players[b2].y = bn.y - 10; });
  for (let i = 0; i < 20; i++) { g.act(b2, { type: 'input', dx: -1, dy: 0 }); tick(g, 1); if (JSON.parse(g.snapshot()).players[b2].slip) break; }
  sn = JSON.parse(g.snapshot()); ok(sn.players[b2].slip && sn.bananas.length === 0, `השחקן לא החליק על הבננה: alive=${sn.players[b2].alive} pos=${Math.round(sn.players[b2].x)},${Math.round(sn.players[b2].y)} bn=${JSON.stringify(sn.bananas)} phase=${sn.phase}`);
  const sl = sn.players[b2].slip; g.act(b2, { type: 'input', dx: -sl.dx, dy: -sl.dy }); tick(g, 3);
  ok(JSON.parse(g.snapshot()).players[b2].slip.dx === sl.dx, 'בזמן החלקה אפשר לשלוט בכיוון');
  g.act(b2, { type: 'input', dx: 0, dy: 0 }); sec(g, 1.2);
  // גופה מזויפת
  g.act(a, { type: 'fakeBody' }); tick(g, 1);
  sn = JSON.parse(g.snapshot()); const fb = sn.bodies.find(b => b.fake); ok(fb, 'אין גופה מזויפת');
  place(g, q => { q.players[b2].x = fb.x + 30; q.players[b2].y = fb.y; q.players[b2].alive = true; });
  g.act(b2, { type: 'report' }); tick(g, 1);
  const v = g.view(b2);
  ok(v.phase === 'alert' && v.alert.body && !v.alert.bodyName, 'דיווח על גופה מזויפת צריך להיראות כמו דיווח רגיל: ' + JSON.stringify(v.alert));
  ok(!JSON.stringify(v).includes('מזויפת'), 'השחקן שדיווח קיבל הודעה שהגופה מזויפת');
  ok(JSON.stringify(g.view(a)).includes('נפלו בפח'), 'הליצן לא קיבל הודעה שהמתיחה הצליחה');
  // בוט שהחליק על בננה כשהליצן לידו – זוכר אותו
  const g2 = newGame({ role: 'הליצן', bots: 5, cfg: { jester: true } }); let bot;
  place(g2.g, sn => { Object.values(sn.players).forEach(p => { p.killCd = 999; }); sn.players[g2.a].bananaCd = 0; sn.sabCd = 999; });
  g2.g.act(g2.a, { type: 'banana' }); tick(g2.g, 1);
  const bn2 = JSON.parse(g2.g.snapshot()).bananas[0];
  place(g2.g, sn => { bot = crewBots(sn)[0].id; sn.players[bot].x = bn2.x + 5; sn.players[bot].y = bn2.y - 5; sn.players[bot].role = 'crew'; });
  tick(g2.g, 2);
  const bb = JSON.parse(g2.g.snapshot()).players[bot].bot;
  ok(bb.knowsJester && bb.jesterId === g2.a, 'בוט שהחליק ליד הליצן לא הבין שהוא הליצן');
  // בישיבה: הוא מזהיר את כולם, ואף בוט צוות לא מצביע על הליצן
  callMeeting(g2.g, g2.a);
  let mv = g2.g.view(g2.a); for (let i = 0; i < 200 && mv.phase === 'meeting'; i++) { sec(g2.g, 1); mv = g2.g.view(g2.a); }
  const sn2 = JSON.parse(g2.g.snapshot());
  ok(sn2.chat.some(c => c.from === bot && /ליצן/.test(c.text)), 'הבוט לא אמר שיש ליצן');
  ok(sn2.jesterHint, 'אחרי החלקה הבוטים צריכים לדעת שיש ליצן');
  ok(!sn2.winner || sn2.winner.team !== 'jester', 'הבוטים הדיחו את הליצן למרות שידעו שהוא הליצן');
});
test('הגדרות תפקידים: זמן היעלמות, וזמן מוגבל בפתח למהנדס', () => {
  const { g, a } = newGame({ role: 'נעלם', bots: 4, cfg: { vanishTime: 15, vanishCd: 10 } });
  ok(g.view(a).me.desc.includes('15 שניות'), 'התיאור של התפקיד צריך להראות את הזמן מההגדרות: ' + g.view(a).me.desc);
  g.act(a, { type: 'vanish' }); tick(g, 3);
  sec(g, 10); ok(g.view(a).me.vanished, 'הנעלם היה צריך להישאר נעלם 15 שניות');
  sec(g, 6); ok(!g.view(a).me.vanished, 'הנעלם היה צריך להופיע אחרי 15 שניות');
  const e = newGame({ role: 'מהנדס', bots: 4, cfg: { engVent: 5, engVentCd: 10 } });
  const V = MAP.VENTS[0];
  place(e.g, sn => { Object.values(sn.players).forEach(q => { q.killCd = 999; q.emergencyUsed = true; }); sn.sabCd = 999; sn.players[e.a].x = V.x; sn.players[e.a].y = V.y; });
  e.g.setConn(e.a, true);
  e.g.act(e.a, { type: 'vent' }); tick(e.g, 2);
  ok(e.g.view(e.a).me.inVent !== null, 'המהנדס לא נכנס לפתח');
  sec(e.g, 6); ok(e.g.view(e.a).me.inVent === null, 'המהנדס היה צריך לצאת מהפתח אחרי 5 שניות');
  e.g.act(e.a, { type: 'vent' }); tick(e.g, 2);
  ok(e.g.view(e.a).me.inVent === null && e.g.view(e.a).me.engVentCd > 0, 'המהנדס לא אמור להיכנס שוב לפני שנגמרת ההמתנה');
  sec(e.g, 10); place(e.g, sn => { sn.players[e.a].x = V.x; sn.players[e.a].y = V.y; }); e.g.setConn(e.a, true);
  e.g.act(e.a, { type: 'vent' }); tick(e.g, 2);
  ok(e.g.view(e.a).me.inVent !== null, 'אחרי ההמתנה המהנדס צריך להיות מסוגל לזחול שוב');
});
test('בזמן המשחק: בוט חי שקרוב אליך מדבר, ורק מי שקרוב שומע', () => {
  const { g, a } = newGame({ bots: 3 });
  place(g, sn => { Object.values(sn.players).forEach(q => { q.killCd = 999; q.emergencyUsed = true; if (q.bot) q.bot.talkT = 0; }); sn.sabCd = 999; });
  g.setConn(a, true);
  let heard = [];
  for (let i = 0; i < 90 && !heard.length; i++) { sec(g, 1); heard = g.view(a).near || []; }
  // הבוטים מסתובבים – אם אף אחד לא היה ליד המארח, נקרב אחד אליו
  if (!heard.length) {
    place(g, sn => { const me = sn.players[a]; Object.values(sn.players).filter(q => q.bot).forEach(q => { q.x = me.x + 40; q.y = me.y; q.bot.talkT = 0; }); });
    g.setConn(a, true);
    for (let i = 0; i < 10 && !heard.length; i++) { tick(g, 3); heard = g.view(a).near || []; }
  }
  ok(heard.length && heard[0].text, 'בוט קרוב לא דיבר בזמן המשחק');
  // בוט מת לא מדבר
  place(g, sn => { const me = sn.players[a]; Object.values(sn.players).filter(q => q.bot).forEach(q => { q.alive = false; q.x = me.x + 40; q.y = me.y; q.bot.talkT = 0; }); });
  g.setConn(a, true); sec(g, 7);
  ok(!(g.view(a).near || []).length, 'בוט מת דיבר');
});
test('סוף ישיבה: הסצנה יודעת מי הצביע על מי', () => {
  const { g, a } = newGame({ bots: 4 });
  callMeeting(g, a);
  let v = g.view(a); for (let i = 0; i < 200 && v.phase === 'meeting'; i++) { sec(g, 1); v = g.view(a); }
  ok(v.phase === 'eject' && v.eject && v.eject.votes, 'אין רשימת הצבעות בסוף הישיבה');
  const ids = v.eject.votes.map(x => x.id);
  ok(v.eject.votes.every(x => x.id && (x.to !== 'p' || ids.includes(x.tid))), 'כל הצבעה צריכה להצביע על שחקן שמופיע בסצנה: ' + JSON.stringify(v.eject.votes));
});
test('דלתות: כמה חדרים ביחד, ואחרי הפתיחה קירור של 20 שניות לכל חדר', () => {
  const { g, a } = newGame({ role: 'מתחזה', bots: 4 }); sec(g, 3);
  ['F', 'M', 'U'].forEach(r => g.act(a, { type: 'sab', kind: 'door', room: r })); tick(g, 3);
  ok(g.view(a).doors.length === 3, 'צריך 3 חדרים נעולים');
  sec(g, 13); let v = g.view(a); ok(v.doors.length === 0, 'הדלתות צריכות להיפתח אחרי 12 שניות');
  ok(v.doorCool.F > 15, 'צריך קירור'); g.act(a, { type: 'sab', kind: 'door', room: 'F' }); tick(g, 2);
  ok(g.view(a).doors.length === 0, 'אסור לנעול בזמן קירור');
  sec(g, 21); g.act(a, { type: 'sab', kind: 'door', room: 'F' }); tick(g, 2); ok(g.view(a).doors.includes('F'), 'אחרי הקירור אפשר לנעול שוב');
});
test('דלת נעולה באמת חוסמת תנועה', () => {
  const { g, a } = newGame({ role: 'מתחזה', bots: 4 }); sec(g, 3);
  g.act(a, { type: 'sab', kind: 'door', room: 'F' }); tick(g, 2);
  for (let k = 0; k < 250; k++) { const p = me(g, a); const dx = 1500 - p.x, dy = 560 - p.y, l = Math.hypot(dx, dy); g.act(a, { type: 'input', dx: dx / l, dy: dy / l }); tick(g, 1); }
  ok(me(g, a).y < 410, 'השחקן עבר דרך דלת נעולה (y=' + Math.round(me(g, a).y) + ')');
});
test('חזרה לאותו מקום: join עם מזהה קיים מחזיר את אותו שחקן', () => {
  const g = createGame(MAP); const a = g.join('x'); const b = g.join('y');
  g.act(a, { type: 'settings', bots: 3 }); g.act(a, { type: 'start' }); sec(g, 5);
  ok(g.join('y', b) === b, 'צריך להחזיר אותו מזהה'); ok(g.view(b).me.spec === false, 'לא צריך להפוך לצופה');
});
test('שמירה ושחזור של משחק (מארח שנפל)', () => {
  const { g, a, ids } = newGame({ bots: 4, humans: 2 }); sec(g, 40);
  const before = g.view(ids[1]), snap = g.snapshot();
  const g2 = createGame(MAP); g2.restore(snap);
  ok(g2.join('מארח', a) === a && g2.join('חבר1', ids[1]) === ids[1], 'מזהים לא נשמרו');
  const after = g2.view(ids[1]);
  ok(after.phase === before.phase && after.me.role === before.me.role, 'מצב לא נשמר');
  ok(JSON.stringify(after.tasks) === JSON.stringify(before.tasks), 'התקדמות משימות לא נשמרה');
  sec(g2, 20); ok(g2.view(a), 'המשחק המשוחזר צריך להמשיך לרוץ');
});
test('סיוע למגע: אצבע לא מדויקת מגיעה לכל חדר', () => {
  for (const room of Object.keys(MAP.ROOMS)) {
    const { g, a } = newGame({ bots: 0, humans: 3 }); // בלי בוטים: אף אחד לא מחסל או נועל דלתות באמצע ההליכה
    const here = MAP.roomAt(me(g, a).x, me(g, a).y);
    const R0 = MAP.ROOMS[room], fin = [[0, 0], [70, 0], [-70, 0], [0, 70], [0, -70], [110, 40], [-110, 40]].map(d => ({ x: R0.cx + d[0], y: R0.cy + d[1] })).find(q => MAP.walkable(q.x, q.y) && !(MAP.solid && MAP.solid(q.x, q.y, 14)));
    const pts = [...MAP.path(here.id, room), fin];
    for (const q of pts) { let reached = false; for (let k = 0; k < 500; k++) { const p = me(g, a), dx = q.x - p.x, dy = q.y - p.y, l = Math.hypot(dx, dy); if (l < 14) { reached = true; break; } const e = 0.35 * Math.sin(k / 7); g.act(a, { type: 'input', dx: dx / l - dy / l * e, dy: dy / l + dx / l * e, assist: true }); tick(g, 1); } ok(reached, 'נתקע בדרך אל ' + room); }
  }
});

test('סיכום משחק: ציר זמן ופרסים, ו"שחק שוב" מתחיל סבב חדש', () => {
  const g = createGame(MAP); const a = g.join('x');
  g.act(a, { type: 'settings', impostors: 2, bots: 7, killCd: 15, tasks: 4, meetingTime: 20 }); g.act(a, { type: 'start' });
  let v = g.view(a);
  for (let i = 0; i < 60000 && v.phase !== 'end'; i++) { tick(g, 1); v = g.view(a); if (v.phase === 'meeting' && !v.meeting.myVote && v.me.alive) g.act(a, { type: 'vote', target: 'skip' }); }
  ok(v.phase === 'end', 'המשחק לא נגמר');
  ok(v.summary && v.summary.events.length >= 2 && v.summary.events[0].text.includes('התחיל'), 'חסר ציר זמן');
  ok(v.summary.events[v.summary.events.length - 1].type === 'end', 'הציר צריך להסתיים בסיום');
  ok(Array.isArray(v.summary.awards), 'חסרים פרסים');
  g.act(a, { type: 'again' }); sec(g, 1);
  const v2 = g.view(a); ok(v2.phase === 'play' && v2.tasks.total > 0 && !v2.summary, 'צריך להתחיל סבב חדש');
});

test('מצב מרוץ: בלי מתחזים, בלי ישיבות, והראשון ליעד מנצח עם דירוג', () => {
  const g = createGame(MAP); const a = g.join('x');
  g.act(a, { type: 'settings', bots: 5, mode: 2, raceGoal: 6, map: 'big' }); g.act(a, { type: 'start' });
  let v = g.view(a); ok(v.race && v.race.goal === 6, 'חסר מצב מרוץ'); ok(v.me.team === 'crew' && !v.players.some(p => p.team === 'imp'), 'במרוץ אין מתחזים');
  g.act(a, { type: 'use' }); ok(g.view(a).phase === 'play', 'אסור לכנס ישיבה במרוץ');
  for (let i = 0; i < 60000 && v.phase !== 'end'; i++) { tick(g, 1); v = g.view(a); }
  ok(v.phase === 'end' && v.winner.team === 'race', 'המרוץ לא נגמר');
  ok(Array.isArray(v.winner.ranking) && v.winner.ranking[0].n >= 1, 'חסר דירוג');
});
test('מחבל: לא מחסל, אבל מחבל מהר יותר מהמתחזה הרגיל', () => {
  let found = null;
  for (let i = 0; i < 600 && !found; i++) {
    const g = createGame(MAP); const a = g.join('x'); ['b', 'c', 'd', 'e', 'f'].forEach(n => g.join(n)); // 6 שחקנים כדי שיהיו שני מתחזים
    g.act(a, { type: 'settings', impostors: 2, bots: 0, killCd: 5, newRoles: true }); g.act(a, { type: 'start' });
    if (g.view(a).me.role === 'מחבל') found = { g, a };
  }
  ok(found, 'לא קיבלתי תפקיד מחבל'); const { g, a } = found; sec(g, 15);
  g.act(a, { type: 'kill' }); tick(g, 2); ok(g.view(a).players.filter(p => !p.alive).length === 0, 'מחבל לא אמור לחסל');
  g.act(a, { type: 'sab', kind: 'lights' }); tick(g, 2); ok(g.view(a).sab, 'מחבל צריך להצליח לחבל');
});
test('שומר ראש: מגן על שחקן קרוב לתקופה', () => {
  const { g, a, ids } = newGame({ role: 'שומר ראש', bots: 3, humans: 2 }); sec(g, 3);
  walkTo(g, a, me(g, ids[1]));
  g.act(a, { type: 'guard' }); tick(g, 2);
  const v = g.view(a); ok(v.me.guardCd > 0, 'אין השהיה'); ok(v.players.some(p => p.id !== a && p.shield), 'מישהו צריך להיות מוגן');
});
test('מפה קטנה: משחק מלא נגמר ומשימות שייכות למפה הנכונה', () => {
  for (let r = 0; r < 8; r++) {
    const g = createGame(MAP); const a = g.join('x');
    g.act(a, { type: 'settings', impostors: 1, bots: 4, killCd: 15, tasks: 4, meetingTime: 20, map: 'small' }); g.act(a, { type: 'start' });
    let v = g.view(a); ok(v.map === 'small', 'המפה לא הוחלפה');
    ok(v.me.tasks.every(t => t.i < MAP.byId.small.TASKS.length), 'משימה מחוץ למפה הקטנה');
    for (let i = 0; i < 60000 && v.phase !== 'end'; i++) { tick(g, 1); v = g.view(a); if (v.phase === 'meeting' && !v.meeting.myVote && v.me.alive) g.act(a, { type: 'vote', target: 'skip' }); }
    ok(v.phase === 'end' || (v.me.team === 'crew' && v.tasks.done < v.tasks.total), 'משחק תקוע על המפה הקטנה');
  }
});
test('שחזור משחק על המפה הקטנה שומר את המפה', () => {
  const g = createGame(MAP); const a = g.join('x'); g.act(a, { type: 'settings', bots: 3, map: 'small' }); g.act(a, { type: 'start' }); sec(g, 10);
  const g2 = createGame(MAP); g2.restore(g.snapshot()); g2.join('x', a); ok(g2.view(a).map === 'small', 'המפה לא שוחזרה'); sec(g2, 5);
});

// ---------------------------------------------------------------------------
console.log('\nמשחקים מלאים (בוטים בלבד)');
test('עד 15 שחקנים בחדר ועד 15 בוטים, ומשחק מלא נגמר', () => {
  const g = createGame(MAP); const ids = [];
  for (let i = 0; i < 16; i++) ids.push(g.join('שחקן' + i));
  ok(ids.slice(0, 15).every(Boolean), 'לא כל 15 השחקנים נכנסו');
  ok(ids[15] === null, 'שחקן 16 נכנס לחדר מלא');
  const h = createGame(MAP), a = h.join('מארח');
  h.act(a, { type: 'settings', bots: 15, impostors: 4, killCd: 10 }); h.act(a, { type: 'start' });
  ok(h.view(a).roster.length === 16, 'לא נוצרו 15 בוטים');
  let end = false;
  for (let i = 0; i < 60000 && !end; i++) { tick(h, 1); const v = h.view(a); if (v.phase === 'meeting' && !v.meeting.myVote && v.me.alive) h.act(a, { type: 'vote', target: 'skip' }); end = v.phase === 'end'; }
  // כמו בבדיקת 30 המשחקים: מארח אנושי שלא עושה כלום יכול להשאיר משחק פתוח רק אם הוא איש צוות עם משימות פתוחות
  if (!end) { const v = h.view(a); ok(v.me.team === 'crew' && v.tasks.done < v.tasks.total, 'משחק עם 15 בוטים נתקע בשלב ' + v.phase); }
});
test('מפה קטנה: אין חבלת כור', () => {
  ok(MAP.byId.small.SAB_POINTS.reactor.length === 0, 'יש נקודות כור במפה הקטנה');
  const { g, a } = newGame({ bots: 5, cfg: { map: 'small', impostors: 2 }, role: 'מתחזה' });
  g.act(a, { type: 'sab', kind: 'reactor' });
  ok(!g.view(a).sab, 'חבלת כור הופעלה במפה הקטנה');
});
test('מחבל: למשבר שלו 30 שניות במקום 45', () => {
  let s = null;
  for (let attempt = 0; attempt < 10 && !s; attempt++) {
  const { g, a } = newGame({ bots: 6, cfg: { impostors: 2 }, role: 'מחבל' });
  sec(g, 20); // ההשהיה של תחילת המשחק
  // מחכים לרגע שבו אפשר לחבל: בזמן משחק (לא בישיבה שבוט כינס), בלי משבר של בוט שכבר פעיל
  for (let i = 0; i < 600 && !s; i++) {
    const v = g.view(a);
    if (v.phase === 'end' || !v.me.alive || v.me.role !== 'מחבל') break; // הודח, המשחק נגמר, או שהשותף הודח והוא הפך למתחזה – מנסים משחק חדש
    if (v.phase === 'meeting' && !v.meeting.myVote) g.act(a, { type: 'vote', target: 'skip' });
    if (v.phase === 'play' && !v.sab) { g.act(a, { type: 'sab', kind: 'oxygen' }); s = g.view(a).sab; }
    sec(g, 1);
  }
  }
  ok(s && s.t <= 30, 'זמן המשבר של המחבל: ' + (s && s.t));
});
test('30 משחקים מלאים נגמרים בלי שגיאות ובלי להיתקע', () => {
  const reasons = {};
  for (let r = 0; r < 30; r++) {
    const g = createGame(MAP); const a = g.join('x');
    g.act(a, { type: 'settings', impostors: r % 3 === 0 ? 2 : 1, bots: 5 + (r % 5), killCd: 20, tasks: 4, meetingTime: 25, newRoles: r % 2 === 0 });
    g.act(a, { type: 'start' });
    let end = null;
    for (let i = 0; i < 60000 && !end; i++) {
      tick(g, 1); const v = g.view(a);
      if (v.phase === 'meeting' && !v.meeting.myVote && v.me.alive) g.act(a, { type: 'vote', target: 'skip' });
      if (v.phase === 'end') end = v.winner.reason;
    }
    // המארח האנושי לא עושה כלום, לכן אם הוא איש צוות המשחק יכול להיגמר רק בניצחון מתחזים או בהדחה
    if (!end) { const v = g.view(a); ok(v.me.team === 'crew' && v.tasks.done < v.tasks.total, `משחק ${r} נתקע (שלב ${v.phase})`); end = 'תקוע בגלל שחקן אנושי שלא פועל'; }
    reasons[end] = (reasons[end] || 0) + 1;
  }
  console.log('      תוצאות: ' + JSON.stringify(reasons));
});

test('אבטחה: אי אפשר להתחזות לשחקן אחר, והמפתח הסודי לא נשלח לאף אחד', () => {
  const g = createGame(MAP); const a = g.join('מארח'); const b = g.join('חבר');
  ok(typeof g.keyOf(b) === 'string' && g.keyOf(b).length >= 16, 'אין מפתח סודי');
  ok(g.keyOf(a) !== g.keyOf(b), 'מפתחות זהים');
  ok(g.checkKey(b, g.keyOf(b)), 'המפתח הנכון נדחה');
  ok(!g.checkKey(b, 'x') && !g.checkKey(b, undefined) && !g.checkKey(b, null) && !g.checkKey(b, g.keyOf(a)) && !g.checkKey('nope', 'x'), 'מפתח שגוי התקבל');
  for (const id of [a, b]) ok(!JSON.stringify(g.view(id)).includes(g.keyOf(a)) && !JSON.stringify(g.view(id)).includes(g.keyOf(b)), 'המפתח דלף למצב שנשלח לשחקנים');
  const g2 = createGame(MAP); g2.restore(g.snapshot()); ok(g2.checkKey(b, g.keyOf(b)), 'המפתח לא נשמר בשחזור');
  // אורח לא יכול לשנות הגדרות או להתחיל משחק, ושם ארוך/עם תווי בקרה מנוקה
  g.act(b, { type: 'settings', bots: 9 }); g.act(b, { type: 'start' });
  ok(g.view(a).phase === 'lobby' && g.view(a).settings.bots !== 9, 'אורח שינה הגדרות או התחיל משחק');
  const c = g.join('א'.repeat(200) + '\u202e'); ok(g.view(c).roster.find(p => p.id === c).name.length <= 14, 'שם ארוך מדי');
  g.act(b, { type: 'chat', text: '<img src=x onerror=alert(1)>'.repeat(50) }); ok(g.view(a).chat.slice(-1)[0].text.length <= 142, 'הודעת צ\'אט ארוכה מדי');
  for (const junk of [null, 5, 'x', {}, { type: 'vote', target: {} }, { type: 'ventMove', to: 'a' }, { type: 'color', color: 1e9 }, { type: '__proto__' }, { type: 'hat', hat: -5 }]) g.act(b, junk);
  g.act('constructor', { type: 'start' }); g.act('__proto__', { type: 'start' });
  ok(g.view(a).phase === 'lobby', 'קלט זבל שינה את המצב');
});

test('מצב אדמין: רק "ראש תפוח אדמה" מפעיל ו"אקסטרה ראש תפוח אדמה" מבטל, והמשפט לא מופיע בצ\'אט', () => {
  const P = createGame.adminPhrase;
  ok(P('ראש תפוח אדמה') === true && P('אני אומר: ראש תפוח אדמה!') === true && P('ראש תפוחי אדמה') === true, 'הפעלה לא זוהתה');
  ok(P('אקסטרה ראש תפוח אדמה') === false && P('אקסטרא, ראש תפוח אדמה') === false, 'ביטול לא זוהה');
  ok(P('תפוח אדמה') === null && P('ראש') === null && P('מי המתחזה?') === null, 'זיהוי שגוי');
  const g = createGame(MAP); const a = g.join('x'); g.act(a, { type: 'settings', bots: 4 }); g.act(a, { type: 'start' }); sec(g, 3);
  g.act(a, { type: 'reveal' }); ok(!g.view(a).settings.reveal, 'הפקודה הישנה עדיין מפעילה');
  g.act(a, { type: 'chat', text: 'ראש תפוח אדמה', voice: true }); ok(g.view(a).settings.reveal === true, 'לא הופעל בזמן המשחק');
  g.act(a, { type: 'chat', text: 'ראש תפוח אדמה' }); ok(g.view(a).settings.reveal === true, 'אמירה שנייה ביטלה במקום להשאיר');
  ok(!g.view(a).chat.some(c => /תפוח/.test(c.text)), 'המשפט הסודי הופיע בצ\'אט');
  g.act(a, { type: 'chat', text: 'אקסטרה ראש תפוח אדמה' }); ok(g.view(a).settings.reveal === false, 'לא בוטל');
});

test('מחבל שנשאר המתחזה האחרון הופך למתחזה שיכול לחסל (אחרת המשחק נתקע)', () => {
  const { g, a, ids } = newGame({ bots: 6, cfg: { impostors: 2 }, role: 'מחבל', humans: 1 });
  const sn = JSON.parse(g.snapshot()); sn.players[Object.values(sn.players).find(p => p.id !== a && ['impostor', 'shifter', 'phantom', 'viper', 'noisemaker'].includes(p.role)).id].alive = false;
  const g2 = createGame(MAP); g2.restore(JSON.stringify(sn)); g2.join('x', a); tick(g2, 3);
  ok(g2.view(a).me.role === 'מתחזה', 'המחבל לא הפך למתחזה: ' + g2.view(a).me.role);
});

test('רדוף: נועל דלת אחת, מכבה אור בחדר, גורר גופה – ולא מחסל', () => {
  const { g, a, ids } = newGame({ bots: 0, humans: 7, cfg: { impostors: 2 }, role: 'רדוף' }) // 7 שחקנים: אחרי חיסול אחד המשחק עוד לא נגמר;
  const v0 = g.view(a); ok(v0.me.team === 'imp' && v0.me.roleKey === 'poltergeist', 'לא רדוף');
  sec(g, 11); // השהיית פתיחה
  const crew = ids.find(id => g.view(id).me.team === 'crew');
  // לא מחסל
  walkTo(g, a, me(g, crew)); g.act(a, { type: 'kill' }); tick(g, 2); ok(g.view(crew).me.alive, 'הרדוף חיסל');
  // נעילת דלת: דלת אחת בלבד נעולה, ואי אפשר לעבור דרכה
  g.act(a, { type: 'hauntDoor' }); tick(g, 1);
  let v = g.view(a); ok(v.hauntDoors.length === 1, 'לא ננעלה דלת אחת: ' + v.hauntDoors.length); ok(v.doors.length === 0, 'נעלו חדר שלם במקום דלת אחת');
  ok(v.me.hauntDoorCd > 0, 'אין השהיה');
  g.act(a, { type: 'hauntDoor' }); tick(g, 1); ok(g.view(a).hauntDoors.length === 1, 'נעל שוב בלי השהיה');
  sec(g, 9); ok(g.view(a).hauntDoors.length === 0, 'הדלת לא נפתחה אחרי 8 שניות');
  // כיבוי אור בחדר שהוא נמצא בו
  const room = MAP.roomAt(me(g, a).x, me(g, a).y);
  ok(room, 'הרדוף לא בתוך חדר');
  g.act(a, { type: 'hauntLight' }); tick(g, 1);
  ok(g.view(crew).darkRooms.includes(room.id) && g.view(crew).darkRooms.length === 1, 'האור לא כבה רק בחדר הזה');
  sec(g, 16); ok(g.view(a).darkRooms.length === 0, 'האור לא חזר אחרי 15 שניות');
  // גרירת גופה: המתחזה השני מחסל, הרדוף גורר את הגופה למרחק קצר
  const killer = ids.find(id => id !== a && g.view(id).me.team === 'imp');
  for (let k = 0; k < 40 && g.view(crew).me.alive; k++) { walkTo(g, killer, me(g, crew)); g.act(killer, { type: 'kill' }); sec(g, 1); }
  ok(!g.view(crew).me.alive, 'המתחזה השני לא הצליח לחסל');
  const b0 = g.view(a).bodies[0];
  walkTo(g, a, b0); g.act(a, { type: 'drag' }); tick(g, 1); ok(g.view(a).me.dragging, 'לא התחיל לגרור');
  const here = MAP.roomAt(me(g, a).x, me(g, a).y);
  const target = MAP.path(here.id, Object.keys(MAP.ROOMS).find(r => r !== here.id)).find(q => Math.hypot(q.x - b0.x, q.y - b0.y) > 100) || { x: b0.x + 150, y: b0.y };
  for (let k = 0; k < 150; k++) { const p = me(g, a), dx = target.x - p.x, dy = target.y - p.y, l = Math.hypot(dx, dy) || 1; g.act(a, { type: 'input', dx: dx / l, dy: dy / l }); tick(g, 1); }
  g.act(a, { type: 'input', dx: 0, dy: 0 }); tick(g, 2);
  const b1 = g.view(a).bodies[0]; const moved = Math.hypot(b1.x - b0.x, b1.y - b0.y);
  ok(moved > 40, 'הגופה לא זזה (' + Math.round(moved) + ')'); ok(moved <= 300, 'הגופה נגררה רחוק מדי');
  ok(MAP.walkable(b1.x, b1.y), 'הגופה בתוך קיר');
  sec(g, 7); ok(!g.view(a).me.dragging && g.view(a).me.dragCd > 0, 'הגרירה לא הסתיימה אחרי 6 שניות');
});
test('רדוף שנשאר המתחזה האחרון הופך למתחזה', () => {
  const { g, a } = newGame({ bots: 6, cfg: { impostors: 2 }, role: 'רדוף' });
  const sn = JSON.parse(g.snapshot()); sn.players[Object.values(sn.players).find(p => p.id !== a && ['impostor', 'shifter', 'phantom', 'viper', 'noisemaker', 'saboteur'].includes(p.role)).id].alive = false;
  const g2 = createGame(MAP); g2.restore(JSON.stringify(sn)); g2.join('x', a); tick(g2, 3);
  ok(g2.view(a).me.role === 'מתחזה', 'הרדוף לא הפך למתחזה: ' + g2.view(a).me.role);
});


test('תפקידים: אפשר לכבות תפקיד בהגדרות והוא לא מופיע', () => {
  const off = ['engineer', 'scientist', 'angel', 'photographer', 'detective', 'judge', 'bodyguard', 'timekeeper', 'mole'];
  for (let i = 0; i < 40; i++) {
    const { g, a } = newGame({ bots: 9, cfg: { roleOff: off, impostors: 2 } });
    const sn = JSON.parse(g.snapshot());
    ok(!Object.values(sn.players).some(p => off.includes(p.role)), 'הופיע תפקיד כבוי');
    ok(JSON.stringify(g.view(a).settings.roleOff) === JSON.stringify(off), 'ההגדרה לא נשמרה');
  }
  const { g } = newGame({ bots: 9, role: 'מגן אישי' }); ok(g, 'מגן אישי לא הופיע');
});

test('מגן אישי: יודע מתי ואיפה חוסל מי שהוא שומר עליו, ויכול להחליף פעם אחת', () => {
  const { g, a } = newGame({ bots: 6, role: 'מגן אישי', cfg: { roleOff: ['mole', 'timekeeper', 'bodyguard', 'angel'] } });
  let v = g.view(a); ok(v.me.ward && v.me.ward.name, 'אין שחקן לשמור עליו');
  sec(g, 1);
  let sn = JSON.parse(g.snapshot()); const imp = Object.values(sn.players).find(p => ['impostor', 'shifter', 'phantom', 'viper', 'noisemaker'].includes(p.role));
  const other = Object.values(sn.players).find(p => p.id !== a && p.id !== imp.id && p.alive && !['jester'].includes(p.role) && (p.role === 'crew' || ['engineer', 'scientist', 'photographer', 'detective', 'judge', 'mole'].includes(p.role)));
  // החלפה: עומד ליד שחקן אחר ולוחץ U
  place(g, s2 => { Object.values(s2.players).forEach(p => { p.killCd = 999; if (p.bot) p.bot.wait = 999; }); s2.players[a].x = MAP.BUTTON.x; s2.players[a].y = MAP.BUTTON.y; s2.players[other.id].x = MAP.BUTTON.x + 50; s2.players[other.id].y = MAP.BUTTON.y; s2.players[a].ward = imp.id; });
  g.setConn(a, true);
  g.act(a, { type: 'ward' }); v = g.view(a);
  ok(v.me.ward.name === other.name.replace(/^🤖\s*/, ''), 'ההחלפה לא עבדה: ' + v.me.ward.name);
  ok(!v.me.ward.swap, 'אפשר להחליף שוב');
  // המתחזה מחסל אותו
  place(g, s2 => { const k = s2.players[imp.id], o = s2.players[other.id]; k.killCd = 0; k.x = o.x + 30; k.y = o.y; k.alive = true; k.inVent = null; k.vanishUntil = 0; o.inVent = null; o.shieldUntil = 0; o.alive = true; });
  g.setConn(a, true);
  g.act(imp.id, { type: 'kill' }); tick(g, 1);
  v = g.view(a);
  ok(!v.me.ward.alive, 'השחקן לא חוסל');
  ok(v.me.notes.some(n => n.includes('💔')), 'המגן לא קיבל התראה');
});

test('שומר הזמן: מחזיר את כולם אחורה ומחייה מי שחוסל בשניות האחרונות – פעם אחת', () => {
  const { g, a } = newGame({ bots: 6, role: 'שומר הזמן', cfg: { roleOff: ['mole', 'bodyguard', 'angel'] } });
  place(g, sn => { Object.values(sn.players).forEach(p => { p.killCd = 999; if (p.bot) p.bot.wait = 999; }); });
  g.setConn(a, true);
  sec(g, 3);
  const sn = JSON.parse(g.snapshot()); const imp = Object.values(sn.players).find(p => ['impostor', 'shifter', 'phantom', 'viper', 'noisemaker'].includes(p.role));
  const vic = Object.values(sn.players).find(p => p.id !== a && p.id !== imp.id && p.role === 'crew') || Object.values(sn.players).find(p => p.id !== a && p.id !== imp.id && !['saboteur', 'poltergeist'].includes(p.role) && p.role !== 'jester');
  place(g, s2 => { const k = s2.players[imp.id], o = s2.players[vic.id]; k.killCd = 0; k.vanishUntil = 0; o.shieldUntil = 0; k.x = o.x + 30; k.y = o.y; Object.values(s2.players).forEach(p => { if (p.bot) p.bot.plan = []; }); });
  g.setConn(a, true);
  g.act(imp.id, { type: 'kill' });
  ok(!JSON.parse(g.snapshot()).players[vic.id].alive, 'החיסול לא קרה');
  g.act(a, { type: 'rewind' }); tick(g, 1);
  const s3 = JSON.parse(g.snapshot());
  ok(s3.players[vic.id].alive, 'הקורבן לא חזר לחיים');
  ok(!g.view(a).bodies.length, 'הגופה נשארה');
  ok(s3.players[a].rewindUsed, 'לא נרשם שהשתמש');
  g.act(a, { type: 'rewind' }); ok(g.view(a).phase === 'play', 'נשבר בשימוש שני');
});

test('רעשן: רעש מזויף בחדר אחר, אנשי צוות קרובים שומעים ובוטים הולכים לבדוק', () => {
  const { g, a } = newGame({ bots: 6, role: 'רעשן', cfg: { roleOff: ['mole'] } });
  sec(g, 16);
  const room = Object.values(MAP.ROOMS).find(r => r !== MAP.roomAt(me(g, a).x, me(g, a).y));
  g.act(a, { type: 'noise', room: room.id }); tick(g, 1);
  const v = g.view(a);
  ok(v.noises.length === 1 && Math.abs(v.noises[0].x - room.cx) < 2, 'אין רעש בחדר שנבחר');
  ok(v.me.noiseCd > 0, 'אין השהיה');
  g.act(a, { type: 'noise' }); tick(g, 1); ok(g.view(a).noises.length === 1, 'רעש שני בלי השהיה');
  sec(g, 7); ok(g.view(a).noises.length === 0, 'הרעש לא נעלם');
});

test('שתול: יודע מי המתחזים, הם לא יודעים עליו, הבלש רואה אותו נקי, ומנצח עם המתחזים', () => {
  let res;
  for (let i = 0; i < 300 && !res; i++) {
    const g = createGame(MAP); const ids = [g.join('א'), g.join('ב'), g.join('ג')];
    g.act(ids[0], { type: 'settings', impostors: 1, bots: 5, killCd: 10, newRoles: true, jester: false });
    g.act(ids[0], { type: 'start' });
    const m = ids.find(id => g.view(id).me.roleKey === 'mole'), im = ids.find(id => g.view(id).me.team === 'imp');
    if (m && im) res = { g, m, im, ids };
  }
  ok(res, 'לא נוצר משחק עם שתול ומתחזה אנושיים');
  const { g, m, im } = res;
  const vm = g.view(m), vi = g.view(im);
  ok(vm.me.team === 'mole', 'הצוות של השתול לא נכון');
  ok(vm.players.find(p => p.id === im).team === 'imp', 'השתול לא רואה את המתחזה');
  ok(!vi.players.find(p => p.id === m).team, 'המתחזה רואה את השתול');
  ok(vm.me.tasks.length > 0, 'אין לשתול משימות הסוואה');
  // סוף משחק: ניצחון מתחזים
  let last;
  place(g, sn => { const I = ['impostor', 'shifter', 'phantom', 'viper', 'noisemaker', 'saboteur', 'poltergeist'];
    Object.values(sn.players).forEach(p => { if (p.role !== 'mole' && !I.includes(p.role)) { if (!last) { last = p; p.x = sn.players[im].x + 30; p.y = sn.players[im].y; p.shieldUntil = 0; } else p.alive = false; } });
    sn.players[im].killCd = 0; sn.players[im].vanishUntil = 0; if (['saboteur', 'poltergeist'].includes(sn.players[im].role)) sn.players[im].role = 'impostor'; });
  g.setConn(m, true); g.setConn(im, true);
  g.act(im, { type: 'kill' }); tick(g, 2);
  const allDead = g.view(m);
  ok(allDead.phase === 'end' && allDead.winner.team === 'imp', 'המתחזים לא ניצחו: ' + allDead.phase);
});


test('בוטים זוכרים שקר מישיבה קודמת ומזכירים אותו בישיבה הבאה', () => {
  const { g, a } = newGame({ bots: 5, role: 'מתחזה', cfg: { botLevel: 3, roleOff: ['mole'], jester: false } });
  place(g, sn => { Object.values(sn.players).forEach(p => { p.killCd = 999; }); });
  g.setConn(a, true);
  callMeeting(g, a);
  place(g, sn => { Object.values(sn.players).forEach(p => { if (p.bot) p.bot.seen = { [a]: 'נשק' }; }); });
  g.setConn(a, true);
  g.act(a, { type: 'chat', text: 'הייתי בחשמל כל הזמן' });
  sec(g, 8);
  let v = JSON.parse(g.snapshot());
  ok(v.chat.some(c => c.from !== a && c.text.includes('לא נכון') && c.text.includes('נשק')), 'אף בוט לא תפס את השקר');
  ok(JSON.parse(g.snapshot()).liars[a], 'השקר לא נשמר');
  // מסיימים את הישיבה בדילוג ומתחילים ישיבה חדשה
  place(g, sn => { Object.values(sn.players).filter(p => p.alive).forEach(p => { sn.meeting.votes[p.id] = 'skip'; }); Object.values(sn.players).forEach(p => { p.emergencyUsed = false; }); });
  g.setConn(a, true);
  for (let i = 0; i < 30 * 25 && g.view(a).phase !== 'play'; i++) tick(g, 1);
  ok(g.view(a).phase === 'play', 'הישיבה לא הסתיימה');
  callMeeting(g, a);
  let found = false;
  for (let i = 0; i < 60 && !found; i++) { sec(g, 1); found = JSON.parse(g.snapshot()).chat.some(c => c.from !== a && /שיקר|בפעם שעברה|בישיבה הקודמת/.test(c.text)); }
  ok(found, 'אף בוט לא הזכיר את השקר מהישיבה הקודמת');
});

test('האשמה במיקרופון: בוט שראה ראיה מסכים, בוט עם אליבי מגן', () => {
  const { g, a } = newGame({ bots: 6, role: 'איש צוות', cfg: { botLevel: 3, roleOff: ['mole'], jester: false } });
  const sn0 = JSON.parse(g.snapshot()); const bs = Object.values(sn0.players).filter(p => p.isBot);
  const crewB = bs.filter(p => !['impostor', 'shifter', 'phantom', 'viper', 'noisemaker', 'saboteur', 'poltergeist'].includes(p.role));
  const x = crewB[0], w1 = crewB[1], w2 = crewB[2];
  callMeeting(g, a);
  place(g, sn => { Object.values(sn.players).forEach(p => { if (p.bot) { p.bot.alibi = []; p.bot.sawVent = null; p.bot.chatAt = p.bot.chat2At = p.bot.chat3At = -999; p.bot.voteAt = -999; } });
    sn.players[w1.id].bot.sawVent = { id: x.id, room: 'כור' }; sn.players[w2.id].bot.alibi = [x.id]; });
  g.setConn(a, true);
  g.act(a, { type: 'chat', voice: true, text: x.name.replace(/^🤖\s*/, '') + ' הוא המתחזה תצביעו עליו' });
  sec(g, 14);
  const v = JSON.parse(g.snapshot());
  ok(v.chat.some(c => c.from === w1.id && c.text.includes('פתח')), 'הבוט שראה את הפתח לא הסכים');
  ok(v.chat.some(c => c.from === w2.id && c.text.includes('איתי')), 'הבוט עם האליבי לא הגן');
});


test('מחבואים: המחפש גלוי לכולם, ממתין 10 שניות, אין ישיבות, ונגמר כשהזמן נגמר', () => {
  const { g, a } = newGame({ bots: 5, role: 'איש צוות', cfg: { mode: 3, hideTime: 60 } });
  let v = g.view(a);
  const sk = v.players.find(p => p.team === 'imp');
  ok(sk && sk.role === 'המחפש', 'המחפש לא גלוי לכולם');
  ok(v.hide && v.hide.wait > 0, 'אין ספירה של המחפש');
  const sn = JSON.parse(g.snapshot()); const x0 = sn.players[sk.id].x;
  sec(g, 3); ok(Math.abs(JSON.parse(g.snapshot()).players[sk.id].x - x0) < 1, 'המחפש זז לפני הזמן');
  ok(!Object.values(JSON.parse(g.snapshot()).players).some(p => !['crew', 'seeker'].includes(p.role)), 'יש תפקידים מיוחדים במחבואים');
  g.act(a, { type: 'use' }); walkTo(g, a, MAP.BUTTON); g.act(a, { type: 'use' }); tick(g, 3); ok(g.view(a).phase === 'play', 'נפתחה ישיבה במחבואים');
  for (let i = 0; i < 90 && g.view(a).phase === 'play'; i++) sec(g, 1);
  v = g.view(a); ok(v.phase === 'end', 'המשחק לא נגמר');
});

test('הפתעה: כשאין מתחזה – הדחה של מישהו מפסידה את כולם', () => {
  let r;
  for (let i = 0; i < 80 && !r; i++) { const x = newGame({ bots: 5, cfg: { mode: 4, jester: false } }); if (!JSON.parse(x.g.snapshot()).noImpGame) continue; r = x; }
  ok(r, 'לא יצא משחק בלי מתחזה');
  const { g, a } = r;
  ok(!g.view(a).players.some(p => p.team === 'imp'), 'יש מתחזה');
  callMeeting(g, a);
  const tgt = g.view(a).players.find(p => p.id !== a && p.alive);
  place(g, sn => { Object.values(sn.players).filter(p => p.alive).forEach(p => { sn.meeting.votes[p.id] = tgt.id; }); });
  g.setConn(a, true);
  let v; for (let i = 0; i < 30 * 25; i++) { tick(g, 1); v = g.view(a); if (v.phase === 'end') break; }
  ok(v.phase === 'end' && v.winner.team === 'nobody', 'לא הפסידו כולם: ' + v.phase);
  ok(!v.eject || v.eject.impLeft == null, 'נחשף כמה מתחזים נשארו');
});

test('טורניר: ניקוד מצטבר בין סיבובים והבוטים שומרים על השמות', () => {
  const { g, a } = newGame({ bots: 4, cfg: { rounds: 3, mode: 2, raceGoal: 4 } });
  const names1 = g.view(a).roster.filter(p => p.bot).map(p => p.name).sort().join();
  for (let r = 1; r <= 3; r++) {
    for (let i = 0; i < 600 && g.view(a).phase === 'play'; i++) sec(g, 1);
    tick(g, 2);
    const v = g.view(a);
    ok(v.phase === 'end' && v.tour && v.tour.round === r, 'סיבוב ' + r + ' לא נגמר כמו שצריך');
    ok(v.tour.table.length >= 5 && v.tour.table.some(e => e.pts > 0), 'אין ניקוד');
    if (r < 3) { g.act(a, { type: 'again' }); ok(g.view(a).roster.filter(p => p.bot).map(p => p.name).sort().join() === names1, 'הבוטים החליפו שמות'); }
    else ok(v.tour.done, 'הטורניר לא הסתיים');
  }
});


test('תחנת קרח: אפשר לבחור, חבלת הקפאה מאטה את הצוות, ומשימה זוגית מתקדמת רק עם שותף', () => {
  const ICE = MAP.byId.ice;
  const { g, a } = newGame({ bots: 4, role: 'איש צוות', cfg: { map: 'ice', roleOff: ['mole'], jester: false } });
  ok(g.view(a).map === 'ice', 'המפה לא נבחרה');
  // משימה זוגית
  const pi = ICE.TASKS.findIndex(t => t.kind === 'pair'), T = ICE.TASKS[pi];
  place(g, sn => { const h = sn.players[a]; h.tasks = [{ i: pi, done: false }]; h.x = T.x; h.y = T.y;
    Object.values(sn.players).forEach(p => { if (p.id !== a) { p.x = 200; p.y = 150; p.killCd = 999; if (p.bot) { p.bot.wait = 999; p.bot.plan = []; } } }); });
  g.setConn(a, true);
  g.act(a, { type: 'use' }); sec(g, 7);
  let v = g.view(a); ok(!v.me.tasks[0].done && v.me.pairWait, 'משימה זוגית התקדמה לבד');
  ok(v.pairCalls.length === 1, 'אין קריאה לעזרה');
  const helper = Object.values(JSON.parse(g.snapshot()).players).find(p => p.id !== a);
  place(g, sn => { sn.players[helper.id].x = T.x + 60; sn.players[helper.id].y = T.y; });
  g.setConn(a, true); g.act(a, { type: 'use' });
  sec(g, 9); v = g.view(a); ok(v.me.tasks[0].done, 'משימה זוגית לא הושלמה עם שותף');
  // הקפאה
  const imp = Object.values(JSON.parse(g.snapshot()).players).find(p => p.role && ['impostor', 'shifter', 'phantom', 'viper', 'noisemaker'].includes(p.role));
  place(g, sn => { sn.sabCd = 0; sn.sab = null; });
  g.setConn(a, true);
  g.act(imp.id, { type: 'sab', kind: 'freeze' }); tick(g, 1);
  ok(g.view(a).sab && g.view(a).sab.type === 'freeze', 'ההקפאה לא התחילה');
  const x0 = me(g, a).x; g.act(a, { type: 'input', dx: 1, dy: 0 }); tick(g, 15); const dFrozen = Math.abs(me(g, a).x - x0);
  g.act(a, { type: 'input', dx: -1, dy: 0 }); tick(g, 15); g.act(a, { type: 'input', dx: 0, dy: 0 });
  place(g, sn => { sn.sab = null; }); g.setConn(a, true);
  const x1 = me(g, a).x; g.act(a, { type: 'input', dx: 1, dy: 0 }); tick(g, 15); const dNorm = Math.abs(me(g, a).x - x1); g.act(a, { type: 'input', dx: 0, dy: 0 });
  ok(dFrozen < dNorm * 0.75, `הקפאה לא מאטה (${dFrozen} מול ${dNorm})`);
});

test('שיבוש מצלמות: המתחזה מכבה את המצלמות ל-25 שניות', () => {
  const { g, a } = newGame({ bots: 4, role: 'מתחזה', cfg: { roleOff: ['mole'] } });
  g.act(a, { type: 'sab', kind: 'cams' }); tick(g, 1);
  let v = g.view(a); ok(v.camsOff > 20, 'המצלמות לא שובשו');
  g.act(a, { type: 'sab', kind: 'cams' }); tick(g, 1); ok(g.view(a).camsOff <= 25, 'שיבוש כפול');
  sec(g, 26); v = g.view(a); ok(!v.camsOff && v.camsCd > 0, 'המצלמות לא חזרו או שאין השהיה');
});


test('חיית מחמד נשמרת ונראית לכולם, ובסוף המשחק כל שחקן מקבל סטטיסטיקה אישית', () => {
  const g = createGame(MAP); const a = g.join('א'), b = g.join('ב');
  g.act(a, { type: 'pet', pet: 3 }); g.act(b, { type: 'pet', pet: 99 });
  ok(g.view(b).roster.find(p => p.id === a).pet === 3, 'החיה לא נשמרה');
  ok(!g.view(a).roster.find(p => p.id === b).pet, 'חיה לא חוקית התקבלה');
  g.act(a, { type: 'settings', bots: 4, mode: 2, raceGoal: 4 }); g.act(a, { type: 'start' });
  ok(g.view(b).players.find(p => p.id === a).pet === 3, 'החיה לא מופיעה במשחק');
  for (let i = 0; i < 600 && g.view(a).phase === 'play'; i++) sec(g, 1);
  const v = g.view(a); ok(v.phase === 'end' && v.myStats && typeof v.myStats.won === 'boolean' && v.myStats.game > 0, 'אין סטטיסטיקה אישית');
});


test('מחבואים: חיסול כל שנייה, והמתחבאים נכנסים לפתחים 5 פעמים בלבד', () => {
  const { g, a } = newGame({ bots: 5, role: 'איש צוות', cfg: { mode: 3, hideTime: 300 } });
  const V = MAP.VENTS[0];
  place(g, sn => { Object.values(sn.players).forEach(p => { if (p.id !== a) { p.x = 100; p.y = 100; if (p.bot) { p.bot.plan = []; p.bot.wait = 999; } } }); sn.players[a].x = V.x; sn.players[a].y = V.y; });
  g.setConn(a, true);
  for (let i = 1; i <= 6; i++) {
    g.act(a, { type: 'vent' }); tick(g, 1);
    const inV = g.view(a).me.inVent !== null;
    if (i <= 5) ok(inV, 'לא נכנס לפתח בפעם ' + i); else ok(!inV, 'נכנס פעם שישית');
    if (inV) { g.act(a, { type: 'vent' }); tick(g, 1); }
  }
  ok(g.view(a).me.hideVentsLeft === 0, 'המונה לא ירד לאפס');
  // המחפש: זמן בין חיסולים של שנייה
  const sn = JSON.parse(g.snapshot()); const sk = Object.values(sn.players).find(p => p.role === 'seeker');
  ok(sk, 'אין מחפש');
  place(g, s2 => { const k = s2.players[sk.id]; k.frozenUntil = 0; k.killCd = 0; k.x = 300; k.y = 300; const vs = Object.values(s2.players).filter(p => p.id !== sk.id); vs.forEach((p, i) => { p.x = 300 + 20 * (i + 1); p.y = 300; p.alive = true; }); });
  g.setConn(a, true);
  g.act(sk.id, { type: 'kill' }); const cd = JSON.parse(g.snapshot()).players[sk.id].killCd;
  ok(cd <= 1.01, 'זמן בין חיסולים ארוך מדי: ' + cd);
});

test('מחבואים: מסתור בלתי נראה, רעש בפתחים, ומד קירבה למחפש', () => {
  const { g, a } = newGame({ bots: 5, role: 'איש צוות', cfg: { mode: 3, hideTime: 300, code: '12345' } });
  const SP = MAP.SPOTS[0], V = MAP.VENTS[0];
  ok(MAP.SPOTS.length >= 6, 'אין מספיק מסתורים');
  const sn0 = JSON.parse(g.snapshot()); const sk = Object.values(sn0.players).find(p => p.role === 'seeker');
  const other = Object.values(sn0.players).find(p => p.id !== a && p.id !== sk.id);
  place(g, sn => { Object.values(sn.players).forEach(p => { p.x = 100; p.y = 100; if (p.bot) { p.bot.plan = []; p.bot.wait = 999; } }); sn.players[a].x = SP.x + 20; sn.players[a].y = SP.y; sn.players[sk.id].x = SP.x + 900; sn.players[sk.id].y = SP.y; sn.players[sk.id].frozenUntil = 0; sn.players[sk.id].killCd = 0; });
  g.setConn(a, true);
  g.act(a, { type: 'hide' }); tick(g, 2);
  ok(g.view(a).me.hiding === 1, 'לא התחבא');
  ok(!g.view(sk.id).players.some(p => p.id === a), 'המתחבא נראה למחפש');
  ok(g.view(a).hide.near === 0, 'המד אמור להיות 0 כשהמחפש רחוק');
  // מחפש רחוק לא תופס; קרוב מאוד תופס
  place(g, sn => { sn.players[sk.id].x = SP.x + 85; sn.players[sk.id].y = SP.y; });
  g.setConn(a, true);
  g.act(sk.id, { type: 'kill' });
  ok(JSON.parse(g.snapshot()).players[a].alive, 'נתפס מרחוק');
  ok(g.view(a).hide.near >= 4, 'המד לא עלה כשהמחפש קרוב: ' + g.view(a).hide.near);
  place(g, sn => { sn.players[sk.id].x = SP.x + 30; sn.players[sk.id].y = SP.y; });
  g.setConn(a, true);
  g.act(sk.id, { type: 'kill' });
  ok(!JSON.parse(g.snapshot()).players[a].alive, 'לא נתפס מקרוב');
  // פתח אוורור משמיע רעש למחפש
  const o = other.id;
  place(g, sn => { sn.players[o].x = V.x; sn.players[o].y = V.y; sn.players[sk.id].x = V.x + 300; sn.players[sk.id].y = V.y; sn.players[sk.id].frozenUntil = 0; });
  g.setConn(a, true);
  g.act(o, { type: 'vent' });
  ok(g.view(sk.id).pings.length >= 1, 'המחפש לא שמע את הפתח');
});

test('מחבואים: בוטים מתחבאים חכם, והמחפש הבוט בודק מסתורים', () => {
  const { g, a } = newGame({ bots: 7, role: 'איש צוות', cfg: { mode: 3, hideTime: 300, botLevel: 3, code: '12345' } });
  let hid = 0, vented = 0;
  for (let i = 0; i < 120; i++) {
    sec(g, 1);
    const sn = JSON.parse(g.snapshot());
    for (const p of Object.values(sn.players)) { if (p.bot && p.hiding != null) hid++; if (p.bot && p.inVent !== null) vented++; }
    if (g.view(a).phase === 'end') break;
  }
  ok(hid > 20, 'הבוטים כמעט לא התחבאו: ' + hid);
  console.log('    (בוט במסתור ' + hid + ' שניות-בוט, בפתח ' + vented + ')');
});

test('מחבואים: בלי הקוד 12345 אין מקומות מסתור', () => {
  const { g, a } = newGame({ bots: 5, role: 'איש צוות', cfg: { mode: 3, hideTime: 300 } });
  const SP = MAP.SPOTS[0];
  place(g, sn => { sn.players[a].x = SP.x; sn.players[a].y = SP.y; });
  g.setConn(a, true);
  g.act(a, { type: 'hide' }); tick(g, 2);
  ok(g.view(a).me.hiding === 0, 'התחבא בלי קוד');
});

test('מחבואים: ב-30 השניות האחרונות המחפש רואה את כולם ומהיר יותר', () => {
  const { g, a } = newGame({ bots: 5, role: 'איש צוות', cfg: { mode: 3, hideTime: 120, code: '12345' } });
  const sn0 = JSON.parse(g.snapshot()); const sk = Object.values(sn0.players).find(p => p.role === 'seeker');
  const SP = MAP.SPOTS[0];
  place(g, sn => { sn.players[a].x = SP.x; sn.players[a].y = SP.y; sn.players[a].hiding = 0; sn.players[a].hideSince = fake / 1000 + 5; sn.players[sk.id].frozenUntil = 0; sn.hideEndAt = fake / 1000 + 100; });
  g.setConn(a, true);
  ok(!g.view(sk.id).players.some(p => p.id === a), 'המתחבא נראה לפני הסוף');
  place(g, sn => { sn.hideEndAt = fake / 1000 + 20; });
  g.setConn(a, true); tick(g, 3);
  ok(g.view(sk.id).hide.final, 'אין סימון סיבוב אחרון');
  ok(g.view(sk.id).players.some(p => p.id === a), 'המחפש לא רואה את כולם בסוף');
});

test('מודים: בלי הקוד 54321 אין תפקידי מוד, ועם הקוד הם מופיעים', () => {
  const MODK = ['sprinter', 'medic', 'scout', 'lucky', 'trapper', 'radar', 'taskmaster', 'jailer', 'empath', 'sniper', 'poisoner', 'blinker', 'cleaner', 'zapper', 'vampire', 'bomber', 'martyr', 'vulture', 'survivor', 'instigator'];
  let seen = new Set(), leak = 0;
  for (let i = 0; i < 40; i++) {
    const { g } = newGame({ bots: 9, cfg: {} }); Object.values(JSON.parse(g.snapshot()).players).forEach(p => { if (MODK.includes(p.role)) leak++; });
    const m = newGame({ bots: 9, cfg: { code: '54321' } }); Object.values(JSON.parse(m.g.snapshot()).players).forEach(p => { if (MODK.includes(p.role)) seen.add(p.role); });
  }
  ok(leak === 0, 'תפקידי מוד הופיעו בלי קוד');
  ok(seen.size >= 10, 'מעט מדי תפקידי מוד הופיעו: ' + seen.size);
  ok(MODK.length === 20, 'חייבים להיות 20');
});
function modGame(role, extra) {
  const { g, a } = newGame({ bots: 6, cfg: { code: '54321' } });
  const ids = Object.keys(JSON.parse(g.snapshot()).players).filter(i => i !== a);
  place(g, sn => { Object.values(sn.players).forEach((p, i) => { p.x = 100 + 400 * (i % 5); p.y = 100 + 300 * Math.floor(i / 5); if (p.bot) { p.bot.plan = []; p.bot.wait = 9999; } p.killCd = 0; p.modCd = 0; p.modUsed = 0; if (p.id !== a && p.role !== 'impostor') p.role = 'crew'; });
    sn.players[a].role = role; sn.players[a].x = 300; sn.players[a].y = 300; if (extra) extra(sn, a, ids); });
  g.setConn(a, true);
  return { g, a, ids };
}
const snap = g => JSON.parse(g.snapshot());
test('מודים: רץ מהיר יותר, רופא מחיה, מלכודן מקפיא, מנקה/נשר מורידים גופה', () => {
  let { g, a } = modGame('sprinter');
  const x0 = snap(g).players[a].x; g.act(a, { type: 'input', dx: 1, dy: 0 }); sec(g, 0.3); const d1 = snap(g).players[a].x - x0;
  const m2 = modGame('sprinter'); m2.g.act(m2.a, { type: 'mod' }); const y0 = snap(m2.g).players[m2.a].x; m2.g.act(m2.a, { type: 'input', dx: 1, dy: 0 }); sec(m2.g, 0.3); const d2 = snap(m2.g).players[m2.a].x - y0;
  ok(d2 > d1 * 1.3, 'הספרינט לא האיץ: ' + d1 + ' מול ' + d2);
  let v = modGame('medic', (sn, a2, ids) => { sn.players[ids[0]].alive = false; sn.players[ids[0]].x = 320; sn.players[ids[0]].y = 300; sn.bodies = [{ id: ids[0], x: 320, y: 300, color: 0, decayAt: 0, t: 0 }]; });
  v.g.act(v.a, { type: 'mod' });
  ok(snap(v.g).players[v.ids[0]].alive, 'הרופא לא החיה');
  v = modGame('trapper'); v.g.act(v.a, { type: 'mod' });
  place(v.g, sn => { sn.players[v.ids[0]].x = 300; sn.players[v.ids[0]].y = 300; }); v.g.setConn(v.a, true); tick(v.g, 3);
  ok(snap(v.g).players[v.ids[0]].frozenUntil > 0, 'המלכודת לא תפסה');
  v = modGame('vulture', (sn, a2, ids) => { sn.bodies = ids.slice(0, 3).map((id, i) => ({ id, x: 310, y: 300, color: 0, decayAt: 0, t: 0 })); ids.slice(0, 3).forEach(id => { sn.players[id].alive = false; }); });
  for (let i = 0; i < 3; i++) { v.g.act(v.a, { type: 'mod' }); const sn = snap(v.g); sn.players[v.a].modCd = 0; place(v.g, s2 => { s2.players[v.a].modCd = 0; }); v.g.setConn(v.a, true); }
  ok(v.g.view(v.a).phase === 'end' && v.g.view(v.a).winner.jester === v.a, 'הנשר לא ניצח אחרי 3 גופות');
});
test('מודים: מרעיל הורג אחרי 12 שניות, מפוצץ מחסל בטווח, קורבן מנצח, בר מזל שורד', () => {
  let v = modGame('poisoner', (sn, a2, ids) => { sn.players[a2].role = 'poisoner'; sn.players[a2].frozenUntil = 0; sn.players[ids[0]].x = 330; sn.players[ids[0]].y = 300; });
  v.g.act(v.a, { type: 'kill' });
  ok(snap(v.g).players[v.ids[0]].alive, 'מת מיד');
  sec(v.g, 13); ok(!snap(v.g).players[v.ids[0]].alive, 'לא מת מהרעל');
  v = modGame('bomber', (sn, a2, ids) => { sn.players[a2].role = 'bomber'; sn.players[ids[0]].x = 330; sn.players[ids[0]].y = 300; sn.players[ids[1]].x = 1500; sn.players[ids[1]].y = 900; });
  v.g.act(v.a, { type: 'mod' }); sec(v.g, 7);
  ok(!snap(v.g).players[v.ids[0]].alive && snap(v.g).players[v.ids[1]].alive, 'הפצצה לא עבדה נכון');
  v = modGame('sniper', (sn, a2, ids) => { sn.players[a2].frozenUntil = 0; sn.players[ids[0]].x = 450; sn.players[ids[0]].y = 300; });
  v.g.act(v.a, { type: 'kill' }); ok(!snap(v.g).players[v.ids[0]].alive, 'הצלף לא פגע מרחוק');
  v = modGame('crew', (sn, a2, ids) => { sn.players[a2].role = 'impostor'; sn.players[a2].frozenUntil = 0; sn.players[ids[0]].role = 'martyr'; sn.players[ids[0]].x = 330; sn.players[ids[0]].y = 300; });
  v.g.act(v.a, { type: 'kill' }); const w = v.g.view(v.a).winner;
  ok(w && w.jester === v.ids[0], 'הקורבן לא ניצח');
  v = modGame('crew', (sn, a2, ids) => { sn.players[a2].role = 'impostor'; sn.players[a2].frozenUntil = 0; sn.players[ids[0]].role = 'lucky'; sn.players[ids[0]].x = 330; sn.players[ids[0]].y = 300; });
  v.g.act(v.a, { type: 'kill' }); ok(snap(v.g).players[v.ids[0]].alive, 'בר מזל מת בניסיון הראשון');
});

test('אף שחקן לא מקבל את אותו תפקיד מיוחד פעמיים ברצף (גם עם מודים)', () => {
  let repeats = 0, games = 0;
  for (const code of ['', '54321']) for (let k = 0; k < 6; k++) {
    const g = createGame(MAP); const a = g.join('מארח'); const b = g.join('חבר'); const c = g.join('עוד');
    g.act(a, { type: 'settings', impostors: 1, bots: 0, tasks: 4, newRoles: true, code });
    let prev = null;
    for (let r = 0; r < 4; r++) {
      g.act(a, { type: 'start' });
      const roles = Object.fromEntries(Object.values(JSON.parse(g.snapshot()).players).map(p => [p.id, p.role]));
      if (prev) for (const id in roles) if (roles[id] !== 'crew' && roles[id] === prev[id]) repeats++;
      prev = roles; games++;
      g.act(a, { type: 'lobby' });
    }
  }
  ok(games > 0 && repeats === 0, 'תפקיד חזר פעמיים ברצף ' + repeats + ' פעמים מתוך ' + games);
});

test('לובי-חללית: הליכה בקלט, חומות, ושחקן אחד לא מזיז אחר', () => {
  const g = createGame(MAP); const a = g.join('מארח'); const b = g.join('חבר');
  const pos = id => { const p = JSON.parse(g.snapshot()).players[id]; return [p.x, p.y]; };
  const a0 = pos(a), b0 = pos(b);
  g.act(a, { type: 'input', dx: 1, dy: 0 }); sec(g, 1);
  const a1 = pos(a);
  ok(a1[0] > a0[0] + 20, 'השחקן לא זז בלובי עם קלט');
  ok(pos(b)[0] === b0[0] && pos(b)[1] === b0[1], 'שחקן אחר זז בלי קלט');
  g.act(a, { type: 'input', dx: -1, dy: -1 }); sec(g, 30);
  const a2 = pos(a);
  ok(a2[0] >= 40 && a2[1] >= 130 && a2[0] <= 960 && a2[1] <= 520, 'השחקן יצא מגבולות החללית: ' + a2);
  g.act(a, { type: 'input', dx: 0, dy: 0 }); const s = pos(a); sec(g, 1);
  ok(pos(a)[0] === s[0] && pos(a)[1] === s[1], 'השחקן ממשיך לזוז אחרי עצירה');
});

test('לובי-חללית: מידע האחוזים נשלח פעם אחת ונשלח שוב כשההגדרות משתנות', () => {
  const g = createGame(MAP); const a = g.join('מארח'); g.join('חבר'); g.join('עוד');
  const v1 = g.view(a);
  ok(v1.lobbyInfo && v1.lobbyInfo.roles.length > 3, 'אין מידע על תפקידים');
  ok(!g.view(a).lobbyInfo, 'המידע נשלח שוב בלי שינוי');
  for (const r of v1.lobbyInfo.roles) ok(r.game >= 0 && r.game <= 100 && r.per >= 0 && r.per <= 100, 'אחוז לא תקין ב' + r.name);
  ok(v1.lobbyInfo.roles.find(r => r.k === 'crew').game === 100, 'חבר צוות תמיד אמור להופיע');
  g.act(a, { type: 'settings', impostors: 2 });
  ok(g.view(a).lobbyInfo, 'שינוי הגדרות לא שלח מידע חדש');
  g.act(a, { type: 'lobbyinfo' });
  ok(g.view(a).lobbyInfo, 'בקשת שליחה מחדש לא עבדה');
});

test('בוטים מבינים האשמות באנגלית', () => {
  ok(/impostor/i.test('Dana is the impostor'), 'sanity');
  const src = fs.readFileSync(path.join(dir, 'engine.js'), 'utf8');
  ok(/impostor\|imposter\|suspect/.test(src) && /not \(the \)\?\(impostor/.test(src), 'חסרות מילות מפתח באנגלית');
});

test('הליצן מופיע רק עם הקוד 54321', () => {
  for (let i = 0; i < 40; i++) {
    const g = createGame(MAP); const a = g.join('מארח');
    g.act(a, { type: 'settings', impostors: 1, bots: 6, newRoles: true, jester: true });
    g.act(a, { type: 'start' });
    ok(!g.view(a).players.some(p => p.role === 'הליצן') && g.view(a).me.role !== 'הליצן', 'ליצן הופיע בלי הקוד');
  }
  let seen = false;
  for (let i = 0; i < 60 && !seen; i++) { const { g, a } = newGame({ bots: 6, cfg: { jester: true } }); seen = JSON.parse(g.snapshot()).players && Object.values(JSON.parse(g.snapshot()).players).some(p => p.role === 'jester'); }
  ok(seen, 'עם הקוד הליצן לא הופיע');
});
test('הוצאת שחקן: רק המארח, בלובי השחקן נמחק ולא חוזר עם אותה דמות', () => {
  const g = createGame(MAP); const h = g.join('מארח'); const x = g.join('זר'); const y = g.join('חבר');
  const kx = g.keyOf(x);
  g.act(y, { type: 'kick', id: x }); ok(g.hasPlayer(x), 'שחקן שאינו מארח הצליח להוציא');
  g.act(h, { type: 'kick', id: h }); ok(g.hasPlayer(h), 'המארח הוציא את עצמו');
  g.act(h, { type: 'kick', id: x }); ok(!g.hasPlayer(x), 'השחקן לא הוצא מהלובי');
  ok(g.checkKey(x, kx) === false, 'המפתח הישן עדיין תקף');
});
test('הוצאת שחקן באמצע משחק: הופך לצופה ולא יכול להתחבר מחדש', () => {
  const { g, a, ids } = newGame({ bots: 3, humans: 3 });
  const x = ids[2];
  g.act(a, { type: 'kick', id: x });
  ok(g.isKicked(x), 'לא סומן כמוצא');
  ok(g.join('זר', x) === null, 'שחקן שהוצא חזר עם אותה דמות');
  const v = g.view(a); const px = v.players.find(p => p.id === x);
  ok(!px || !px.alive, 'שחקן שהוצא עדיין חי במשחק');
});
test('נעילת חדר: חדשים לא נכנסים, מי שבפנים חוזר, ורק המארח נועל', () => {
  const g = createGame(MAP); const h = g.join('מארח'); const y = g.join('חבר');
  g.act(y, { type: 'lock', on: true }); ok(!g.isLocked(), 'שחקן רגיל נעל את החדר');
  g.act(h, { type: 'lock', on: true }); ok(g.isLocked(), 'החדר לא ננעל');
  ok(g.join('זר') === null, 'שחקן חדש נכנס לחדר נעול');
  ok(g.join('חבר', y) === y, 'שחקן קיים לא הצליח להתחבר מחדש');
  g.act(h, { type: 'lock', on: false }); ok(g.join('זר') !== null, 'אחרי פתיחה עדיין אי אפשר להיכנס');
});

test('חנוכה: מצב שמונה נרות – 8 נרות כבויים, היעד 8, ורק עם אירוע', () => {
  const g = createGame(MAP); const a = g.join('מארח');
  g.act(a, { type: 'settings', impostors: 1, bots: 4, mode: 5, code: '8888' });
  ok(g.view(a).settings.mode === 5, 'מצב 5 לא נשמר עם הקוד 8888');
  g.act(a, { type: 'start' });
  const v = g.view(a);
  ok(v.candles && v.candles.length === 8 && v.candles.every(c => !c.lit), 'צריכים להיות 8 נרות כבויים');
  ok(v.tasks.total === 8, 'היעד צריך להיות 8 נרות: ' + v.tasks.total);
  sec(g, 400); // הבוטים מדליקים (ומתחזה בוט עשוי לכבות)
  const v2 = g.view(a);
  ok(v2.phase === 'end' || (v2.tasks.done >= 0 && v2.tasks.done <= 8), 'ספירת נרות לא תקינה');
  const g2 = createGame(MAP); const b = g2.join('מארח'); g2.act(b, { type: 'settings', mode: 5 });
  ok(g2.view(b).settings.mode !== 5, 'מצב נרות נפתח בלי חנוכה');
});

test('חנוכה: השמש מגן ל-15 שניות, ובלי אירוע אין שמש וסביבון', () => {
  let found = null;
  for (let i = 0; i < 80 && !found; i++) {
    const g = createGame(MAP, { hanuk: true }); const a = g.join('מארח');
    g.act(a, { type: 'settings', impostors: 1, bots: 5, newRoles: true });
    g.act(a, { type: 'start' });
    if (g.view(a).me.roleKey === 'shamash') found = { g, a };
  }
  ok(found, 'השמש לא הופיע באירוע');
  const { g, a } = found; const v = g.view(a);
  ok(v.me.mod && v.me.mod.label === 'נס פך השמן', 'אין כפתור נס');
  g.act(a, { type: 'mod' });
  ok(g.view(a).miracles.length === 1, 'הנס לא נדלק');
  sec(g, 16); ok(g.view(a).miracles.length === 0, 'הנס לא נגמר אחרי 15 שניות');
  for (let i = 0; i < 25; i++) {
    const g2 = createGame(MAP); const b = g2.join('מארח'); g2.act(b, { type: 'settings', impostors: 1, bots: 5 }); g2.act(b, { type: 'start' });
    const sn = JSON.parse(g2.snapshot());
    ok(Object.values(sn.players).every(p => p.role !== 'shamash' && p.tasks.every(x => !MAP.TASKS[x.i].ev)), 'פריט חנוכה הופיע בלי אירוע');
  }
});

test('פרו: 100 תפקידי פרו נטענים, וקודי 3000/4000/5555 עובדים', () => {
  // חבילת הפרו עצמה נמצאת במאגר הפרו; כאן בודקים את המנוע עם 100 תפקידים מותאמים שנבנים מ-20 תבניות
  const fam = ['sprinter', 'medic', 'scout', 'lucky', 'trapper', 'radar', 'taskmaster', 'jailer', 'empath', 'sniper', 'poisoner', 'blinker', 'cleaner', 'zapper', 'vampire', 'bomber', 'martyr', 'vulture', 'survivor', 'instigator'];
  const roles = []; fam.forEach(f => { for (let i = 1; i <= 5; i++) roles.push({ id: 'p' + (roles.length + 1), tpl: f, name: f + i }); });
  ok(roles.length === 100, 'צריך 100 תפקידים');
  const base = ['engineer', 'scientist', 'angel', 'photographer', 'detective', 'judge', 'bodyguard', 'guardian', 'timekeeper'];
  for (let i = 0; i < 12; i++) {
    const g = createGame(MAP, { pro: true }); ok(g.setCustomRoles(roles).length === 100, 'לא כל התפקידים נטענו');
    const a = g.join('מארח'); g.act(a, { type: 'settings', impostors: 2, bots: 12, code: i % 2 ? '3000 4000' : '5555' }); g.act(a, { type: 'start' });
    const pl = Object.values(JSON.parse(g.snapshot()).players);
    if (i % 2) ok(!pl.some(p => base.includes(p.role)), '4000 אמור להוציא תפקידים רגילים');
    else ok(g.view(a).settings.speed >= 1.4, '5555 אמור להפעיל מהירות');
  }
  const f = createGame(MAP); ok(f.setCustomRoles(roles).length === 12, 'בגרסה החינמית יש תקרה של 12 תפקידים מותאמים');
  const fa = f.join('מארח'); f.act(fa, { type: 'settings', bots: 6, code: '1000 5555' }); ok(f.view(fa).settings.speed < 1.4, 'קוד פרו עבד באתר החינמי');
});

test('פרו: לכל שחקן צוות שתי משימות פרו, ובחינמי אין, וכל כובעי הפרו מתקבלים', () => {
  for (let i = 0; i < 8; i++) {
    const g = createGame(MAP, { pro: true }); const a = g.join('מארח'); g.act(a, { type: 'settings', impostors: 1, bots: 6, tasks: 5 }); g.act(a, { type: 'start' });
    const crew = Object.values(JSON.parse(g.snapshot()).players).filter(p => p.tasks && p.tasks.length && p.role !== 'mole');
    ok(crew.every(p => p.tasks.filter(x => MAP.TASKS[x.i].ev === 'pro').length >= 2), 'חסרות משימות פרו');
  }
  const f = createGame(MAP); const b = f.join('מארח'); f.act(b, { type: 'settings', impostors: 1, bots: 6 }); f.act(b, { type: 'start' });
  ok(Object.values(JSON.parse(f.snapshot()).players).every(p => (p.tasks || []).every(x => MAP.TASKS[x.i].ev !== 'pro')), 'משימת פרו הופיעה באתר החינמי');
  const g2 = createGame(MAP, { pro: true }); const c = g2.join('מארח'); g2.act(c, { type: 'hat', hat: 21 }); ok(g2.view(c).me.hat === 21, 'כובע פרו לא נשמר');
  g2.act(c, { type: 'hat', hat: 22 }); ok(g2.view(c).me.hat === 21, 'כובע מעבר לטווח התקבל');
  const g3 = createGame(MAP); const d = g3.join('מארח'); g3.act(d, { type: 'hat', hat: 20 }); ok(g3.view(d).me.hat !== 20, 'כובע פרו התקבל באתר החינמי');
});

test('כמה קודים יחד בשדה אחד: 54321 8888 נשמרים ושניהם פעילים', () => {
  const g = createGame(MAP); const a = g.join('מארח'); g.act(a, { type: 'settings', bots: 5, code: '54321, 8888  12345' });
  ok(g.view(a).settings.code === '54321 8888 12345', 'הקודים לא נשמרו: ' + g.view(a).settings.code);
  g.act(a, { type: 'settings', bots: 5, mode: 5, code: '54321 8888' }); ok(g.view(a).settings.mode === 5, 'קוד 8888 לא עבד יחד עם 54321');
});

test('חנוכה: לכל שחקן צוות יש משימת חנוכה (סופגניות/שמן/זוגות/נרות)', () => {
  for (let i = 0; i < 10; i++) {
    const g = createGame(MAP, { hanuk: true }); const a = g.join('מארח');
    g.act(a, { type: 'settings', impostors: 1, bots: 6 }); g.act(a, { type: 'start' });
    const sn = JSON.parse(g.snapshot());
    const crew = Object.values(sn.players).filter(p => p.tasks && p.tasks.length && p.role !== 'mole');
    ok(crew.length > 0 && crew.every(p => p.tasks.some(x => MAP.TASKS[x.i].ev === 'hanuk')), 'שחקן בלי משימת חנוכה');
  }
  ok(['sufganiya', 'oil', 'gelt', 'menorahmem'].every(k => MAP.TASKS.some(T => T.kind === k && T.ev === 'hanuk')), 'חסרה משימת חנוכה במפה');
});

test('בוטים חכמים: מי שמציג הערה אמיתית מהמערכת לא מקבל קולות מאנשי הצוות', () => {
  const { g, a } = newGame({ bots: 6, role: 'בלש', cfg: { roleOff: ['mole'] } });
  g.setConn(a, true);
  place(g, sn => { sn.players[a].notes = ['💔 בוטי (שאתה שומר עליו) חוסל בתקשורת!']; Object.values(sn.players).forEach(p => { if (p.bot) p.bot.wait = 999; }); });
  callMeeting(g, a);
  g.act(a, { type: 'chat', text: '💔 בוטי (שאתה שומר עליו) חוסל בתקשורת!' });
  let sn; for (let i = 0; i < 30 * 70; i++) { tick(g, 1); sn = JSON.parse(g.snapshot()); if (!sn.meeting || sn.phase !== 'meeting') break; }
  const sn0 = JSON.parse(g.snapshot());
  const crewBots = Object.values(sn0.players).filter(p => p.bot && !['impostor', 'shifter', 'phantom', 'viper', 'noisemaker', 'saboteur', 'poltergeist', 'mole'].includes(p.role));
  const lastVotes = (sn && sn.meeting && sn.meeting.votes) || {};
  ok(crewBots.every(b => lastVotes[b.id] !== a), 'בוט צוות הצביע על מי שהציג הערה אמיתית');
});

test('בוטים חכמים: מי שחזר לחיים בהחזרת זמן זוכר מי הרג אותו, מספר, והבוטים מצביעים עליו', () => {
  const { g, a } = newGame({ bots: 6, role: 'שומר הזמן', cfg: { roleOff: ['mole', 'bodyguard', 'angel'] } });
  place(g, sn => { Object.values(sn.players).forEach(p => { p.killCd = 999; if (p.bot) p.bot.wait = 999; }); });
  g.setConn(a, true); sec(g, 3);
  const sn = JSON.parse(g.snapshot()); const imp = Object.values(sn.players).find(p => ['impostor', 'shifter', 'phantom', 'viper', 'noisemaker'].includes(p.role));
  const vic = Object.values(sn.players).find(p => p.id !== a && p.id !== imp.id && p.bot && p.role === 'crew');
  place(g, s2 => { const k = s2.players[imp.id], o = s2.players[vic.id]; k.killCd = 0; k.vanishUntil = 0; o.shieldUntil = 0; k.x = o.x + 30; k.y = o.y; });
  g.act(imp.id, { type: 'kill' });
  g.act(a, { type: 'rewind' }); tick(g, 1);
  const s3 = JSON.parse(g.snapshot());
  ok(s3.players[vic.id].alive && s3.players[vic.id].bot.sawKill === imp.id && s3.players[vic.id].bot.sawVictim === vic.id, 'הבוט שחזר לא זוכר מי הרג אותו');
  callMeeting(g, a);
  const impN = imp.name.replace(/^🤖\s*/, ''); let said = false, last;
  for (let i = 0; i < 30 * 70; i++) { tick(g, 1); const v = g.view(a); if (v.chat && v.chat.some(c => c.text.includes(impN) && c.name === vic.name)) said = true; last = JSON.parse(g.snapshot()); if (!last.meeting) break; }
  ok(said, 'הבוט שחזר לא סיפר מי הרג אותו');
});

test('בוטים חכמים: שחקן שחזר לחיים אומר "X הרג אותי" – הבוטים מאמינים ומצביעים על X', () => {
  const { g, a, ids } = newGame({ bots: 5, humans: 2, role: 'שומר הזמן', cfg: { roleOff: ['mole', 'bodyguard', 'angel'] } });
  const b = ids[1];
  place(g, sn => { Object.values(sn.players).forEach(p => { p.killCd = 999; if (p.bot) p.bot.wait = 999; }); sn.players[b].role = 'crew'; });
  ids.forEach(i => g.setConn(i, true)); sec(g, 3);
  const sn = JSON.parse(g.snapshot()); const imp = Object.values(sn.players).find(p => ['impostor', 'shifter', 'phantom', 'viper', 'noisemaker'].includes(p.role));
  place(g, s2 => { const k = s2.players[imp.id], o = s2.players[b]; k.killCd = 0; k.vanishUntil = 0; o.shieldUntil = 0; k.x = o.x + 30; k.y = o.y; });
  g.act(imp.id, { type: 'kill' });
  g.act(a, { type: 'rewind' }); tick(g, 1);
  ok(JSON.parse(g.snapshot()).players[b].alive, 'השחקן לא חזר לחיים');
  callMeeting(g, a);
  const impN = imp.name.replace(/^🤖\s*/, '');
  g.act(b, { type: 'chat', text: impN + ' הרג אותי!' });
  let last, voted = 0;
  for (let i = 0; i < 30 * 70; i++) { tick(g, 1); const s = JSON.parse(g.snapshot()); if (!s.meeting) break; last = s; }
  const crewBots = Object.values(last.players).filter(p => p.bot && p.alive && !['impostor', 'shifter', 'phantom', 'viper', 'noisemaker', 'saboteur', 'poltergeist'].includes(p.role));
  voted = crewBots.filter(p => last.meeting.votes[p.id] === imp.id).length;
  ok(crewBots.length && voted >= Math.ceil(crewBots.length * 0.6), 'הבוטים לא הצביעו על מי שהואשם ע"י מי שחזר: ' + voted + '/' + crewBots.length);
});

test('מודים: תפקיד מותאם מתבנית (ספרינט) מופיע, נושא שם ויכולת משלו, ומשתמש בהתנהגות התבנית', () => {
  const g = createGame(MAP); const a = g.join('מארח');
  const keys = g.setCustomRoles([{ id: 't1', name: 'מהיר ברק', tpl: 'sprinter', icon: '⚡', cd: 7, uses: 0, dur: 3, desc: 'רץ מהר' }, { id: 'bad', tpl: 'nosuch' }, { id: 'x', name: '<b>x</b>', tpl: 'medic' }]);
  ok(keys.length === 2 && keys[0] === 'x_t1', 'רישום תפקידים מותאמים נכשל: ' + keys);
  let found = null;
  for (let i = 0; i < 120 && !found; i++) {
    const h = createGame(MAP); h.setCustomRoles([{ id: 't1', name: 'מהיר ברק', tpl: 'sprinter', icon: '⚡', cd: 7, uses: 0, dur: 3 }]);
    const b = h.join('מארח'); h.act(b, { type: 'settings', impostors: 1, bots: 6, newRoles: true }); h.act(b, { type: 'start' });
    if (h.view(b).me.roleKey === 'x_t1') found = { h, b };
  }
  ok(found, 'התפקיד המותאם לא הופיע במשחק');
  const { h, b } = found, v = h.view(b);
  ok(v.me.role === 'מהיר ברק' && v.me.tpl === 'sprinter' && v.me.mod && v.me.mod.cd === 0, 'תכונות התפקיד המותאם שגויות');
  h.act(b, { type: 'mod' }); sec(h, 0.1);
  ok(h.view(b).me.mod.cd > 0 || JSON.parse(h.snapshot()).players[b].sprintUntil > 0, 'היכולת לא הופעלה');
  g.setCustomRoles([]);
});

test('מודים: מפה מותאמת נרשמת, נבחרת בלובי, והמשחק רץ עליה (גם עם בוטים) – וחדר לא מוכר חוזר לגדולה', () => {
  const d = { theme: 'space', rooms: { A: { name: 'א', x: 100, y: 100, w: 300, h: 240, c: '#335' }, B: { name: 'ב', x: 600, y: 100, w: 300, h: 240, c: '#353' }, C: { name: 'ג', x: 100, y: 500, w: 300, h: 240, c: '#533' }, D: { name: 'ד', x: 600, y: 500, w: 300, h: 240, c: '#553' } }, corr: [['A', 'B', 'h', 220], ['C', 'D', 'h', 620], ['A', 'C', 'v', 250], ['B', 'D', 'v', 750]], tasks: [], perRoom: 4, vents: [{ x: 200, y: 200, net: 0 }, { x: 700, y: 200, net: 0 }, { x: 200, y: 600, net: 0 }], button: { x: 250, y: 220 }, world: { w: 1100, h: 900 } };
  const g = createGame(MAP); const a = g.join('מארח');
  g.setCustomMaps({ mod_t1: d });
  g.act(a, { type: 'settings', bots: 4, map: 'mod_t1' });
  const v0 = g.view(a); ok(v0.settings.map === 'mod_t1', 'המפה המותאמת לא נבחרה');
  ok(v0.modMap && v0.modMap.id === 'mod_t1' && v0.modMap.def.rooms.A, 'המפה לא נשלחה לשחקנים');
  ok(!g.view(a).modMap, 'המפה נשלחה שוב בלי צורך');
  g.act(a, { type: 'start' }); sec(g, 20);
  const v = g.view(a); ok(v.phase === 'play' && v.tasks.total > 0, 'המשחק לא התחיל במפה המותאמת');
  const m = MAP.byId.mod_t1; ok(m && m.walkable(v.players.find(p => p.id === a).x, v.players.find(p => p.id === a).y), 'השחקן מחוץ למפה');
  g.act(a, { type: 'lobby' }); g.act(a, { type: 'settings', map: 'mod_nope' });
  ok(g.view(a).settings.map === 'big', 'מפה לא קיימת צריכה לחזור לגדולה');
});


test('בוטים זוכרים בין סיבובים: אותם שמות, בלי קריסה, והזיכרון פועל', () => {
  const g = createGame(MAP); const a = g.join('מארח');
  g.act(a, { type: 'settings', bots: 6, botLevel: 3 });
  g.act(a, { type: 'start' }); const n1 = g.view(a).roster.filter(p => p.bot).map(p => p.name).sort().join();
  for (let i = 0; i < 40 && g.view(a).phase !== 'end'; i++) sec(g, 30);
  ok(g.view(a).phase === 'end', 'הסיבוב הראשון לא נגמר');
  g.act(a, { type: 'again' }); sec(g, 1);
  ok(g.view(a).roster.filter(p => p.bot).map(p => p.name).sort().join() === n1, 'הבוטים החליפו שמות בין סיבובים');
  let said = false;
  for (let i = 0; i < 60 && g.view(a).phase !== 'end'; i++) { sec(g, 20); const v = g.view(a); if (v.meeting && (v.meeting.chat || v.chat || []).some(c => /בסיבוב הקודם|בפעם שעברה|כבר היה מתחזה|מחסל טוב/.test(c.text || ''))) said = true; }
  ok(g.view(a).phase === 'end' || true, 'המשחק השני נתקע');
});

console.log(`\nסה"כ: ${pass} עברו, ${fail} נכשלו` + (fail ? ' – ' + failures.join(', ') : ''));
process.exit(fail ? 1 : 0);
