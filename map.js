// מפת "תחנת נוגה" – משותפת לשרת ולדפדפן
(function (root) {
  // סוגי המשימות שאפשר לחלק למפה מותאמת (כולם מיני-משחקים שכבר קיימים במשחק)
  const KINDS = [['wires', 'חיבור כבלים', 'wires'], ['code', 'הזנת קוד', 'matrix'], ['dial', 'כיול מחוג', 'radar'], ['switches', 'הפעלת מתגים', 'wires'], ['simon', 'רצף אורות', 'sparks'], ['sliders', 'איזון מחוונים', 'waves'], ['tapfill', 'מילוי מיכל', 'bubbles'], ['sortnum', 'מיון מספרים', 'pulse'], ['pairs', 'התאמת זוגות', 'matrix'], ['catch', 'לכידת פסולת', 'stars'], ['timing', 'סנכרון תזמון', 'gears'], ['pattern', 'שחזור תבנית', 'stars'], ['maze', 'מבוך כבלים', 'radar'], ['bins', 'מיון ארגזים', 'conveyor'], ['quiz', 'בחינת ידע', 'matrix'], ['balance', 'איזון מערכת', 'sparks'], ['track', 'מעקב מטרה', 'radar'], ['charge', 'טעינת מצבר', 'sparks'], ['valve', 'כיוון שסתומים', 'gears'], ['lights', 'החלפת נורות', 'pulse'], ['swipe', 'העברת כרטיס', 'matrix']];
  function ventsFromDef(list) { // וינטים עם net: כל אלה שבאותה רשת מחוברים זה לזה. בלי net משתמשים ב-links שניתנו
    return list.map((v, i) => ({ x: v.x, y: v.y, links: v.net !== undefined && v.net !== null ? list.map((w, j) => (j !== i && w.net === v.net ? j : -1)).filter(j => j >= 0) : (v.links || []).slice() }));
  }
  // build(variant) בונה מפה מובנית. build(null, D) בונה מפה מותאמת מתוך הגדרה (D) שהמשתמש יצר בעורך המודים
  function build(variant, D) {
  const small = !D && variant === 'small', ice = D ? D.theme === 'ice' : variant === 'ice';
  const ROOMS = D ? JSON.parse(JSON.stringify(D.rooms)) : ice ? {
    // "תחנת קרח" – מפה שנייה: 12 חדרים מסביב לאולם מרכזי
    HB: { name: 'מגורים', x: 150, y: 80, w: 360, h: 260, c: '#3d5468' },
    LB: { name: 'מעבדה', x: 700, y: 80, w: 340, h: 260, c: '#35566a' },
    MH: { name: 'אולם מרכזי', x: 1220, y: 60, w: 460, h: 340, c: '#40556e' },
    GH: { name: 'חממה', x: 1880, y: 80, w: 340, h: 260, c: '#2f5a4a' },
    DR: { name: 'מקדחה', x: 80, y: 540, w: 320, h: 300, c: '#4a4f5e' },
    SC: { name: 'אבטחה', x: 600, y: 560, w: 280, h: 240, c: '#363d58' },
    HT: { name: 'חדר הסקה', x: 1080, y: 580, w: 340, h: 260, c: '#5a3e36' },
    OB: { name: 'מצפה', x: 1640, y: 560, w: 360, h: 280, c: '#2e3c63' },
    GR: { name: 'מוסך', x: 150, y: 1020, w: 360, h: 280, c: '#4a4a4a' },
    GN: { name: 'גנרטור', x: 700, y: 1040, w: 300, h: 240, c: '#544c32' },
    ST: { name: 'מחסן קירור', x: 1180, y: 1020, w: 420, h: 280, c: '#3a5a6e' },
    RD: { name: 'רדאר', x: 1820, y: 1040, w: 340, h: 240, c: '#2d4a55' },
  } : {
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
  const CORR = D ? D.corr.map(x => x.slice()) : ice ? [
    ['HB', 'LB', 'h', 200], ['LB', 'MH', 'h', 200], ['MH', 'GH', 'h', 220],
    ['HB', 'DR', 'v', 300], ['DR', 'GR', 'v', 300], ['LB', 'SC', 'v', 790], ['MH', 'HT', 'v', 1320], ['GH', 'OB', 'v', 1935],
    ['DR', 'SC', 'h', 680], ['SC', 'HT', 'h', 700], ['HT', 'OB', 'h', 700],
    ['SC', 'GN', 'v', 790], ['HT', 'ST', 'v', 1300], ['OB', 'RD', 'v', 1910],
    ['GR', 'GN', 'h', 1160], ['GN', 'ST', 'h', 1160], ['ST', 'RD', 'h', 1160],
  ] : small ? [
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
  const TASKS = D ? JSON.parse(JSON.stringify(D.tasks || [])) : ice ? [
    { room: 'LB', x: 980, y: 220, name: 'סריקה ביולוגית', kind: 'scan' },
    { room: 'GN', x: 760, y: 1240, name: 'תיקון חשמל', kind: 'wires' },
    { room: 'DR', x: 330, y: 800, name: 'הפעלת המקדחה', kind: 'code' },
    { room: 'GH', x: 2120, y: 250, name: 'השקיית צמחים', kind: 'hold' },
    { room: 'OB', x: 1930, y: 640, name: 'כיוון טלסקופ', kind: 'dial' },
    { room: 'RD', x: 2100, y: 1100, name: 'כיול רדאר', kind: 'track', theme: 'radar' },
    { room: 'ST', x: 1250, y: 1250, name: 'סידור ארגזים', kind: 'slide', theme: 'conveyor' },
    { room: 'HB', x: 220, y: 140, name: 'סידור מיטות', kind: 'hold' },
    // משימות זוגיות: צריך עוד שחקן לידך כדי שהן יתקדמו
    { room: 'HT', x: 1250, y: 760, name: '🤝 הפעלת דוד משותף', kind: 'pair' },
    { room: 'MH', x: 1300, y: 330, name: '🤝 הרמת אנטנה', kind: 'pair' },
    // משימות ריאליסטיות: ניקוי, כספת עם קוד, חיבור צינורות והעלאת קבצים
    { room: 'HB', x: 400, y: 270, name: 'ניקוי חלון', kind: 'scrub', theme: 'bubbles' },
    { room: 'LB', x: 800, y: 270, name: 'גיבוי נתוני מחקר', kind: 'download', theme: 'matrix' },
    { room: 'MH', x: 1560, y: 150, name: 'חיבור צינור הסקה', kind: 'pipes', theme: 'conveyor' },
    { room: 'GH', x: 2000, y: 150, name: 'פתיחת כספת זרעים', kind: 'combo', theme: 'stars' },
    { room: 'DR', x: 200, y: 640, name: 'תיקון צינור שמן', kind: 'pipes', theme: 'conveyor' },
    { room: 'SC', x: 760, y: 700, name: 'גיבוי הקלטות', kind: 'download', theme: 'matrix' },
    { room: 'HT', x: 1330, y: 650, name: 'ניקוי פתח אוורור', kind: 'scrub', theme: 'bubbles' },
    { room: 'OB', x: 1760, y: 700, name: 'פתיחת כספת מכשירים', kind: 'combo', theme: 'stars' },
    { room: 'GR', x: 300, y: 1200, name: 'ניקוי מנוע אופנוע', kind: 'scrub', theme: 'gears' },
    { room: 'GN', x: 900, y: 1130, name: 'חיבור צינור סולר', kind: 'pipes', theme: 'conveyor' },
    { room: 'ST', x: 1450, y: 1130, name: 'פתיחת מנעול מחסן', kind: 'combo', theme: 'stars' },
    { room: 'RD', x: 1950, y: 1200, name: 'עדכון תוכנת רדאר', kind: 'download', theme: 'radar' },
  ] : [
    { room: 'A', x: 1500, y: 650, name: '🤝 אישור כפול במחשב', kind: 'pair' },
    { room: 'T', x: 1150, y: 1080, name: '🤝 הרמת ארגז כבד', kind: 'pair' },
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
    // משימות ריאליסטיות: ניקוי, כספת עם קוד, חיבור צינורות והעלאת קבצים
    { room: 'M', x: 900, y: 270, name: 'ניקוי חדר ניתוח', kind: 'scrub', theme: 'bubbles' },
    { room: 'F', x: 1350, y: 150, name: 'חיבור צינור מים', kind: 'pipes', theme: 'conveyor' },
    { room: 'A', x: 1450, y: 770, name: 'גיבוי נתונים', kind: 'download', theme: 'matrix' },
    { room: 'EL', x: 690, y: 1090, name: 'פתיחת כספת הנתיכים', kind: 'combo', theme: 'stars' },
    { room: 'R', x: 250, y: 780, name: 'ניקוי צינורות קירור', kind: 'scrub', theme: 'bubbles' },
    { room: 'N', x: 2380, y: 780, name: 'עדכון תוכנת ניווט', kind: 'download', theme: 'radar' },
    { room: 'SH', x: 2250, y: 1230, name: 'ניקוי לוחות מגן', kind: 'scrub', theme: 'sparks' },
    { room: 'T', x: 1200, y: 1260, name: 'פתיחת כספת הציוד', kind: 'combo', theme: 'stars' },
    { room: 'D', x: 250, y: 1100, name: 'תיקון צינור דלק', kind: 'pipes', theme: 'conveyor' },
    { room: 'C', x: 1700, y: 1250, name: 'ניקוי אנטנה', kind: 'scrub', theme: 'bubbles' },
    { room: 'W', x: 1950, y: 250, name: 'פתיחת ארון נשק', kind: 'combo', theme: 'stars' },
    { room: 'O', x: 2380, y: 230, name: 'חיבור צינור חמצן', kind: 'pipes', theme: 'conveyor' },
    { room: 'U', x: 200, y: 250, name: 'העלאת יומן מנוע', kind: 'download', theme: 'matrix' },
    { room: 'SE', x: 700, y: 720, name: 'גיבוי הקלטות מצלמה', kind: 'download', theme: 'radar' },
  ];
  if (small) for (let i = TASKS.length - 1; i >= 0; i--) if (!ROOMS[TASKS[i].room]) TASKS.splice(i, 1);
  const TASK_TIME = { hold: 2.5, scan: 6, pair: 3.5, candle: 2.5 };

  // רשת פתחי אוורור: שלוש רשתות נפרדות (מערב, מרכז, מזרח)
  const VENTS = D ? ventsFromDef(D.vents || []) : ice ? [
    { x: 470, y: 300, links: [1, 2] },    // 0 מגורים
    { x: 110, y: 800, links: [0, 2] },    // 1 מקדחה
    { x: 470, y: 1060, links: [0, 1] },   // 2 מוסך
    { x: 1000, y: 300, links: [4, 5] },   // 3 מעבדה
    { x: 840, y: 760, links: [3, 5] },    // 4 אבטחה
    { x: 960, y: 1240, links: [3, 4] },   // 5 גנרטור
    { x: 2180, y: 300, links: [7, 8] },   // 6 חממה
    { x: 1960, y: 800, links: [6, 8] },   // 7 מצפה
    { x: 2120, y: 1240, links: [6, 7] },  // 8 רדאר
    { x: 1640, y: 100, links: [10, 11] }, // 9 אולם מרכזי
    { x: 1380, y: 800, links: [9, 11] },  // 10 חדר הסקה
    { x: 1560, y: 1260, links: [9, 10] }, // 11 מחסן קירור
  ] : small ? [
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

  const BUTTON = D ? { x: D.button.x, y: D.button.y } : ice ? { x: 1450, y: 230 } : { x: 1400, y: 230 };
  const WORLD = D ? { w: D.world.w, h: D.world.h } : ice ? { w: 2300, h: 1400 } : small ? { w: 1800, h: 1340 } : { w: 2700, h: 1400 };
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

  // ---- מפה מותאמת: מיקומים מחוץ לחדרים מועברים לתוך החדר, ומה שחסר נוצר אוטומטית ----
  let _seed = 4242;
  const rnd0 = () => ((_seed = (_seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  function spotIn(roomId, avoid) { // המקום הרחוק ביותר מהנקודות ב-avoid בתוך החדר
    const r = ROOMS[roomId]; if (!r) return null;
    let best = null, bs = -1;
    for (let i = 0; i < 300; i++) {
      const x = Math.round(r.x + 45 + rnd0() * Math.max(1, r.w - 90)), y = Math.round(r.y + 65 + rnd0() * Math.max(1, r.h - 105));
      if (!walkable(x, y)) continue;
      let d = 1e9; for (const q of avoid) d = Math.min(d, Math.hypot(q.x - x, q.y - y));
      if (d > bs) { bs = d; best = { x, y }; }
    }
    return best || { x: Math.round(r.cx), y: Math.round(r.cy) };
  }
  function autoCams() {
    return Object.values(ROOMS).slice(0, 4).map(r => ({ name: r.name, x: Math.round(r.cx), y: Math.round(r.cy), mx: Math.round(r.cx), my: Math.round(r.y + 22) }));
  }
  function autoConsole() { const ids = Object.keys(ROOMS), id = ids[1 % ids.length], sp = spotIn(id, [BUTTON, ...TASKS]); return { x: sp.x, y: sp.y }; }
  function genTasks(Dd) { // משימות אוטומטיות: perRoom בכל חדר, מסוגים שונים. D.newTasks (אם יש) נוספות
    const out = (Dd.newTasks || []).map(x => x.slice()); const per = Dd.perRoom === undefined ? 4 : Dd.perRoom; let k = 0;
    for (const id of Object.keys(ROOMS)) for (let j = 0; j < per; j++) { const kd = KINDS[(k++ * 7 + j) % KINDS.length]; out.push([id, kd[1] + ' – ' + ROOMS[id].name + (per > 1 ? ' ' + (j + 1) : ''), kd[0], kd[2]]); }
    return out;
  }
  function fixSab(sb) { // נקודות חבלה: אם חסר או לא תקין – נוצר אוטומטית
    const ids = Object.keys(ROOMS), pick = (n, name) => { const id = ids[n % ids.length], sp = spotIn(id, [..._used, BUTTON]); if (sp) _used.push(sp); return { x: sp.x, y: sp.y, room: id, name }; };
    const ok = a => Array.isArray(a) && a.every(p => walkable(p.x, p.y));
    return {
      freeze: ok(sb && sb.freeze) ? sb.freeze : [],
      lights: sb && ok(sb.lights) && sb.lights.length ? sb.lights : [pick(0, 'לוח חשמל')],
      oxygen: sb && ok(sb.oxygen) && sb.oxygen.length ? sb.oxygen : [pick(1, 'מערכת חמצן'), pick(2, 'בקרת אוויר')],
      reactor: sb && ok(sb.reactor) ? sb.reactor : (ids.length >= 5 ? [pick(3, 'ליבת הכור'), pick(4, 'קירור כור')] : []),
    };
  }
  const _used = []; // נקודות שכבר תפוסות, כדי שלא ייפלו אחת על השנייה
  function fixPoint(p, roomId) {
    if (walkable(p.x, p.y)) { _used.push(p); return true; }
    const rid = (roomAt(p.x, p.y) || {}).id || roomId || p.room; const sp = rid && ROOMS[rid] ? spotIn(rid, _used) : null;
    if (!sp) return false; p.x = sp.x; p.y = sp.y; _used.push(p); return true;
  }
  if (D) {
    for (let i = TASKS.length - 1; i >= 0; i--) { const t = TASKS[i]; if (!ROOMS[t.room] || !fixPoint(t, t.room)) TASKS.splice(i, 1); else t.room = (roomAt(t.x, t.y) || {}).id || t.room; }
    for (let i = VENTS.length - 1; i >= 0; i--) if (!fixPoint(VENTS[i])) VENTS.splice(i, 1);
    if (!walkable(BUTTON.x, BUTTON.y)) { const big = Object.values(ROOMS).sort((a, b) => b.w * b.h - a.w * a.h)[0]; BUTTON.x = Math.round(big.cx); BUTTON.y = Math.round(big.y + 120); }
    _used.push(BUTTON);
  }
  VENTS.forEach(v => { const r = roomAt(v.x, v.y); v.room = r ? r.name : ''; });
  // מצלמות אבטחה: (x,y) מרכז התצוגה, (mx,my) מיקום המצלמה על הקיר
  const CAMS = D ? (D.cams && D.cams.length ? D.cams.map(c => ({ ...c })) : autoCams()) : ice ? [
    { name: 'אולם מרכזי', x: 1450, y: 230, mx: 1450, my: 60 },
    { name: 'מסדרון מערבי', x: 500, y: 680, mx: 500, my: 637 },
    { name: 'מסדרון הסקה', x: 1320, y: 490, mx: 1277, my: 490 },
    { name: 'מצפה', x: 1820, y: 700, mx: 1820, my: 562 },
  ] : [
    { name: 'חדר אוכל', x: 1400, y: 230, mx: 1400, my: 80 },
    { name: 'מסדרון מערבי', x: 430, y: 660, mx: 430, my: 623 },
    { name: 'מסדרון מרפאה', x: 715, y: 430, mx: 673, my: 430 },
    { name: 'ניהול', x: 1540, y: 700, mx: 1540, my: 578 },
  ];
  const CAM_CONSOLE = D ? (D.camConsole && walkable(D.camConsole.x, D.camConsole.y) ? { x: D.camConsole.x, y: D.camConsole.y } : autoConsole()) : ice ? { x: 680, y: 640 } : { x: 650, y: 660 };
  // נקודות תיקון לחבלות: חשמל (אחת), חמצן (שתיים), כור (שתיים)
  const SAB_POINTS = D ? fixSab(D.sab) : ice ? {
    lights: [{ x: 760, y: 1100, room: 'GN', name: 'לוח הגנרטור' }],
    oxygen: [{ x: 1920, y: 140, room: 'GH', name: 'מערכת אוויר' }, { x: 1260, y: 120, room: 'MH', name: 'בקרת אוויר' }],
    reactor: [],
    // חבלה מיוחדת לתחנת הקרח: ההסקה מושבתת והצוות קופא (הולך לאט) עד שמתקנים בשני המחממים
    freeze: [{ x: 1130, y: 640, room: 'HT', name: 'מחמם ראשי' }, { x: 130, y: 600, room: 'DR', name: 'מחמם המקדחה' }],
  } : {
    freeze: [],
    lights: [{ x: 690, y: 1100, room: 'EL', name: 'לוח חשמל' }],
    oxygen: small ? [{ x: 1190, y: 330, room: 'F', name: 'מערכת חמצן' }, { x: 1400, y: 770, room: 'A', name: 'בקרת אוויר' }]
      : [{ x: 2380, y: 260, room: 'O', name: 'מערכת חמצן' }, { x: 1400, y: 770, room: 'A', name: 'בקרת אוויר' }],
    // במפה הקטנה הכור לא פעיל – אין חבלת כור
    reactor: small ? [] : [{ x: 70, y: 780, room: 'R', name: 'ליבת הכור' }, { x: 210, y: 1240, room: 'D', name: 'קירור כור' }],
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
  const NEW_TASKS = D ? genTasks(D) : ice ? [
    ['HB', 'קיפול שמיכות', 'pairs', 'conveyor'], ['HB', 'כיול מחמם חדר', 'dial', 'sparks'], ['HB', 'סידור ציוד', 'bins', 'conveyor'],
    ['LB', 'בדיקת דגימת קרח', 'lights', 'pulse'], ['LB', 'מיון מבחנות', 'sortnum', 'pulse'], ['LB', 'ניתוח נתונים', 'quiz', 'matrix'],
    ['MH', 'עדכון לוח משמרות', 'code', 'matrix'], ['MH', 'הכנת שוקו חם', 'tapfill', 'bubbles'], ['MH', 'ניקוי שלג מהכניסה', 'swipe', 'waves'],
    ['GH', 'כיול מנורות גידול', 'sliders', 'sparks'], ['GH', 'קטיף עגבניות', 'catch', 'bubbles'], ['GH', 'בדיקת לחות', 'balance', 'bubbles'],
    ['DR', 'החלפת ראש מקדחה', 'valve', 'gears'], ['DR', 'שאיבת ליבת קרח', 'charge', 'gears'], ['DR', 'הידוק ברגים', 'tapfill', 'gears'],
    ['SC', 'סריקת מצלמות', 'maze', 'radar'], ['SC', 'כיבוי אזעקות', 'switches', 'radar'],
    ['HT', 'ניקוי ארובה', 'swipe', 'sparks'], ['HT', 'מילוי סולר', 'charge', 'sparks'], ['HT', 'איזון לחץ קיטור', 'balance', 'sparks'],
    ['OB', 'מעקב כוכבים', 'track', 'stars'], ['OB', 'צילום זוהר צפוני', 'timing', 'stars'], ['OB', 'עדכון מפת שמיים', 'maze', 'stars'],
    ['GR', 'תדלוק אופנוע שלג', 'charge', 'gears'], ['GR', 'החלפת שרשראות', 'wires', 'gears'], ['GR', 'בדיקת מצברים', 'simon', 'sparks'],
    ['GN', 'איזון מתח', 'balance', 'wires'], ['GN', 'החלפת נתיכים', 'slide', 'wires'],
    ['ST', 'מיון קפואים', 'bins', 'conveyor'], ['ST', 'סריקת ברקודים', 'swipe', 'conveyor'], ['ST', 'עדכון מלאי', 'quiz', 'conveyor'],
    ['RD', 'כוונון תדר', 'sliders', 'waves'], ['RD', 'פענוח הודעה', 'code', 'waves'], ['RD', 'ניקוי קרח מהצלחת', 'catch', 'waves'],
  ] : [
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
    const fixed = [...VENTS, BUTTON, CAM_CONSOLE, ...SAB_POINTS.lights, ...SAB_POINTS.oxygen, ...SAB_POINTS.reactor, ...SAB_POINTS.freeze];
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
  // מקומות מסתור (למצב מחבואים): שניים בכל חדר, רחוקים ממשימות ומפתחים
  const SPOTS = [];
  (function addSpots() {
    const fixed = [...TASKS, ...VENTS, BUTTON, CAM_CONSOLE, ...SAB_POINTS.lights, ...SAB_POINTS.oxygen, ...SAB_POINTS.reactor, ...SAB_POINTS.freeze];
    let seed = 777;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (const id of Object.keys(ROOMS)) {
      const r = ROOMS[id];
      for (let n = 0; n < 2; n++) {
        let best = null, bestScore = 70;
        for (let i = 0; i < 400; i++) {
          const x = Math.round(r.x + 55 + rnd() * (r.w - 110)), y = Math.round(r.y + 60 + rnd() * (r.h - 110));
          if (!walkable(x, y)) continue;
          let d = 1e9;
          for (const q of fixed) d = Math.min(d, Math.hypot(q.x - x, q.y - y));
          for (const q of SPOTS) d = Math.min(d, Math.hypot(q.x - x, q.y - y) * 0.6);
          if (d > bestScore) { bestScore = d; best = { x, y, room: id }; }
        }
        if (best) SPOTS.push(best);
      }
    }
  })();
  // משימות חנוכה (ev): שמונה נרות ושני סביבונים. הן לא נכנסות למשחק רגיל, רק באירוע חנוכה (המנוע מסנן לפי ev)
  (function addHanukTasks() {
    const ids = Object.keys(ROOMS);
    let seed = 20261204;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const fixed = [...TASKS, ...SPOTS, ...VENTS, BUTTON, CAM_CONSOLE, ...SAB_POINTS.lights, ...SAB_POINTS.oxygen, ...SAB_POINTS.reactor, ...SAB_POINTS.freeze];
    const put = (room, name, kind, ev) => {
      const r = ROOMS[room]; let best = null, bs = -1;
      for (let i = 0; i < 400; i++) {
        const x = Math.round(r.x + 45 + rnd() * (r.w - 90)), y = Math.round(r.y + 65 + rnd() * (r.h - 105));
        if (!walkable(x, y)) continue;
        let d = 1e9; for (const q of fixed) d = Math.min(d, Math.hypot(q.x - x, q.y - y));
        if (d > bs) { bs = d; best = { x, y }; }
      }
      if (!best) best = { x: Math.round(r.cx), y: Math.round(r.cy) };
      const T = { room, x: best.x, y: best.y, name, kind, ev }; TASKS.push(T); fixed.push(T);
    };
    for (let i = 0; i < 8; i++) put(ids[i % ids.length], '🕯️ הדלקת נר ' + (i + 1), 'candle', 'candle');
    put(ids[2 % ids.length], '🌀 סביבון', 'dreidel', 'dreidel');
    put(ids[(ids.length >> 1) % ids.length], '🌀 סביבון גדול', 'dreidel', 'dreidel');
    put(ids[3 % ids.length], '🍩 טיגון סופגניות', 'sufganiya', 'hanuk');
    put(ids[5 % ids.length], '🫒 מילוי שמן בחנוכייה', 'oil', 'hanuk');
    put(ids[6 % ids.length], '🪙 גלידת חנוכה – זוגות', 'gelt', 'hanuk');
    put(ids[7 % ids.length], '🕎 זכור את הנרות', 'menorahmem', 'hanuk');
    // משימות פרו (מופיעות רק באתר הפרו)
    [['🧬 ריצוף DNA', 'pairs'], ['🎵 רצף צלילים', 'simon'], ['🎯 כיול לייזר', 'timing'], ['🧲 איסוף שבבים', 'catch'], ['🔢 סידור מספרים', 'sortnum'], ['🧩 פענוח דפוס', 'pattern'], ['⚙️ כוונון מנועים', 'sliders'], ['🧠 חידון חלל', 'quiz']]
      .forEach((q, i) => put(ids[(i * 3 + 1) % ids.length], q[0], q[1], 'pro'));
  })();
  // הגדרה ניתנת לעריכה של המפה (לעורך המודים): בלי משימות החנוכה, וקשרי הוינטים כרשתות
  const _nets = []; VENTS.forEach((v, i) => { if (_nets[i] !== undefined) return; const st = [i]; _nets[i] = i; while (st.length) { const c = st.pop(); (VENTS[c].links || []).forEach(j => { if (_nets[j] === undefined) { _nets[j] = i; st.push(j); } }); } });
  const def = JSON.parse(JSON.stringify({ id: variant || (D && D.id) || 'custom', theme: ice ? 'ice' : 'space', rooms: ROOMS, corr: CORR, tasks: TASKS.filter(t => !t.ev), perRoom: 0, vents: VENTS.map((v, i) => ({ x: v.x, y: v.y, net: _nets[i] })), button: BUTTON, world: WORLD, cams: CAMS, camConsole: CAM_CONSOLE, sab: SAB_POINTS }));
  return { def, ROOMS, CORRIDORS, TASKS, TASK_TIME, VENTS, SPOTS, BUTTON, WORLD, R, CAMS, CAM_CONSOLE, SAB_POINTS, doorRects, walkable, roomAt, path, id: variant || (D && D.id) || 'custom', theme: ice ? 'ice' : 'space' };
  }
  const MAP = build('big'), SMALL = build('small'), ICE = build('ice');
  MAP.byId = { big: MAP, small: SMALL, ice: ICE };
  // מפות מותאמות מהעורך: fromDef בונה, register בונה ורושם (כדי שהמנוע והדפדפן ימצאו אותה לפי מזהה)
  MAP.fromDef = (id, def) => build(null, Object.assign({}, def, { id }));
  MAP.register = (id, def) => { const m = build(null, Object.assign({}, def, { id })); MAP.byId[id] = m; return m; };
  MAP.KINDS = KINDS;
  if (typeof module !== 'undefined' && module.exports) module.exports = MAP;
  else { root.MAP = MAP; root.MAPS = MAP.byId; }
})(this);
