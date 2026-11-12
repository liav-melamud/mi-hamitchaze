// מנוע המשחק – רץ בדפדפן של המארח (או ב-Node)
(function (root) {
function createGame(MAP, opts) {
  opts = opts || {};
const COLORS = [
  { n: 'אדום', c: '#e53935' }, { n: 'כחול', c: '#1e63d6' }, { n: 'ירוק', c: '#22a34a' },
  { n: 'ורוד', c: '#ec5fb5' }, { n: 'כתום', c: '#f08c1e' }, { n: 'צהוב', c: '#f2d22e' },
  { n: 'שחור', c: '#3b3f46' }, { n: 'לבן', c: '#e8edf2' }, { n: 'סגול', c: '#7b3fc9' },
  { n: 'חום', c: '#8a5a33' }, { n: 'תכלת', c: '#36d1d6' }, { n: 'ליים', c: '#9be03a' },
];

const ROLES = {
  crew: { name: 'איש צוות', team: 'crew', desc: 'בצע משימות ומצא את המתחזים.' },
  engineer: { name: 'מהנדס', team: 'crew', desc: 'יכול לזחול בפתחי האוורור (V) כמו המתחזים.' },
  scientist: { name: 'מדען', team: 'crew', desc: 'רואה מכל מקום מי חי ומי מת – לחץ C.' },
  angel: { name: 'מלאך שומר', team: 'crew', desc: 'אחרי שתמות תוכל להגן על שחקן מחיסול – לחץ G לידו.' },
  impostor: { name: 'מתחזה', team: 'imp', desc: 'חסל (Q) את אנשי הצוות בלי להיתפס. אפשר לזחול בפתחים (V).' },
  shifter: { name: 'משנה צורה', team: 'imp', desc: 'מתחזה שיכול להתחפש לשחקן הקרוב (F) ל-20 שניות.' },
  spectator: { name: 'צופה', team: 'none', desc: 'הצטרפת באמצע משחק – צפה עד הסבב הבא.' },
};

const BOT_NAMES = ['בוטי', 'רובי', 'צ׳יפ', 'ננו', 'ביפ', 'זיק', 'פיקסל', 'טורבו', 'גלקסי', 'בורג'];
const BOT_LINES = ['לא אני!', 'הייתי במשימות כל הזמן', 'מי ראה משהו?', 'דלג, אין מספיק מידע', 'זה חשוד…',
  'ראיתי מישהו ליד הפתח', 'אני סומך על כולם 😅', 'בואו נצביע ביחד', 'אני מהצוות, באמת'];

const SPEED = 220, KILL_RANGE = 90, REPORT_RANGE = 110, USE_RANGE = 60;
const KILL_CD = 25, SHIFT_CD = 30, SHIFT_TIME = 20, GA_CD = 30, SHIELD_TIME = 15, TASK_TIME = 2.5;
const MEETING_TIME = 60, EJECT_TIME = 6, HAT_COUNT = 12;
  const taskTime = i => MAP.TASK_TIME[MAP.TASKS[i].kind] || 3.5;
  const isMini = i => !MAP.TASK_TIME[MAP.TASKS[i].kind];

let players = {};
let phase = 'lobby';
let hostId = null;
let settings = { impostors: 1, bots: 4, reveal: false, killCd: 25, speed: 1, vision: 1, tasks: 4, meetingTime: 60, confirm: true, openVotes: true };
let usedLines = new Set();
let gusts = [], windT = 14;
let alertT = 0;
let bodies = [];
let meeting = null, eject = null, winner = null;
let chat = [];
let taskTotal = 0, taskDone = 0;

const now = () => Date.now() / 1000;
const rid = () => Math.random().toString(36).slice(2, 10);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const list = () => Object.values(players);
const humans = () => list().filter(p => !p.isBot);
const team = p => (ROLES[p.role] || ROLES.crew).team;

function freeColor() {
  const used = new Set(list().map(p => p.color));
  const free = COLORS.map((_, i) => i).filter(i => !used.has(i));
  return free.length ? free[0] : 0;
}

function newPlayer(name, color, isBot) {
  const id = rid();
  const p = {
    id, name: String(name || 'שחקן').slice(0, 14), color, isBot,
    x: MAP.BUTTON.x, y: MAP.BUTTON.y, dir: 1, alive: true, role: null, tasks: [],
    input: { dx: 0, dy: 0 }, work: null, killCd: 0, shiftCd: 0, shapeAs: null, shapeUntil: 0,
    shieldUntil: 0, gaCd: 0, emergencyUsed: false, inVent: null, hat: isBot ? 1 + Math.floor(Math.random() * (HAT_COUNT - 1)) : 0, toast: [], conn: !isBot, lastSeen: now(),
    bot: isBot ? { plan: [], wait: 0, goal: null, voteAt: 0, chatAt: 0 } : null,
  };
  players[id] = p;
  return p;
}

function toast(p, text) { if (p && !p.isBot) p.toast.push(text); }
function toastAll(text) { humans().forEach(p => toast(p, text)); }

// ---------- מהלך המשחק ----------
function spawnAround(arr) {
  arr.forEach((p, i) => {
    const a = (i / Math.max(1, arr.length)) * Math.PI * 2;
    p.x = MAP.BUTTON.x + Math.cos(a) * 110;
    p.y = MAP.BUTTON.y + Math.sin(a) * 90;
    p.work = null; p.inVent = null;
    if (p.bot) { p.bot.plan = []; p.bot.wait = 1 + Math.random() * 2; p.bot.goal = null; }
  });
}

function startGame(by) {
  if (by !== hostId || phase !== 'lobby') return;
  Object.values(players).filter(p => p.isBot).forEach(p => delete players[p.id]);
  const names = shuffle(BOT_NAMES.slice());
  for (let i = 0; i < settings.bots && list().length < 12; i++) newPlayer('🤖 ' + names[i], freeColor(), true);
  const all = shuffle(list());
  if (opts.demo) { const me = players[by]; all.splice(all.indexOf(me), 1); all.push(me); } // בדמו: השחקן תמיד איש צוות
  if (all.length < 3) { toast(players[by], 'צריך לפחות 3 שחקנים (אפשר להוסיף בוטים)'); return; }

  const nImp = Math.max(1, Math.min(settings.impostors, Math.floor((all.length - 1) / 2)));
  const imps = all.slice(0, nImp), crew = all.slice(nImp);
  imps.forEach((p, i) => { p.role = (i === 0 && (nImp >= 2 || Math.random() < 0.5)) ? 'shifter' : 'impostor'; });
  const specials = shuffle(['engineer', 'scientist', 'angel']);
  crew.forEach((p, i) => { p.role = i < specials.length && crew.length > 1 ? specials[i] : 'crew'; });

  taskTotal = 0; taskDone = 0;
  all.forEach(p => {
    p.alive = true; p.spectator = false; p.killCd = opts.demo ? 45 : 12; p.shiftCd = 10; p.shapeAs = null; p.gaCd = 0;
    p.shieldUntil = 0; p.emergencyUsed = false; p.toast = [];
    if (team(p) === 'crew') {
      p.tasks = shuffle(MAP.TASKS.map((_, i) => i)).slice(0, settings.tasks).map(i => ({ i, done: false }));
      taskTotal += p.tasks.length;
    } else p.tasks = [];
  });
  bodies = []; meeting = null; eject = null; winner = null; chat = []; usedLines = new Set(); gusts = []; windT = 10 + Math.random() * 8;
  settings.reveal = false;
  spawnAround(all);
  phase = 'play';
}

function backToLobby(by) {
  if (by !== hostId) return;
  Object.values(players).filter(p => p.isBot).forEach(p => delete players[p.id]);
  list().forEach(p => { p.role = null; p.alive = true; p.spectator = false; p.tasks = []; p.shapeAs = null; });
  spawnAround(list());
  phase = 'lobby'; bodies = []; meeting = null; eject = null; winner = null; chat = []; settings.reveal = false;
}

function checkWin() {
  if (phase !== 'play' && phase !== 'eject') return false;
  const alive = list().filter(p => p.alive && !p.spectator);
  const imps = alive.filter(p => team(p) === 'imp').length;
  const crew = alive.filter(p => team(p) === 'crew').length;
  let w = null;
  if (imps === 0) w = { team: 'crew', reason: 'כל המתחזים הודחו!' };
  else if (taskTotal > 0 && taskDone >= taskTotal) w = { team: 'crew', reason: 'הצוות השלים את כל המשימות!' };
  else if (imps >= crew) w = { team: 'imp', reason: 'המתחזים השתלטו על התחנה!' };
  if (w) { winner = w; phase = 'end'; settings.reveal = true; return true; }
  return false;
}

function completeTask(p, t) {
  t.done = true;
  if (team(p) === 'crew') taskDone++;
  toast(p, '✔ ' + MAP.TASKS[t.i].name + ' הושלמה');
  checkWin();
}

function callMeeting(by, body) {
  phase = 'alert'; alertT = 3.2; // מסך הכרזה לפני הישיבה
  let room = 'מסדרון', bodyRoom = null;
  if (body) {
    const br = MAP.roomAt(body.x, body.y);
    if (br) { room = br.name; bodyRoom = br.name; }
    else { // גופה במסדרון: מציינים ליד איזה חדר
      const near = Object.values(MAP.ROOMS).sort((x, y) => dist(body, { x: x.cx, y: x.cy }) - dist(body, { x: y.cx, y: y.cy }))[0];
      room = 'מסדרון ליד ' + near.name;
    }
  }
  meeting = { by: by.id, body: body ? body.id : null, room, votes: {}, t: settings.meetingTime, mentions: {}, skipTalk: 0, bodyRoom, queue: [], suspect: {}, accused: {} };
  chat = [];
  bodies = [];
  list().forEach(p => {
    p.work = null; p.shapeAs = null; p.inVent = null;
    if (p.bot) {
      const T = settings.meetingTime;
      p.bot.chatAt = T - (2 + Math.random() * 8);
      p.bot.chat2At = Math.random() < 0.5 ? T - (12 + Math.random() * 12) : -999;
      p.bot.voteAt = T - (Math.min(T - 5, 16 + Math.random() * 18));
      p.bot.replies = 0; p.bot.replyAt = -999;
    }
  });
}

function resolveMeeting() {
  const voters = list().filter(p => p.alive && !p.spectator);
  const tally = {};
  voters.forEach(v => { const t = meeting.votes[v.id]; if (t) tally[t] = (tally[t] || 0) + 1; });
  let best = null, max = 0, tie = false;
  for (const k in tally) {
    if (tally[k] > max) { max = tally[k]; best = k; tie = false; }
    else if (tally[k] === max) tie = true;
  }
  let ej = null;
  if (best && best !== 'skip' && !tie && players[best]) {
    ej = players[best]; ej.alive = false;
  }
  eject = ej
    ? { id: ej.id, name: ej.name, color: ej.color, role: settings.confirm ? ROLES[ej.role].name : null, team: settings.confirm ? team(ej) : null, tally, t: EJECT_TIME }
    : { id: null, tally, t: EJECT_TIME, tie };
  list().forEach(p => { if (p.bot && ej && (p.bot.sawKill === ej.id || p.bot.sawShift === ej.id)) p.bot.sawKill = p.bot.sawShift = null; });
  // מי הצביע למי (אלא אם ההצבעות אנונימיות)
  if (settings.openVotes) {
    eject.votes = voters.map(v => {
      const t = meeting.votes[v.id];
      const tp = t && t !== 'skip' ? players[t] : null;
      return { n: v.name, c: COLORS[v.color].c, to: !t ? 'none' : t === 'skip' ? 'skip' : 'p', tn: tp ? tp.name : '', tc: tp ? COLORS[tp.color].c : '' };
    });
  }
  meeting = null;
  phase = 'eject';
}

function endEject() {
  eject = null;
  phase = 'play';
  if (checkWin()) return;
  spawnAround(list().filter(p => p.alive));
  list().forEach(p => { if (team(p) === 'imp') p.killCd = Math.max(p.killCd, 15); });
}

// ---------- פעולות ----------
function nearest(p, arr, range) {
  let best = null, bd = range;
  arr.forEach(o => { const d = dist(p, o); if (d <= bd) { bd = d; best = o; } });
  return best;
}

function act(p, a) {
  if (!p) return;
  const t = now();
  switch (a.type) {
    case 'input': {
      const dx = Math.max(-1, Math.min(1, Number(a.dx) || 0));
      const dy = Math.max(-1, Math.min(1, Number(a.dy) || 0));
      p.input = { dx, dy };
      break;
    }
    case 'use': {
      if (phase !== 'play' || p.spectator) return;
      const t0 = p.tasks.filter(x => !x.done).map(x => ({ ...MAP.TASKS[x.i], ref: x }));
      const task = nearest(p, t0, USE_RANGE);
      if (p.inVent !== null) return;
      if (task) { p.work = { ref: task.ref, t: 0, mini: isMini(task.ref.i) }; return; }
      if (p.alive && dist(p, MAP.BUTTON) < 80) {
        if (p.emergencyUsed) return toast(p, 'כבר השתמשת בכפתור החירום');
        p.emergencyUsed = true;
        callMeeting(p, null);
      }
      break;
    }
    case 'kill': {
      if (phase !== 'play' || !p.alive || team(p) !== 'imp' || p.killCd > 0 || p.inVent !== null) return;
      const tgt = nearest(p, list().filter(o => o.alive && !o.spectator && team(o) !== 'imp' && o.inVent === null), KILL_RANGE);
      if (!tgt) return;
      if (tgt.shieldUntil > t) { p.killCd = 10; toast(p, '🛡 המטרה מוגנת על ידי מלאך שומר!'); return; }
      tgt.alive = false; tgt.work = null;
      bodies.push({ id: tgt.id, x: tgt.x, y: tgt.y, color: tgt.color });
      p.x = tgt.x; p.y = tgt.y; p.killCd = settings.killCd;
      // בוטים שראו את החיסול זוכרים מי עשה את זה
      list().forEach(o => {
        if (o.bot && o.alive && o.id !== p.id && team(o) === 'crew' && dist(o, tgt) < 330) {
          o.bot.sawKill = p.id; o.bot.sawVictim = tgt.id; o.bot.plan = [{ x: tgt.x, y: tgt.y }]; o.bot.wait = 0;
        }
      });
      toast(tgt, '💀 חוסלת! עכשיו אתה רוח – אפשר להמשיך במשימות ולצפות בכולם.');
      checkWin();
      break;
    }
    case 'report': {
      if (phase !== 'play' || !p.alive) return;
      const b = nearest(p, bodies, REPORT_RANGE);
      if (b) callMeeting(p, b);
      break;
    }
    case 'vent': {
      if (phase !== 'play' || !p.alive || !['impostor', 'shifter', 'engineer'].includes(p.role)) return;
      if (p.inVent !== null) { p.inVent = null; return; } // יציאה מהפתח
      const v = nearest(p, MAP.VENTS, USE_RANGE);
      if (!v) return;
      p.inVent = MAP.VENTS.indexOf(v); p.x = v.x; p.y = v.y; p.work = null;
      break;
    }
    case 'ventMove': {
      if (phase !== 'play' || p.inVent === null) return;
      const to = Number(a.to);
      if (!MAP.VENTS[p.inVent].links.includes(to)) return;
      p.inVent = to; p.x = MAP.VENTS[to].x; p.y = MAP.VENTS[to].y;
      break;
    }
    case 'finish': {
      if (phase !== 'play' || !p.work || !p.work.mini || p.work.ref.i !== Number(a.i) || p.work.t < 1) return;
      const r = p.work.ref; p.work = null; completeTask(p, r);
      break;
    }
    case 'cancel': p.work = null; break;
    case 'hat': {
      if (phase !== 'lobby') return;
      const h = Number(a.hat);
      if (h >= 0 && h < HAT_COUNT) p.hat = h;
      break;
    }
    case 'shift': {
      if (phase !== 'play' || !p.alive || p.role !== 'shifter') return;
      if (p.shapeAs) { p.shapeAs = null; p.shiftCd = SHIFT_CD; return; }
      if (p.shiftCd > 0) return;
      const tgt = nearest(p, list().filter(o => o.id !== p.id && o.alive && !o.spectator), 5000);
      if (!tgt) return;
      p.shapeAs = tgt.id; p.shapeUntil = t + SHIFT_TIME;
      // בוטים שראו את ההתחפשות יחשפו אותו בישיבה
      list().forEach(o => { if (o.bot && o.alive && o.id !== p.id && team(o) === 'crew' && dist(o, p) < 400) o.bot.sawShift = p.id; });
      toast(p, '🎭 התחפשת ל' + tgt.name);
      break;
    }
    case 'shield': {
      if (phase !== 'play' || p.alive || p.role !== 'angel' || p.gaCd > 0) return;
      const tgt = nearest(p, list().filter(o => o.alive && !o.spectator), 150);
      if (!tgt) return toast(p, 'התקרב לשחקן חי כדי להגן עליו');
      tgt.shieldUntil = t + SHIELD_TIME; p.gaCd = GA_CD;
      toast(p, '🛡 הגנת על ' + tgt.name);
      break;
    }
    case 'vote': {
      if (phase !== 'meeting' || meeting.reveal || !p.alive || p.spectator || meeting.votes[p.id]) return;
      if (a.target !== 'skip' && !(players[a.target] && players[a.target].alive)) return;
      meeting.votes[p.id] = a.target;
      break;
    }
    case 'chat': {
      const text = String(a.text || '').trim().slice(0, 140);
      if (!text) return;
      if (phase === 'meeting' && !p.alive) return;
      if (phase !== 'meeting' && phase !== 'lobby') return;
      say(p, text);
      break;
    }
    case 'reveal':
      if (phase !== 'lobby') settings.reveal = !settings.reveal;
      break;
    case 'settings':
      if (p.id !== hostId || phase !== 'lobby') return;
      settings.impostors = Math.max(1, Math.min(3, Number(a.impostors) || 1));
      settings.bots = Math.max(0, Math.min(9, Number(a.bots) || 0));
      const cl = (v, lo, hi, d) => { v = Number(v); return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
      settings.killCd = cl(a.killCd, 10, 60, 25);
      settings.speed = cl(a.speed, 0.5, 2, 1);
      settings.vision = cl(a.vision, 0.5, 2, 1);
      settings.tasks = Math.round(cl(a.tasks, 1, 8, 4));
      settings.meetingTime = Math.round(cl(a.meetingTime, 20, 180, 60));
      settings.confirm = a.confirm !== false;
      settings.openVotes = a.openVotes !== false;
      break;
    case 'color': {
      if (phase !== 'lobby') return;
      const c = Number(a.color);
      if (c >= 0 && c < COLORS.length && !list().some(o => o.id !== p.id && o.color === c)) p.color = c;
      break;
    }
    case 'start': startGame(p.id); break;
    case 'lobby': backToLobby(p.id); break;
  }
}

// ---------- בוטים ----------
function botGoal(p) {
  const todo = p.tasks.filter(x => !x.done);
  let target;
  if (team(p) === 'crew' && todo.length) {
    const tk = pick(todo); target = { ...MAP.TASKS[tk.i], ref: tk };
  } else {
    const r = pick(Object.values(MAP.ROOMS));
    target = { x: r.cx + (Math.random() - 0.5) * (r.w - 80), y: r.cy + (Math.random() - 0.5) * (r.h - 80), room: r.id };
  }
  const here = MAP.roomAt(p.x, p.y);
  const pts = here ? MAP.path(here.id, target.room) : [];
  p.bot.plan = [...pts, { x: target.x, y: target.y }];
  p.bot.goal = target;
}

function botTick(p, dt) {
  const b = p.bot;
  p.input = { dx: 0, dy: 0 };
  if (phase !== 'play' || p.spectator) return;

  if (p.alive) {
    // זיכרון: איפה ראיתי את מי
    b.seeT = (b.seeT || 0) - dt;
    if (b.seeT <= 0) {
      b.seeT = 1; b.seen = b.seen || {};
      const r = MAP.roomAt(p.x, p.y); if (r) b.lastRoom = r.name;
      list().forEach(o => { if (o.id !== p.id && o.alive && o.inVent === null && dist(o, p) < 320) { const rr = MAP.roomAt(o.x, o.y); if (rr) b.seen[o.id] = rr.name; } });
    }
    // רואים שני שחקנים זהים (משנה צורה) – בורחים, ולפעמים רצים לכפתור החירום
    if (team(p) === 'crew' && !b.flee) {
      const near = list().filter(o => o.id !== p.id && o.alive && o.inVent === null && dist(o, p) < 330);
      const fake = near.find(o => o.shapeAs && players[o.shapeAs] && players[o.shapeAs].alive && near.some(q => q.id === o.shapeAs));
      if (fake) { b.sawShift = fake.id; b.flee = { from: fake.id, t: 4 + Math.random() * 2 }; b.plan = []; b.pressButton = !p.emergencyUsed && Math.random() < 0.6; }
    }
    // מתחזה: חסל כשאין עדים
    if (team(p) === 'imp' && p.killCd <= 0) {
      const tgt = nearest(p, list().filter(o => o.alive && team(o) !== 'imp'), KILL_RANGE);
      if (tgt) {
        const witnesses = list().filter(o => o.alive && o.id !== p.id && o.id !== tgt.id && dist(o, p) < 320);
        if (!witnesses.length && Math.random() < 0.05) { act(p, { type: 'kill' }); return; }
      }
    }
    if (p.role === 'shifter' && !p.shapeAs && p.shiftCd <= 0 && Math.random() < 0.002) act(p, { type: 'shift' });
    // צוות: דווח על גופה
    if (team(p) === 'crew' && bodies.some(bd => dist(bd, p) < REPORT_RANGE - 10) && Math.random() < (b.sawKill ? 0.15 : 0.03)) {
      act(p, { type: 'report' }); return;
    }
  }

  if (b.flee) {
    b.flee.t -= dt;
    const o = players[b.flee.from];
    if (o) { const dx = p.x - o.x, dy = p.y - o.y, l = Math.hypot(dx, dy) || 1; p.input = { dx: dx / l, dy: dy / l, bot: true }; }
    if (b.flee.t <= 0) {
      b.flee = null; b.wait = 0;
      if (b.pressButton) { const h = MAP.roomAt(p.x, p.y); b.plan = [...(h ? MAP.path(h.id, 'F') : []), { x: MAP.BUTTON.x, y: MAP.BUTTON.y }]; }
    }
    return;
  }
  if (b.wait > 0) { b.wait -= dt; return; }
  if (p.work) return;
  if (!b.plan.length && b.pressButton) {
    b.pressButton = false;
    if (dist(p, MAP.BUTTON) < 90) act(p, { type: 'use' });
    return;
  }
  if (!b.plan.length) {
    if (b.goal && b.goal.ref && !b.goal.ref.done && dist(p, b.goal) < USE_RANGE) {
      act(p, { type: 'use' }); b.goal = null; return;
    }
    b.wait = 0.5 + Math.random() * 2.5;
    botGoal(p);
    return;
  }
  const n = b.plan[0];
  const d = dist(p, n);
  if (d < 8) { b.plan.shift(); return; }
  p.input = { dx: (n.x - p.x) / d, dy: (n.y - p.y) / d, bot: true };
}

const bare = n => String(n).replace(/^🤖\s*/, '');
const GENERIC = ['לא אני!', 'הייתי במשימות כל הזמן', 'מי ראה משהו?', 'אין לי מספיק מידע, אני מדלג', 'משהו פה חשוד…',
  'בואו לא נמהר להדיח', 'אני מהצוות, באמת', 'מישהו היה ליד הגופה?', 'כדאי שנסתובב בזוגות', 'בואו נסיים משימות מהר',
  'שמעתי פתח אוורור נפתח…', 'מי עוד לא עשה משימות?', 'מי שעשה סריקה ביולוגית – נקי', 'שקט מדי פה', 'אם אין ראיות – מדלגים',
  'מי היה בחשמל?', 'תזכרו מי הסתובב לבד', 'יש לי תחושה רעה לגבי מישהו', 'שכל אחד יגיד איפה הוא היה', 'הייתי לבד, אבל עשיתי משימות',
  'מישהו ראה מי יצא מהפתח?', 'אני לא מצביע בלי הוכחה', 'בסבב הבא אני עוקב אחרי כולם 👀', 'זה מרגיש כמו מלכודת'];

// הודעה בלי לחזור על אותו משפט באותו משחק
function fresh(lines) {
  const opts = lines.filter(l => !usedLines.has(l));
  const l = pick(opts.length ? opts : lines);
  usedLines.add(l);
  return l;
}
const fill = (tpl, o) => tpl.replace(/\{(\w)\}/g, (_, k) => o[k] || '');

// מוסיף הודעה לצ'אט ומנתח אותה: מי הוזכר, מי ביקש לדלג
function say(p, text, silent) {
  const e = { name: p.name, color: p.color, text, from: p.id, mentions: [] };
  if (meeting) {
    list().forEach(o => {
      const n = bare(o.name);
      if (o.id !== p.id && o.alive && !o.spectator && n.length >= 2 && text.includes(n)) {
        e.mentions.push(o.id);
        meeting.mentions[o.id] = (meeting.mentions[o.id] || 0) + 1;
      }
    });
    if (/דלג|סקיפ|skip/i.test(text)) meeting.skipTalk++;
    // בוטים שהוזכרו יענו
    e.mentions.forEach(id => { const o = players[id]; if (o && o.bot && o.bot.replies < 2 && o.bot.replyAt < -1) o.bot.replyAt = meeting.t - (1.5 + Math.random() * 2.5); });
  }
  chat.push(e);
  if (meeting && !silent && (!p.isBot || team(p) === 'imp')) analyze(p, text);
  if (chat.length > 60) chat.shift();
}


// ---------- ניתוח טענות: בוטים בודקים אליבי ומתנגשים בסתירות ----------
const ALIASES = { 'קפיטריה': 'חדר אוכל', 'קפטריה': 'חדר אוכל', 'נשקייה': 'נשק' };
function roomIn(text) {
  for (const k in ALIASES) if (text.includes(k)) return ALIASES[k];
  const names = Object.values(MAP.ROOMS).map(r => r.name).sort((a, b) => b.length - a.length);
  return names.find(n => text.includes(n)) || null;
}
function queueSay(bot, text, delay) { meeting.queue.push({ id: bot.id, text, at: meeting.t - delay }); }

function analyze(sp, text) {
  const room = roomIn(text);
  if (!room) return;
  const spN = bare(sp.name);
  const named = list().filter(o => o.id !== sp.id && bare(o.name).length >= 2 && text.includes(bare(o.name)));
  const bots = shuffle(list().filter(o => o.isBot && o.alive && o.id !== sp.id && !o.spectator));
  const killWord = /רצח|הרג|חיסל|חוסל|נרצח|גופה|מת /.test(text + ' ');
  let d = 1.5;
  const S = (n) => (meeting.suspect[sp.id] = (meeting.suspect[sp.id] || 0) + n);

  if (killWord && named.length) {
    const victim = named[0], vN = bare(victim.name);
    if (meeting.body === victim.id && meeting.bodyRoom && meeting.bodyRoom !== room) {
      // הטענה סותרת את המקום שבו נמצאה הגופה
      const [a, b] = bots;
      if (a) { queueSay(a, `אבל אני הייתי ב${room} ולא ראיתי שם שום גופה`, d); d += 1.6; }
      if (b) { queueSay(b, `נכון, גם אני הייתי ב${room}. ${vN} נמצא ב${meeting.bodyRoom}`, d); d += 1.6; }
      S(3);
    } else if (victim.alive) {
      const a = bots[0];
      if (a) queueSay(a, `${vN} עומד כאן חי, אז מי רצח אותו בעצם?`, d);
      S(2);
    }
  } else if (/הייתי/.test(text) && !named.length) {
    // אליבי של הדובר עצמו: בוטים שראו אותו מאשרים או מכחישים
    let n = 0;
    for (const b of bots) {
      const seen = b.bot.seen && b.bot.seen[sp.id];
      if (!seen || n >= 2) continue;
      if (seen === room) { queueSay(b, `נכון, ראיתי את ${spN} ב${room}`, d); S(-1); }
      else { queueSay(b, `לא נכון, ראיתי את ${spN} ב${seen}, לא ב${room}`, d); S(2); }
      d += 1.6; n++;
    }
  } else if (/ראיתי|היה/.test(text) && named.length) {
    const x = named[0], xN = bare(x.name);
    let n = 0;
    for (const b of bots) {
      const seen = b.bot.seen && b.bot.seen[x.id];
      if (!seen || n >= 2) continue;
      if (seen === room) queueSay(b, `נכון, גם אני ראיתי את ${xN} ב${room}`, d);
      else { queueSay(b, `ראיתי את ${xN} ב${seen}, לא ב${room}`, d); S(1.5); }
      d += 1.6; n++;
    }
  }
  // מסקנה: מי ששיקר שוב ושוב נחשד כמתחזה
  if ((meeting.suspect[sp.id] || 0) >= 3 && !meeting.accused[sp.id]) {
    meeting.accused[sp.id] = true;
    const c = bots[2] || bots[0];
    if (c) queueSay(c, pick([`אז ${spN} משקר… זה אומר ש${spN} הוא המתחזה! תצביעו עליו!`, `ההסבר של ${spN} לא מסתדר. אני מצביע עליו`, `${spN} סותר את עצמו, חשוד מאוד`]), d + 0.5);
  }
}

function botLine(p) {
  const b = p.bot, name = id => players[id] ? bare(players[id].name) : '';
  const alive = id => players[id] && players[id].alive;
  const myRoom = b.lastRoom || 'חדר האוכל';
  if (team(p) === 'crew' && b.sawShift && alive(b.sawShift)) return fill(fresh(['ראיתי את {n} משנה צורה! הוא מתחזה!', '{n} התחפש למישהו אחר מול העיניים שלי! תצביעו עליו', 'אני בטוח ב-100%: {n} הוא משנה צורה']), { n: name(b.sawShift) });
  if (team(p) === 'crew' && b.sawKill && alive(b.sawKill)) return fill(fresh(['ראיתי את {n} מחסל את {b}! תצביעו עליו!', '{n} הרג את {b} מולי!', 'זה {n}! ראיתי הכל']), { n: name(b.sawKill), b: name(b.sawVictim) });
  if (meeting.by === p.id && meeting.body) return fill(fresh(['מצאתי את {b} ב{r}!', 'הגופה של {b} הייתה ב{r}', 'מישהו היה ב{r} לפני רגע?']), { b: name(meeting.body), r: meeting.room });
  // מתחזה בוט לפעמים מאשים מישהו מהצוות
  if (team(p) === 'imp' && Math.random() < 0.35) {
    const v = list().filter(o => o.alive && !o.spectator && team(o) === 'crew');
    if (v.length) { const o = pick(v); return fill(fresh(['ראיתי את {n} ליד פתח ב{r}', '{n} מתנהג מוזר', '{n} עקב אחריי כל הסבב']), { n: bare(o.name), r: pick(Object.values(MAP.ROOMS)).name }); }
  }
  const seen = Object.keys(b.seen || {}).filter(id => alive(id) && id !== p.id);
  if (seen.length && Math.random() < 0.55) {
    const id = pick(seen);
    return fill(fresh(['ראיתי את {n} ב{r}', '{n} היה ב{r} לא מזמן', 'הייתי עם {n} ב{r}, נראה לי שהוא בסדר', 'אני הייתי ב{m}, ו{n} היה ב{r}']), { n: name(id), r: b.seen[id], m: myRoom });
  }
  return fresh(GENERIC);
}

function botMeeting(p) {
  const b = p.bot;
  if (!p.alive || p.spectator) return;
  const T = meeting.t;
  if (T < b.chatAt) { b.chatAt = -999; say(p, botLine(p)); }
  if (T < b.chat2At) { b.chat2At = -999; say(p, botLine(p)); }
  if (b.replyAt > -1 && T < b.replyAt) {
    b.replyAt = -999; b.replies++;
    const others = list().filter(o => o.alive && o.id !== p.id && !o.spectator);
    const m = others.length ? bare(pick(others).name) : '';
    say(p, fill(fresh(['למה אני? הייתי ב{r}', 'זה לא אני! תבדקו את {m}', 'עשיתי משימות, תשאלו את {m}', 'אני? באמת? הייתי ב{r} כל הזמן', 'אם תדיחו אותי תפסידו 😤']), { r: b.lastRoom || 'חדר האוכל', m }));
  }
  if (T < b.voteAt && !meeting.votes[p.id]) {
    const ok = id => players[id] && players[id].alive && id !== p.id && !(team(p) === 'imp' && team(players[id]) === 'imp');
    let vote = null;
    if (team(p) === 'crew' && b.sawShift && ok(b.sawShift)) vote = b.sawShift;
    else if (team(p) === 'crew' && b.sawKill && ok(b.sawKill)) vote = b.sawKill;
    else {
      const score = {};
      for (const id in meeting.mentions) score[id] = (score[id] || 0) + meeting.mentions[id];
      for (const id in meeting.suspect) score[id] = (score[id] || 0) + meeting.suspect[id] * 1.5;
      const top = Object.entries(score).filter(([id]) => ok(id)).sort((x, y) => y[1] - x[1])[0];
      if (top && top[1] >= 3) vote = top[0];
      else if (top && top[1] >= 2 && Math.random() < 0.7) vote = top[0];
      else if (top && team(p) === 'imp' && Math.random() < 0.6) vote = top[0];
      else if (meeting.skipTalk >= 2 || Math.random() < 0.5) vote = 'skip';
      else { const opts = list().filter(o => ok(o.id) && !o.spectator); vote = opts.length ? pick(opts).id : 'skip'; }
    }
    meeting.votes[p.id] = vote || 'skip';
  }
}

// ---------- לולאת משחק ----------
let last = now();
function tick() {
  const t = now();
  const dt = Math.min(0.1, t - last);
  last = t;

  if (phase === 'play') {
    // רוח מפתחי האוורור: פעם בכמה שניות פתח אחד נושף ודוחף חלש
    windT -= dt;
    if (windT <= 0) { windT = 12 + Math.random() * 14; gusts.push({ i: Math.floor(Math.random() * MAP.VENTS.length), until: t + 3 }); }
    gusts = gusts.filter(g => g.until > t);
    for (const g of gusts) {
      const v = MAP.VENTS[g.i];
      for (const q of list()) {
        if (!q.alive || q.spectator || q.inVent !== null) continue;
        const dx = q.x - v.x, dy = q.y - v.y, l = Math.hypot(dx, dy);
        if (l > 170 || l < 1) continue;
        const f = 60 * (1 - l / 170) * dt;
        const nx = q.x + dx / l * f, ny = q.y + dy / l * f;
        if (MAP.walkable(nx, ny)) { q.x = nx; q.y = ny; }
      }
    }
    for (const p of list()) {
      if (p.isBot) botTick(p, dt);
      if (phase !== 'play') break;
      p.killCd = Math.max(0, p.killCd - dt);
      p.shiftCd = Math.max(0, p.shiftCd - (p.shapeAs ? 0 : dt));
      p.gaCd = Math.max(0, p.gaCd - dt);
      if (p.shapeAs && (t > p.shapeUntil || !players[p.shapeAs])) { p.shapeAs = null; p.shiftCd = SHIFT_CD; }

      let { dx, dy } = p.input;
      const len = p.inVent !== null ? 0 : Math.hypot(dx, dy);
      if (len > 0) {
        dx /= len; dy /= len;
        const step = SPEED * settings.speed * dt;
        if (!p.alive || p.spectator) {
          p.x = Math.max(0, Math.min(MAP.WORLD.w, p.x + dx * step));
          p.y = Math.max(0, Math.min(MAP.WORLD.h, p.y + dy * step));
        } else {
          if (MAP.walkable(p.x + dx * step, p.y)) p.x += dx * step;
          if (MAP.walkable(p.x, p.y + dy * step)) p.y += dy * step;
        }
        if (Math.abs(dx) > 0.1) p.dir = dx > 0 ? 1 : -1;
        p.work = null;
      }
      if (p.work) {
        const tk = MAP.TASKS[p.work.ref.i];
        if (dist(p, tk) > USE_RANGE + 5 || p.work.ref.done) p.work = null;
        else {
          p.work.t += dt;
          if ((!p.work.mini || p.isBot) && p.work.t >= (p.isBot && p.work.mini ? 3.5 : taskTime(p.work.ref.i))) { const r = p.work.ref; p.work = null; completeTask(p, r); if (phase !== 'play') break; }
        }
      }
    }
  } else if (phase === 'alert') {
    alertT -= dt;
    if (alertT <= 0) phase = 'meeting';
  } else if (phase === 'meeting' && meeting.reveal) {
    // מסך חשיפת ההצבעות: רואים מי הצביע למי לפני ההדחה
    meeting.reveal -= dt;
    if (meeting.reveal <= 0) resolveMeeting();
  } else if (phase === 'meeting') {
    meeting.t -= dt;
    list().filter(p => p.isBot).forEach(botMeeting);
    meeting.queue.sort((x, y) => y.at - x.at);
    while (meeting.queue.length && meeting.t <= meeting.queue[0].at) {
      const q = meeting.queue.shift(), o = players[q.id];
      if (o && o.alive) say(o, q.text, true);
    }
    const voters = list().filter(p => p.alive && !p.spectator);
    if (meeting.t <= 0 || voters.every(v => meeting.votes[v.id])) { meeting.t = Math.max(0, meeting.t); meeting.reveal = settings.openVotes ? 5 : 1.2; }
  } else if (phase === 'eject') {
    eject.t -= dt;
    if (eject.t <= 0) endEject();
  }

  // ניתוק שחקנים בלובי
  if (phase === 'lobby') {
    humans().forEach(p => { if (!p.conn && t - p.lastSeen > 10) delete players[p.id]; });
  }
  if (!players[hostId] || !players[hostId].conn) {
    const h = humans().find(p => p.conn);
    if (h) hostId = h.id;
  }
}

// ---------- תצוגה לכל שחקן ----------
function viewFor(v) {
  const t = now();
  const seeAll = settings.reveal || phase === 'end' || (!v.alive && phase !== 'lobby');
  const showRoles = phase !== 'lobby';
  const ps = [];
  for (const p of list()) {
    if (phase === 'play' && !p.alive && v.alive && p.id !== v.id) continue; // רוחות נסתרות מהחיים
    if (p.inVent !== null && p.id !== v.id && !seeAll && !(team(v) === 'imp' && team(p) === 'imp')) continue; // בתוך פתח – בלתי נראה
    const disp = p.shapeAs && players[p.shapeAs] ? players[p.shapeAs] : p;
    const o = {
      id: p.id, x: Math.round(p.x), y: Math.round(p.y), dir: p.dir, name: disp.name, color: COLORS[disp.color].c,
      alive: p.alive, spec: !!p.spectator, bot: p.isBot, work: p.work && !p.work.mini ? p.work.t / taskTime(p.work.ref.i) : 0, hat: disp.hat,
      scan: p.work && MAP.TASKS[p.work.ref.i].kind === 'scan' ? 1 : 0, vent: p.inVent !== null ? 1 : 0,
    };
    if (p.shieldUntil > t) o.shield = 1;
    if (showRoles && p.role && (seeAll || p.id === v.id || (team(v) === 'imp' && team(p) === 'imp'))) {
      o.role = ROLES[p.role].name; o.team = team(p);
      if (p.shapeAs) o.realName = p.name;
    }
    ps.push(o);
  }
  const me = {
    id: v.id, alive: v.alive, spec: !!v.spectator, role: v.role ? ROLES[v.role].name : null, roleKey: v.role,
    team: v.role ? team(v) : null, desc: v.role ? ROLES[v.role].desc : '',
    tasks: v.tasks.map(x => ({ name: MAP.TASKS[x.i].name, i: x.i, done: x.done })),
    killCd: Math.ceil(v.killCd), shiftCd: Math.ceil(v.shiftCd), shifted: !!v.shapeAs, gaCd: Math.ceil(v.gaCd),
    emergencyUsed: v.emergencyUsed, work: v.work && !v.work.mini ? v.work.t / taskTime(v.work.ref.i) : 0,
    mini: v.work && v.work.mini ? v.work.ref.i : null, inVent: v.inVent, hat: v.hat, host: v.id === hostId,
    color: v.color,
  };
  const out = {
    phase, me, players: ps, settings, hostId,
    bodies: bodies.map(b => ({ x: Math.round(b.x), y: Math.round(b.y), color: COLORS[b.color].c })),
    tasks: { done: taskDone, total: taskTotal },
    gusts: gusts.map(g => g.i),
    toast: v.toast.splice(0),
    roster: list().map(p => ({ id: p.id, name: p.name, color: COLORS[p.color].c, alive: p.alive, spec: !!p.spectator, bot: p.isBot, colorIdx: p.color, hat: p.hat })),
    chat,
  };
  if (v.role === 'scientist' || seeAll) out.vitals = list().filter(p => !p.spectator).map(p => ({ name: p.name, color: COLORS[p.color].c, alive: p.alive }));
  if (meeting) {
    const by = players[meeting.by];
    const body = meeting.body && players[meeting.body];
    out.meeting = {
      t: Math.ceil(meeting.t), by: by ? by.name : '', body: body ? body.name : null, room: meeting.room, bodyRoom: meeting.bodyRoom,
      voted: Object.keys(meeting.votes), myVote: meeting.votes[v.id] || null,
      reveal: !!meeting.reveal,
      votes: meeting.reveal && settings.openVotes ? Object.entries(meeting.votes).map(([id, to]) => ({ c: players[id] ? COLORS[players[id].color].c : '#888', to })) : null,
    };
  }
  if (phase === 'alert' && meeting) {
    const by = players[meeting.by], body = meeting.body && players[meeting.body];
    out.alert = { name: by ? by.name : '', color: by ? COLORS[by.color].c : '#fff', hat: by ? by.hat : 0,
      body: !!body, bodyName: body ? body.name : null, bodyColor: body ? COLORS[body.color].c : null, room: meeting.room };
  }
  if (eject) out.eject = eject;
  if (winner) out.winner = winner;
  if (phase === 'lobby') out.colors = COLORS;
  return out;
}


  function join(name, id) {
    if (id && players[id]) { players[id].conn = true; return id; }
    const p = newPlayer(name, freeColor(), false);
    if (phase !== 'lobby') { p.alive = false; p.spectator = true; p.role = 'spectator'; }
    if (!hostId || !players[hostId]) hostId = p.id;
    return p.id;
  }
  function setConn(id, on) { const p = players[id]; if (p) { p.conn = on; p.lastSeen = now(); } }
  function setHost(id) { hostId = id; }
  return { join, act: (id, a) => act(players[id], a), view: id => players[id] ? viewFor(players[id]) : null, tick, setConn, setHost };
}
if (typeof module !== 'undefined' && module.exports) module.exports = createGame;
else root.createGame = createGame;
})(this);
