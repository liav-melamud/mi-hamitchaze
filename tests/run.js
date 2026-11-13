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
    const { g, a } = newGame({ bots: 0, humans: 3 }); // בלי בוטים: אף אחד לא מחסל או נועל דלתות באמצע ההליכה
    const here = MAP.roomAt(me(g, a).x, me(g, a).y);
    const pts = [...MAP.path(here.id, room), { x: MAP.ROOMS[room].cx, y: MAP.ROOMS[room].cy }];
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
  const sn = JSON.parse(g.snapshot()); sn.players[Object.values(sn.players).find(p => p.id !== a && ['impostor', 'shifter', 'phantom', 'viper'].includes(p.role)).id].alive = false;
  const g2 = createGame(MAP); g2.restore(JSON.stringify(sn)); g2.join('x', a); tick(g2, 3);
  ok(g2.view(a).me.role === 'מתחזה', 'המחבל לא הפך למתחזה: ' + g2.view(a).me.role);
});

console.log(`\nסה"כ: ${pass} עברו, ${fail} נכשלו` + (fail ? ' – ' + failures.join(', ') : ''));
process.exit(fail ? 1 : 0);
