// מפת "תחנת נוגה" – משותפת לשרת ולדפדפן
(function (root) {
  function build(variant) {
  const small = variant === 'small';
  const ROOMS = {
    U: { name: 'מנוע עליון', x: 150, y: 80, w: 300, h: 240, c: '#4a3a32' },
    M: { name: 'מרפאה', x: 650, y: 80, w: 300, h: 240, c: '#2f4a4a' },
    F: { name: 'חדר אוכל', x: 1150, y: 60, w: 500, h: 340, c: '#38424f' },
    W: { name: 'נשק', x: 1850, y: 80, w: 300, h: 240, c: '#4a3340' },
    O: { name: 'חמצן', x: 2300, y: 120, w: 250, h: 200, c: '#2d4a3a' },
    R: { name: 'כור', x: 40, y: 500, w: 280, h: 340, c: '#4d2f2f' },
    SE: { name: 'אבטחה', x: 520, y: 540, w: 260, h: 240, c: '#33384d' },
    EL: { name: 'חשמל', x: 560, y: 1040, w: 260, h: 240, c: '#4a4530' },
    A: { name: 'ניהול', x: 1350, y: 560, w: 380, h: 260, c: '#30405e' },
    N: { name: 'ניווט', x: 2300, y: 660, w: 300, h: 300, c: '#2b3a55' },
    D: { name: 'מנוע תחתון', x: 150, y: 1040, w: 300, h: 240, c: '#4a3a32' },
    T: { name: 'מחסן', x: 900, y: 1020, w: 520, h: 300, c: '#4a4433' },
    C: { name: 'תקשורת', x: 1600, y: 1080, w: 300, h: 220, c: '#2d4a4f' },
    SH: { name: 'מגנים', x: 2150, y: 1040, w: 320, h: 260, c: '#3a3352' },
  };
  // מפה קטנה: 7 חדרים עם טבעת הליכה סגורה (אבטחה ← מרפאה ← חדר אוכל ← ניהול ← מחסן ← חשמל ← אבטחה)
  if (small) for (const k of ['U', 'W', 'O', 'D', 'C', 'SH', 'N']) delete ROOMS[k];
  for (const k in ROOMS) {
    const r = ROOMS[k];
    r.id = k; r.cx = r.x + r.w / 2; r.cy = r.y + r.h / 2;
  }

  const CW = 90;
  const CORR = small ? [
    ['R', 'SE', 'h', 660], ['M', 'SE', 'v', 715], ['M', 'F', 'h', 200], ['F', 'A', 'v', 1500],
    ['A', 'T', 'v', 1385], ['EL', 'T', 'h', 1160], ['SE', 'EL', 'v', 650],
  ] : [
    ['U', 'M', 'h', 200], ['M', 'F', 'h', 200], ['F', 'W', 'h', 200], ['W', 'O', 'h', 220],
    ['O', 'N', 'v', 2450], ['U', 'R', 'v', 235], ['R', 'D', 'v', 235], ['R', 'SE', 'h', 660],
    ['M', 'SE', 'v', 715], ['F', 'A', 'v', 1500],
    ['D', 'EL', 'h', 1160], ['EL', 'T', 'h', 1160], ['T', 'C', 'h', 1180], ['C', 'SH', 'h', 1180], ['N', 'SH', 'v', 2380],
    ['A', 'N', 'h', 740],
  ];
  const CORRIDORS = CORR.map(([a, b, o, c]) => {
    const A = ROOMS[a], B = ROOMS[b];
    if (o === 'v') {
      return { a, b, o, x: c - CW / 2, y: A.y + A.h - 30, w: CW, h: B.y - (A.y + A.h) + 60,
        da: { x: c, y: A.y + A.h - 25 }, db: { x: c, y: B.y + 25 } };
    }
    return { a, b, o, x: A.x + A.w - 30, y: c - CW / 2, w: B.x - (A.x + A.w) + 60, h: CW,
      da: { x: A.x + A.w - 25, y: c }, db: { x: B.x + 25, y: c } };
  });

  // kind: hold = להחזיק E · scan = משימה גלויה (כולם רואים) · wires/dial/code = מיני-משחק
  const TASKS = [
    { room: 'M', x: 870, y: 200, name: 'סריקה ביולוגית', kind: 'scan' },
    { room: 'M', x: 700, y: 140, name: 'בדיקת דגימות', kind: 'hold' },
    { room: 'EL', x: 610, y: 1120, name: 'תיקון חשמל', kind: 'wires' },
    { room: 'EL', x: 770, y: 1240, name: 'כיול מתח', kind: 'dial' },
    { room: 'SE', x: 600, y: 600, name: 'בדיקת מצלמות', kind: 'track', theme: 'radar' },
    { room: 'R', x: 100, y: 560, name: 'הפעלת הכור', kind: 'code' },
    { room: 'U', x: 380, y: 140, name: 'תדלוק מנוע עליון', kind: 'charge', theme: 'gears' },
    { room: 'D', x: 380, y: 1230, name: 'תדלוק מנוע תחתון', kind: 'hold' },
    { room: 'F', x: 1220, y: 120, name: 'ניקוי פילטר אוויר', kind: 'lights', theme: 'bubbles' },
    { room: 'F', x: 1600, y: 360, name: 'פינוי אשפה', kind: 'bins', theme: 'conveyor' },
    { room: 'W', x: 2050, y: 150, name: 'כיוון תותחים', kind: 'dial' },
    { room: 'O', x: 2490, y: 270, name: 'ניקוי מסנן חמצן', kind: 'swipe', theme: 'bubbles' },
    { room: 'N', x: 2550, y: 900, name: 'כיול ניווט', kind: 'dial' },
    { room: 'A', x: 1680, y: 620, name: 'העלאת נתונים', kind: 'code' },
    { room: 'T', x: 960, y: 1270, name: 'סידור ארגזים', kind: 'slide', theme: 'conveyor' },
    { room: 'T', x: 1380, y: 1060, name: 'תדלוק מיכל', kind: 'charge', theme: 'conveyor' },
    { room: 'C', x: 1850, y: 1120, name: 'כוונון אנטנה', kind: 'dial' },
    { room: 'SH', x: 2420, y: 1250, name: 'הפעלת מגנים', kind: 'wires' },
  ];
  if (small) for (let i = TASKS.length - 1; i >= 0; i--) if (!ROOMS[TASKS[i].room]) TASKS.splice(i, 1);
  const TASK_TIME = { hold: 2.5, scan: 6 };

  // רשת פתחי אוורור: שלוש רשתות נפרדות (מערב, מרכז, מזרח)
  const VENTS = small ? [
    { x: 90, y: 800, links: [1, 5] },     // 0 כור
    { x: 740, y: 740, links: [0, 5] },    // 1 אבטחה
    { x: 680, y: 290, links: [3, 4] },    // 2 מרפאה
    { x: 1600, y: 100, links: [2, 4] },   // 3 חדר אוכל
    { x: 1690, y: 790, links: [2, 3] },   // 4 ניהול
    { x: 790, y: 1080, links: [0, 1] },   // 5 חשמל
  ] : [
    { x: 400, y: 290, links: [1, 2] },   // 0 מנוע עליון
    { x: 90, y: 800, links: [0, 2] },    // 1 כור
    { x: 400, y: 1070, links: [0, 1] },  // 2 מנוע תחתון
    { x: 680, y: 290, links: [4, 5] },   // 3 מרפאה
    { x: 740, y: 740, links: [3, 5] },   // 4 אבטחה
    { x: 790, y: 1080, links: [3, 4] },  // 5 חשמל
    { x: 2100, y: 290, links: [7] },     // 6 נשק
    { x: 2560, y: 700, links: [6, 8] },  // 7 ניווט
    { x: 2200, y: 1260, links: [7] },    // 8 מגנים
    { x: 1690, y: 790, links: [10, 11] },// 9 ניהול
    { x: 1640, y: 1250, links: [9] },    // 10 תקשורת
    { x: 1600, y: 100, links: [9] },     // 11 חדר אוכל
  ];

  const BUTTON = { x: 1400, y: 230 };
  const WORLD = small ? { w: 1800, h: 1340 } : { w: 2700, h: 1400 };
  const R = 18;

  function walkable(x, y, r) {
    if (r === undefined) r = R;
    for (const k in ROOMS) {
      const m = ROOMS[k];
      if (x >= m.x + r && x <= m.x + m.w - r && y >= m.y + r && y <= m.y + m.h - r) return true;
    }
    for (const c of CORRIDORS) {
      if (c.o === 'v') {
        if (x >= c.x + r && x <= c.x + c.w - r && y >= c.y && y <= c.y + c.h) return true;
      } else if (x >= c.x && x <= c.x + c.w && y >= c.y + r && y <= c.y + c.h - r) return true;
    }
    return false;
  }

  function roomAt(x, y) {
    for (const k in ROOMS) {
      const m = ROOMS[k];
      if (x >= m.x && x <= m.x + m.w && y >= m.y && y <= m.y + m.h) return m;
    }
    return null;
  }

  // מסלול בין חדרים (לבוטים): רשימת נקודות דרך הדלתות
  function path(fromRoom, toRoom) {
    if (fromRoom === toRoom) return [];
    const prev = { [fromRoom]: null };
    const q = [fromRoom];
    while (q.length) {
      const cur = q.shift();
      if (cur === toRoom) break;
      CORRIDORS.forEach((c, i) => {
        const nxt = c.a === cur ? c.b : c.b === cur ? c.a : null;
        if (nxt && !(nxt in prev)) { prev[nxt] = { from: cur, i }; q.push(nxt); }
      });
    }
    if (!(toRoom in prev)) return [];
    const pts = [];
    let cur = toRoom;
    while (prev[cur]) {
      const { from, i } = prev[cur];
      const c = CORRIDORS[i];
      const dFrom = c.a === from ? c.da : c.db;
      const dTo = c.a === from ? c.db : c.da;
      pts.unshift({ x: dTo.x, y: dTo.y });
      pts.unshift({ x: dFrom.x, y: dFrom.y });
      cur = from;
    }
    return pts;
  }

  VENTS.forEach(v => { const r = roomAt(v.x, v.y); v.room = r ? r.name : ''; });
  // מצלמות אבטחה: (x,y) מרכז התצוגה, (mx,my) מיקום המצלמה על הקיר
  const CAMS = [
    { name: 'חדר אוכל', x: 1400, y: 230, mx: 1400, my: 80 },
    { name: 'מסדרון מערבי', x: 430, y: 660, mx: 430, my: 623 },
    { name: 'מסדרון מרפאה', x: 715, y: 430, mx: 673, my: 430 },
    { name: 'ניהול', x: 1540, y: 700, mx: 1540, my: 578 },
  ];
  const CAM_CONSOLE = { x: 650, y: 660 };
  // נקודות תיקון לחבלות: חשמל (אחת), חמצן (שתיים), כור (שתיים)
  const SAB_POINTS = {
    lights: [{ x: 690, y: 1100, room: 'EL', name: 'לוח חשמל' }],
    oxygen: small ? [{ x: 1190, y: 330, room: 'F', name: 'מערכת חמצן' }, { x: 1400, y: 770, room: 'A', name: 'בקרת אוויר' }]
      : [{ x: 2380, y: 260, room: 'O', name: 'מערכת חמצן' }, { x: 1400, y: 770, room: 'A', name: 'בקרת אוויר' }],
    reactor: small ? [{ x: 70, y: 780, room: 'R', name: 'ליבת הכור' }, { x: 1000, y: 1280, room: 'T', name: 'קירור כור' }]
      : [{ x: 70, y: 780, room: 'R', name: 'ליבת הכור' }, { x: 210, y: 1240, room: 'D', name: 'קירור כור' }],
  };
  // מלבני הדלתות של חדר: כל המעברים שלו אל מסדרונות
  function doorRects(roomId) {
    const out = [];
    CORRIDORS.forEach(c => {
      if (c.a !== roomId && c.b !== roomId) return;
      const A = ROOMS[c.a], B = ROOMS[c.b];
      if (c.o === 'v') { const by = c.a === roomId ? A.y + A.h : B.y; out.push({ x: c.x, y: by - 14, w: c.w, h: 28 }); }
      else { const bx = c.a === roomId ? A.x + A.w : B.x; out.push({ x: bx - 14, y: c.y, w: 28, h: c.h }); }
    });
    return out;
  }
  // 52 משימות נוספות, כל אחת עם סוג משחק וערכת נושא מונפשת. המיקומים נקבעים אוטומטית בתוך כל חדר.
  // kind: wires dial code switches simon sliders tapfill sortnum pairs catch timing pattern
  // theme: wires gears bubbles pulse matrix radar stars sparks waves conveyor
  const NEW_TASKS = [
    ['U', 'כיול טורבינה', 'valve', 'gears'], ['U', 'החלפת שמן מנוע', 'tapfill', 'gears'], ['U', 'בדיקת לחץ', 'charge', 'gears'],
    ['M', 'כיול דופק', 'timing', 'pulse'], ['M', 'התאמת סוגי דם', 'bins', 'pulse'], ['M', 'סידור תרופות', 'sortnum', 'pulse'], ['M', 'שחזור דנ"א', 'lights', 'pulse'],
    ['F', 'הכנת ארוחה', 'simon', 'conveyor'], ['F', 'ניקוי שולחנות', 'catch', 'bubbles'], ['F', 'מיון כלים', 'pairs', 'conveyor'], ['F', 'כיול מכונת קפה', 'balance', 'sparks'], ['F', 'סידור מגשים', 'slide', 'conveyor'],
    ['W', 'טעינת תותח', 'tapfill', 'sparks'], ['W', 'כיוון טווח', 'track', 'radar'], ['W', 'פירוק אסטרואידים', 'catch', 'stars'],
    ['O', 'החלפת מסנן אוויר', 'switches', 'bubbles'], ['O', 'כיול לחץ חמצן', 'charge', 'bubbles'], ['O', 'השקיית עציצים', 'valve', 'bubbles'],
    ['R', 'ייצוב הליבה', 'balance', 'sparks'], ['R', 'החלפת מוטות דלק', 'bins', 'sparks'], ['R', 'קירור צינורות', 'valve', 'waves'], ['R', 'קוד שחרור', 'code', 'matrix'],
    ['SE', 'סריקת מצלמות', 'maze', 'radar'], ['SE', 'פענוח הקלטה', 'code', 'matrix'], ['SE', 'מעקב תנועה', 'track', 'radar'], ['SE', 'כיבוי אזעקות', 'lights', 'radar'],
    ['EL', 'חיבור כבלים ראשי', 'wires', 'wires'], ['EL', 'איזון מתח', 'balance', 'wires'], ['EL', 'החלפת נתיכים', 'slide', 'wires'], ['EL', 'הפעלת גנרטור', 'tapfill', 'wires'],
    ['A', 'עדכון רשימת צוות', 'quiz', 'matrix'], ['A', 'הזנת דוחות', 'code', 'matrix'], ['A', 'סידור מסמכים', 'bins', 'matrix'], ['A', 'אישור כניסה', 'swipe', 'matrix'],
    ['N', 'חישוב מסלול', 'quiz', 'stars'], ['N', 'כיול ג\'יירו', 'balance', 'stars'], ['N', 'מעקב כוכבים', 'track', 'stars'], ['N', 'עדכון מפת ניווט', 'maze', 'stars'],
    ['D', 'כיוון מדחף', 'valve', 'gears'], ['D', 'הידוק ברגים', 'tapfill', 'gears'], ['D', 'בדיקת ציר', 'charge', 'gears'],
    ['T', 'מיון ארגזים', 'bins', 'conveyor'], ['T', 'סריקת ברקודים', 'swipe', 'conveyor'], ['T', 'עדכון מלאי', 'quiz', 'conveyor'], ['T', 'טעינת מלגזה', 'maze', 'conveyor'], ['T', 'נעילת מכולה', 'code', 'conveyor'],
    ['C', 'כוונון תדר', 'sliders', 'waves'], ['C', 'פענוח הודעה', 'quiz', 'waves'], ['C', 'חיבור לוויין', 'track', 'waves'],
    ['SH', 'כיול מגן', 'charge', 'waves'], ['SH', 'טעינת קבלים', 'tapfill', 'sparks'], ['SH', 'סנכרון שכבות', 'slide', 'sparks'],
  ];
  (function addTasks() {
    let seed = 20261112;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const far = (x, y, list, d) => list.every(q => Math.hypot(q.x - x, q.y - y) >= d);
    const fixed = [...VENTS, BUTTON, CAM_CONSOLE, ...SAB_POINTS.lights, ...SAB_POINTS.oxygen, ...SAB_POINTS.reactor];
    for (const [room, name, kind, theme] of NEW_TASKS) {
      const r = ROOMS[room];
      if (!r) continue; // חדר שלא קיים במפה הזו
      // בוחרים מבין מועמדים את המקום הרחוק ביותר מכל המשימות והנקודות הקיימות (פיזור אחיד גם בחדרים קטנים)
      let best = null, bestScore = -1;
      for (let i = 0; i < 500; i++) {
        const x = Math.round(r.x + 45 + rnd() * (r.w - 90)), y = Math.round(r.y + 65 + rnd() * (r.h - 105));
        if (!walkable(x, y)) continue;
        let dmin = 1e9;
        for (const q of TASKS) dmin = Math.min(dmin, Math.hypot(q.x - x, q.y - y));
        for (const q of fixed) dmin = Math.min(dmin, Math.hypot(q.x - x, q.y - y) * 1.15);
        if (dmin > bestScore) { bestScore = dmin; best = { x, y }; }
      }
      if (!best) best = { x: Math.round(r.cx), y: Math.round(r.cy) };
      TASKS.push({ room, x: best.x, y: best.y, name, kind, theme });
    }
  })();
  return { ROOMS, CORRIDORS, TASKS, TASK_TIME, VENTS, BUTTON, WORLD, R, CAMS, CAM_CONSOLE, SAB_POINTS, doorRects, walkable, roomAt, path, id: variant };
  }
  const MAP = build('big'), SMALL = build('small');
  MAP.byId = { big: MAP, small: SMALL };
  if (typeof module !== 'undefined' && module.exports) module.exports = MAP;
  else { root.MAP = MAP; root.MAPS = MAP.byId; }
})(this);
