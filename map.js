// מפת "תחנת נוגה" – משותפת לשרת ולדפדפן
(function (root) {
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
  for (const k in ROOMS) {
    const r = ROOMS[k];
    r.id = k; r.cx = r.x + r.w / 2; r.cy = r.y + r.h / 2;
  }

  const CW = 90;
  const CORR = [
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
    { room: 'SE', x: 600, y: 600, name: 'בדיקת מצלמות', kind: 'hold' },
    { room: 'R', x: 100, y: 560, name: 'הפעלת הכור', kind: 'code' },
    { room: 'U', x: 380, y: 140, name: 'תדלוק מנוע עליון', kind: 'hold' },
    { room: 'D', x: 380, y: 1230, name: 'תדלוק מנוע תחתון', kind: 'hold' },
    { room: 'F', x: 1220, y: 120, name: 'ניקוי פילטר אוויר', kind: 'hold' },
    { room: 'F', x: 1600, y: 360, name: 'פינוי אשפה', kind: 'hold' },
    { room: 'W', x: 2050, y: 150, name: 'כיוון תותחים', kind: 'dial' },
    { room: 'O', x: 2490, y: 270, name: 'ניקוי מסנן חמצן', kind: 'hold' },
    { room: 'N', x: 2550, y: 900, name: 'כיול ניווט', kind: 'dial' },
    { room: 'A', x: 1680, y: 620, name: 'העלאת נתונים', kind: 'code' },
    { room: 'T', x: 960, y: 1270, name: 'סידור ארגזים', kind: 'hold' },
    { room: 'T', x: 1380, y: 1060, name: 'תדלוק מיכל', kind: 'hold' },
    { room: 'C', x: 1850, y: 1120, name: 'כוונון אנטנה', kind: 'dial' },
    { room: 'SH', x: 2420, y: 1250, name: 'הפעלת מגנים', kind: 'wires' },
  ];
  const TASK_TIME = { hold: 2.5, scan: 6 };

  // רשת פתחי אוורור: שלוש רשתות נפרדות (מערב, מרכז, מזרח)
  const VENTS = [
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
  const WORLD = { w: 2700, h: 1400 };
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
  const MAP = { ROOMS, CORRIDORS, TASKS, TASK_TIME, VENTS, BUTTON, WORLD, R, walkable, roomAt, path };
  if (typeof module !== 'undefined' && module.exports) module.exports = MAP;
  else root.MAP = MAP;
})(this);
