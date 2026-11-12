// מפת "תחנת נוגה" – משותפת לשרת ולדפדפן
(function (root) {
  const ROOMS = {
    Q: { name: 'מגורים', x: 200, y: 80, w: 300, h: 220, c: '#2b3a55' },
    B: { name: 'גשר הפיקוד', x: 850, y: 80, w: 300, h: 220, c: '#30405e' },
    C: { name: 'תקשורת', x: 1500, y: 80, w: 300, h: 220, c: '#2d4a4f' },
    E: { name: 'חדר מנועים', x: 100, y: 450, w: 300, h: 350, c: '#4a3a32' },
    F: { name: 'חדר אוכל', x: 750, y: 450, w: 500, h: 350, c: '#38424f' },
    L: { name: 'מעבדה', x: 1600, y: 450, w: 300, h: 350, c: '#2f4a3d' },
    S: { name: 'חדר שרתים', x: 150, y: 950, w: 300, h: 250, c: '#3a3352' },
    T: { name: 'מחסן', x: 750, y: 1000, w: 500, h: 220, c: '#4a4433' },
    G: { name: 'חממה', x: 1550, y: 950, w: 300, h: 250, c: '#2e4d2e' },
  };
  for (const k in ROOMS) {
    const r = ROOMS[k];
    r.id = k; r.cx = r.x + r.w / 2; r.cy = r.y + r.h / 2;
  }

  const CW = 90;
  const CORR = [
    ['Q', 'B', 'h', 190], ['B', 'C', 'h', 190], ['B', 'F', 'v', 1000], ['Q', 'E', 'v', 350],
    ['C', 'L', 'v', 1650], ['E', 'F', 'h', 625], ['F', 'L', 'h', 625], ['F', 'T', 'v', 1000],
    ['E', 'S', 'v', 300], ['L', 'G', 'v', 1700], ['S', 'T', 'h', 1105], ['T', 'G', 'h', 1105],
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

  const TASKS = [
    { room: 'Q', x: 260, y: 130, name: 'סידור מיטות' },
    { room: 'B', x: 900, y: 120, name: 'כיול ניווט' },
    { room: 'B', x: 1100, y: 250, name: 'בדיקת מכ"ם' },
    { room: 'C', x: 1750, y: 130, name: 'כוונון אנטנה' },
    { room: 'E', x: 150, y: 500, name: 'תדלוק מנוע' },
    { room: 'E', x: 350, y: 760, name: 'החלפת מסנן' },
    { room: 'F', x: 800, y: 500, name: 'ניקוי פילטר אוויר' },
    { room: 'F', x: 1200, y: 760, name: 'פינוי אשפה' },
    { room: 'L', x: 1850, y: 500, name: 'ניתוח דגימות' },
    { room: 'L', x: 1650, y: 760, name: 'הפעלת מיקרוסקופ' },
    { room: 'S', x: 200, y: 1150, name: 'אתחול שרת' },
    { room: 'T', x: 800, y: 1170, name: 'סידור ארגזים' },
    { room: 'T', x: 1200, y: 1050, name: 'ספירת מלאי' },
    { room: 'G', x: 1800, y: 1000, name: 'השקיית צמחים' },
  ];

  const VENTS = [
    { x: 130, y: 780 }, { x: 420, y: 980 }, { x: 1000, y: 1190 },
    { x: 1580, y: 1180 }, { x: 1880, y: 780 }, { x: 1120, y: 100 },
  ];

  const BUTTON = { x: 1000, y: 625 };
  const WORLD = { w: 2000, h: 1300 };
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

  const MAP = { ROOMS, CORRIDORS, TASKS, VENTS, BUTTON, WORLD, R, walkable, roomAt, path };
  if (typeof module !== 'undefined' && module.exports) module.exports = MAP;
  else root.MAP = MAP;
})(this);
