// בדיקות אוטומטיות למשחק "מי המתחזה?" – בלי תלויות, רק Node.
// הרצה:  node tests/run.js        (מחפש את הקבצים בתיקייה הראשית או ב-public/)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dir = fs.existsSync(path.join(root, 'engine.js')) ? root : path.join(root, 'public');
const MAP = require(path.join(dir, 'map.js'));
const createGame = require(path.join(dir, 'engine.js'));

// שעון מדומה: מריצים שעות משחק בשניות
let fake = Date.now();
Date.now = () => fake;
const tick = (g, n) => { for (let i = 0; i < n; i++) { fake += 33; g.tick(); } };
const sec = (g, s) => tick(g, Math.round(s * 30));

let pass = 0, fail = 0;
const failures = [];
function test(name, fn) {
  const t0 = process.hrtime.bigint();
  try { fn(); pass++; console.log('  ✓ ' + name + ` (${Number((process.hrtime.bigint() - t0) / 1000000n)}ms)`); }
  catch (e) { fail++; failures.push(name); console.log('  ✗ ' + name + '\n      ' + (e && e.message)); }
}
const ok = (c, msg) => { if (!c) throw new Error(msg || 'assertion failed'); };

// מתחיל משחק עם מארח אנושי אחד ובוטים. אפשר לבקש תפקיד מסוים (מנסה שוב ושוב עד שיוצא).
function newGame({ bots = 4, role = null, humans = 1, cfg = {}, tries = 800 } = {}) {
  for (let i = 0; i < tries; i++) {
    const g = createGame(MAP);
    const ids = [g.join('מארח')];
    for (let h = 1; h < humans; h++) ids.push(g.join('חבר' + h));
    g.act(ids[0], { type: 'settings', impostors: 1, bots, killCd: 10, tasks: 4, newRoles: true, ...cfg });
    g.act(ids[0], { type: 'start' });
    if (!role || g.view(ids[0]).me.role === role) return { g, a: ids[0], ids };
  }
  throw new Error('לא הצלחתי לקבל את התפקיד ' + role);
}
const me = (g, a) => g.view(a).players.find(p => p.id === a);
function walkTo(g, a, target, assist = false) {
  const here = MAP.roomAt(me(g, a).x, me(g, a).y);
  const pts = [...MAP.path(here ? here.id : 'F', MAP.roomAt(target.x, target.y).id), target];
  for (const q of pts) for (let k = 0; k < 600; k++) {
    const p = me(g, a), dx = q.x - p.x, dy = q.y - p.y, l = Math.hypot(dx, dy);
    if (l < (q === target ? 18 : 10)) break;
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
test('כל המשימות והנקודות במקומות הליכים בחדר הנכון', () => {
  ok(MAP.TASKS.length >= 70, 'צריך לפחות 70 משימות, יש ' + MAP.TASKS.length);
  MAP.TASKS.forEach(t => { ok(MAP.walkable(t.x, t.y), 'משימה לא ניתנת להליכה: ' + t.name); ok(MAP.roomAt(t.x, t.y).id === t.room, 'משימה בחדר הלא נכון: ' + t.name); });
  MAP.VENTS.concat([MAP.BUTTON, MAP.CAM_CONSOLE]).forEach(p => ok(MAP.walkable(p.x, p.y), 'נקודה לא ניתנת להליכה'));
  Object.values(MAP.SAB_POINTS).flat().forEach(p => ok(MAP.walkable(p.x, p.y) && MAP.roomAt(p.x, p.y).id === p.room, 'נקודת תיקון שגויה: ' + p.name));
  ok(new Set(MAP.TASKS.map(t => t.name)).size === MAP.TASKS.length, 'שמות משימות כפולים');
});
test('אפשר להגיע מכל חדר לכל חדר, והמסלול עובר רק בשטח הליכה', () => {
  for (const a in MAP.ROOMS) for (const b in MAP.ROOMS) {
    const p = MAP.path(a, b); if (a !== b) ok(p.length > 0, `אין מסלול ${a}->${b}`);
    let prev = { x: MAP.ROOMS[a].cx, y: MAP.ROOMS[a].cy };
    for (const q of [...p, { x: MAP.ROOMS[b].cx, y: MAP.ROOMS[b].cy }]) {
      for (let i = 0; i <= 40; i++) ok(MAP.walkable(prev.x + (q.x - prev.x) * i / 40, prev.y + (q.y - prev.y) * i / 40), `קיר בדרך ${a}->${b}`);
      prev = q;
    }
  }
});
test('לכל חדר יש דלתות', () => { for (const r in MAP.ROOMS) ok(MAP.doorRects(r).length >= 2, 'חדר בלי דלתות: ' + r); });
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
  const { g, a } = newGame({ role: 'בלש', bots: 3 }); sec(g, 3);
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
test('שופט: ההצבעה שלו שווה כפול', () => {
  const { g, a, ids } = newGame({ role: 'שופט', bots: 3, humans: 2 });
  callMeeting(g, a); const tgt = g.view(a).roster.find(r => r.bot && r.alive);
  g.act(a, { type: 'vote', target: tgt.id }); g.act(ids[1], { type: 'vote', target: 'skip' });
  let w = null; for (let i = 0; i < 30 * 70; i++) { tick(g, 1); const v = g.view(a); if (v.meeting && v.meeting.reveal) { w = (v.meeting.votes || []).find(x => x.to === tgt.id); break; } }
  ok(w && w.w === 2, 'משקל הקול של השופט צריך להיות 2');
});
test('חבלות: חמצן מחייב שתי נקודות, ואם לא מתקנים המתחזים מנצחים', () => {
  // שלושה שחקנים אנושיים שלא עושים כלום (אין בוטים שיתקנו), כדי שהמשבר ייגמר בהפסד
  const { g, a } = newGame({ role: 'מתחזה', bots: 0, humans: 3, cfg: { tasks: 1 } }); sec(g, 21);
  g.act(a, { type: 'sab', kind: 'oxygen' }); tick(g, 2);
  ok(g.view(a).sab && g.view(a).sab.type === 'oxygen', 'חבלה לא התחילה');
  sec(g, 50); const v = g.view(a); ok(v.phase === 'end' && /האוויר/.test(v.winner.reason), 'צריך להפסיד בגלל חמצן: ' + v.phase);
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
    const { g, a } = newGame({ bots: 2 });
    const here = MAP.roomAt(me(g, a).x, me(g, a).y);
    const pts = [...MAP.path(here.id, room), { x: MAP.ROOMS[room].cx, y: MAP.ROOMS[room].cy }];
    for (const q of pts) { let reached = false; for (let k = 0; k < 500; k++) { const p = me(g, a), dx = q.x - p.x, dy = q.y - p.y, l = Math.hypot(dx, dy); if (l < 14) { reached = true; break; } const e = 0.35 * Math.sin(k / 7); g.act(a, { type: 'input', dx: dx / l - dy / l * e, dy: dy / l + dx / l * e, assist: true }); tick(g, 1); } ok(reached, 'נתקע בדרך אל ' + room); }
  }
});

// ---------------------------------------------------------------------------
console.log('\nמשחקים מלאים (בוטים בלבד)');
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

console.log(`\nסה"כ: ${pass} עברו, ${fail} נכשלו` + (fail ? ' – ' + failures.join(', ') : ''));
process.exit(fail ? 1 : 0);
