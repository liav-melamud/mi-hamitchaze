// מנוע המשחק – רץ בדפדפן של המארח (או ב-Node)
(function (root) {
// "ראש תפוח אדמה" מפעיל את מצב האדמין, "אקסטרה ראש תפוח אדמה" מבטל. מחזיר true/false, או null אם זה לא המשפט.
function adminPhrase(text) {
  const t = String(text).replace(/[^\u0590-\u05FFa-z\s]/gi, ' ').replace(/\s+/g, ' ').toLowerCase();
  if (!/ראש ?תפוח(י)? ?אדמה/.test(t)) return null;
  return !/(אקסטרה|אקסטרא|אקסטרע|extra)/.test(t);
}
function createGame(MAP, opts) {
  const MAPS = MAP.byId || { big: MAP }, MAPREG = MAP.register || null;
  opts = opts || {};
const COLORS = [
  { n: 'אדום', c: '#e53935' }, { n: 'כחול', c: '#1e63d6' }, { n: 'ירוק', c: '#22a34a' },
  { n: 'ורוד', c: '#ec5fb5' }, { n: 'כתום', c: '#f08c1e' }, { n: 'צהוב', c: '#f2d22e' },
  { n: 'שחור', c: '#3b3f46' }, { n: 'לבן', c: '#e8edf2' }, { n: 'סגול', c: '#7b3fc9' },
  { n: 'חום', c: '#8a5a33' }, { n: 'תכלת', c: '#36d1d6' }, { n: 'ליים', c: '#9be03a' },
  { n: 'אפור', c: '#8d96a0' }, { n: 'בורדו', c: '#8c1d40' }, { n: 'כחול כהה', c: '#23338f' },
  { n: 'זית', c: '#6b7a2a' }, { n: 'אפרסק', c: '#f6b38a' }, { n: 'טורקיז', c: '#12907e' },
];
const MAX_HUMANS = 15, MAX_BOTS = 15; // עד 15 שחקנים ועד 15 בוטים

const ROLES = {
  crew: { name: 'איש צוות', team: 'crew', desc: 'בצע משימות ומצא את המתחזים.' },
  engineer: { name: 'מהנדס', team: 'crew', desc: 'יכול לזחול בפתחי האוורור (V) כמו המתחזים.' },
  scientist: { name: 'מדען', team: 'crew', desc: 'רואה מכל מקום מי חי ומי מת – לחץ C.' },
  angel: { name: 'מלאך שומר', team: 'crew', desc: 'אחרי שתמות תוכל להגן על שחקן מחיסול – לחץ G לידו.' },
  impostor: { name: 'מתחזה', team: 'imp', desc: 'חסל (Q) את אנשי הצוות בלי להיתפס. אפשר לזחול בפתחים (V).' },
  shifter: { name: 'משנה צורה', team: 'imp', desc: 'מתחזה שיכול להתחפש לשחקן הקרוב (F) ל-20 שניות.' },
  photographer: { name: 'הצלם', team: 'crew', desc: 'צלם (P) שחקנים וגופות שלידך. בישיבה אפשר להציג את התמונות כראיה.' },
  detective: { name: 'בלש', team: 'crew', desc: 'חקור (I) שחקן קרוב: תגלה אם הוא היה ליד זירת חיסול.' },
  judge: { name: 'שופט', team: 'crew', desc: 'אחרי שסיימת את כל המשימות שלך, פעם אחת במשחק אפשר לפסוק בישיבה (⚖️): הפטיש יורד והשחקן שבחרת מודח מיד, בלי הצבעה. ההצבעה הרגילה שלך שווה קול אחד. תיזהר – פסק דין על חף מפשע הוא טעות.' },
  phantom: { name: 'נעלם', team: 'imp', desc: 'היעלם (H) ל-8 שניות: אף אחד לא רואה אותך, אבל אי אפשר לחסל בזמן ההיעלמות.' },
  viper: { name: 'מרקיב', team: 'imp', desc: 'הגופות של מי שחיסלת מתפרקות אחרי 8 שניות, ואי אפשר לדווח עליהן.' },
  bodyguard: { name: 'שומר ראש', team: 'crew', desc: 'הגן (B) על שחקן קרוב ל-20 שניות: ניסיון חיסול שלו ייכשל, ותקבל התראה.' },
  saboteur: { name: 'מחבל', team: 'imp', desc: 'אתה לא מחסל – אתה מומחה חבלות: חבלה כל 15 שניות (במקום 30), למשברים שלך יש רק 30 שניות לתיקון (במקום 45), ונועל דלתות עם חצי זמן המתנה. עוזר לשותף שלך לנצח.' },
  poltergeist: { name: 'רדוף', team: 'imp', desc: 'אתה לא מחסל – אתה רוח רפאים ששולטת בתחנה: נעל דלת אחת (J) ל-8 שניות, כבה את האור בחדר שאתה נמצא בו (L) ל-15 שניות, וגרור גופה (Z) למקום מחבוא. לכלוא קורבן בחדר חשוך בשביל השותף שלך. נעילה וכיבוי אור עובדים גם אחרי שאתה מת.' },
  jester: { name: 'הליצן', team: 'jester', desc: 'אתה לא צוות ולא מתחזה 🤡 המטרה שלך: שידיחו אותך בישיבה – ואז אתה מנצח לבד! יכולות: זחילה בפתחי אוורור (V) כדי שיחשדו בך, קליפת בננה (K) שמי שדורך עליה מחליק, וגופה מזויפת (T) שמכנסת ישיבה. אין לך משימות. אם מחסלים אותך – הפסדת.' },
  guardian: { name: 'מגן אישי', team: 'crew', desc: 'יש לך שחקן אחד לשמור עליו (רואים אותו בכרטיס התפקיד). אפשר להחליף אותו פעם אחת – עמוד ליד שחקן ולחץ U. אם הוא נהרג, תקבל התראה ותדע באיזה חדר זה קרה.' },
  mole: { name: 'שתול', team: 'mole', desc: 'אתה נראה כמו איש צוות – גם הבלש רואה אותך נקי. אתה יודע מי המתחזים, אבל הם לא יודעים מי אתה (והם יכולים לחסל גם אותך!). אין לך חיסול: עזור להם מבפנים – בלבל בישיבות והגן עליהם. אתה מנצח רק אם המתחזים מנצחים. המשימות שלך מזויפות ולא נספרות.' },
  timekeeper: { name: 'שומר הזמן', team: 'crew', desc: 'פעם אחת במשחק: החזר את כולם 10 שניות אחורה (Y). כל מי שחוסל ב-10 השניות האלה חוזר לחיים, וכולם חוזרים למקום שבו היו.' },
  noisemaker: { name: 'רעשן', team: 'imp', desc: 'מתחזה שיכול להשמיע רעש מזויף של צעדים (N) בחדר אחר, כדי למשוך לשם את הצוות ולהישאר לבד עם קורבן.' },
  seeker: { name: 'המחפש', team: 'imp', desc: 'מחבואים: כולם יודעים שאתה המחפש! תפוס (Q) את כל המתחבאים לפני שהזמן נגמר או שהם מסיימים את המשימות. אתה קצת יותר מהיר, אבל יוצא לחפש רק אחרי 10 שניות.' },
  spectator: { name: 'צופה', team: 'none', desc: 'הצטרפת באמצע משחק – צפה עד הסבב הבא.' },
};

// התיאור של התפקיד עם המספרים מההגדרות
const roleDesc = r => {
  const d = ROLES[r].desc, S = settings;
  if (r === 'engineer') return d + (S.engVent ? ` עד ${S.engVent} שניות בכל פעם` : '') + (S.engVentCd ? `, ואז ${S.engVentCd} שניות המתנה.` : '');
  if (r === 'timekeeper') return d.replace(/10 שניות/g, S.rewindSecs + ' שניות');
  if (r === 'noisemaker') return d + ` אפשר פעם ב-${S.noiseCd} שניות.`;
  return d.replace('ל-20 שניות.', 'ל-' + (r === 'shifter' ? S.shiftTime : S.guardTime) + ' שניות.').replace('ל-8 שניות', 'ל-' + S.vanishTime + ' שניות').replace('אחרי 8 שניות', 'אחרי ' + S.rotTime + ' שניות');
};
const BOT_NAMES = ['בוטי', 'רובי', 'צ׳יפ', 'ננו', 'ביפ', 'זיק', 'פיקסל', 'טורבו', 'גלקסי', 'בורג', 'ג׳ט', 'מגנט', 'רדאר', 'קוונטי', 'סטאר'];
const BOT_LINES = ['לא אני!', 'הייתי במשימות כל הזמן', 'מי ראה משהו?', 'דלג, אין מספיק מידע', 'זה חשוד…',
  'ראיתי מישהו ליד הפתח', 'אני סומך על כולם 😅', 'בואו נצביע ביחד', 'אני מהצוות, באמת'];

const SPEED = 220, KILL_RANGE = 90, REPORT_RANGE = 110, USE_RANGE = 60;
const KILL_CD = 25, SHIFT_CD = 30, SHIFT_TIME = 20, GA_CD = 30, SHIELD_TIME = 15, TASK_TIME = 2.5;
const MEETING_TIME = 60, EJECT_TIME = 6, HAT_BASE = 12, HAT_COUNT = 14, PRO_HAT_COUNT = 22, PET_BASE = 9, PET_COUNT = 11; // כובעים וחיות מחמד: הבסיס, ועם פריטי חנוכה
// הגדרות תפקידים (כמו במשחק האמיתי): [ברירת מחדל, מינימום, מקסימום]
const ROLE_SET = {
  engVent: [15, 0, 60], engVentCd: [15, 0, 60],       // מהנדס: כמה זמן אפשר להיות בפתח (0 = בלי הגבלה), והמתנה בין זחילות
  vanishTime: [8, 3, 30], vanishCd: [25, 5, 60],      // נעלם
  shiftTime: [20, 5, 60], shiftCd: [30, 5, 60],       // משנה צורה
  shieldTime: [15, 5, 60], gaCd: [30, 5, 60],         // מלאך שומר
  guardTime: [20, 5, 60], guardCd: [50, 10, 90],      // שומר ראש
  photoCd: [25, 5, 60], investCd: [35, 5, 90],        // צלם, בלש
  rotTime: [8, 3, 30],                                // מרקיב: אחרי כמה זמן הגופה נעלמת
  bananaCd: [15, 5, 60], fakeCd: [45, 10, 120],       // ליצן
  noiseCd: [30, 10, 90], rewindSecs: [10, 5, 20],      // רעשן, שומר הזמן
};
// תפקידים שאפשר לכבות אחד-אחד בהגדרות (המתחזה ואיש הצוות הרגילים תמיד קיימים, לליצן יש מתג משלו)
const TOGGLE_ROLES = ['engineer', 'scientist', 'angel', 'photographer', 'detective', 'judge', 'bodyguard', 'guardian', 'timekeeper', 'shifter', 'phantom', 'viper', 'noisemaker', 'saboteur', 'poltergeist', 'mole'];
const roleOn = k => !(settings.roleOff || []).includes(k);
// ---- מודים: 20 תפקידים נוספים, נפתחים רק עם הקוד 54321 בלובי ----
const PRO_OPEN = ['54321', '8888', '12345']; // בגרסת פרו המודים, אירוע חנוכה ומחבואים תמיד פתוחים
const proCode = c => !!(typeof opts !== 'undefined' && opts && opts.pro) && hasCode(c); // קודי פרו עובדים רק באתר הפרו
const CODE_ALIAS = { '5555': ['3000', '1000'] }; // 5555 = שילוב של כמה קודים
const hasCode = c => {
  if (typeof opts !== 'undefined' && opts && opts.pro && PRO_OPEN.includes(c)) return true;
  const have = String(settings.code || '').split(/[\s,]+/);
  return have.includes(c) || have.some(h => (CODE_ALIAS[h] || []).includes(c));
};
const modsOn = () => hasCode('54321');
const hanukOn = () => !!(typeof opts !== 'undefined' && opts && (typeof opts.hanuk === 'function' ? opts.hanuk() : opts.hanuk)) || hasCode('8888'); // אירוע חנוכה: בתאריכים, או תמיד עם הקוד 8888
const jesterOn = () => modsOn() && settings.jester; // הליצן נפתח רק עם הקוד 54321
const MOD = { // [שם, קבוצה, אייקון, כפתור, קירור, מספר שימושים (0 = ללא הגבלה), תיאור]
  sprinter: ['רץ', 'crew', '🏃', 'ספרינט', 30, 0, 'לחץ O כדי לרוץ מהר פי 1.7 למשך 5 שניות (אחרי זה 30 שניות המתנה). מעולה לברוח – או להגיע לגופה לפני כולם.'],
  medic: ['רופא', 'crew', '🩺', 'החייאה', 0, 1, 'פעם אחת במשחק: עמוד ליד גופה ולחץ O – השחקן חוזר לחיים במקום. אבל כל החיבורים בסביבה יראו אותך שם…'],
  scout: ['סייר', 'crew', '🔭', '', 0, 0, 'ראיית הלילה שלך חדה: טווח הראייה שלך גדול ב-40% מכולם. תפקיד פסיבי.'],
  lucky: ['בר מזל', 'crew', '🍀', '', 0, 0, 'מזל! ניסיון החיסול הראשון עליך נכשל (ואתה מקבל התראה), אחרי זה אתה כמו כולם. תפקיד פסיבי.'],
  trapper: ['מלכודן', 'crew', '🪤', 'מלכודת', 8, 2, 'שים עד 2 מלכודות בלתי נראות (O). מי שדורך על אחת קופא ל-5 שניות, ואתה מקבל הודעה מי נתפס ואיפה.'],
  radar: ['מכ"ם', 'crew', '📡', 'סרוק', 45, 3, 'לחץ O: למשך 5 שניות אתה רואה נקודות של כל השחקנים החיים על המפה, גם דרך קירות. 3 פעמים במשחק.'],
  taskmaster: ['אשף משימות', 'crew', '⚡', '', 0, 0, 'כל המשימות שלך נגמרות בחצי מהזמן. תפקיד פסיבי.'],
  jailer: ['סוהר', 'crew', '🔒', 'נעל חדר', 45, 0, 'לחץ O כדי לנעול את הדלתות של החדר שאתה בו (כמו מחבל) – תופס מתחזה בפנים, או חוסם מסלול בריחה.'],
  empath: ['רגיש', 'crew', '😨', 'חוש', 25, 0, 'לחץ O: תקבל הרגשה אם יש מתחזה (או שתול) במרחק של כ-260 מסביבך. לא אומר מי.'],
  sniper: ['צלף', 'imp', '🎯', '', 0, 0, 'מתחזה שמחסל (Q) מרחוק – כמעט פי 2 טווח. אבל אחרי כל חיסול ההמתנה ארוכה ב-40%.'],
  poisoner: ['מרעיל', 'imp', '☠️', '', 0, 0, 'החיסול שלך (Q) מרעיל: הקורבן מת רק 12 שניות אחרי, במקום אחר – ויש לך זמן להתרחק. הקורבן יודע שהורעל.'],
  blinker: ['מתעתע', 'imp', '🌀', 'שיגור', 40, 0, 'מתחזה שיכול להשתגר (O) לחדר אקראי אחר על המפה. מעולה לבריחה מזירה.'],
  cleaner: ['מנקה', 'imp', '🧹', 'נקה גופה', 30, 0, 'מתחזה שיכול לנקות (O) גופה קרובה – כך אי אפשר לדווח עליה.'],
  zapper: ['חשמלאי', 'imp', '⚡', 'שוק', 40, 0, 'מתחזה: לחץ O כדי להקפיא לכ-3.5 שניות את כל אנשי הצוות שבטווח 170 מסביבך.'],
  vampire: ['ערפד', 'imp', '🧛', '', 0, 0, 'מתחזה שמתחזק מדם: אחרי כל חיסול ההמתנה לחיסול הבא קצרה ב-40%. תפקיד פסיבי.'],
  bomber: ['מפוצץ', 'imp', '💣', 'פצצה', 0, 1, 'מתחזה: פעם אחת במשחק הנח פצצה (O) – אחרי 6 שניות היא מתפוצצת ומחסלת כל איש צוות בטווח 110. כולם רואים אותה!'],
  martyr: ['קורבן', 'jester', '🕊️', '', 0, 0, 'אתה לא צוות ולא מתחזה: אתה מנצח לבד אם חיסלו אותך (על ידי מתחזה)! הצטרף לחשד, תסתובב ליד מתחזים… אבל אל תיתן להדיח אותך.'],
  vulture: ['נשר', 'jester', '🦅', 'אכול גופה', 5, 0, 'אתה לא צוות ולא מתחזה: אכול (O) 3 גופות ותנצח לבד! הגופה נעלמת, ואי אפשר לדווח עליה.'],
  survivor: ['ניצול', 'jester', '🛟', '', 0, 0, 'אתה לא צוות ולא מתחזה: אם אתה בחיים בסוף המשחק – אתה מנצח גם, בלי קשר למי שניצח! תישאר חי.'],
  shamash: ['השמש', 'crew', '🕎', 'נס פח השמן', 0, 1, 'תפקיד חנוכה: פעם אחת במשחק, לחץ O כדי להדליק אור קסום במקום שבו אתה עומד. ל-15 שניות אף אחד בתוך האור לא יכול להיחסל – גם לא אתה. תדליק אותו כשהמתחזה קרוב!'],
  instigator: ['מסית', 'jester', '🗣️', '', 0, 0, 'אתה לא צוות ולא מתחזה: אם תצליח לגרום להדחה של 2 אנשי צוות חפים מפשע – ואתה עדיין בחיים – אתה מנצח לבד!'],
};
const MOD_CREW = Object.keys(MOD).filter(k => MOD[k][1] === 'crew' && k !== 'shamash'), MOD_IMP = Object.keys(MOD).filter(k => MOD[k][1] === 'imp'), MOD_NEU = Object.keys(MOD).filter(k => MOD[k][1] === 'jester');
for (const k in MOD) { ROLES[k] = { name: MOD[k][0], team: MOD[k][1], desc: MOD[k][6], mod: true }; TOGGLE_ROLES.push(k); }
// ---- תפקידים מותאמים (מעורך המודים): תפקיד חדש = תבנית יכולת קיימת + שם, אייקון, זמנים ותיאור משלו ----
const tplOf = r => (MOD[r] && MOD[r].tpl) || r;      // התבנית (ההתנהגות) של תפקיד: למותאם זו התבנית שנבחרה
const CUSTOM = { crew: [], imp: [], jester: [] };   // התפקידים המותאמים הפעילים, לפי קבוצה
const customDefs = {}, customMapDefs = {};
const modDur = (r, d) => (MOD[r] && MOD[r].dur) || d;
const cleanTxt = (v, n) => String(v === undefined || v === null ? '' : v).replace(/[<>\u0000-\u001f\u202a-\u202e]/g, '').trim().slice(0, n);
function clearCustomRoles() { for (const k of Object.keys(customDefs)) { delete MOD[k]; delete ROLES[k]; const i = TOGGLE_ROLES.indexOf(k); if (i >= 0) TOGGLE_ROLES.splice(i, 1); delete customDefs[k]; } CUSTOM.crew = []; CUSTOM.imp = []; CUSTOM.jester = []; }
function addCustomRole(d) {
  const tpl = typeof d.tpl === 'string' && Object.prototype.hasOwnProperty.call(MOD, d.tpl) && !(MOD[d.tpl].custom) ? d.tpl : null;
  const id = cleanTxt(d.id, 12).replace(/[^\w]/g, '');
  if (!tpl || !id) return null;
  const base = MOD[tpl], key = 'x_' + id, num = (v, lo, hi, def) => { v = Number(v); return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : def; };
  const name = cleanTxt(d.name, 14) || base[0], icon = cleanTxt(d.icon, 4) || base[2];
  const cd = num(d.cd, 0, 120, base[4]), uses = Math.round(num(d.uses, 0, 9, base[5])), dur = num(d.dur, 1, 60, 0);
  const desc = cleanTxt(d.desc, 260) || base[6];
  MOD[key] = [name, base[1], icon, base[3] ? (cleanTxt(d.btn, 14) || base[3]) : '', cd, uses, desc]; MOD[key].tpl = tpl; MOD[key].dur = dur; MOD[key].custom = true;
  ROLES[key] = { name, team: base[1], desc, mod: true, custom: true };
  TOGGLE_ROLES.push(key); customDefs[key] = d;
  CUSTOM[base[1]].push(key);
  return key;
}
let rewound = {}; // מי חזר לחיים בהחזרת זמן ומי הרג אותו (כולם יודעים שהוא חזר, ולכן אפשר להאמין לו)
let miracles = [], candleLit = {}; // נס פח השמן של השמש, ונרות החנוכה במצב שמונה נרות
let traps = [], bombs = [], wrongEjects = 0, lastRoles = {};
  // רמת אורך משימות (1 קל, 2 רגיל, 3 ארוך): מאריכה משימות עם פס התקדמות, ומשימות של בוטים
  const taskTime = i => (MAP.TASK_TIME[MAP.TASKS[i].kind] || 3.5) * (0.5 + settings.taskLevel * 0.75);
  const botTaskTime = () => (4 + 4 * settings.taskLevel) * (settings.botLevel === 1 ? 1.3 : settings.botLevel === 3 ? 0.8 : 1);
  // בקבוצה קטנה למתחזה קשה יותר, אז זמן ההמתנה בין חיסולים מתקצר קצת
  const HIDE_VENTS = 5, HIDE_VENT_TIME = 15, HIDE_SPOT_TIME = 25, HIDE_SPOT_CD = 6;
let pings = [], pingId = 0; // רעשים של פתחי אוורור/מחבואים (מחבואים בלבד)
let hideFinalSaid = false;
const finalPhase = () => settings.mode === 3 && phase === 'play' && hideEndAt > 0 && hideEndAt - now() <= 30;
const spotsOn = () => settings.mode === 3 && settings.code === '12345'; // מקומות מסתור: רק עם הקוד בלובי
const SPOTS = () => (spotsOn() ? MAP.SPOTS : []);
const addPing = (x, y, by) => { pings.push({ id: ++pingId, x, y, by, until: now() + 3 }); };
  const killCdFor = () => { if (settings.mode === 3) return 1;  const n = Object.values(players).filter(q => !q.spectator).length; return settings.killCd * (n <= 5 ? 0.7 : n <= 7 ? 0.85 : 1); };
  const isMini = i => !MAP.TASK_TIME[MAP.TASKS[i].kind];

let players = {};
let phase = 'lobby';
let lobbyCache = null;
let hostId = null;
let settings = { rounds: 1, hideTime: 180, impostors: 1, bots: 4, reveal: false, killCd: 25, speed: 1, vision: 1, tasks: 4, meetingTime: 60, confirm: true, openVotes: true, taskLevel: 2, newRoles: true, botLevel: 2, map: 'big', mode: 1, code: '', raceGoal: 10, locked: false, jester: true };
for (const k in ROLE_SET) settings[k] = ROLE_SET[k][0];
settings.roleOff = [];
let usedLines = new Set();
let lastMistake = null;
let jesterHint = false; // נמצאה גופה מזויפת במשחק: הבוטים יודעים שיש ליצן // ישיבה קודמת: מי דחף להדיח איש צוות
let gusts = [], windT = 14;
// חבלות: sab = משבר פעיל (חשמל/חמצן/כור), דלתות סגורות לפי חדר
let sab = null, sabCd = 20, doorsUntil = {}, doorCool = {};
// הרדוף: דלתות בודדות נעולות וחדרים חשוכים
let hauntDoors = [], darkRooms = {};
let events = [], gameStartT = 0, raceEndAt = 0, raceChaosAt = 0;
const ev = (type, text) => { events.push({ t: Math.max(0, Math.round(now() - gameStartT)), type, text }); if (events.length > 300) events.shift(); };
const nm = p => String(p.name).replace(/^🤖\s*/, '');
const SAB_TIME = 45, SAB_CD = 30, DOOR_TIME = 12, DOOR_COOL = 20;
const SAB_WIN = { oxygen: 'האוויר בתחנה נגמר!', reactor: 'הכור התפוצץ!' };
const NON_KILLERS = ['saboteur', 'poltergeist']; // תפקידי מתחזים שלא מחסלים
const HAUNT_DOOR_TIME = 8, HAUNT_DOOR_CD = 20, HAUNT_DOOR_RANGE = 320, DARK_TIME = 15, DARK_CD = 30, DRAG_TIME = 6, DRAG_DIST = 280, DRAG_CD = 20;
const doorBlocked = (x, y) => {
  const tN = now();
  for (const d of hauntDoors) if (d.until > tN && x > d.x - 18 && x < d.x + d.w + 18 && y > d.y - 18 && y < d.y + d.h + 18) return true;
  for (const rid in doorsUntil) {
    if (doorsUntil[rid] <= tN) continue;
    for (const d of MAP.doorRects(rid)) if (x > d.x - 18 && x < d.x + d.w + 18 && y > d.y - 18 && y < d.y + d.h + 18) return true;
  }
  return false;
};
// מחבל (strong): המשברים שלו קשים יותר – 30 שניות לתקן במקום 45
const SAB_TIME_STRONG = 30;
function startSab(kind, force, strong) {
  if (sab || (sabCd > 0 && !force)) return;
  const secs = strong ? SAB_TIME_STRONG : SAB_TIME;
  sab = { type: kind, t: kind === 'lights' || kind === 'freeze' ? 0 : secs, fixed: MAP.SAB_POINTS[kind].map(() => false) };
  ev('sab', { lights: '💡 החשמל הופל', oxygen: '💨 הופסק החמצן', reactor: '☢️ הכור התחמם', freeze: '❄️ ההסקה הושבתה' }[kind]);
  toastAll(kind === 'freeze' ? '❄️ ההסקה הושבתה! כולם קופאים ונעים לאט – תקנו בשני המחממים' : kind === 'lights' ? '💡 החשמל נפל! תקנו בלוח החשמל' : kind === 'oxygen' ? `💨 הפסקת חמצן! יש ${secs} שניות לתקן בשתי נקודות` : `☢️ הכור מתחמם! יש ${secs} שניות לקרר בשתי נקודות`);
}
function fixSab(i) {
  if (!sab || sab.fixed[i]) return;
  sab.fixed[i] = true;
  if (sab.fixed.every(Boolean)) { sab = null; sabCd = SAB_CD; toastAll('✅ התקלה תוקנה'); ev('fix', '✅ התקלה תוקנה'); }
}
function closeDoors(roomId, noCool) {
  const r = MAP.ROOMS[roomId];
  // אפשר לנעול כמה חדרים שרוצים. לכל חדר יש זמן קירור של 20 שניות אחרי שהדלתות שלו נפתחות (למחבל – חצי מזה)
  if (!r || (doorsUntil[roomId] || 0) > now() || (doorCool[roomId] || 0) - (noCool ? DOOR_COOL / 2 : 0) > now()) return false;
  doorsUntil[roomId] = now() + DOOR_TIME; doorCool[roomId] = now() + DOOR_TIME + DOOR_COOL;
  // מי שעומד בתוך הדלת נדחף אל מרכז החדר
  for (const q of list()) {
    if (!q.alive || q.inVent !== null) continue;
    if (doorBlocked(q.x, q.y)) {
      const dx = r.cx - q.x, dy = r.cy - q.y, l = Math.hypot(dx, dy) || 1;
      for (const k of [60, 90, 120]) { const nx = q.x + dx / l * k, ny = q.y + dy / l * k; if (MAP.walkable(nx, ny) && !doorBlocked(nx, ny)) { q.x = nx; q.y = ny; break; } }
    }
  }
  toastAll('🚪 הדלתות ב' + r.name + ' ננעלו!');
  return true;
}
let alertT = 0;
let bodies = [];
let bananas = []; // קליפות בננה של הליצן
const BANANA_CD = 15, BANANA_LIFE = 60, BANANA_MAX = 3, SLIP_TIME = 0.9, FAKE_BODY_CD = 45;
let meeting = null, eject = null, winner = null;
let chat = [];
let pairCalls = [];
let camsOffUntil = 0, camsCd = 0; const CAMS_OFF = 25, CAMS_CD = 45; // שיבוש מצלמות של המתחזה // משימות זוגיות שמחכות לשותף
let noises = []; // רעשים מזויפים של הרעשן
let noiseSeq = 0;
let posHist = [], killLog = [], histT = 0; // לשומר הזמן: איפה כולם היו בשניות האחרונות, ומי חוסל מתי
let hideEndAt = 0, noImpGame = false; // מחבואים: מתי נגמר הזמן; הפתעה: האם אין מתחזה בכלל
let tour = null, endAwarded = false;   // טורניר: ניקוד מצטבר בין סיבובים
let liars = {}, meetingNo = 0; // זיכרון בין ישיבות: מי נתפס משקר, באיזו ישיבה ועל מה
let nearTalk = []; // דיבור של בוטים חיים בזמן המשחק – רק מי שקרוב שומע
const HEAR_R = 520;
let taskTotal = 0, taskDone = 0;

const now = () => Date.now() / 1000;
const rid = () => Math.random().toString(36).slice(2, 10);
// מפתח סודי לחזרה לחדר – רק השחקן עצמו והמארח מכירים אותו (המזהה הרגיל גלוי לכולם)
const secretKey = () => {
  try { const c = globalThis.crypto; if (c && c.getRandomValues) return Array.from(c.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join(''); } catch (e) {}
  return rid() + rid() + rid() + rid();
};
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const list = () => Object.values(players);
const humans = () => list().filter(p => !p.isBot);
const team = p => (ROLES[p.role] || ROLES.crew).team;
const evil = p => team(p) === 'imp' || team(p) === 'mole'; // מתחזים + השתול

function freeColor() {
  const used = new Set(list().map(p => p.color));
  const free = COLORS.map((_, i) => i).filter(i => !used.has(i));
  if (free.length) return free[0];
  // יותר שחקנים מצבעים: הצבע שהכי פחות בשימוש
  const cnt = COLORS.map((_, i) => list().filter(p => p.color === i).length);
  return cnt.indexOf(Math.min(...cnt));
}

// ---------- זיכרון בין סיבובים: הבוטים זוכרים מי היה מתחזה, מי חיסל הרבה, ומי חיסל אותם ----------
const rmem = {}; let prevBotNames = null;
const mkey = p => p.isBot ? p.name : p.id;
const rm = k => rmem[k] || (rmem[k] = { imp: 0, kills: 0, diedBy: {} });
function noteKill(killer, tgt) { if (!killer || !tgt) return; rm(mkey(killer)).kills++; const d = rm(mkey(tgt)).diedBy; d[mkey(killer)] = (d[mkey(killer)] || 0) + 1; }
function rememberGame() { list().forEach(q => { if (!q.spectator && q.role && team(q) === 'imp') rm(mkey(q)).imp++; }); }
function grudgeOf(o, x) { // כמה הבוט o לא סומך על x, לפי הסיבובים הקודמים
  const a = rmem[mkey(x)]; if (!a) return 0;
  const mine = rmem[mkey(o)];
  return Math.min(2.5, a.imp * 1) + Math.min(2, a.kills * 0.5) + (mine && mine.diedBy[mkey(x)] ? 2.5 : 0);
}

function newPlayer(name, color, isBot) {
  const id = rid();
  const p = {
    id, key: isBot ? null : secretKey(), name: String(name || 'שחקן').replace(/[\u0000-\u001f\u202a-\u202e\u2066-\u2069]/g, '').slice(0, 14) || 'שחקן', color, isBot,
    x: MAP.BUTTON.x, y: MAP.BUTTON.y, dir: 1, alive: true, role: null, tasks: [],
    input: { dx: 0, dy: 0 }, work: null, killCd: 0, shiftCd: 0, shapeAs: null, shapeUntil: 0,
    shieldUntil: 0, gaCd: 0, emergencyUsed: false, inVent: null, hat: isBot ? 1 + Math.floor(Math.random() * ((opts.pro ? PRO_HAT_COUNT : hanukOn() ? HAT_COUNT : HAT_BASE) - 1)) : 0, pet: isBot && Math.random() < 0.3 ? 1 + Math.floor(Math.random() * ((hanukOn() ? PET_COUNT : PET_BASE) - 1)) : 0, toast: [], conn: !isBot, lastSeen: now(),
    bot: isBot ? { plan: [], wait: 0, goal: null, voteAt: 0, chatAt: 0, persona: pick(['suspicious', 'quiet', 'chatty', 'aggressive', 'helpful', 'normal', 'normal']) } : null,
  };
  players[id] = p;
  if (phase === 'lobby' && !isBot) lobbySpawn([p]);
  return p;
}

function toast(p, text) { if (p && !p.isBot) p.toast.push(text); }
function toastAll(text) { humans().forEach(p => toast(p, text)); }

// ---------- מהלך המשחק ----------
// ---------- הלובי: חללית קטנה שאפשר ללכת בה ----------
const LOBBY = { W: 1000, H: 560, x0: 50, x1: 950, y0: 140, y1: 510, table: { x0: 430, x1: 570, y0: 292, y1: 362 } };
const lobbyWalkable = (x, y, r = 18) => x - r >= LOBBY.x0 && x + r <= LOBBY.x1 && y - r >= LOBBY.y0 && y + r <= LOBBY.y1
  && !(x + r > LOBBY.table.x0 && x - r < LOBBY.table.x1 && y + r > LOBBY.table.y0 && y - r < LOBBY.table.y1);
function lobbySpawn(arr) {
  arr.forEach((p, i) => { p.x = 330 + (i % 8) * 48 + Math.random() * 10; p.y = 440 + Math.floor(i / 8) * 46; p.input = { dx: 0, dy: 0 }; p.work = null; p.inVent = null; });
}
const ROLE_IC = { crew: '🧑‍🚀', engineer: '🔧', scientist: '🧪', angel: '😇', photographer: '📸', detective: '🔎', judge: '⚖️', bodyguard: '🛡', guardian: '🫂', timekeeper: '⏪', impostor: '🔪', shifter: '🎭', phantom: '👻', viper: '🐍', noisemaker: '🔊', saboteur: '💣', poltergeist: '🌀', mole: '🕵️', jester: '🤡' };
// הדמיה של חלוקת התפקידים (אותם מאגרים כמו ב-startGame) – כדי להראות בלובי כמה אחוז לכל תפקיד
function simRoles(n, mods) {
  const nImp = Math.max(1, Math.min(settings.impostors, Math.floor((n - 1) / 2)));
  const impPool = shuffle((settings.newRoles ? ['impostor', 'shifter', 'phantom', 'viper', 'noisemaker', 'impostor'].concat(nImp >= 2 ? ['saboteur', 'poltergeist'] : []) : ['impostor', 'shifter', 'impostor']).filter(r => r === 'impostor' || roleOn(r)).concat((mods ? MOD_IMP : []).concat(CUSTOM.imp).filter(roleOn)));
  const out = [];
  for (let i = 0; i < nImp; i++) out.push(impPool[i % impPool.length]);
  if (out.every(r => NON_KILLERS.includes(r))) out[0] = 'impostor';
  const nCrew = n - nImp;
  const specials = shuffle((proCode('4000') ? [] : settings.newRoles ? ['engineer', 'scientist', 'angel', 'photographer', 'detective', 'judge', 'bodyguard', 'guardian', 'timekeeper'] : ['engineer', 'scientist', 'angel']).concat((mods ? MOD_CREW : []).concat(CUSTOM.crew)).filter(roleOn));
  const nSpecial = proCode('3000') ? nCrew : settings.newRoles ? Math.max(1, Math.round(nCrew * 0.7)) : specials.length; // 3000 – כל אנשי הצוות עם תפקיד מיוחד
  const crew = [];
  for (let i = 0; i < nCrew; i++) crew.push(i < Math.min(specials.length, nSpecial) && nCrew > 1 ? specials[i] : 'crew');
  if (jesterOn() && nCrew >= 3 && n >= 5) crew[Math.floor(Math.random() * nCrew)] = 'jester';
  if (hanukOn() && roleOn('shamash') && nCrew >= 3 && n >= 4) { const ix = shuffle(crew.map((r, i) => r === 'crew' ? i : -1).filter(i => i >= 0))[0]; if (ix !== undefined) crew[ix] = 'shamash'; }
  if ((mods || CUSTOM.jester.length) && nCrew >= 4 && n >= 5) { const idx = shuffle(crew.map((r, i) => r === 'crew' ? i : -1).filter(i => i >= 0)), nn = shuffle((mods ? MOD_NEU : []).concat(CUSTOM.jester).filter(roleOn)); for (let i = 0; i < (nCrew >= 8 ? 2 : 1) && idx[i] !== undefined && nn[i]; i++) crew[idx[i]] = nn[i]; }
  if (settings.newRoles && roleOn('mole') && nImp > 0 && n >= 6 && nCrew >= 4) { const c = shuffle(crew.map((r, i) => r !== 'jester' ? i : -1).filter(i => i >= 0))[0]; if (c !== undefined) crew[c] = 'mole'; }
  return out.concat(crew);
}
function lobbyInfo() {
  const n = Math.max(3, humans().filter(q => !q.spectator).length + settings.bots), mods = modsOn(), classic = settings.mode === 1 || settings.mode === 4 || settings.mode === 5;
  const cnt = {}, pres = {}, T = 400;
  if (classic) for (let t = 0; t < T; t++) { const seen = {}; for (const r of simRoles(n, mods)) { cnt[r] = (cnt[r] || 0) + 1; seen[r] = 1; } for (const r in seen) pres[r] = (pres[r] || 0) + 1; }
  const roles = [];
  const add = (k, name, tm, ic, desc) => roles.push({ k, name, team: tm, ic, desc, on: roleOn(k) || k === 'crew' || k === 'impostor', game: Math.round(100 * (pres[k] || 0) / T), per: Math.round(100 * (cnt[k] || 0) / (T * n)) });
  for (const k of Object.keys(ROLES)) {
    if (k === 'spectator' || k === 'seeker' || MOD[k]) continue;
    const r = ROLES[k];
    add(k, r.name, r.team === 'jester' ? 'jester' : r.team, ROLE_IC[k] || '⭐', roleDesc(k));
  }
  if (mods || hanukOn() || Object.keys(customDefs).length) for (const k of Object.keys(MOD)) { if (!mods && k !== 'shamash' && !MOD[k].custom) continue; if (!hanukOn() && !mods && k === 'shamash') continue; const m = MOD[k]; add(k, m[0], m[1], m[2], m[6] + (m[3] ? ` [כפתור: ${m[3]}${m[4] ? ' · המתנה ' + m[4] + ' שניות' : ''}${m[5] ? ' · ' + m[5] + (m[5] > 1 ? ' שימושים' : ' שימוש') : ''}]` : '')); }
  // תפקיד הליצן בהגדרות הוא מתג נפרד
  const j = roles.find(r => r.k === 'jester'); if (j) j.on = jesterOn();
  return { n, classic, mode: settings.mode, roles };
}

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
  MAP = MAPS[settings.map] || MAPS.big; // המפה שנבחרה בלובי
  raceEndAt = 0; raceChaosAt = now() + 20;
  Object.values(players).filter(p => p.isBot).forEach(p => delete players[p.id]);
  // טורניר: סיבוב חדש או טורניר חדש. הבוטים שומרים על אותם שמות לאורך כל הטורניר
  if (settings.rounds > 1) { if (!tour || tour.done || tour.total !== settings.rounds) tour = { round: 1, total: settings.rounds, scores: {}, bots: null, done: false }; else tour.round++; }
  else tour = null;
  const names = tour && tour.bots && tour.bots.length >= settings.bots ? tour.bots.slice() : prevBotNames && prevBotNames.length >= settings.bots ? prevBotNames.slice() : shuffle(BOT_NAMES.slice());
  if (tour) tour.bots = names.slice();
  prevBotNames = names.slice(); // אותם בוטים באותו חדר, כדי שיזכרו
  for (let i = 0; i < settings.bots && i < MAX_BOTS; i++) newPlayer('🤖 ' + names[i], freeColor(), true);
  endAwarded = false;
  const all = shuffle(list());
  if (opts.demo) { const me = players[by]; all.splice(all.indexOf(me), 1); all.push(me); } // בדמו: השחקן תמיד איש צוות
  if (all.length < 3) { toast(players[by], 'צריך לפחות 3 שחקנים (אפשר להוסיף בוטים)'); return; }

  const race = settings.mode === 2, hide = settings.mode === 3, surprise = settings.mode === 4;
  noImpGame = surprise && Math.random() < 0.3; // הפתעה: לפעמים אין מתחזה בכלל, ואף אחד לא יודע
  const nImp = race || noImpGame ? 0 : hide ? 1 : Math.max(1, Math.min(settings.impostors, Math.floor((all.length - 1) / 2)));
  const imps = all.slice(0, nImp), crew = all.slice(nImp);
  const mods = modsOn() && !race && !hide;
  let impPool = shuffle((settings.newRoles ? ['impostor', 'shifter', 'phantom', 'viper', 'noisemaker', 'impostor'].concat(nImp >= 2 ? ['saboteur', 'poltergeist'] : []) : ['impostor', 'shifter', 'impostor']).filter(r => r === 'impostor' || roleOn(r)).concat((mods ? MOD_IMP : []).concat(CUSTOM.imp).filter(roleOn)));
  imps.forEach((p, i) => { p.role = hide ? 'seeker' : impPool[i % impPool.length]; });
  if (imps.length && imps.every(p => NON_KILLERS.includes(p.role))) imps[0].role = 'impostor'; // חייב להיות לפחות מתחזה אחד שיכול לחסל
  const specials = shuffle((proCode('4000') ? [] : settings.newRoles ? ['engineer', 'scientist', 'angel', 'photographer', 'detective', 'judge', 'bodyguard', 'guardian', 'timekeeper'] : ['engineer', 'scientist', 'angel']).concat((mods ? MOD_CREW : []).concat(CUSTOM.crew)).filter(roleOn));
  const nSpecial = proCode('3000') ? crew.length : settings.newRoles ? Math.max(1, Math.round(crew.length * 0.7)) : specials.length;
  crew.forEach((p, i) => { p.role = !race && !hide && i < Math.min(specials.length, nSpecial) && crew.length > 1 ? specials[i] : 'crew'; });
  // הליצן (אפשר לכבות בהגדרות): אחד מהצוות הופך לליצן, רק כשיש מספיק שחקנים
  if (jesterOn() && !race && !hide && crew.length >= 3 && all.length >= 5) crew[Math.floor(Math.random() * crew.length)].role = 'jester';
  // השמש: תפקיד חנוכה – אחד מהצוות
  if (hanukOn() && roleOn('shamash') && !race && !hide && crew.length >= 3 && all.length >= 4) { const c = shuffle(crew.filter(q => q.role === 'crew'))[0]; if (c) c.role = 'shamash'; }
  // מודים: תפקידים ניטרליים (עם מטרה משלהם)
  if ((mods || CUSTOM.jester.length) && !race && !hide && crew.length >= 4 && all.length >= 5) { const cand = shuffle(crew.filter(q => q.role === 'crew')), nn = shuffle((mods ? MOD_NEU : []).concat(CUSTOM.jester).filter(roleOn)); for (let i = 0; i < (crew.length >= 8 ? 2 : 1) && cand[i] && nn[i]; i++) cand[i].role = nn[i]; }
  // השתול: אחד מהצוות שבעצם עובד בשביל המתחזים (רק כשיש מספיק שחקנים)
  if (settings.newRoles && roleOn('mole') && !race && !hide && nImp > 0 && all.length >= 6) { const c = shuffle(crew.filter(p => p.role !== 'jester'))[0]; if (c && crew.length >= 4) c.role = 'mole'; }

  // אף אחד לא מקבל את אותו תפקיד מיוחד פעמיים ברצף: מחליפים עם שחקן מאותה קבוצה, או מחליפים לתפקיד אחר שלא חולק
  if (!race && !hide) {
    const key = q => (q.isBot ? 'b:' + q.name : q.id), prev = q => lastRoles[key(q)];
    const spare = { crew: shuffle(specials.filter(r => !all.some(q => q.role === r))), imp: shuffle(impPool.filter(r => !all.some(q => q.role === r))) };
    for (const tm of ['crew', 'imp', 'jester']) {
      const grp = all.filter(q => team(q) === tm);
      for (const p of grp) {
        if (!p.role || p.role === 'crew' || p.role !== prev(p)) continue;
        const sw = shuffle(grp).find(q => q !== p && q.role !== p.role && prev(q) !== p.role && prev(p) !== q.role && !(tm === 'imp' && NON_KILLERS.includes(q.role) && grp.filter(z => !NON_KILLERS.includes(z.role) && z !== p).length === 0));
        if (sw) { const r = p.role; p.role = sw.role; sw.role = r; continue; }
        const nr = (spare[tm] || []).find(r => r !== prev(p) && !(tm === 'imp' && NON_KILLERS.includes(r) && grp.every(z => z === p || NON_KILLERS.includes(z.role))));
        if (nr) { spare[tm].splice(spare[tm].indexOf(nr), 1); p.role = nr; }
      }
    }
  }
  events = []; gameStartT = now(); ev('start', '🚀 המשחק התחיל');
  taskTotal = 0; taskDone = 0; candleLit = {}; miracles = []; rewound = {};
  // בקבוצה קטנה כל איש צוות מקבל יותר משימות, כדי שהצוות לא יסיים מהר מדי (לפחות 20 משימות בסך הכל)
  const tasksEach = Math.min(8, Math.max(settings.tasks, Math.ceil(20 / Math.max(1, crew.length))));
  hideEndAt = hide ? now() + settings.hideTime + 10 : 0;
  if (hide) ev('start', '🙈 מחבואים: ' + nm(imps[0]) + ' הוא המחפש');
  if (settings.mode === 5) { crew.forEach(p => toast(p, '🕎 שמונה נרות! הדליקו את כל 8 הנרות שבמפה (E ליד נר). מתחזים יכבו אותם – תחזרו להדליק!')); imps.forEach(p => toast(p, '💨 שמונה נרות: עמוד ליד נר דולק ולחץ E כדי לכבות אותו (אחת ל-12 שניות)')); ev('start', '🕎 שמונה נרות: הצוות מדליק, המתחזים מכבים'); }
  if (race) { raceEndAt = now() + 8 * 60; ev('start', '🏁 מרוץ משימות: ראשון שמגיע ל-' + settings.raceGoal + ' משימות מנצח'); }
  all.forEach(p => {
    p.alive = true; p.ejected = false; p.spectator = false; p.killCd = opts.demo ? 45 : 12; p.shiftCd = 10; p.shapeAs = null; p.gaCd = 0;
    p.shieldUntil = 0; p.emergencyUsed = false; p.toast = [];
    p.verdictUsed = false;
    p.stats = { tasks: 0, kills: 0, goodVotes: 0, badVotes: 0, reports: 0 }; p.photos = []; p.notes = []; p.noteMeta = []; p.photoCd = 0; p.investCd = 0; p.guardCd = 0; p.guardedBy = null; p.vanishUntil = 0; p.vanishCd = 0; p.hauntDoorCd = 10; p.darkCd = 10; p.dragCd = 0; p.drag = null; p.nearKill = 0; p.bananaCd = 8; p.fakeCd = 25; p.slip = null; p.hideVents = 0; p.hiding = null; p.hideSince = 0; p.hideCd = 0; p.ward = null; p.wardSwap = true; p.wardDied = null; p.rewindUsed = false; p.noiseCd = 15; p.modCd = 0; p.modUsed = 0; p.sprintUntil = 0; p.radarUntil = 0; p.luckUsed = false; p.poisonAt = 0; p.poisonBy = null; p.eaten = 0;
    if (team(p) === 'crew') {
      if (settings.mode === 5) { p.tasks = candleIdx().map(i => ({ i, done: false })); }
      else { p.tasks = shuffle(taskPool()).slice(0, race ? 3 : tasksEach).map(i => ({ i, done: false })); addDreidel(p); addPro(p); }
      taskTotal += p.tasks.length;
    } else if (p.role === 'mole') p.tasks = shuffle(settings.mode === 5 ? candleIdx() : taskPool()).slice(0, tasksEach).map(i => ({ i, done: false })); // משימות מזויפות
    else p.tasks = [];
  });
  if (settings.mode === 5) taskTotal = candleIdx().length; // שמונה נרות: היעד הוא שמונה, לא סכום המשימות של כולם
  // המגן האישי מקבל שחקן לשמור עליו
  all.filter(p => p.role === 'guardian').forEach(p => { const w = pick(all.filter(o => o.id !== p.id)); if (w) { p.ward = w.id; toast(p, '🫂 אתה שומר על ' + nm(w) + '. אם יקרה לו משהו – תדע מיד'); } });
  traps = []; bombs = []; wrongEjects = 0; pings = []; hideFinalSaid = false; noises = []; posHist = []; killLog = []; histT = 0; liars = {}; meetingNo = 0;
  if (hide) { imps.forEach(p => { p.frozenUntil = now() + 10; p.killCd = 10; toast(p, '🙈 אתה המחפש! עיניים עצומות 10 שניות, ואז מחפשים…'); }); all.filter(q => team(q) !== 'imp').forEach(q => toast(q, '🔍 המחפש הוא ' + imps.map(nm).join(', ') + ' – מתחבאים! (הסתתר במסתור: M)')); }
  else all.forEach(p => { p.frozenUntil = 0; });
  if (hide) crew.forEach(p => toast(p, '🙈 מחבואים! ' + nm(imps[0]) + ' הוא המחפש – יש לך 10 שניות להתחבא'));
  pairCalls = []; camsOffUntil = 0; camsCd = 0;
  bodies = []; bananas = []; meeting = null; eject = null; winner = null; chat = []; usedLines = new Set(); lastMistake = null; jesterHint = false; gusts = []; windT = 10 + Math.random() * 8;
  sab = null; sabCd = 20; doorsUntil = {}; doorCool = {}; hauntDoors = []; darkRooms = {};
  settings.reveal = false;
  spawnAround(all);
  all.forEach(q => { lastRoles[q.isBot ? 'b:' + q.name : q.id] = q.role; });
  phase = 'play';
}

function backToLobby(by) {
  if (by !== hostId) return;
  Object.values(players).filter(p => p.isBot).forEach(p => delete players[p.id]);
  list().forEach(p => { p.role = null; p.alive = true; p.spectator = false; p.tasks = []; p.shapeAs = null; });
  lobbySpawn(list());
  phase = 'lobby'; bodies = []; bananas = []; meeting = null; eject = null; winner = null; chat = []; settings.reveal = false;
  sab = null; sabCd = 20; doorsUntil = {}; doorCool = {}; hauntDoors = []; darkRooms = {}; miracles = []; candleLit = {}; rewound = {};
}

function raceRanking() {
  return list().filter(q => !q.spectator && q.stats).sort((x, y) => y.stats.tasks - x.stats.tasks).map(q => ({ name: nm(q), color: COLORS[q.color].c, n: q.stats.tasks }));
}
// המחבל והרדוף לא מחסלים. אם נשאר בחיים רק מתחזה כזה – הוא הופך למתחזה רגיל, אחרת אין גופות, אין ישיבות והמשחק נתקע
function promoteSaboteur() {
  if (phase !== 'play' && phase !== 'eject') return;
  const liveImps = list().filter(q => q.alive && !q.spectator && team(q) === 'imp');
  if (liveImps.length && liveImps.every(q => NON_KILLERS.includes(q.role))) liveImps.forEach(q => {
    q.role = 'impostor'; q.killCd = Math.max(q.killCd || 0, 10);
    q.drag = null; toast(q, '🔪 השותף שלך כבר לא כאן – עכשיו אתה מתחזה רגיל ויכול לחסל!');
  });
}
function checkWin() {
  if (settings.mode === 2) { // מרוץ משימות: ניצחון בנקודות
    if (phase !== 'play') return false;
    const rank = raceRanking();
    const timeUp = raceEndAt && now() >= raceEndAt;
    if ((rank[0] && rank[0].n >= settings.raceGoal) || timeUp) {
      winner = { team: 'race', reason: timeUp && !(rank[0] && rank[0].n >= settings.raceGoal) ? `נגמר הזמן! ${rank[0].name} מוביל עם ${rank[0].n} משימות` : `${rank[0].name} הגיע ראשון ל-${rank[0].n} משימות!`, ranking: rank };
      phase = 'end'; settings.reveal = true; ev('end', '🏁 ' + winner.reason); return true;
    }
    return false;
  }
  if (phase !== 'play' && phase !== 'eject') return false;
  if (settings.mode === 3) { // מחבואים
    const alive = list().filter(p => p.alive && !p.spectator);
    const seek = alive.filter(p => team(p) === 'imp').length, hiders = alive.filter(p => team(p) !== 'imp').length;
    let w = null;
    if (!seek) w = { team: 'crew', reason: 'המחפש עזב – המתחבאים ניצחו!' };
    else if (!hiders) w = { team: 'imp', reason: 'המחפש תפס את כולם!' };
    else if (taskTotal > 0 && taskDone >= taskTotal) w = { team: 'crew', reason: 'המתחבאים השלימו את כל המשימות!' };
    else if (hideEndAt && now() >= hideEndAt) w = { team: 'crew', reason: '⏰ הזמן נגמר – המתחבאים שרדו!' };
    if (w) { winner = w; phase = 'end'; settings.reveal = true; ev('end', '🏁 ' + w.reason); return true; }
    return false;
  }
  promoteSaboteur();
  const alive = list().filter(p => p.alive && !p.spectator);
  const imps = alive.filter(p => team(p) === 'imp').length;
  const crew = alive.filter(p => team(p) === 'crew' || team(p) === 'jester').length;
  let w = null;
  if (noImpGame) { if (taskTotal > 0 && taskDone >= taskTotal) w = { team: 'crew', reason: '😄 לא היה מתחזה בכלל! השלמתם את המשימות בלי להדיח אף אחד – כולם ניצחו', surprise: true }; }
  else if (imps === 0) w = { team: 'crew', reason: 'כל המתחזים הודחו!' };
  else if (taskTotal > 0 && taskDone >= taskTotal) w = { team: 'crew', reason: settings.mode === 5 ? '🕎 כל שמונת הנרות דולקים – חג אורים שמח!' : 'הצוות השלים את כל המשימות!' };
  else if (imps >= crew) w = { team: 'imp', reason: 'המתחזים השתלטו על התחנה!' };
  if (w) {
    const sv = list().filter(q => tplOf(q.role) === 'survivor' && q.alive && !q.spectator);
    if (sv.length) { w.also = sv.map(q => q.id); w.reason += ' · 🛟 ' + sv.map(nm).join(', ') + ' שרד וניצח גם!'; }
    winner = w; phase = 'end'; settings.reveal = true; ev('end', '🏁 ' + w.reason); return true;
  }
  return false;
}

const candleIdx = () => MAP.TASKS.map((T, i) => T.ev === 'candle' ? i : -1).filter(i => i >= 0);
// מאגר המשימות: משימות הסביבון רק באירוע חנוכה, והנרות רק במצב שמונה נרות
const taskPool = () => MAP.TASKS.map((_, i) => i).filter(i => { const k = MAP.TASKS[i].ev; return !k || ((k === 'dreidel' || k === 'hanuk') && hanukOn() && settings.mode !== 5) || (k === 'pro' && !!opts.pro && settings.mode !== 5); });
function addPro(p) { // באתר הפרו: שתי משימות פרו לכל שחקן (במקום משימות רגילות)
  if (!opts.pro || settings.mode === 2 || settings.mode === 5 || p.tasks.length < 3) return;
  const have = () => p.tasks.filter(x => MAP.TASKS[x.i].ev === 'pro').length;
  const pool = shuffle(taskPool().filter(i => MAP.TASKS[i].ev === 'pro' && !p.tasks.some(x => x.i === i)));
  for (let j = p.tasks.length - 1; j >= 0 && have() < 2 && pool.length; j--) { if (!MAP.TASKS[p.tasks[j].i].ev) p.tasks[j] = { i: pool.pop(), done: false }; }
}
function addDreidel(p) {
  if (!hanukOn() || settings.mode === 2) return;
  const d = p.tasks.some(x => MAP.TASKS[x.i].ev === 'dreidel') || Math.random() > 0.6 ? undefined : taskPool().filter(i => MAP.TASKS[i].ev === 'dreidel' && !p.tasks.some(x => x.i === i))[0];
  if (d !== undefined && p.tasks.length) p.tasks[p.tasks.length - 1] = { i: d, done: false };
  // משימת חנוכה נוספת (סופגניות / שמן / זוגות / זכור את הנרות) – תמיד אחת לכל שחקן
  if (!p.tasks.some(x => MAP.TASKS[x.i].ev === 'hanuk') && p.tasks.length > 1) {
    const h = shuffle(taskPool().filter(i => MAP.TASKS[i].ev === 'hanuk' && !p.tasks.some(x => x.i === i)))[0];
    if (h !== undefined) p.tasks[0] = { i: h, done: false };
  }
}
const roomOf = i => (MAP.ROOMS[MAP.TASKS[i].room] || {}).name || 'המסדרון';
function candleCount() { return candleIdx().filter(i => candleLit[i]).length; }
function lightCandle(p, i) {
  if (candleLit[i]) return;
  candleLit[i] = true;
  list().forEach(q => q.tasks.forEach(x => { if (x.i === i) x.done = true; }));
  taskDone = candleCount(); p.stats.tasks++;
  toast(p, '🕯️ הדלקת נר ב' + roomOf(i));
  ev('candle', `🕯️ ${nm(p)} הדליק נר (${taskDone}/${taskTotal})`);
  checkWin();
}
function blowCandle(p, i) {
  candleLit[i] = false;
  list().forEach(q => q.tasks.forEach(x => { if (x.i === i) x.done = false; }));
  taskDone = candleCount(); p.blowAt = now() + 12;
  const rn = roomOf(i);
  list().forEach(q => { if (q.alive && !q.spectator && team(q) !== 'imp') toast(q, '💨 נר כבה ב' + rn + '!'); });
  ev('candle', `💨 ${nm(p)} כיבה נר ב${rn}`);
}
function completeTask(p, t) {
  if (MAP.TASKS[t.i].ev === 'dreidel') { p.sprintUntil = now() + 6; toast(p, '🪀 גימל! נס גדול היה פה – תוספת מהירות ל-6 שניות'); }
  if (settings.mode === 5 && MAP.TASKS[t.i].ev === 'candle') { t.done = true; lightCandle(p, t.i); return; }
  t.done = true;
  if (team(p) === 'crew') taskDone++;
  p.stats.tasks++;
  p.doneIdx = p.doneIdx || []; p.doneIdx.push(t.i); // כל משימה נעשית פעם אחת בלבד
  toast(p, '✔ ' + MAP.TASKS[t.i].name + ' הושלמה');
  if (settings.mode === 2) { // מרוץ: מקבלים מיד משימה חדשה שלא עשיתי עוד
    const have = new Set(p.tasks.map(x => x.i).concat(p.doneIdx));
    const fresh = shuffle(taskPool().filter(i => !have.has(i)))[0];
    p.tasks = p.tasks.filter(x => !x.done);
    if (fresh !== undefined) p.tasks.push({ i: fresh, done: false });
  }
  checkWin();
}

function callMeeting(by, body) {
  phase = 'alert'; alertT = 3.2; // מסך הכרזה לפני הישיבה
  const fake = !!(body && body.fake); // גופה מזויפת של הליצן
  let room = 'מסדרון', bodyRoom = null;
  if (body) {
    const br = MAP.roomAt(body.x, body.y);
    if (br) { room = br.name; bodyRoom = br.name; }
    else { // גופה במסדרון: מציינים ליד איזה חדר
      const near = Object.values(MAP.ROOMS).sort((x, y) => dist(body, { x: x.cx, y: x.cy }) - dist(body, { x: y.cx, y: y.cy }))[0];
      room = 'מסדרון ליד ' + near.name;
    }
  }
  by.stats.reports++; ev('meeting', fake ? `🎈 ${nm(by)} דיווח על גופה – אבל היא הייתה מזויפת!` : body ? `📢 ${nm(by)} דיווח על הגופה של ${players[body.id] ? nm(players[body.id]) : 'שחקן'} (${room})` : `🚨 ${nm(by)} כינס ישיבת חירום`);
  if (fake && players[body.by]) toast(players[body.by], '🎈 נפלו בפח! ' + by.name + ' דיווח על הגופה המזויפת שלך');
  meeting = { by: by.id, body: body && !fake ? body.id : null, fake, fakeColor: fake ? body.color : null, deduce: false, room, votes: {}, t: settings.meetingTime, mentions: {}, skipTalk: 0, bodyRoom, queue: [], suspect: {}, accused: {}, floor: Infinity };
  // זיכרון של הבוטים: מי היה ליד הגופה, מי היה איתם (נקי), מי נראה בפתח אוורור, ומי טעה בסבב הקודם
  const addS = (id, n) => { if (players[id]) meeting.suspect[id] = (meeting.suspect[id] || 0) + n; };
  list().forEach(o => {
    if (!o.bot) return;
    o.bot.nearBody = []; o.bot.alibi = [];
    if (!o.alive || o.spectator) return;
    if (body) recallKill(o, body, bodyRoom);
    if (team(o) !== 'crew') return;
    o.bot.nearBody.forEach(id => addS(id, 1.2));
    // רק הליצן זורק בננות: מי שהחליק יודע שיש ליצן, ואם ראה מי זרק – יודע שאסור להדיח אותו
    if (o.bot.knowsJester) jesterHint = true;
    if (o.bot.jesterId && players[o.bot.jesterId] && players[o.bot.jesterId].alive) addS(o.bot.jesterId, -6);
    o.bot.alibi.forEach(id => addS(id, -2));
    if (o.bot.sawVent && players[o.bot.sawVent.id] && players[o.bot.sawVent.id].alive) addS(o.bot.sawVent.id, jesterHint ? 1 : 1.8);
  });
  if (lastMistake) lastMistake.by.forEach(id => addS(id, 0.8));
  if (settings.botLevel >= 2 && Object.keys(rmem).length) { // מה הבוטים זוכרים מהסיבוב הקודם
    const pre = list().filter(o => o.bot && o.alive && !o.spectator && team(o) === 'crew');
    pre.forEach(o => list().forEach(x => { if (x.alive && !x.spectator && x.id !== o.id) { const g = grudgeOf(o, x); if (g > 0) addS(x.id, g * (settings.botLevel === 3 ? 1 : 0.7)); } }));
    let best = null; // בוט אחד אומר בקול את מה שהוא זוכר
    pre.forEach(o => list().forEach(x => { if (x.alive && !x.spectator && x.id !== o.id) { const g = grudgeOf(o, x); if (g >= 1 && (!best || g > best.g)) best = { o, x, g }; } }));
    if (best && Math.random() < 0.85) {
      const xn = bare(best.x.name), a = rmem[mkey(best.x)], mine = rmem[mkey(best.o)];
      const line = mine && mine.diedBy[mkey(best.x)] ? fresh([`${xn} חיסל אותי בסיבוב הקודם, אני לא שוכח`, `בסיבוב הקודם ${xn} הרג אותי. לא סומך עליו`, `${xn}, זוכר מה עשית לי בפעם שעברה? 😒`])
        : a && a.imp ? fresh([`${xn} היה המתחזה בסיבוב הקודם, אני לא סומך עליו`, `שימו לב ל${xn}, בפעם שעברה הוא היה המתחזה`, `${xn} כבר היה מתחזה, תיזהרו ממנו`])
        : fresh([`${xn} חיסל כמה אנשים בסיבוב הקודם, הוא יודע להרוג טוב, פחות תסמכו עליו`, `${xn} מחסל טוב מדי, אני חושד בו`]);
      meeting.queue.push({ id: best.o.id, at: meeting.t - (6 + Math.random() * 6), silent: false, text: line });
    }
  }
  meetingNo++;
  // הבוטים זוכרים מי שיקר בישיבות קודמות
  for (const id in liars) if (players[id] && players[id].alive) addS(id, settings.botLevel === 1 ? 0.4 : settings.botLevel === 3 ? 1.6 : 1);
  // גופה מזויפת: אף אחד לא מקבל הודעה. בוטים חכמים עשויים לשים לב באמצע הישיבה שאף אחד לא מת
  if (fake && Math.random() < (settings.botLevel === 3 ? 0.8 : settings.botLevel === 1 ? 0.25 : 0.55)) {
    const w = shuffle(list().filter(o => o.isBot && o.alive && !o.spectator && team(o) === 'crew'))[0];
    if (w) { meeting.deduce = true; meeting.queue.push({ id: w.id, at: meeting.t - (10 + Math.random() * 10), silent: true, deduce: true, text: fresh(['רגע… אף אחד לא מת! כולנו פה. הגופה הייתה מזויפת – יש פה ליצן שרוצה שנצביע עליו', 'תספרו: כולם חיים. זאת הייתה גופה מזויפת! לא מצביעים בלי ראיה אמיתית']) }); }
  }
  chat = []; nearTalk = []; noises = []; posHist = []; killLog = [];
  bodies = []; bananas = [];
  // ישיבה פותחת את כל הדלתות, ולכל חדר שנפתח מתחיל זמן קירור
  for (const rid of Object.keys(doorsUntil)) doorCool[rid] = Math.max(doorCool[rid] || 0, now() + DOOR_COOL);
  doorsUntil = {}; hauntDoors = []; darkRooms = {}; list().forEach(q => { q.drag = null; });
  list().forEach(p => {
    p.work = null; p.shapeAs = null; p.inVent = null; p.cam = false; p.sabWork = null; p.slip = null;
    if (p.bot) {
      const T = settings.meetingTime;
      const pe = p.bot.persona;
      // שקט מדבר מעט, פטפטן הרבה; תוקפני מצביע מוקדם; רמת הבוטים משפיעה על מהירות התגובה
      const lvl = settings.botLevel;
      p.bot.chatAt = pe === 'quiet' && Math.random() < 0.6 ? -999 : T - (2 + Math.random() * 8) * (lvl === 3 ? 0.7 : lvl === 1 ? 1.4 : 1);
      p.bot.chat2At = pe === 'chatty' ? T - (10 + Math.random() * 8) : (pe === 'quiet' ? -999 : (Math.random() < 0.5 ? T - (12 + Math.random() * 12) : -999));
      p.bot.chat3At = pe === 'chatty' ? T - (22 + Math.random() * 10) : -999;
      p.bot.voteAt = T - (Math.min(T - 5, (pe === 'aggressive' ? 10 : 16) + Math.random() * 18));
      // מי שראה משהו חשוב מדבר מוקדם, גם אם הוא שקט מטבעו
      const b0 = p.bot, ev0 = team(p) === 'crew' && p.alive && (b0.sawKill || b0.sawShift || b0.sawVent || b0.knowsJester || p.wardDied || (b0.nearBody && b0.nearBody.length));
      if (ev0) b0.chatAt = T - (1.5 + Math.random() * 3);
      p.bot.replies = 0; p.bot.replyAt = -999; p.bot.shared = false; p.bot.saidLiar = false; p.bot.saidVent = p.bot.saidNear = p.bot.saidAlibi = p.bot.saidMistake = p.bot.saidBanana = p.bot.saidWard = false;
    }
  });
}

const judgeReady = p => p.tasks.length > 0 && p.tasks.every(x => x.done);
function resolveMeeting(forced, judge) { // forced = פסק דין של השופט: מודחים מיד את מי שנבחר, בלי ספירת קולות
  const voters = list().filter(p => p.alive && !p.spectator);
  const tally = {};
  if (!forced) voters.forEach(v => { const t = meeting.votes[v.id]; if (t) tally[t] = (tally[t] || 0) + 1; });
  let best = forced || null, max = 0, tie = false;
  if (!forced) for (const k in tally) {
    if (tally[k] > max) { max = tally[k]; best = k; tie = false; }
    else if (tally[k] === max) tie = true;
  }
  let ej = null;
  if (best && best !== 'skip' && !tie && players[best]) {
    ej = players[best]; ej.alive = false; ej.ejected = true; if (team(ej) === 'crew') wrongEjects++;
  }
  // סטטיסטיקה: מי הצביע נכון (נגד מתחזה) ומי טעה (נגד איש צוות)
  if (!forced) voters.forEach(v => { const tg = meeting.votes[v.id]; if (tg && tg !== 'skip' && players[tg]) { if (team(players[tg]) === 'imp') v.stats.goodVotes++; else v.stats.badVotes++; } });
  if (forced && ej) ev('verdict', `⚖️ השופט ${nm(judge)} פסק והדיח את ${nm(ej)} (היה ${ROLES[ej.role].name})`);
  else ev('eject', ej ? `🚀 ${nm(ej)} הודח (היה ${ROLES[ej.role].name})` : (tie ? '🤝 תיקו בהצבעה – אף אחד לא הודח' : '⏭ ההצבעה דילגה – אף אחד לא הודח'));
  eject = ej
    ? { id: ej.id, name: ej.name, color: ej.color, role: settings.confirm || ej.role === 'jester' ? ROLES[ej.role].name : null, team: settings.confirm || ej.role === 'jester' ? team(ej) : null, jester: ej.role === 'jester', tally, t: EJECT_TIME }
    : { id: null, tally, t: EJECT_TIME, tie };
  list().forEach(p => { if (p.bot && ej && (p.bot.sawKill === ej.id || p.bot.sawShift === ej.id)) p.bot.sawKill = p.bot.sawShift = null; });
  list().forEach(p => { if (p.bot && p.bot.sawVent && (!players[p.bot.sawVent.id] || (ej && p.bot.sawVent.id === ej.id))) p.bot.sawVent = null; });
  lastMistake = ej && settings.confirm && team(ej) === 'crew'
    ? { name: bare(ej.name), by: voters.filter(v => meeting.votes[v.id] === ej.id && v.id !== ej.id).map(v => v.id) } : null;
  if (forced && ej) eject.verdict = { j: judge.name, jc: COLORS[judge.color].c, t: ej.name };
  // מי הצביע למי (אלא אם ההצבעות אנונימיות)
  if (settings.openVotes && !forced) {
    eject.votes = voters.map(v => {
      const t = meeting.votes[v.id];
      const tp = t && t !== 'skip' ? players[t] : null;
      return { id: v.id, tid: tp ? tp.id : null, hat: v.hat || 0, w: 1, n: v.name, c: COLORS[v.color].c, to: !t ? 'none' : t === 'skip' ? 'skip' : 'p', tn: tp ? tp.name : '', tc: tp ? COLORS[tp.color].c : '' };
    });
  }
  // לאנימציה: הצבע והכובע של המודח, כמה מתחזים נשארו, וזמן לסצנת ההצבעות + הזריקה לחלל
  if (ej) { eject.c = COLORS[ej.color].c; eject.hat = ej.hat || 0; }
  if (settings.confirm && settings.mode !== 4 && !(ej && ej.role === 'jester')) eject.impLeft = list().filter(o => o.alive && !o.spectator && team(o) === 'imp').length;
  eject.t = (eject.votes ? 0.4 + voters.length * 0.3 + 1 : 0) + 6 + (forced ? 3 : 0);
  meeting = null;
  phase = 'eject';
}

function endEject() {
  const ejId = eject && eject.id;
  const jw = eject && eject.jester && players[eject.id] ? players[eject.id] : null;
  eject = null;
  phase = 'play';
  // הליצן הודח – הוא מנצח לבד והמשחק נגמר
  if (jw) {
    winner = { team: 'jester', reason: `🤡 ${jw.name} היה הליצן – הדחתם אותו, והוא ניצח!`, jester: jw.id, role: 'jester' };
    phase = 'end'; settings.reveal = true; ev('end', '🏁 ' + winner.reason); return;
  }
  const inst = wrongEjects >= 2 && list().find(q => tplOf(q.role) === 'instigator' && q.alive && !q.spectator);
  if (inst) {
    winner = { team: 'jester', reason: `🗣️ ${nm(inst)} היה המסית – גרם להדחה של 2 חפים מפשע, והוא ניצח לבד!`, jester: inst.id, role: 'instigator' };
    phase = 'end'; settings.reveal = true; ev('end', '🏁 ' + winner.reason); return;
  }
  // הפתעה בלי מתחזה: הדחתם מישהו חף מפשע – כולם מפסידים
  if (noImpGame && ejId && players[ejId] && players[ejId].role !== 'jester') {
    winner = { team: 'nobody', reason: `🤯 לא היה מתחזה בכלל! הדחתם את ${nm(players[ejId])} שהיה חף מפשע – כולם הפסידו`, surprise: true };
    phase = 'end'; settings.reveal = true; ev('end', '🏁 ' + winner.reason); return;
  }
  if (checkWin()) return;
  spawnAround(list().filter(p => p.alive));
  list().forEach(p => { if (team(p) === 'imp') p.killCd = Math.max(p.killCd, 15); });
  sabCd = Math.max(sabCd, 12);
}

// ---------- פעולות ----------
function nearest(p, arr, range) {
  let best = null, bd = range;
  arr.forEach(o => { const d = dist(p, o); if (d <= bd) { bd = d; best = o; } });
  return best;
}

function act(p, a) {
  if (!p || !a || typeof a !== 'object') return; // הודעה פגומה מהרשת לא מפילה את המשחק
  const t = now();
  switch (a.type) {
    case 'input': {
      const dx = Math.max(-1, Math.min(1, Number(a.dx) || 0));
      const dy = Math.max(-1, Math.min(1, Number(a.dy) || 0));
      p.input = { dx, dy };
      p.assist = !!a.assist; // במגע: רדיוס התנגשות קטן יותר, קל יותר לעבור במסדרונות ובדלתות
      break;
    }
    case 'camoff': p.cam = false; break;
    case 'guard': {
      if (phase !== 'play' || !p.alive || p.role !== 'bodyguard' || p.guardCd > 0 || p.inVent !== null) return;
      const tgt = nearest(p, list().filter(o => o.id !== p.id && o.alive && !o.spectator && o.inVent === null && !(o.vanishUntil > t)), 160);
      if (!tgt) return toast(p, '🛡 התקרב לשחקן כדי להגן עליו');
      tgt.shieldUntil = t + settings.guardTime; tgt.guardedBy = p.id; p.guardCd = settings.guardCd;
      toast(p, '🛡 אתה מגן על ' + nm(tgt) + ' ל-' + settings.guardTime + ' שניות');
      break;
    }
    case 'photo': {
      if (phase !== 'play' || !p.alive || p.role !== 'photographer' || p.photoCd > 0 || p.inVent !== null) return;
      const near = list().filter(o => o.id !== p.id && o.alive && !o.spectator && o.inVent === null && !(o.vanishUntil > t) && dist(o, p) < 330);
      const bds = bodies.filter(b => dist(b, p) < 330);
      if (!near.length && !bds.length) return toast(p, '📸 אין מה לצלם כאן');
      const room = (MAP.roomAt(p.x, p.y) || {}).name || 'מסדרון';
      const shown = o => (o.shapeAs && players[o.shapeAs] ? players[o.shapeAs] : o).name.replace(/^🤖\s*/, '');
      p.photos.push({ t, room, names: near.map(shown), bodies: bds.length });
      if (p.photos.length > 6) p.photos.shift();
      p.photoCd = settings.photoCd;
      toast(p, '📸 צילמת ב' + room + ': ' + (near.map(shown).join(', ') || 'גופה'));
      break;
    }
    case 'investigate': {
      if (phase !== 'play' || !p.alive || p.role !== 'detective' || p.investCd > 0 || p.inVent !== null) return;
      const tgt = nearest(p, list().filter(o => o.id !== p.id && o.alive && !o.spectator && o.inVent === null && !(o.vanishUntil > t)), 160);
      if (!tgt) return toast(p, '🔎 התקרב לשחקן כדי לחקור אותו');
      const nm = tgt.name.replace(/^🤖\s*/, '');
      const text = tgt.nearKill > 0 && tgt.role !== 'mole' ? `🔎 ${nm} היה ליד זירת חיסול` : `🔎 ${nm}: אין ראיות נגדו`;
      p.notes.push(text); if (p.notes.length > 6) p.notes.shift();
      p.noteMeta = p.noteMeta || []; p.noteMeta.push({ id: tgt.id, hit: tgt.nearKill > 0 }); if (p.noteMeta.length > 6) p.noteMeta.shift();
      p.investCd = settings.investCd;
      toast(p, text);
      break;
    }
    case 'vanish': {
      if (phase !== 'play' || !p.alive || p.role !== 'phantom') return;
      if (p.vanishUntil > t) { p.vanishUntil = 0; p.vanishCd = settings.vanishCd; toast(p, '👻 הופעת מחדש'); return; }
      if (p.vanishCd > 0 || p.inVent !== null) return toast(p, 'היכולת בהשהיה');
      p.vanishUntil = t + settings.vanishTime; p.work = null; p.cam = false;
      toast(p, '👻 אתה נעלם ל-' + settings.vanishTime + ' שניות');
      break;
    }
    // ---------- הרדוף ----------
    case 'hauntDoor': { // נועל את הדלת הקרובה אליו (גם כרוח)
      if (phase !== 'play' || p.role !== 'poltergeist' || p.spectator) return;
      if (p.hauntDoorCd > 0) return toast(p, 'נעילת דלת בעוד ' + Math.ceil(p.hauntDoorCd) + ' שניות');
      let best = null, bd = HAUNT_DOOR_RANGE;
      const seen = new Set();
      for (const rid in MAP.ROOMS) for (const d of MAP.doorRects(rid)) {
        const key = d.x + ',' + d.y; if (seen.has(key)) continue; seen.add(key);
        const dd = Math.hypot(d.x + d.w / 2 - p.x, d.y + d.h / 2 - p.y);
        if (dd < bd && !hauntDoors.some(h => h.key === key && h.until > t)) { bd = dd; best = { ...d, key }; }
      }
      if (!best) return toast(p, 'אין דלת קרובה');
      if (list().some(q => q.alive && !q.spectator && q.inVent === null && q.x > best.x - 20 && q.x < best.x + best.w + 20 && q.y > best.y - 20 && q.y < best.y + best.h + 20)) return toast(p, 'מישהו עומד בפתח – נסה שוב בעוד רגע');
      hauntDoors.push({ ...best, until: t + HAUNT_DOOR_TIME });
      p.hauntDoorCd = HAUNT_DOOR_CD;
      toast(p, '🚪 נעלת דלת ל-' + HAUNT_DOOR_TIME + ' שניות');
      break;
    }
    case 'hauntLight': { // מכבה את האור בחדר שהוא נמצא בו (גם כרוח)
      if (phase !== 'play' || p.role !== 'poltergeist' || p.spectator) return;
      if (p.darkCd > 0) return toast(p, 'כיבוי אור בעוד ' + Math.ceil(p.darkCd) + ' שניות');
      const r = MAP.roomAt(p.x, p.y);
      if (!r) return toast(p, 'צריך לעמוד בתוך חדר כדי לכבות בו את האור');
      darkRooms[r.id] = t + DARK_TIME; p.darkCd = DARK_CD;
      toast(p, '💡 כיבית את האור ב' + r.name + ' ל-' + DARK_TIME + ' שניות');
      for (const q of list()) if (q.id !== p.id && q.alive && team(q) === 'crew') { const qr = MAP.roomAt(q.x, q.y); if (qr && qr.id === r.id) toast(q, '💡 האור כבה פתאום…'); }
      break;
    }
    case 'drag': { // גרירת גופה: לחיצה נוספת משחררת
      if (phase !== 'play' || p.role !== 'poltergeist' || !p.alive) return;
      if (p.drag) { p.drag = null; p.dragCd = DRAG_CD; toast(p, '🫳 שחררת את הגופה'); return; }
      if (p.dragCd > 0) return toast(p, 'גרירה בעוד ' + Math.ceil(p.dragCd) + ' שניות');
      if (p.inVent !== null) return;
      const body = bodies.filter(b => !list().some(o => o.drag && o.drag.id === b.id)).sort((x, y) => dist(x, p) - dist(y, p))[0];
      if (!body || dist(body, p) > 80) return toast(p, 'אין גופה קרובה');
      p.drag = { id: body.id, ox: body.x, oy: body.y, until: t + DRAG_TIME };
      p.work = null; p.cam = false;
      toast(p, '🫳 אתה גורר גופה (עד ' + DRAG_TIME + ' שניות). לחץ שוב כדי לשחרר');
      break;
    }
    case 'ward': { // מגן אישי: מחליף פעם אחת את מי שהוא שומר עליו
      if (phase !== 'play' || !p.alive || p.role !== 'guardian') return;
      if (!p.wardSwap) return toast(p, 'כבר החלפת פעם אחת');
      const tgt = nearest(p, list().filter(o => o.id !== p.id && o.id !== p.ward && o.alive && !o.spectator && o.inVent === null && !(o.vanishUntil > t)), 160);
      if (!tgt) return toast(p, '🫂 התקרב לשחקן כדי לשמור עליו');
      p.ward = tgt.id; p.wardSwap = false; p.wardDied = null;
      toast(p, '🫂 עכשיו אתה שומר על ' + nm(tgt));
      break;
    }
    case 'rewind': { // שומר הזמן: פעם אחת במשחק
      if (phase !== 'play' || !p.alive || p.role !== 'timekeeper' || p.rewindUsed || settings.mode === 2) return;
      p.rewindUsed = true; doRewind(p);
      break;
    }
    case 'noise': { // רעשן: רעש מזויף בחדר אחר
      if (phase !== 'play' || !p.alive || p.role !== 'noisemaker' || p.inVent !== null) return;
      if (p.noiseCd > 0) return toast(p, 'רעש נוסף בעוד ' + Math.ceil(p.noiseCd) + ' שניות');
      makeNoise(p, a.room);
      break;
    }
    case 'sab': {
      if (phase !== 'play' || !p.alive || team(p) !== 'imp' || settings.mode === 3) return;
      if (a.kind === 'cams') { // שיבוש מצלמות: חבלה קטנה, לא משבר
        if (camsOffUntil > t || camsCd > t) return toast(p, 'שיבוש מצלמות בעוד ' + Math.ceil(Math.max(camsOffUntil, camsCd) - t) + ' שניות');
        camsOffUntil = t + CAMS_OFF; camsCd = t + CAMS_OFF + CAMS_CD; ev('sab', '📺 המצלמות שובשו');
        toast(p, '📺 שיבשת את המצלמות ל-' + CAMS_OFF + ' שניות'); return;
      }
      if (a.kind === 'door') { if (!closeDoors(a.room, p.role === 'saboteur')) toast(p, 'הדלתות עדיין בהשהיה'); return; }
      if (!['lights', 'oxygen', 'reactor', 'freeze'].includes(a.kind) || !(MAP.SAB_POINTS[a.kind] || []).length) return; // במפה הקטנה אין כור
      const fast = p.role === 'saboteur' && sabCd <= SAB_CD / 2; // מחבל: מחכה חצי מהזמן
      if (sab || (sabCd > 0 && !fast)) return toast(p, 'חבלה נוספת בעוד ' + Math.ceil(p.role === 'saboteur' ? sabCd - SAB_CD / 2 : sabCd) + ' שניות');
      startSab(a.kind, fast, p.role === 'saboteur');
      break;
    }
    case 'sabfinish': {
      if (!sab || !p.sabWork || p.sabWork.i !== Number(a.i) || p.sabWork.t < 1 || !p.alive) return;
      const i = p.sabWork.i; p.sabWork = null; fixSab(i);
      break;
    }
    case 'use': {
      if (phase !== 'play' || p.spectator) return;
      const t0 = p.tasks.filter(x => !x.done).map(x => ({ ...MAP.TASKS[x.i], ref: x }));
      const task = nearest(p, t0, USE_RANGE);
      if (p.inVent !== null) return;
      if (settings.mode === 5 && team(p) === 'imp' && p.alive) { // מתחזה מכבה נרות
        const lit = candleIdx().filter(i => candleLit[i]).map(i => ({ ...MAP.TASKS[i], ci: i }));
        const c = nearest(p, lit, USE_RANGE);
        if (c) { if ((p.blowAt || 0) > now()) return toast(p, '💨 אפשר לכבות שוב בעוד ' + Math.ceil(p.blowAt - now()) + ' שניות'); blowCandle(p, c.ci); return; }
      }
      // נקודת תיקון של חבלה פעילה
      if (sab && p.alive) {
        const pts = MAP.SAB_POINTS[sab.type];
        const idx = pts.findIndex((q, i) => !sab.fixed[i] && dist(p, q) < 70);
        if (idx >= 0) { p.sabWork = { i: idx, t: 0 }; p.work = null; return; }
      }
      if (task) { p.work = { ref: task.ref, t: 0, mini: isMini(task.ref.i) }; return; }
      // כיסא האבטחה: צופים במצלמות. תזוזה או לחיצה נוספת מסיימות את הצפייה
      if (p.alive && dist(p, MAP.CAM_CONSOLE) < 80) { p.cam = !p.cam; p.work = null; return; }
      if (p.alive && dist(p, MAP.BUTTON) < 80) {
        if (settings.mode === 2) return toast(p, 'במרוץ אין ישיבות – רק משימות!');
        if (settings.mode === 3) return toast(p, 'במחבואים אין ישיבות – רק לברוח ולהתחבא!');
        if (sab && sab.type !== 'lights' && sab.type !== 'freeze') return toast(p, 'אי אפשר לכנס ישיבה בזמן משבר!');
        if (p.emergencyUsed) return toast(p, 'כבר השתמשת בכפתור החירום');
        p.emergencyUsed = true;
        callMeeting(p, null);
      }
      break;
    }
    case 'kill': {
      if (phase !== 'play' || !p.alive || team(p) !== 'imp' || p.killCd > 0 || p.inVent !== null) return;
      if (p.role === 'saboteur') return toast(p, 'מחבל לא מחסל – חבל במקום!');
      if (p.role === 'poltergeist') return toast(p, 'הרדוף לא מחסל – נעל דלת, כבה אור או גרור גופה!');
      if (p.vanishUntil > t) return toast(p, 'אי אפשר לחסל בזמן שאתה נעלם');
      if (p.frozenUntil > t) return toast(p, 'עוד רגע… סופר עד 10');
      const tgt = nearest(p, list().filter(o => o.alive && !o.spectator && team(o) !== 'imp' && o.inVent === null && (o.hiding == null || dist(o, p) < 60)), tplOf(p.role) === 'sniper' ? 190 : KILL_RANGE);
      if (!tgt) return;
      if (tgt.shieldUntil > t || miracleAt(tgt)) {
        p.killCd = 10; toast(p, '🛡 המטרה מוגנת!');
        if (tgt.guardedBy && players[tgt.guardedBy] && players[tgt.guardedBy].alive) { toast(players[tgt.guardedBy], '🛡 הצלת את ' + nm(tgt) + ' מחיסול!'); ev('guard', `🛡 שומר הראש הציל את ${nm(tgt)} מחיסול`); }
        return;
      }
      if (tplOf(tgt.role) === 'lucky' && !tgt.luckUsed) { tgt.luckUsed = true; p.killCd = 10; toast(p, '🍀 למטרה יש מזל – החיסול נכשל!'); toast(tgt, '🍀 מזל! שרדת ניסיון חיסול. תיזהר, זה לא יקרה שוב'); return; }
      if (tplOf(p.role) === 'poisoner') { tgt.poisonAt = t + 12; tgt.poisonBy = p.id; p.killCd = killCdFor(); toast(p, '☠️ הרעלת את ' + nm(tgt) + ' – הוא ימות בעוד 12 שניות'); toast(tgt, '🤢 הורעלת! נשארו לך 12 שניות לחיות – תספר למישהו מי היה לידך!'); return; }
      tgt.alive = false; tgt.work = null; tgt.cam = false;
      bodies.push({ id: tgt.id, x: tgt.x, y: tgt.y, color: tgt.color, decayAt: p.role === 'viper' ? t + settings.rotTime : 0, t, killer: p.id });
      p.x = tgt.x; p.y = tgt.y; p.killCd = killCdFor() * (tplOf(p.role) === 'vampire' ? 0.6 : tplOf(p.role) === 'sniper' ? 1.4 : 1);
      p.stats.kills++; noteKill(p, tgt); ev('kill', `🔪 ${nm(p)} חיסל את ${nm(tgt)} ב${(MAP.roomAt(tgt.x, tgt.y) || {}).name || 'מסדרון'}`);
      // לבלש: מי שהיה ליד הזירה נרשם כחשוד קל
      list().forEach(q => { if (q.alive && !q.spectator && dist(q, tgt) < 700) q.nearKill = (q.nearKill || 0) + 1; });
      // בוטים שראו את החיסול זוכרים מי עשה את זה
      list().forEach(o => {
        if (o.bot && o.alive && o.id !== p.id && team(o) === 'crew' && dist(o, tgt) < 330) {
          o.bot.sawKill = p.id; o.bot.sawVictim = tgt.id; o.bot.plan = [{ x: tgt.x, y: tgt.y }]; o.bot.wait = 0;
        }
      });
      toast(tgt, '💀 חוסלת! עכשיו אתה רוח – אפשר להמשיך במשימות ולצפות בכולם.');
      killLog.push({ id: tgt.id, t, killer: p.id });
      const kRoom = (MAP.roomAt(tgt.x, tgt.y) || {}).name || 'המסדרון';
      list().forEach(g => { if (g.role === 'guardian' && g.ward === tgt.id && g.id !== tgt.id) {
        g.wardDied = { id: tgt.id, room: kRoom, t };
        const msg = '💔 ' + nm(tgt) + ' (שאתה שומר עליו) חוסל ב' + kRoom + '!';
        toast(g, msg); g.notes = g.notes || []; g.notes.push(msg); if (g.notes.length > 6) g.notes.shift();
      } });
      if (tplOf(tgt.role) === 'martyr' && martyrWin(tgt)) break;
      checkWin();
      break;
    }
    case 'mod': modUse(p); break;
    case 'banana': { // הליצן משאיר קליפת בננה
      if (phase !== 'play' || !p.alive || p.role !== 'jester' || p.inVent !== null || (p.bananaCd || 0) > 0) return;
      const mine = bananas.filter(b => b.by === p.id);
      if (mine.length >= BANANA_MAX) bananas.splice(bananas.indexOf(mine[0]), 1);
      bananas.push({ x: p.x, y: p.y + 10, by: p.id, until: t + BANANA_LIFE });
      p.bananaCd = settings.bananaCd; toast(p, '🍌 השארת קליפת בננה. מי שדורך עליה – מחליק!');
      break;
    }
    case 'fakeBody': { // הליצן מניח גופה מזויפת בצבע של שחקן אחר
      if (phase !== 'play' || !p.alive || p.role !== 'jester' || p.inVent !== null || (p.fakeCd || 0) > 0 || settings.mode === 2) return;
      const others = list().filter(o => o.id !== p.id && !o.spectator);
      if (!others.length) return;
      bodies = bodies.filter(b => !b.fake);
      bodies.push({ id: 'fake' + Math.floor(Math.random() * 1e9), fake: true, by: p.id, x: p.x + p.dir * 30, y: p.y + 6, color: pick(others).color, decayAt: 0, t });
      p.fakeCd = settings.fakeCd; toast(p, '🎈 הנחת גופה מזויפת. מי שידווח עליה יכנס ישיבה…');
      ev('fake', `🎈 ${nm(p)} הניח גופה מזויפת`);
      break;
    }
    case 'report': {
      if (phase !== 'play' || !p.alive || settings.mode === 2 || settings.mode === 3) return;
      const b = nearest(p, bodies, REPORT_RANGE);
      if (b) callMeeting(p, b);
      break;
    }
    case 'vent': {
      const hideVent = settings.mode === 3 && p.role === 'crew'; // מחבואים: המתחבאים יכולים להיכנס לפתחים 5 פעמים
      if (phase !== 'play' || !p.alive || !(hideVent || ['impostor', 'shifter', 'engineer', 'phantom', 'viper', 'noisemaker', 'saboteur', 'poltergeist', 'jester'].includes(p.role) || (MOD[p.role] && MOD[p.role][1] === 'imp'))) return;
      if (p.inVent !== null) { if (settings.mode === 3) addPing(p.x, p.y, p.id); p.inVent = null; witnessVent(p); return; } // יציאה מהפתח
      if (hideVent) { if ((p.hideVents || 0) >= HIDE_VENTS) return toast(p, '🕳️ נגמרו לך הכניסות לפתחים'); }
      if (p.role === 'engineer' && p.engVentCd > 0) return toast(p, '🕳️ אפשר לזחול שוב בעוד ' + Math.ceil(p.engVentCd) + ' שניות');
      const v = nearest(p, MAP.VENTS, USE_RANGE);
      if (!v) return;
      witnessVent(p); if (settings.mode === 3) addPing(v.x, v.y, p.id);
      p.inVent = MAP.VENTS.indexOf(v); p.x = v.x; p.y = v.y; p.work = null;
      if (hideVent) { p.hideVents = (p.hideVents || 0) + 1; p.ventSince = t; toast(p, '🕳️ נשארו לך ' + (HIDE_VENTS - p.hideVents) + ' כניסות לפתחים (עד ' + HIDE_VENT_TIME + ' שניות בכל פעם)'); }
      break;
    }
    case 'hide': { // מחבואים: להיכנס/לצאת ממקום מסתור
      if (phase !== 'play' || !p.alive || !spotsOn() || p.role !== 'crew' || p.inVent !== null) return;
      if (p.hiding != null) { p.hiding = null; p.hideCd = HIDE_SPOT_CD; addPing(p.x, p.y, p.id); return; }
      if ((p.hideCd || 0) > 0) return toast(p, '🫣 אפשר להסתתר שוב בעוד ' + Math.ceil(p.hideCd) + ' שניות');
      const sp = nearest(p, SPOTS().filter((q, i) => !list().some(o => o.hiding === i)), USE_RANGE + 15);
      if (!sp) return;
      p.hiding = MAP.SPOTS.indexOf(sp); p.x = sp.x; p.y = sp.y; p.work = null; p.hideSince = t;
      addPing(sp.x, sp.y, p.id);
      toast(p, '🫣 מסתתר! (עד ' + HIDE_SPOT_TIME + ' שניות, אפשר לצאת עם M)');
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
      if (phase !== 'play' || !p.work || !p.work.mini || p.work.ref.i !== Number(a.i) || p.work.t < 1.5) return; // משימה היא סיבוב אחד, בכל אורך משימות
      const r = p.work.ref; p.work = null; completeTask(p, r);
      break;
    }
    case 'cancel': p.work = null; p.sabWork = null; break;
    case 'lobbyinfo': p.lobbySig = ''; p.sentMap = ''; break;
    case 'pet': { // חיית מחמד שהולכת אחרי הרחפן (נפתחת לפי ניצחונות)
      if (phase !== 'lobby') return;
      const n = Number(a.pet);
      if (n >= 0 && n < PET_COUNT) p.pet = n;
      break;
    }
    case 'hat': {
      if (phase !== 'lobby') return;
      const h = Number(a.hat);
      if (h >= 0 && h < (opts.pro ? PRO_HAT_COUNT : HAT_COUNT)) p.hat = h;
      break;
    }
    case 'shift': {
      if (phase !== 'play' || !p.alive || p.role !== 'shifter') return;
      if (p.shapeAs) { p.shapeAs = null; p.shiftCd = settings.shiftCd; return; }
      if (p.shiftCd > 0) return;
      const tgt = nearest(p, list().filter(o => o.id !== p.id && o.alive && !o.spectator), 5000);
      if (!tgt) return;
      p.shapeAs = tgt.id; p.shapeUntil = t + settings.shiftTime;
      // בוטים שראו את ההתחפשות יחשפו אותו בישיבה
      list().forEach(o => { if (o.bot && o.alive && o.id !== p.id && team(o) === 'crew' && dist(o, p) < 400) o.bot.sawShift = p.id; });
      toast(p, '🎭 התחפשת ל' + tgt.name);
      break;
    }
    case 'shield': {
      if (phase !== 'play' || p.alive || p.role !== 'angel' || p.gaCd > 0) return;
      const tgt = nearest(p, list().filter(o => o.alive && !o.spectator), 150);
      if (!tgt) return toast(p, 'התקרב לשחקן חי כדי להגן עליו');
      tgt.shieldUntil = t + settings.shieldTime; p.gaCd = settings.gaCd;
      toast(p, '🛡 הגנת על ' + tgt.name);
      break;
    }
    case 'vote': {
      if (phase !== 'meeting' || meeting.reveal || !p.alive || p.spectator || meeting.votes[p.id]) return;
      if (a.target !== 'skip' && !(players[a.target] && players[a.target].alive)) return;
      meeting.votes[p.id] = a.target;
      break;
    }
    case 'verdict': { // פסק דין של השופט: פעם אחת במשחק, אחרי שסיים את כל המשימות שלו
      if (phase !== 'meeting' || !meeting || meeting.reveal || p.role !== 'judge' || !p.alive || p.spectator || p.verdictUsed) return;
      if (!judgeReady(p)) return toast(p, '⚖️ צריך לסיים את כל המשימות שלך כדי לפסוק');
      const tg = players[a.target];
      if (!tg || !tg.alive || tg.spectator || tg.id === p.id) return;
      p.verdictUsed = true; resolveMeeting(tg.id, p);
      break;
    }
    case 'talk': p.talking = !!a.on; p.talkT = now(); break;
    case 'chat': {
      const text = String(a.text || '').trim().slice(0, 140);
      if (!text) return;
      // מצב אדמין (חשיפה): רק במשפט הסודי, בכתיבה או בדיבור, בכל שלב במשחק. המשפט עצמו לא מופיע בצ'אט.
      const adm = adminPhrase(text);
      if (adm !== null) { if (phase !== 'lobby') settings.reveal = adm; return; }
      if (phase === 'meeting' && !p.alive) return;
      if (phase !== 'meeting' && phase !== 'lobby') return;
      say(p, a.voice ? '🎙️ ' + text : text);
      break;
    }
    case 'settings':
      if (p.id !== hostId || phase !== 'lobby') return;
      settings.impostors = Math.max(1, Math.min(5, Number(a.impostors) || 1));
      settings.bots = Math.max(0, Math.min(MAX_BOTS, Number(a.bots) || 0));
      const cl = (v, lo, hi, d) => { v = Number(v); return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
      settings.killCd = cl(a.killCd, 10, 60, 25);
      settings.speed = cl(a.speed, 0.5, 2, 1);
      settings.vision = cl(a.vision, 0.5, 2, 1);
      settings.tasks = Math.round(cl(a.tasks, 1, 8, 4));
      settings.meetingTime = Math.round(cl(a.meetingTime, 20, 180, 60));
      settings.confirm = a.confirm !== false;
      settings.openVotes = a.openVotes !== false;
      settings.taskLevel = Math.round(cl(a.taskLevel, 1, 3, 2));
      settings.newRoles = a.newRoles !== false;
      if (Array.isArray(a.roleOff)) settings.roleOff = a.roleOff.filter(k => TOGGLE_ROLES.includes(k));
      settings.jester = !!a.jester;
      settings.botLevel = Math.round(cl(a.botLevel, 1, 3, 2));
      settings.map = typeof a.map === 'string' && Object.prototype.hasOwnProperty.call(MAPS, a.map) ? a.map : 'big';
      settings.rounds = [1, 3, 5].includes(Number(a.rounds)) ? Number(a.rounds) : 1;
      settings.hideTime = Math.round(cl(a.hideTime, 60, 600, 180));
      if (a.code !== undefined) settings.code = String(a.code).replace(/[^0-9 ,]/g, '').replace(/[ ,]+/g, ' ').trim().slice(0, 60); // אפשר כמה קודים יחד, מופרדים ברווח
      settings.mode = [1, 2, 3, 4].concat(hanukOn() ? [5] : []).includes(a.mode) ? a.mode : 1;
      settings.raceGoal = Math.round(cl(a.raceGoal, 4, 25, 10));
      for (const k in ROLE_SET) settings[k] = Math.round(cl(a[k] === undefined ? settings[k] : a[k], ROLE_SET[k][1], ROLE_SET[k][2], ROLE_SET[k][0]));
      // קודי פרו: משנים הגדרות (נבדקים אחרי שהקוד נקבע)
      if (proCode('1000')) settings.speed = Math.max(settings.speed, 1.4);          // 1000 – אולטרה: מהירות גבוהה
      if (proCode('2000')) settings.vision = Math.min(settings.vision, 0.5);         // 2000 – ליל חשכה: טווח ראייה קצר מאוד
      if (proCode('9000')) { settings.killCd = 10; settings.taskLevel = 3; }          // 9000 – מלחמה: חיסולים מהירים ומשימות ארוכות
      break;
    case 'color': {
      if (phase !== 'lobby') return;
      const c = Number(a.color);
      if (c >= 0 && c < COLORS.length && !list().some(o => o.id !== p.id && o.color === c)) p.color = c;
      break;
    }
    case 'kick': { // המארח מוציא שחקן מהחדר (גם באמצע משחק). השחקן לא יכול לחזור עם אותה דמות
      if (p.id !== hostId) return;
      const tgt = players[String(a.id)];
      if (!tgt || tgt.id === hostId || tgt.isBot) return;
      tgt.kicked = true; tgt.conn = false;
      if (phase === 'lobby') delete players[tgt.id];
      else { tgt.alive = false; tgt.spectator = true; }
      break;
    }
    case 'lock': // המארח נועל את החדר: שחקנים חדשים לא נכנסים, מי שכבר בפנים יכול להתחבר מחדש
      if (p.id !== hostId) return;
      settings.locked = !!a.on;
      break;
    case 'start': startGame(p.id); break;
    case 'lobby': backToLobby(p.id); break;
    case 'again': if (p.id === hostId && phase === 'end') { backToLobby(p.id); startGame(p.id); } break;
  }
}

// ---------- שומר הזמן והרעשן ----------
function doRewind(p) {
  const t = now(), back = settings.rewindSecs;
  const snap = posHist.find(h => h.t >= t - back - 0.5) || posHist[0];
  const revived = [];
  for (const k of killLog) {
    const q = players[k.id];
    if (k.t < t - back || !q || q.alive || q.spectator) continue;
    q.alive = true; revived.push(q);
    bodies = bodies.filter(b => b.id !== q.id);
    if (players[k.killer]) players[k.killer].stats.kills = Math.max(0, players[k.killer].stats.kills - 1);
    toast(q, '✨ הזמן חזר אחורה – חזרת לחיים!');
    rewound[q.id] = { killer: k.killer, t };
    if (q.bot && players[k.killer]) { // בוט שהוחזר לחיים זוכר מי הרג אותו: יספר, יצביע עליו, ולפעמים ירוץ ללחוץ על כפתור החירום
      q.bot.sawKill = k.killer; q.bot.sawVictim = q.id; q.bot.saidKiller = false;
      q.bot.pressButton = !q.emergencyUsed && Math.random() < 0.8; q.bot.plan = [];
    }
  }
  killLog = killLog.filter(k => k.t < t - back);
  if (snap) for (const q of list()) {
    const ps = snap.pos[q.id];
    if (!ps || !q.alive || q.spectator) continue;
    q.x = ps[0]; q.y = ps[1]; q.inVent = null; q.work = null; q.cam = false; q.sabWork = null; q.drag = null;
  }
  noises = []; bananas = [];
  toastAll('⏪ שומר הזמן החזיר את כולם ' + back + ' שניות אחורה!' + (revived.length ? ' ' + revived.map(nm).join(', ') + ' חזר לחיים!' : ''));
  ev('rewind', '⏪ ' + nm(p) + ' החזיר את הזמן ' + back + ' שניות' + (revived.length ? ' – ' + revived.map(nm).join(', ') + ' חזר לחיים' : ''));
}
function martyrWin(m) {
  winner = { team: 'jester', reason: `🕊️ ${nm(m)} היה הקורבן – חיסלו אותו, והוא ניצח לבד!`, jester: m.id, role: 'martyr' };
  phase = 'end'; settings.reveal = true; ev('end', '🏁 ' + winner.reason); return true;
}
// הריגה שלא דרך כפתור החיסול (הרעלה, פצצה)
function slay(tgt, killer) {
  if (!tgt.alive || phase !== 'play') return;
  const t = now();
  tgt.alive = false; tgt.work = null; tgt.cam = false; tgt.poisonAt = 0; tgt.inVent = null;
  bodies.push({ id: tgt.id, x: tgt.x, y: tgt.y, color: tgt.color, decayAt: 0, t, killer: killer.id });
  if (killer.stats) killer.stats.kills++;
  noteKill(killer, tgt);
  ev('kill', `🔪 ${nm(killer)} חיסל את ${nm(tgt)} ב${(MAP.roomAt(tgt.x, tgt.y) || {}).name || 'מסדרון'}`);
  killLog.push({ id: tgt.id, t, killer: killer.id });
  list().forEach(q => { if (q.alive && !q.spectator && dist(q, tgt) < 700) q.nearKill = (q.nearKill || 0) + 1; });
  toast(tgt, '💀 חוסלת! עכשיו אתה רוח – אפשר להמשיך במשימות ולצפות בכולם.');
  if (tplOf(tgt.role) === 'martyr' && martyrWin(tgt)) return;
  checkWin();
}
const miracleAt = q => miracles.some(m => m.until > now() && dist(m, q) < 230);
// יכולת מיוחדת של תפקידי המודים (כפתור O)
function modUse(p) {
  const def = MOD[p.role], t = now();
  if (!def || phase !== 'play' || !p.alive || p.inVent !== null || !def[3]) return;
  if ((p.modCd || 0) > 0) return toast(p, 'היכולת בהשהיה עוד ' + Math.ceil(p.modCd) + ' שניות');
  if (def[5] && (p.modUsed || 0) >= def[5]) return toast(p, 'נגמרו לך השימושים');
  const room = MAP.roomAt(p.x, p.y);
  const body = nearest(p, bodies.filter(b => !b.fake), 110);
  let ok = false;
  switch (tplOf(p.role)) {
    case 'shamash': miracles.push({ x: p.x, y: p.y, until: t + modDur(p.role, 15), by: p.id }); toast(p, '🕎 נס! אור קסום – אף אחד בתוכו לא ייפגע'); ev('miracle', `🕎 ${nm(p)} הדליק את נס פח השמן ב${room ? room.name : 'מסדרון'}`); ok = true; break;
    case 'sprinter': p.sprintUntil = t + modDur(p.role, 5); toast(p, '🏃 רץ!'); ok = true; break;
    case 'medic': {
      const q = body && players[body.id];
      if (!q || q.alive) return toast(p, 'אין גופה קרובה להחיות');
      q.alive = true; q.x = body.x; q.y = body.y; q.ejected = false; q.work = null; bodies.splice(bodies.indexOf(body), 1);
      toast(q, '🩺 הרופא החיה אותך! אתה שוב בחיים'); toast(p, '🩺 החזרת את ' + nm(q) + ' לחיים!');
      ev('medic', `🩺 ${nm(p)} החיה את ${nm(q)}`); ok = true; break;
    }
    case 'trapper': traps.push({ x: p.x, y: p.y, by: p.id }); toast(p, '🪤 הנחת מלכודת. תקבל הודעה מי יפול בה'); ok = true; break;
    case 'radar': p.radarUntil = t + modDur(p.role, 5); toast(p, '📡 המכ"ם פעיל – רואים את כולם'); ok = true; break;
    case 'jailer': if (!room || !closeDoors(room.id)) return toast(p, 'אי אפשר לנעול את החדר הזה עכשיו'); toast(p, '🔒 נעלת את ' + room.name); ok = true; break;
    case 'empath': {
      const near = list().some(o => o.id !== p.id && o.alive && !o.spectator && evil(o) && dist(o, p) < 260);
      toast(p, near ? '😨 יש כאן מישהו מסוכן קרוב אליך!' : '😌 אין מתחזה בטווח'); ok = true; break;
    }
    case 'blinker': {
      const rs = Object.values(MAP.ROOMS).filter(r => !room || r.id !== room.id); let spot = null;
      for (let i = 0; i < 40 && !spot; i++) { const r = pick(rs), x = r.x + 60 + Math.random() * (r.w - 120), y = r.y + 60 + Math.random() * (r.h - 120); if (MAP.walkable(x, y)) spot = { x, y }; }
      if (!spot) return; p.x = spot.x; p.y = spot.y; p.work = null; toast(p, '🌀 השתגרת!'); ok = true; break;
    }
    case 'cleaner': if (!body) return toast(p, 'אין גופה קרובה לנקות'); bodies.splice(bodies.indexOf(body), 1); toast(p, '🧹 הגופה נוקתה'); ok = true; break;
    case 'zapper': {
      const hit = list().filter(o => o.alive && !o.spectator && team(o) !== 'imp' && o.inVent === null && dist(o, p) < 170);
      if (!hit.length) return toast(p, 'אין אף אחד קרוב');
      hit.forEach(o => { o.frozenUntil = t + 3.5; o.work = null; toast(o, '⚡ קיבלת שוק חשמלי!'); }); toast(p, '⚡ הקפאת ' + hit.length + ' שחקנים'); ok = true; break;
    }
    case 'bomber': bombs.push({ x: p.x, y: p.y, by: p.id, at: t + 6 }); toast(p, '💣 הנחת פצצה – תרחק! היא מתפוצצת בעוד 6 שניות'); ok = true; break;
    case 'vulture': {
      if (!body) return toast(p, 'אין גופה קרובה לאכול');
      bodies.splice(bodies.indexOf(body), 1); p.eaten = (p.eaten || 0) + 1; toast(p, '🦅 אכלת גופה (' + p.eaten + '/3)');
      if (p.eaten >= 3) { winner = { team: 'jester', reason: `🦅 ${nm(p)} היה הנשר – אכל 3 גופות, והוא ניצח לבד!`, jester: p.id, role: 'vulture' }; phase = 'end'; settings.reveal = true; ev('end', '🏁 ' + winner.reason); }
      ok = true; break;
    }
  }
  if (ok) { p.modUsed = (p.modUsed || 0) + 1; p.modCd = def[4]; }
}
function makeNoise(p, roomId) {
  const here = MAP.roomAt(p.x, p.y);
  let room = roomId && MAP.ROOMS[roomId] && (!here || here.id !== roomId) ? MAP.ROOMS[roomId] : null;
  if (!room) {
    const opts = Object.values(MAP.ROOMS).filter(r => !here || r.id !== here.id).sort((a, b) => dist(p, { x: a.cx, y: a.cy }) - dist(p, { x: b.cx, y: b.cy }));
    room = pick(opts.slice(1, 5).length ? opts.slice(1, 5) : opts);
  }
  if (!room) return;
  const t = now();
  noises.push({ id: ++noiseSeq, x: room.cx, y: room.cy, room: room.id, until: t + 6 });
  p.noiseCd = settings.noiseCd;
  toast(p, '🔊 השמעת רעש ב' + room.name);
  ev('noise', '🔊 ' + nm(p) + ' השמיע רעש מזויף ב' + room.name);
  for (const q of list()) {
    if (q.id === p.id || !q.alive || q.spectator || team(q) === 'imp') continue;
    if (Math.hypot(q.x - room.cx, q.y - room.cy) > 1300) continue;
    toast(q, '👣 שמעת רעש מכיוון ' + room.name + '!');
    if (q.bot && team(q) === 'crew' && Math.random() < 0.55) { // בוטים סקרנים הולכים לבדוק
      const pts = MAP.path(hereRoom(q).id, room.id);
      q.bot.plan = [...pts, { x: room.cx, y: room.cy }]; q.bot.goal = { x: room.cx, y: room.cy, room: room.id }; q.bot.wait = 0;
    }
  }
}

// ---------- בוטים ----------
const sightR = () => settings.botLevel === 3 ? 420 : settings.botLevel === 1 ? 240 : 320;
// בוט מהצוות שרואה מישהו נכנס לפתח אוורור או יוצא ממנו – זוכר את זה (מהנדס יכול להסביר את עצמו בישיבה)
function witnessVent(p) {
  const r = MAP.roomAt(p.x, p.y);
  list().forEach(o => {
    if (o.bot && o.alive && o.id !== p.id && team(o) === 'crew' && o.inVent === null && dist(o, p) < sightR() * 0.8)
      o.bot.sawVent = { id: p.id, room: r ? r.name : 'המסדרון' };
  });
}
// מה הבוט זוכר מסביב לזמן החיסול: מי היה בחדר של הגופה, ומי היה איתו במקום אחר (ולכן נקי)
function recallKill(p, body, bodyRoom) {
  const b = p.bot, h = b.hist || [], kt = body.t || now();
  const near = new Set(), withMe = new Set();
  for (const e of h) {
    if (e.id === p.id || e.id === body.id || Math.abs(e.t - kt) > 14) continue;
    if (bodyRoom && e.room === bodyRoom) near.add(e.id);
    else if (e.me && e.room !== bodyRoom && Math.abs(e.t - kt) < 8) withMe.add(e.id);
  }
  near.forEach(id => withMe.delete(id));
  b.nearBody = [...near].filter(id => players[id] && players[id].alive);
  b.alibi = [...withMe].filter(id => players[id] && players[id].alive);
}
function hereRoom(p) {
  const r = MAP.roomAt(p.x, p.y); if (r) return r;
  return Object.values(MAP.ROOMS).sort((a, b) => dist(p, { x: a.cx, y: a.cy }) - dist(p, { x: b.cx, y: b.cy }))[0];
}
// בוט שנתקע (למשל נדחף מהמסלול) מחשב מסלול מחדש מהמקום שבו הוא נמצא
function replan(p) {
  const b = p.bot, here = hereRoom(p);
  if (sab && b.sabTarget != null && !sab.fixed[b.sabTarget]) {
    const pt = MAP.SAB_POINTS[sab.type][b.sabTarget];
    b.plan = [...MAP.path(here.id, pt.room), { x: pt.x, y: pt.y }];
  } else if (b.goal && b.goal.room) b.plan = [...MAP.path(here.id, b.goal.room), { x: b.goal.x, y: b.goal.y }];
  else b.plan = [];
}
function botGoal(p) {
  const todo = p.tasks.filter(x => !x.done);
  let target;
  if (team(p) === 'crew' && todo.length) {
    // כמו שחקן אמיתי: בדרך כלל המשימה הקרובה, לפעמים אחרת
    const byDist = todo.slice().sort((x, y) => dist(p, MAP.TASKS[x.i]) - dist(p, MAP.TASKS[y.i]));
    const tk = Math.random() < (settings.botLevel === 1 ? 0.4 : 0.75) ? byDist[0] : pick(todo); target = { ...MAP.TASKS[tk.i], ref: tk };
  } else if (p.role === 'jester' && p.alive && MAP.VENTS.length && Math.random() < 0.3) {
    const v = pick(MAP.VENTS), vr = MAP.roomAt(v.x, v.y);
    if (vr) target = { x: v.x, y: v.y, room: vr.id, fake: true };
  }
  if (!target && settings.mode === 5 && team(p) === 'imp' && p.alive) { const lit = candleIdx().filter(i => candleLit[i]); if (lit.length && Math.random() < 0.7) { const tk = MAP.TASKS[pick(lit)]; target = { x: tk.x, y: tk.y, room: tk.room, fake: true }; } }
  if (target) { /* כבר נבחר יעד */ } else if (team(p) !== 'crew' && p.alive && MAP.TASKS.length && Math.random() < 0.6) {
    const tk = MAP.TASKS[Math.floor(Math.random() * MAP.TASKS.length)];
    target = { x: tk.x, y: tk.y, room: tk.room, fake: true };
  } else {
    const r = pick(Object.values(MAP.ROOMS));
    target = { x: r.cx + (Math.random() - 0.5) * (r.w - 80), y: r.cy + (Math.random() - 0.5) * (r.h - 80), room: r.id };
  }
  const here = hereRoom(p);
  const pts = MAP.path(here.id, target.room);
  p.bot.plan = [...pts, { x: target.x, y: target.y }];
  p.bot.goal = target;
}

// בוט חי מדבר מדי פעם בזמן המשחק, רק כשיש מישהו לידו (כמו צ'אט קולי לפי קרבה)
let talkId = 0;
function botChatter(p, dt) {
  const b = p.bot;
  if (b.talkT === undefined) b.talkT = 8 + Math.random() * 20;
  b.talkT -= dt;
  if (b.talkT > 0 || p.inVent !== null || p.vanishUntil > now()) return;
  b.talkT = (b.persona === 'chatty' ? 14 : b.persona === 'quiet' ? 45 : 25) + Math.random() * 20;
  const others = list().filter(o => o.id !== p.id && o.alive && !o.spectator && dist(o, p) < HEAR_R);
  if (!others.length) return;
  const human = others.find(o => !o.isBot), o = human || pick(others), n = bare(o.name);
  const room = (MAP.roomAt(p.x, p.y) || {}).name || 'המסדרון';
  let lines;
  if (sab) lines = ['צריך לתקן את התקלה, מהר!', 'מישהו בא איתי לתקן?', 'אני רץ לתקן, תכסו אותי', 'אם לא נתקן את זה נפסיד!'];
  else if (hanukOn() && Math.random() < 0.18) lines = ['חג אורים שמח, {n}! 🕎', 'מי רוצה סופגנייה? 🍩', '{n}, סביבון סביבון סוב סוב סוב 🎶', 'איזה יפה כל האורות האלה', 'נס גדול היה פה… בואו נשמור על כולם']
  else if (bodies.length && Math.random() < 0.3) lines = ['משהו פה מריח לא טוב…', 'יש לי הרגשה רעה', 'אני נשאר ליד אנשים, לא מסתובב לבד'];
  else lines = [
    'היי {n}, מה אתה עושה ב{r}?', '{n}, בוא נעשה משימות ביחד', 'אני הולך לעשות משימה', 'נשארו לי עוד כמה משימות',
    'מישהו ראה משהו חשוד?', 'אני לא אוהב את השקט הזה…', '{n}, אתה בא איתי?', 'אני הולך לבדוק מה קורה ב{r}',
    'למה אתה עוקב אחריי, {n}?', 'סיימתי משימה! עוד קצת', 'זהירות, אולי המתחזה פה', 'אני סומך עליך {n}, נשארים ביחד',
  ];
  const text = fill(fresh(lines), { n, r: room });
  nearTalk.push({ id: ++talkId, from: p.id, name: p.name, x: p.x, y: p.y, text, t: now() });
  nearTalk = nearTalk.filter(e => now() - e.t < 10);
}
function botTick(p, dt) {
  const b = p.bot;
  p.input = { dx: 0, dy: 0 };
  if (phase !== 'play' || p.spectator) return;

  if (p.alive) {
    botChatter(p, dt);
    if (settings.mode === 5 && team(p) === 'imp' && (p.blowAt || 0) <= now() && Math.random() < 0.15) { // בוט מתחזה מכבה נר שקרוב אליו
      const c = candleIdx().find(i => candleLit[i] && dist(p, MAP.TASKS[i]) < USE_RANGE - 8);
      if (c !== undefined) blowCandle(p, c);
    }
    // זיכרון: איפה ראיתי את מי
    b.seeT = (b.seeT || 0) - dt;
    if (b.seeT <= 0) {
      b.seeT = 1; b.seen = b.seen || {};
      const r = MAP.roomAt(p.x, p.y); if (r) b.lastRoom = r.name;
      const T0 = now(); b.hist = (b.hist || []).filter(e => T0 - e.t < 30);
      list().forEach(o => { if (o.id !== p.id && o.alive && o.inVent === null && dist(o, p) < sightR()) { const rr = MAP.roomAt(o.x, o.y); if (rr) {
        b.seen[o.id] = rr.name;
        // היסטוריה קצרה: איפה ומתי ראיתי כל אחד (me = היינו באותו חדר)
        const lastE = b.hist.filter(e => e.id === o.id).pop();
        if (!lastE || lastE.room !== rr.name || T0 - lastE.t > 4) b.hist.push({ id: o.id, room: rr.name, t: T0, me: !!r && r.id === rr.id });
      } } });
    }
    // רואים שני שחקנים זהים (משנה צורה) – בורחים, ולפעמים רצים לכפתור החירום
    if (team(p) === 'crew' && !b.flee) {
      const near = list().filter(o => o.id !== p.id && o.alive && o.inVent === null && dist(o, p) < 330);
      const fake = near.find(o => o.shapeAs && players[o.shapeAs] && players[o.shapeAs].alive && near.some(q => q.id === o.shapeAs));
      if (fake) { b.sawShift = fake.id; b.flee = { from: fake.id, t: 4 + Math.random() * 2 }; b.plan = []; b.pressButton = !p.emergencyUsed && Math.random() < 0.6; }
    }
    // מחבואים: המתחבא מתחבא חכם (מסתור או פתח אוורור), המחפש בודק מסתורים ומקשיב לרעשים
    if (settings.mode === 3 && team(p) !== 'imp' && phase === 'play') {
      const lvl = settings.botLevel, T = now();
      const sk = list().filter(o => o.alive && team(o) === 'imp' && !(o.frozenUntil > T)).sort((x, y) => dist(x, p) - dist(y, p))[0];
      const sd = sk ? dist(sk, p) : 9999;
      if (p.hiding != null) { // במסתור: נשאר, ויוצא כשהמחפש רחוק
        if (b.hideStay === undefined) b.hideStay = 6 + Math.random() * 14;
        if (T - p.hideSince > b.hideStay && sd > 450) { act(p, { type: 'hide' }); b.hideStay = undefined; b.wait = 0.5; }
        return;
      }
      if (p.inVent !== null) {
        if (b.ventStay === undefined) b.ventStay = 4 + Math.random() * 9;
        if (T - (p.ventSince || T) > b.ventStay && sd > 300) { act(p, { type: 'vent' }); b.ventStay = undefined; b.wait = 0.5; }
        return;
      }
      const freeSpot = (maxD) => SPOTS().map((q, i) => ({ q, i })).filter(o => !list().some(z => z.hiding === o.i) && dist(o.q, p) < maxD).sort((x, y) => dist(x.q, p) - dist(y.q, p))[0];
      const goSpot = o => { b.spot = o.i; b.plan = [...(hereRoom(p).id === o.q.room ? [] : MAP.path(hereRoom(p).id, o.q.room)), { x: o.q.x, y: o.q.y }]; b.goal = null; b.wait = 0; b.flee = null; };
      if (b.spot != null && !b.plan.length) { const sp = SPOTS()[b.spot]; b.spot = null; if (sp && dist(sp, p) < USE_RANGE + 12) { act(p, { type: 'hide' }); return; } }
      if (b.toVent && !b.plan.length) { b.toVent = false; act(p, { type: 'vent' }); return; }
      if (sk && sd < 340 && !b.flee && b.spot == null && !b.toVent && lvl > 1) {
        const v = (p.hideVents || 0) < HIDE_VENTS && nearest(p, MAP.VENTS, 240);
        if (v && Math.random() < 0.5) { b.toVent = true; b.plan = [{ x: v.x, y: v.y }]; b.goal = null; b.wait = 0; }
        else { const o = !(p.hideCd > 0) && spotsOn() && freeSpot(260); if (o && Math.random() < 0.6) goSpot(o); }
      }
      if (sk && sd < sightR() * 1.1 && !b.flee && b.spot == null && !b.toVent) { b.flee = { from: sk.id, t: 1.5 + Math.random() }; b.plan = []; b.pressButton = false; }
    }
    if (settings.mode === 3 && team(p) === 'imp' && !(p.frozenUntil > now())) {
      b.huntT = (b.huntT || 0) - dt;
      if (b.huntT <= 0) {
        b.huntT = 1;
        const T = now(), lvl = settings.botLevel;
        const tg = list().filter(o => o.alive && !o.spectator && team(o) !== 'imp' && o.hiding == null && o.inVent === null && dist(o, p) < (lvl === 1 ? 160 : lvl === 2 ? 200 : 250)).sort((x, y) => dist(p, x) - dist(p, y))[0];
        const toPoint = (x, y) => { const to = MAP.roomAt(x, y) || hereRoom(p), here = hereRoom(p); b.plan = [...(to.id === here.id ? [] : MAP.path(here.id, to.id)), { x, y }]; b.goal = null; b.wait = 0; };
        if (tg) toPoint(tg.x, tg.y);
        else {
          const pg = lvl > 1 ? pings.filter(q => q.by !== p.id && q.until > T && dist(q, p) < 1400 && q.id !== b.lastPing).sort((x, y) => dist(p, x) - dist(p, y))[0] : null;
          if (pg) { b.lastPing = pg.id; toPoint(pg.x, pg.y); b.searched = b.searched || {}; }
          else if (!b.plan.length || Math.random() < 0.1) {
            b.searched = b.searched || {};
            const sp = SPOTS().map((q, i) => ({ q, i })).filter(o => T - (b.searched[o.i] || -99) > 45).sort((x, y) => dist(p, x.q) - dist(p, y.q))[0];
            if (sp) { b.searched[sp.i] = T; toPoint(sp.q.x, sp.q.y); }
          }
        }
      }
    }
    // מתחזה ציד: כשהחיסול כמעט מוכן, הולך אחרי מישהו שמסתובב לבד (כמו שחקן אמיתי)
    if (team(p) === 'imp' && !NON_KILLERS.includes(p.role) && p.inVent === null && settings.botLevel > 1 && p.killCd < 5 && !sab) {
      b.huntT = (b.huntT || 0) - dt;
      if (b.huntT <= 0) {
        b.huntT = 1.5;
        const crew = list().filter(o => o.alive && !o.spectator && team(o) !== 'imp' && o.inVent === null);
        const alone = crew.filter(o => !list().some(q => q.id !== o.id && q.id !== p.id && q.alive && q.inVent === null && dist(q, o) < 380))
          .sort((x, y) => dist(p, x) - dist(p, y))[0];
        if (alone && dist(p, alone) < 900 && (settings.botLevel === 3 || Math.random() < 0.6)) {
          const to = MAP.roomAt(alone.x, alone.y), here = hereRoom(p);
          if (to) { b.plan = [...(to.id === here.id ? [] : MAP.path(here.id, to.id)), { x: alone.x, y: alone.y }]; b.goal = null; b.wait = 0; b.hunting = alone.id; }
        } else b.hunting = null;
      }
    }
    // אחרי חיסול: בורחים מהגופה – דרך פתח אוורור אם יש קרוב, אחרת הולכים לחדר רחוק
    if (b.escape) {
      b.escape.t -= dt;
      if (p.inVent !== null) {
        if (b.escape.t <= 0) { act(p, { type: 'vent' }); b.escape = null; b.plan = []; b.wait = 0.5; }
        else if (!b.escape.moved) { const L = MAP.VENTS[p.inVent].links; if (L && L.length) act(p, { type: 'ventMove', to: pick(L) }); b.escape.moved = true; }
        return;
      }
      if (b.escape.t <= 0) b.escape = null;
    }
    // מתחזה: חסל כשאין עדים
    if (team(p) === 'imp' && p.killCd <= 0 && !NON_KILLERS.includes(p.role)) {
      const tgt = nearest(p, list().filter(o => o.alive && team(o) !== 'imp' && (o.hiding == null || dist(o, p) < 60)), KILL_RANGE);
      if (tgt) {
        const lvl = settings.botLevel;
        const witnesses = list().filter(o => o.alive && o.id !== p.id && o.id !== tgt.id && o.inVent === null && dist(o, p) < (lvl === 3 ? 420 : 320));
        // קל: מתחזים רשלניים שחונקים גם מול עדים. חכם: מחסלים רק כשאף אחד לא רואה
        const chance = settings.mode === 3 ? (lvl === 1 ? 0.006 : lvl === 2 ? 0.012 : 0.025) : lvl === 1 ? (witnesses.length ? 0.012 : 0.04) : lvl === 3 ? (witnesses.length ? 0 : 0.08) : (witnesses.length ? 0 : 0.05);
        if (Math.random() < chance) {
          act(p, { type: 'kill' });
          if (!p.alive || phase !== 'play') return;
          b.hunting = null;
          const canVent = ['impostor', 'shifter', 'phantom', 'viper', 'noisemaker'].includes(p.role) || (MOD[p.role] && MOD[p.role][1] === 'imp');
          const v = canVent && settings.botLevel > 1 && nearest(p, MAP.VENTS, 220);
          if (v) { b.plan = [{ x: v.x, y: v.y }]; b.escape = { t: 6, vent: true }; }
          else { b.escape = { t: 5 }; const far = Object.values(MAP.ROOMS).sort((x, y) => dist(p, { x: y.cx, y: y.cy }) - dist(p, { x: x.cx, y: x.cy }))[0]; b.plan = [...MAP.path(hereRoom(p).id, far.id), { x: far.cx, y: far.cy }]; b.goal = null; }
          b.wait = 0;
          return;
        }
      }
    }
    if (p.role === 'shifter' && !p.shapeAs && p.shiftCd <= 0 && Math.random() < 0.002) act(p, { type: 'shift' });
    // יכולות תפקיד של בוטים
    if (p.role === 'phantom' && !(p.vanishUntil > now()) && p.vanishCd <= 0 && Math.random() < 0.004 && list().some(o => o.alive && team(o) === 'crew' && dist(o, p) < 320)) act(p, { type: 'vanish' });
    // בוט רדוף: נועל דלת ליד אנשי צוות, מכבה אור בחדר שיש בו קורבן, ומסתיר גופות כשאף אחד לא רואה
    if (p.role === 'poltergeist') {
      const crewNear = r => list().filter(o => o.alive && team(o) === 'crew' && dist(o, p) < r);
      if (p.hauntDoorCd <= 0 && Math.random() < 0.006 && crewNear(380).length) act(p, { type: 'hauntDoor' });
      const myRoom = MAP.roomAt(p.x, p.y);
      if (p.darkCd <= 0 && myRoom && Math.random() < 0.005 && crewNear(400).some(o => { const r = MAP.roomAt(o.x, o.y); return r && r.id === myRoom.id; })) act(p, { type: 'hauntLight' });
      if (!p.drag && p.dragCd <= 0 && bodies.some(bd => dist(bd, p) < 70) && !crewNear(450).length && Math.random() < 0.05) act(p, { type: 'drag' });
    }
    // בוט ליצן: קופץ לפתח כשמישהו רואה (שיחשדו בו), זורק בננות ליד אנשים, ושם גופה מזויפת כשאף אחד לא רואה
    if (p.role === 'jester' && p.inVent === null && !b.escape) {
      const others = r => list().filter(o => o.id !== p.id && o.alive && !o.spectator && dist(o, p) < r);
      if (others(330).length && MAP.VENTS.some(v => dist(v, p) < USE_RANGE) && Math.random() < 0.012) { act(p, { type: 'vent' }); if (p.inVent !== null) { b.escape = { t: 1 + Math.random() * 1.5 }; b.plan = []; return; } }
      if (p.bananaCd <= 0 && others(400).length && Math.random() < 0.004) act(p, { type: 'banana' });
      if (p.fakeCd <= 0 && !others(450).length && MAP.roomAt(p.x, p.y) && Math.random() < 0.002) act(p, { type: 'fakeBody' });
    }
    if (p.role === 'bodyguard' && p.guardCd <= 0 && Math.random() < 0.008 && list().some(o => o.id !== p.id && o.alive && dist(o, p) < 150)) act(p, { type: 'guard' });
    if (p.role === 'photographer' && p.photoCd <= 0 && Math.random() < 0.012 && list().some(o => o.id !== p.id && o.alive && dist(o, p) < 300)) act(p, { type: 'photo' });
    if (p.role === 'timekeeper' && !p.rewindUsed && killLog.some(k => now() - k.t < 6 && now() - k.t > 1.5) && Math.random() < 0.03) act(p, { type: 'rewind' });
    if (p.role === 'noisemaker' && p.noiseCd <= 0 && Math.random() < 0.004) act(p, { type: 'noise' });
    if (MOD[p.role] && MOD[p.role][3] && !(p.modCd > 0) && !(MOD[p.role][5] && (p.modUsed || 0) >= MOD[p.role][5])) {
      const bd = bodies.find(x => !x.fake && dist(x, p) < 100), near = n => list().filter(o => o.id !== p.id && o.alive && !o.spectator && o.inVent === null && dist(o, p) < n);
      const R = tplOf(p.role), rr = Math.random();
      if ((R === 'shamash' && (rr < 0.001 || (near(300).some(o => team(o) === 'imp') && rr < 0.1))) || (R === 'sprinter' && (b.flee || rr < 0.002)) || (R === 'medic' && bd && rr < 0.2) || (R === 'trapper' && rr < 0.004) || (R === 'radar' && rr < 0.003) || (R === 'jailer' && rr < 0.002 && near(300).length)
        || (R === 'empath' && rr < 0.004) || (R === 'blinker' && (b.escape ? rr < 0.1 : rr < 0.0015)) || (R === 'cleaner' && bd && !near(260).filter(o => team(o) !== 'imp').length && rr < 0.3)
        || (R === 'zapper' && p.killCd < 4 && near(160).filter(o => team(o) !== 'imp').length && rr < 0.03) || (R === 'bomber' && near(100).filter(o => team(o) !== 'imp').length >= 2 && rr < 0.03)
        || (R === 'vulture' && bd && !near(260).length && rr < 0.2)) act(p, { type: 'mod' });
      if (R === 'bomber' && bombs.some(x => x.by === p.id)) { b.escape = b.escape || { t: 5 }; }
    }
    if (p.role === 'detective' && p.investCd <= 0 && Math.random() < 0.012 && list().some(o => o.id !== p.id && o.alive && o.inVent === null && dist(o, p) < 150)) act(p, { type: 'investigate' });
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
      if (b.pressButton) { const h = hereRoom(p); b.plan = [...MAP.path(h.id, MAP.roomAt(MAP.BUTTON.x, MAP.BUTTON.y).id), { x: MAP.BUTTON.x, y: MAP.BUTTON.y }]; }
    }
    return;
  }
  // חבלה פעילה: בוטים מהצוות רצים לתקן, כל אחד לנקודה אחרת
  if (!sab) { b.sabTarget = null; b.pressSab = false; }
  else {
    if (b.sabTarget != null && sab.fixed[b.sabTarget]) { b.sabTarget = null; b.pressSab = false; }
    if (team(p) === 'crew' && p.alive && b.sabTarget == null && !p.sabWork && Math.random() < 0.03) {
      const taken = new Set(list().filter(o => o.isBot && o.alive && o.id !== p.id && o.bot.sabTarget != null && now() - (o.bot.sabSince || 0) < 25).map(o => o.bot.sabTarget));
      const pts = MAP.SAB_POINTS[sab.type];
      const idx = pts.findIndex((q, i) => !sab.fixed[i] && !taken.has(i));
      if (idx >= 0) {
        const h = hereRoom(p);
        b.sabTarget = idx; b.pressSab = true; b.wait = 0; b.sabSince = now();
        b.plan = [...MAP.path(h.id, pts[idx].room), { x: pts[idx].x, y: pts[idx].y }];
      }
    }
  }
  if (team(p) === 'imp' && p.alive && !p.inVent && settings.mode !== 3) {
    const sabF = settings.botLevel === 1 ? 0.5 : settings.botLevel === 3 ? 1.6 : 1;
    const sabI = p.role === 'saboteur' ? 2.5 : 1, sabReady = p.role === 'saboteur' ? sabCd <= SAB_CD / 2 : sabCd <= 0;
    if (!sab && sabReady && Math.random() < 0.0005 * sabF * sabI) startSab(pick(['lights', 'lights', 'oxygen'].concat(MAP.SAB_POINTS.reactor.length ? ['reactor'] : [], MAP.SAB_POINTS.freeze && MAP.SAB_POINTS.freeze.length ? ['freeze', 'freeze'] : [])), p.role === 'saboteur', p.role === 'saboteur');
    else if (Math.random() < 0.0003 * sabF) closeDoors(pick(Object.keys(MAP.ROOMS)));
    else if (list().some(q => q.cam && q.alive && team(q) !== 'imp') && Math.random() < 0.002 * sabF) act(p, { type: 'sab', kind: 'cams' });
  }
  // זיהוי תקיעה: יש מסלול אבל כמעט לא זזים 3 שניות
  if (b.plan.length) {
    if (!b.pos || dist(b.pos, p) > 14) b.pos = { x: p.x, y: p.y, t: now() };
    else if (now() - b.pos.t > 3) { b.pos = { x: p.x, y: p.y, t: now() }; replan(p); }
  } else b.pos = null;
  if (b.wait > 0) { b.wait -= dt; return; }
  if (p.work || p.sabWork) return;
  // מישהו מחכה לשותף למשימה זוגית – בוט קרוב בא לעזור (גם מתחזה יכול לבוא… רגע של אמון)
  if (b.helping) {
    const c = pairCalls.find(q => q.by === b.helping);
    if (!c) b.helping = null;
    else if (!b.plan.length) { b.wait = 0.8; return; }
  } else if (pairCalls.length && !sab && Math.random() < 0.03) {
    const c = pairCalls.find(q => q.by !== p.id && Math.hypot(q.x - p.x, q.y - p.y) < 1200);
    if (c && !list().some(o => o.bot && o.bot.helping === c.by)) {
      const to = MAP.roomAt(c.x, c.y); b.helping = c.by; b.goal = null;
      b.plan = [...(to ? MAP.path(hereRoom(p).id, to.id) : []), { x: c.x + (Math.random() < 0.5 ? -60 : 60), y: c.y + 20 }];
      return;
    }
  }
  if (!b.plan.length && b.escape && b.escape.vent && p.inVent === null) {
    b.escape.vent = false; b.escape.t = 1.5 + Math.random() * 2; act(p, { type: 'vent' });
    if (p.inVent === null) b.escape = null;
    return;
  }
  if (!b.plan.length && b.pressSab) {
    b.pressSab = false;
    act(p, { type: 'use' });
    return;
  }
  if (!b.plan.length && b.pressButton) {
    b.pressButton = false;
    if (dist(p, MAP.BUTTON) < 90) act(p, { type: 'use' });
    return;
  }
  if (!b.plan.length) {
    if (b.goal && b.goal.ref && !b.goal.ref.done && dist(p, b.goal) < USE_RANGE) {
      act(p, { type: 'use' }); b.goal = null; return;
    }
    // מתחזה "עושה" משימה מזויפת: עומד ליד העמדה כמה שניות, כמו כולם
    if (b.goal && b.goal.fake) { b.goal = null; b.wait = 3 + Math.random() * 4; return; }
    b.wait = 0.5 + Math.random() * 2.5;
    if (settings.mode === 3 && team(p) !== 'imp' && !(p.hideCd > 0) && spotsOn() && Math.random() < (settings.botLevel === 1 ? 0.35 : settings.botLevel === 2 ? 0.65 : 0.85)) {
      const sk = list().find(o => o.alive && team(o) === 'imp');
      const free = SPOTS().map((q, i) => ({ q, i })).filter(o => !list().some(z => z.hiding === o.i)).sort((x, y) => (sk ? dist(sk, y.q) - dist(sk, x.q) : 0)).slice(0, 5);
      const o = free.length ? pick(free) : null;
      if (o) { b.spot = o.i; b.plan = [...(hereRoom(p).id === o.q.room ? [] : MAP.path(hereRoom(p).id, o.q.room)), { x: o.q.x, y: o.q.y }]; b.goal = null; b.wait = 0; return; }
    }
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
  if (p.isBot && !IMPORTANT.test(text) && Math.random() < 0.8) e.hide = true;
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
  if (meeting && !silent && (!p.isBot || team(p) === 'imp')) {
    const q0 = meeting.queue.length;
    analyze(p, text);
    // גם אם לא זוהתה טענה מסוימת – מישהו מהבוטים מראה שהוא שמע אותך
    if (!p.isBot && meeting.queue.length === q0 && Math.random() < 0.6) acknowledge(p, text);
  }
  if (chat.length > 60) chat.shift();
}


// ---------- ניתוח טענות: בוטים בודקים אליבי ומתנגשים בסתירות ----------
const ALIASES = { 'קפיטריה': 'חדר אוכל', 'קפטריה': 'חדר אוכל', 'נשקייה': 'נשק' };
function roomIn(text) {
  for (const k in ALIASES) if (text.includes(k)) return ALIASES[k];
  const names = Object.values(MAP.ROOMS).map(r => r.name).sort((a, b) => b.length - a.length);
  return names.find(n => text.includes(n)) || null;
}
function queueSay(bot, text, delay) { meeting.queue.push({ id: bot.id, text, at: meeting.t - delay, silent: true }); }
// משפט חשוב נכתב גם בצ'אט; שאר הדברים של הבוטים נשמעים בקול בלבד
const IMPORTANT = /בננה|פתח אוורור|נקי|הצביע נגד|ראיתי|משנה צורה|מחסל|הרג|תצביעו|משקר|המתחזה|נמצא|לא נכון|נכון,|סותר|חשוד מאוד|מצאתי|הגופה/;
const speechDur = text => 0.9 + String(text).length * 0.075;
const humanTalking = () => list().some(p => !p.isBot && p.talking && now() - p.talkT < 6);

function acknowledge(sp, text) {
  const bots = shuffle(list().filter(o => o.isBot && o.alive && !o.spectator && o.id !== sp.id));
  if (!bots.length) return;
  const n = bare(sp.name);
  let line;
  if (/דלג|סקיפ|skip/i.test(text)) line = fresh(['גם אני חושב שכדאי לדלג', 'אין לנו מספיק מידע, אני בעד לדלג', 'דלג זה לא רעיון רע']);
  else if (/חושד|חשוד|המתחזה|מתחזה|משקר|suspect|\bsus\b|impostor|imposter|liar|lying/i.test(text)) line = fresh([`למה אתה חושד? יש לך הוכחה, ${n}?`, 'מעניין… על מה אתה מבסס את זה?', 'שמעתי. מי עוד חושב ככה?']);
  else if (/הייתי|ראיתי|עשיתי|i was|i saw|i did|i've seen/i.test(text)) line = fresh(['אוקיי, שמעתי אותך', 'תודה, זה עוזר. מישהו יכול לאשר?', 'נרשם. מי עוד ראה משהו?']);
  else line = fresh(['שמעתי אותך, ' + n, 'אוקיי, תמשיך', 'מעניין, מה עוד יש לך?', 'אני מקשיב', 'בוא נשמע גם אחרים']);
  queueSay(bots[0], line, 1.6);
}

// ראיה אמיתית מהמערכת (הערה של בלש, מגן אישי או תמונה של הצלם): השרת מחזיק את ההערות, אז אי אפשר לזייף אותה.
// רק תפקידי צוות מקבלים הערות, ולכן מי שהציג אחת – לא המתחזה, והבוטים לא מצביעים עליו
function presentEvidence(sp, text) {
  meeting.cleared = meeting.cleared || {}; meeting.cleared[sp.id] = true;
  meeting.suspect[sp.id] = Math.min(meeting.suspect[sp.id] || 0, 0) - 6;
  const spN = bare(sp.name), what = text.includes('🔎') ? 'חקירה' : text.includes('📸') ? 'תמונה' : 'הערה';
  const bots = shuffle(list().filter(o => o.isBot && o.alive && !o.spectator && o.id !== sp.id && !evil(o)));
  const tgt = list().find(o => o.id !== sp.id && bare(o.name).length >= 2 && text.includes(bare(o.name)));
  if (tgt && text.includes('🔎')) meeting.suspect[tgt.id] = (meeting.suspect[tgt.id] || 0) + (text.includes('אין ראיות') ? -1.5 : 1.8);
  if (bots[0]) queueSay(bots[0], fill(fresh(['{s} הביא {w} אמיתית מהמערכת – זה אומר שהוא לא המתחזה', 'אוקיי, {s} הציג {w} אמיתית. רק איש צוות מקבל כאלה, אז אפשר לסמוך עליו', 'רגע, {s} הוכיח שהוא בצד שלנו – לא מצביעים עליו']), { s: spN, w: what }), 1.4);
  if (bots[1] && Math.random() < 0.7) queueSay(bots[1], fill(fresh(['נכון, מי שיש לו {w} כזו הוא איש צוות. מחפשים את המתחזה במקום אחר', 'מסכים. {s} נקי, בואו נחשוב על מישהו אחר']), { s: spN, w: what }), 3.1);
}
function analyze(sp, text) {
  if ((sp.notes || []).includes(String(text).trim()) || (text.includes('📸') && sp.photos && sp.photos.length)) { presentEvidence(sp, text); return; }
  if (text.includes('📸') || text.includes('🔎')) { // ראיה מהצלם או הבלש: הבוטים מגיבים בקצרה
    const b = shuffle(list().filter(o => o.isBot && o.alive && !o.spectator && o.id !== sp.id))[0];
    if (b) queueSay(b, fresh(['תודה על הראיה, זה עוזר', 'וואו, טוב לדעת', 'נרשם. מי ראה עוד משהו?']), 1.6);
    return;
  }
  if (killClaim(sp, text)) return;
  if (accusation(sp, text)) return;
  const room = roomIn(text);
  if (!room) return;
  const spN = bare(sp.name);
  const named = list().filter(o => o.id !== sp.id && bare(o.name).length >= 2 && text.includes(bare(o.name)));
  const bots = shuffle(list().filter(o => o.isBot && o.alive && o.id !== sp.id && !o.spectator));
  const killWord = /רצח|הרג|חיסל|חוסל|נרצח|גופה|מת /.test(text + ' ');
  const maxResp = settings.botLevel === 1 ? 1 : settings.botLevel === 3 ? 3 : 2;
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
      if (!seen || n >= maxResp) continue;
      if (seen === room) { queueSay(b, `נכון, ראיתי את ${spN} ב${room}`, d); S(-1); }
      else { queueSay(b, `לא נכון, ראיתי את ${spN} ב${seen}, לא ב${room}`, d); S(2); if (!liars[sp.id]) liars[sp.id] = { said: room, seen, mtg: meetingNo }; }
      d += 1.6; n++;
    }
  } else if (/ראיתי|היה/.test(text) && named.length) {
    const x = named[0], xN = bare(x.name);
    let n = 0;
    for (const b of bots) {
      const seen = b.bot.seen && b.bot.seen[x.id];
      if (!seen || n >= maxResp) continue;
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

// "X הרג אותי" – שחקן שחזר לחיים בהחזרת זמן מספר מי הרג אותו. הבוטים מבינים, מאמינים (הם ראו שהוא חזר) ומצביעים
function killClaim(sp, text) {
  if (!/(הרג|רצח|חיסל|killed|murdered|eliminated|stabbed)\s*(אותי|me\b)|(אותי|me\b)\s*(הרג|רצח|חיסל|killed)|(הרוצח|הרוצחת|killer)\s*(שלי|is|was)?/i.test(text)) return false;
  if (!/(אותי|\bme\b|my killer|שלי)/i.test(text)) return false;
  const named = list().filter(o => o.id !== sp.id && o.alive && !o.spectator && bare(o.name).length >= 2 && text.includes(bare(o.name)));
  if (named.length !== 1) return false;
  const x = named[0], xN = bare(x.name), spN = bare(sp.name), back = rewound[sp.id];
  const bots = shuffle(list().filter(o => o.isBot && o.alive && !o.spectator && o.id !== sp.id && o.id !== x.id));
  if (!back) { // הוא חי ולא חזר בזמן – אי אפשר היה להרוג אותו
    if (bots[0]) queueSay(bots[0], fill('{s}, אתה חי. מי בעצם הרג אותך?', { s: spN }), 1.4);
    meeting.suspect[sp.id] = (meeting.suspect[sp.id] || 0) + 1.5;
    return true;
  }
  let d = 1.3, n = 0;
  for (const b of bots) {
    const evilB = evil(b);
    if (!evilB) { // איש צוות מאמין למי שחזר לחיים: הוא ראה את הרוצח
      if (Math.random() < 0.92) { b.bot.sawKill = x.id; b.bot.sawVictim = sp.id; }
      if (n < 2) { queueSay(b, fill(fresh(['{s} חזר מהמתים, אז הוא ראה את הרוצח. {x} הוא המתחזה – מצביעים עליו!', 'אם {s} אומר שזה {x}, אני מאמין לו. הוא היה שם', '{x}?! {s} חזר לחיים והוא יודע מה הוא אומר']), { s: spN, x: xN }), d); d += 1.6; n++; }
    } else if (team(x) === 'imp') { // מתחזה מגן על השותף שלו
      if (n < 1) { queueSay(b, fill(fresh(['רגע, איך אנחנו יודעים ש{s} לא משקר?', '{x} היה איתי, אני לא קונה את זה', 'הזמן חזר… {s} אולי התבלבל, זה לא {x}']), { s: spN, x: xN }), d); n++; }
    } else { // מתחזה מנצל את ההזדמנות להפיל חף מפשע
      if (n < 2) { queueSay(b, fill(fresh(['גם אני חושד ב{x}, {s} צודק', 'זה מסתדר, {x} התנהג מוזר כל המשחק']), { s: spN, x: xN }), d); d += 1.6; n++; }
    }
  }
  meeting.suspect[x.id] = (meeting.suspect[x.id] || 0) + 4;
  if (x.bot && x.bot.replies < 2) x.bot.replyAt = meeting.t - (1 + Math.random() * 1.5);
  return true;
}
// מישהו מאשים שחקן ("X המתחזה", "תצביעו על X"): כל בוט עונה לפי מה שהוא יודע
function accusation(sp, text) {
  if (!/מתחזה|חשוד|תצביעו|משקר|הרוצח|רוצח|להדיח|תדיחו|מצביע על|impostor|imposter|suspect|\bsus\b|vote|killer|liar/i.test(text) || /לא חשוד|נקי|לא מתחזה|לא הוא|not (the )?(impostor|imposter|sus)|innocent|clean/i.test(text)) return false;
  const named = list().filter(o => o.id !== sp.id && o.alive && !o.spectator && bare(o.name).length >= 2 && text.includes(bare(o.name)));
  if (named.length !== 1) return false;
  const x = named[0], xN = bare(x.name), spN = bare(sp.name);
  // מי שיודע משהו על X מדבר קודם
  const knows = o => { const k = o.bot; return !evil(o) && (k.sawKill === x.id || k.sawShift === x.id || (k.sawVent && k.sawVent.id === x.id) || (k.alibi || []).includes(x.id) || x.id === k.jesterId) ? 1 : 0; };
  const bots = shuffle(list().filter(o => o.isBot && o.alive && !o.spectator && o.id !== sp.id && o.id !== x.id)).sort((p1, p2) => knows(p2) - knows(p1));
  const maxResp = settings.botLevel === 1 ? 1 : settings.botLevel === 3 ? 3 : 2;
  let d = 1.4, n = 0, push = 0.8; // האשמה של שחקן קצת משכנעת
  for (const b of bots) {
    if (n >= maxResp) break;
    const k = b.bot, evilB = evil(b);
    let line = null;
    if (!evilB && (k.sawKill === x.id || k.sawShift === x.id)) { line = `נכון! ראיתי את ${xN} בעצמי. מצביעים עליו`; push += 2; }
    else if (!evilB && k.sawVent && k.sawVent.id === x.id) { line = `מסכים, ראיתי את ${xN} ליד פתח אוורור ב${k.sawVent.room}`; push += 1.2; }
    else if (!evilB && liars[x.id]) { line = `זה מסתדר: ${xN} כבר שיקר בישיבה קודמת – אמר ${liars[x.id].said} ובכלל היה ב${liars[x.id].seen}`; push += 1; }
    else if (!evilB && (k.alibi || []).includes(x.id)) { line = `לא נכון, ${xN} היה איתי כל הזמן. אולי דווקא ${spN} מנסה לבלבל אותנו?`; push -= 1.5; meeting.suspect[sp.id] = (meeting.suspect[sp.id] || 0) + 0.6; }
    else if (!evilB && meeting.cleared && meeting.cleared[x.id]) { line = fill('רגע, {x} הציג הערה אמיתית מהמערכת – הוא לא המתחזה', { x: xN }); push -= 3.5; }
    else if (!evilB && x.id === k.jesterId) { line = `רגע! ${xN} הוא הליצן, הוא רוצה שנצביע עליו. לא להדיח!`; push -= 3; }
    else if (evilB && team(x) === 'imp') { line = pick([`יש לך הוכחה נגד ${xN}? נראה לי שאתה ממהר`, `${xN} היה במשימות, אני לא קונה את זה`]); push -= 0.6; }
    else if (evilB && team(x) !== 'imp') { line = pick([`גם לי ${xN} נראה חשוד!`, `כן, ${xN} מתנהג מוזר כל המשחק`]); push += 0.6; }
    else if (Math.random() < 0.5) line = pick([`למה ${xN}? מה ראית?`, `יש לך הוכחה נגד ${xN}?`, `אני לא בטוח לגבי ${xN}, תסביר`]);
    if (line) { queueSay(b, line, d); d += 1.7; n++; }
  }
  meeting.suspect[x.id] = (meeting.suspect[x.id] || 0) + push;
  if (x.bot && x.bot.replies < 2) x.bot.replyAt = meeting.t - (1 + Math.random() * 1.5); // המואשם מתגונן
  return true;
}

const PERSONA_LINES = {
  suspicious: ['משהו כאן מריח לי לא טוב', 'אני לא סומך על אף אחד כרגע', 'מי שלא עשה משימות – חשוד', 'שימו לב מי שותק יותר מדי'],
  quiet: ['…', 'לא יודע', 'נראה לי'],
  chatty: ['רגע רגע, תנו לי לספר מה ראיתי', 'יש לי כמה דברים להגיד', 'בואו נעבור על כולם אחד אחד', 'אני זוכר הכל מהסבב הזה'],
  aggressive: ['תצביעו כבר!', 'בואו נסיים עם זה, מי שנתפס – החוצה', 'אין זמן, מצביעים!', 'אני לא מפחד להצביע'],
  helpful: ['בואו נסדר: מי היה איפה?', 'אני אספר איפה הייתי ואתם תתקנו אותי', 'בואו נבדוק את האליבי של כל אחד', 'מי שראה משהו – עכשיו הזמן'],
};
function botLine(p) {
  // ראיה חשובה קודמת לאופי: גם בוט שקט מספר מה ראה
  const b = p.bot, has = id => id && players[id] && players[id].alive;
  if ((has(b.sawKill) || has(b.sawShift) || (b.sawVent && has(b.sawVent.id) && !b.saidVent) || (b.knowsJester && !b.saidBanana) || (b.nearBody && b.nearBody.length && !b.saidNear) || (p.wardDied && !b.saidWard)) && team(p) === 'crew') return botLine0(p);
  const pl = PERSONA_LINES[p.bot.persona];
  if (pl && Math.random() < 0.35) return fresh(pl);
  return botLine0(p);
}
function botLine0(p) {
  const b = p.bot, name = id => players[id] ? bare(players[id].name) : '';
  // בוט ליצן רוצה שיחשדו בו
  if (p.role === 'jester' && Math.random() < 0.7) return fresh(['אולי זה אני, אולי לא 😏', 'אני לא חייב להגיד לכם איפה הייתי', 'נו, תצביעו עליי אם אתם כל כך בטוחים', 'הייתי ליד הגופה… במקרה', 'אני לא מתכוון להסביר את עצמי', 'למה כולם מסתכלים עליי? 🤭']);
  const alive = id => players[id] && players[id].alive;
  const myRoom = b.lastRoom || 'חדר האוכל';
  if (team(p) === 'crew' && b.sawShift && alive(b.sawShift)) return fill(fresh(['ראיתי את {n} משנה צורה! הוא מתחזה!', '{n} התחפש למישהו אחר מול העיניים שלי! תצביעו עליו', 'אני בטוח ב-100%: {n} הוא משנה צורה']), { n: name(b.sawShift) });
  if (b.sawVictim === p.id && b.sawKill && alive(b.sawKill)) { // הרגו אותי, הזמן חזר – ואני זוכר
    if (!b.saidKiller && meeting) { b.saidKiller = true; meeting.suspect[b.sawKill] = (meeting.suspect[b.sawKill] || 0) + 3.5; }
    return fill(fresh(['{n} הרג אותי! הזמן חזר אחורה אבל אני זוכר הכל', 'זה {n}! הוא חיסל אותי לפני שהזמן חזר – אני זוכר את הפנים שלו', 'תצביעו על {n}! הוא הרוצח, הוא הרג אותי ממש עכשיו']), { n: name(b.sawKill) });
  }
  if (team(p) === 'crew' && b.sawKill && alive(b.sawKill)) return fill(fresh(['ראיתי את {n} מחסל את {b}! תצביעו עליו!', '{n} הרג את {b} מולי!', 'זה {n}! ראיתי הכל']), { n: name(b.sawKill), b: name(b.sawVictim) });
  if (team(p) === 'crew' && b.sawVent && alive(b.sawVent.id) && !b.saidVent) { b.saidVent = true; return fill(fresh(['ראיתי את {n} ליד פתח אוורור ב{r}! רק מתחזים משתמשים בפתחים', '{n} יצא לי מפתח אוורור ב{r}, אני בטוח', 'ראיתי את {n} נכנס לפתח ב{r}. {n}, אתה מהנדס?']), { n: name(b.sawVent.id), r: b.sawVent.room }); }
  if (b.jesterId && alive(b.jesterId) && !b.saidBanana) { b.saidBanana = true; return fill(fresh(['החלקתי על בננה ו{n} היה שם. רק הליצן זורק בננות! אל תצביעו עליו, זה בדיוק מה שהוא רוצה', '{n} הוא הליצן! הוא זרק עליי בננה ב{r}. לא מדיחים אותו', 'שימו לב: {n} זרק בננה, אז הוא הליצן. מי שמצביע עליו עוזר לו לנצח']), { n: name(b.jesterId), r: myRoom }); }
  if (b.knowsJester && !b.saidBanana) { b.saidBanana = true; return fill(fresh(['החלקתי על קליפת בננה ב{r}! יש פה ליצן, תיזהרו במי מצביעים', 'מישהו זרק בננה ב{r}. מתחזים לא עושים את זה, זה הליצן. לא מצביעים סתם', 'יש ליצן במשחק, החלקתי על הבננה שלו. רק מי שבטוחים בו']), { r: myRoom }); }
  if (!b.saidLiar && !evil(p) && settings.botLevel > 1 || (!b.saidLiar && !evil(p) && Math.random() < 0.3)) {
    const lid = Object.keys(liars).find(id => alive(id) && id !== p.id && liars[id].mtg < meetingNo);
    if (lid && Math.random() < 0.6) { b.saidLiar = true; const L = liars[lid]; return fill(fresh(['בישיבה הקודמת {n} אמר שהיה ב{a}, אבל ראו אותו ב{s}. אני לא שוכח', 'תזכרו: {n} כבר שיקר לנו פעם – אמר {a} ובכלל היה ב{s}', '{n}, בפעם שעברה אמרת שהיית ב{a}. ראו אותך ב{s}! למה שנאמין לך עכשיו?']), { n: name(lid), a: L.said, s: L.seen }); }
  }
  if ((meeting.body || meeting.fake) && b.nearBody && b.nearBody.length && !b.saidNear) {
    const id = pick(b.nearBody.filter(x => !(evil(p) && team(players[x]) === 'imp')));
    if (id) { b.saidNear = true; return fill(fresh(['ראיתי את {n} ב{r} ממש לפני שמצאו את הגופה', '{n} היה ב{r} בדיוק בזמן הזה. {n}, מה עשית שם?', 'רגע, {n} יצא מ{r} לא מזמן']), { n: name(id), r: meeting.bodyRoom }); }
  }
  if (team(p) === 'crew' && meeting.body && b.alibi && b.alibi.length && !b.saidAlibi && Math.random() < 0.7) { b.saidAlibi = true; return fill(fresh(['{n} היה איתי ב{m} כשזה קרה, הוא נקי', 'אני יכול לאשר את {n}, היינו ביחד ב{m}', '{n} לא יכול להיות, הוא היה לידי']), { n: name(pick(b.alibi)), m: myRoom }); }
  if (lastMistake && lastMistake.by.length && !b.saidMistake && Math.random() < 0.4) {
    const id = pick(lastMistake.by.filter(x => alive(x) && x !== p.id && !(evil(p) && team(players[x]) === 'imp')));
    if (id) { b.saidMistake = true; return fill(fresh(['בסבב הקודם {n} דחף להדיח את {e}, ו{e} היה מהצוות. חשוד', 'תזכרו ש{n} הצביע נגד {e} שהיה נקי']), { n: name(id), e: lastMistake.name }); }
  }
  if (meeting.by === p.id && meeting.fake) return fill(fresh(['מצאתי גופה ב{r}!', 'יש גופה ב{r}, מי היה שם?']), { r: meeting.room });
  if (meeting.by === p.id && meeting.body) return fill(fresh(['מצאתי את {b} ב{r}!', 'הגופה של {b} הייתה ב{r}', 'מישהו היה ב{r} לפני רגע?']), { b: name(meeting.body), r: meeting.room });
  // מתחזה בוט לפעמים מאשים מישהו מהצוות
  // שומר שהשחקן שלו מת – מספר איפה זה קרה
  if (p.role === 'guardian' && p.wardDied && !b.saidWard) { b.saidWard = true; return fill(fresh(['אני המגן של {n}. הרגשתי שהוא מת ב{r}! מי היה שם?', 'שמרתי על {n}, והוא חוסל ב{r}. תגידו מי היה ב{r}', 'אני מגן אישי: {n} נהרג ב{r}, אני בטוח בזה']), { n: name(p.wardDied.id), r: p.wardDied.room }); }
  // השתול מגן על המתחזים
  if (p.role === 'mole' && Math.random() < 0.4) {
    const imp = list().find(o => o.alive && team(o) === 'imp' && (meeting.suspect[o.id] || 0) > 0);
    if (imp) return fill(fresh(['{n} היה איתי כל הזמן, הוא נקי', 'אני יכול לאשר את {n}, ראיתי אותו עושה משימה', 'לא {n}, הייתי לידו']), { n: bare(imp.name) });
  }
  if (evil(p) && Math.random() < 0.35) {
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
  if (!p.alive || p.spectator || !meeting) return; // בוט קודם יכול היה לסיים את הדיון (הצבעה אחרונה)
  const T = meeting.t;
  if (T < b.chatAt) { b.chatAt = -999; meeting.queue.push({ id: p.id, text: botLine(p), at: T, silent: false }); }
  if (T < b.chat2At) { b.chat2At = -999; meeting.queue.push({ id: p.id, text: botLine(p), at: T, silent: false }); }
  if (T < (b.chat3At || -999)) { b.chat3At = -999; meeting.queue.push({ id: p.id, text: botLine(p), at: T, silent: false }); }
  // בוט צלם או בלש מציג את הראיות שלו
  if (!b.shared && T < settings.meetingTime - 6 && Math.random() < 0.02) {
    if (p.role === 'photographer' && p.photos && p.photos.length) {
      const ph = p.photos[p.photos.length - 1]; b.shared = true;
      meeting.queue.push({ id: p.id, silent: true, at: T, text: `📸 צילמתי ב${ph.room}: ${ph.names.join(', ') || 'גופה'}` });
    } else if (p.role === 'detective' && p.noteMeta && p.noteMeta.length) {
      const hit = p.noteMeta.slice().reverse().find(m => m.hit) || p.noteMeta[p.noteMeta.length - 1]; b.shared = true;
      meeting.queue.push({ id: p.id, silent: true, at: T, text: p.notes[p.noteMeta.indexOf(hit)] || p.notes[p.notes.length - 1] });
      if (hit.hit && players[hit.id]) meeting.suspect[hit.id] = (meeting.suspect[hit.id] || 0) + 2;
    }
  }
  if (b.replyAt > -1 && T < b.replyAt) {
    b.replyAt = -999; b.replies++;
    const others = list().filter(o => o.alive && o.id !== p.id && !o.spectator);
    const m = others.length ? bare(pick(others).name) : '';
    meeting.queue.push({ id: p.id, silent: true, at: T, text: fill(fresh(['למה אני? הייתי ב{r}', 'זה לא אני! תבדקו את {m}', 'עשיתי משימות, תשאלו את {m}', 'אני? באמת? הייתי ב{r} כל הזמן', 'אם תדיחו אותי תפסידו 😤']), { r: b.lastRoom || 'חדר האוכל', m }) });
  }
  if (T < b.voteAt && !meeting.votes[p.id]) {
    const ok = id => players[id] && players[id].alive && id !== p.id && !(evil(p) && team(players[id]) === 'imp') && !(!evil(p) && meeting.cleared && meeting.cleared[id]) && !(team(p) === 'crew' && id === b.jesterId);
    let vote = null;
    if (team(p) === 'crew' && b.sawShift && ok(b.sawShift)) vote = b.sawShift;
    else if (team(p) === 'crew' && b.sawKill && ok(b.sawKill)) vote = b.sawKill;
    else if (team(p) === 'crew' && b.sawVent && ok(b.sawVent.id) && Math.random() < (jesterHint ? 0.2 : 0.4)) vote = b.sawVent.id;
    else {
      const score = {};
      const lf = settings.botLevel === 1 ? 0.5 : settings.botLevel === 3 ? 1.4 : 1, pe = b.persona;
      const pf = pe === 'suspicious' ? 1.4 : pe === 'quiet' ? 0.8 : 1;
      for (const id in meeting.mentions) score[id] = (score[id] || 0) + meeting.mentions[id] * pf;
      for (const id in meeting.suspect) score[id] = (score[id] || 0) + meeting.suspect[id] * 1.5 * lf * pf;
      // מי שהיה איתי בזמן החיסול – לא מצביעים עליו
      if (team(p) === 'crew') (b.alibi || []).forEach(id => { score[id] = (score[id] || 0) - 4; });
      // הולכים עם הרוב כשיש לו בסיס (וגם מתחזה מצטרף כדי להיראות כמו כולם)
      const cnt = {}; for (const v of Object.values(meeting.votes)) if (v !== 'skip') cnt[v] = (cnt[v] || 0) + 1;
      const nv = list().filter(o => o.alive && !o.spectator).length;
      for (const id in cnt) if (cnt[id] >= Math.max(2, Math.ceil(nv / 3)) && (score[id] || 0) > -1) score[id] = (score[id] || 0) + (evil(p) ? 3 : 1.5);
      const top = Object.entries(score).filter(([id]) => ok(id)).sort((x, y) => y[1] - x[1])[0];
      if (top && top[1] >= 3) vote = top[0];
      else if (top && top[1] >= 2 && Math.random() < 0.7) vote = top[0];
      else if (top && evil(p) && Math.random() < 0.6) vote = top[0];
      else if (meeting.skipTalk >= 2 || Math.random() < (b.persona === 'aggressive' ? 0.15 : b.persona === 'quiet' ? 0.7 : 0.5)) vote = 'skip';
      else if (jesterHint && team(p) === 'crew') vote = 'skip'; // יש ליצן – לא מצביעים בניחוש
      else { const opts = list().filter(o => ok(o.id) && !o.spectator); vote = opts.length ? pick(opts).id : 'skip'; }
    }
    meeting.votes[p.id] = vote || 'skip';
    // שופט בוט פוסק רק כשהוא בטוח (ראה בעצמו חיסול או שינוי צורה)
    if (p.role === 'judge' && !p.verdictUsed && judgeReady(p) && vote && vote !== 'skip' && (b.sawKill === vote || b.sawShift === vote) && Math.random() < 0.8) act(p, { type: 'verdict', target: vote });
  }
}

// ---------- לולאת משחק ----------
let last = now();
function tick() {
  const t = now();
  if (phase === 'play') promoteSaboteur();
  const dt = Math.min(0.1, t - last);
  last = t;

  if (phase === 'play') {
    if (settings.mode === 3 && hideEndAt && t >= hideEndAt) checkWin();
    if (finalPhase() && !hideFinalSaid) { hideFinalSaid = true; toastAll('⚡ 30 שניות אחרונות! המחפש מהיר מתמיד ורואה איפה כל אחד!'); }
    if (settings.mode === 2) { checkWin(); if (phase === 'play' && now() > raceChaosAt) { raceChaosAt = now() + 28 + Math.random() * 14; closeDoors(pick(Object.keys(MAP.ROOMS))); } }
    sabCd = Math.max(0, sabCd - dt);
    bodies = bodies.filter(b => !b.decayAt || b.decayAt > t);
    if (bananas.length) bananas = bananas.filter(b => b.until > t);
    for (const rid of Object.keys(doorsUntil)) if (doorsUntil[rid] <= t) delete doorsUntil[rid];
    hauntDoors = hauntDoors.filter(d => d.until > t);
    for (const rid of Object.keys(darkRooms)) if (darkRooms[rid] <= t) delete darkRooms[rid];
    if (sab && sab.type !== 'lights' && sab.type !== 'freeze') {
      sab.t -= dt;
      if (sab.t <= 0 && sab.type !== 'freeze') { winner = { team: 'imp', reason: SAB_WIN[sab.type] }; phase = 'end'; settings.reveal = true; sab = null; ev('end', '🏁 ' + winner.reason); }
    }
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
    if (traps.length) traps = traps.filter(tr => { const q = list().find(o => o.alive && !o.spectator && o.id !== tr.by && o.inVent === null && dist(o, tr) < 45); if (!q) return true; q.frozenUntil = t + 5; q.work = null; toast(q, '🪤 נפלת במלכודת!'); const o = players[tr.by]; if (o) toast(o, '🪤 ' + nm(q) + ' נתפס במלכודת ב' + ((MAP.roomAt(tr.x, tr.y) || {}).name || 'מסדרון') + '!'); return false; });
    if (bombs.length) bombs = bombs.filter(b => { if (t < b.at) return true; const k = players[b.by]; list().filter(o => o.alive && !o.spectator && team(o) !== 'imp' && o.inVent === null && dist(o, b) < 110).forEach(o => { if (k && phase === 'play') slay(o, k); }); return false; });
    noises = noises.filter(n => n.until > t); pings = pings.filter(n => n.until > t);
    pairCalls = pairCalls.filter(c => c.until > t && players[c.by] && players[c.by].alive);
    histT -= dt;
    if (histT <= 0) { // תמונת מצב כל חצי שנייה לשומר הזמן
      histT = 0.5; const pos = {};
      for (const q of list()) if (q.alive && !q.spectator) pos[q.id] = [Math.round(q.x), Math.round(q.y)];
      posHist.push({ t, pos }); posHist = posHist.filter(h => t - h.t < 25);
    }
    for (const p of list()) {
      if (p.isBot) botTick(p, dt);
      if (phase !== 'play') break;
      p.killCd = Math.max(0, p.killCd - dt);
      p.guardCd = Math.max(0, (p.guardCd || 0) - dt);
      if (p.role === 'noisemaker') p.noiseCd = Math.max(0, (p.noiseCd || 0) - dt);
      p.photoCd = Math.max(0, (p.photoCd || 0) - dt); p.investCd = Math.max(0, (p.investCd || 0) - dt); p.vanishCd = Math.max(0, (p.vanishCd || 0) - dt);
      if (settings.mode === 3) { p.hideCd = Math.max(0, (p.hideCd || 0) - dt); if (p.hiding != null && t - p.hideSince > HIDE_SPOT_TIME) { p.hiding = null; p.hideCd = HIDE_SPOT_CD; addPing(p.x, p.y, p.id); toast(p, '🫣 נגמר הזמן במסתור'); } }
      if (settings.mode === 3 && p.role === 'crew' && p.inVent !== null && p.ventSince && t - p.ventSince > HIDE_VENT_TIME) { p.inVent = null; p.ventSince = 0; witnessVent(p); toast(p, '🕳️ נגמר הזמן בפתח'); }
      // מהנדס: זמן מוגבל בתוך הפתח, ואחרי היציאה המתנה
      if (p.role === 'engineer') {
        p.engVentCd = Math.max(0, (p.engVentCd || 0) - dt);
        if (p.inVent !== null) {
          if (!p.ventSince) p.ventSince = t;
          if (settings.engVent && t - p.ventSince > settings.engVent) { p.inVent = null; witnessVent(p); toast(p, '🕳️ נגמר הזמן בפתח'); }
        }
        if (p.inVent === null && p.ventSince) { p.ventSince = 0; p.engVentCd = settings.engVentCd; }
      }
      if (p.vanishUntil && t > p.vanishUntil) { p.vanishUntil = 0; p.vanishCd = settings.vanishCd; }
      if (p.modCd > 0) p.modCd = Math.max(0, p.modCd - dt);
      if (p.poisonAt && p.alive && t >= p.poisonAt) slay(p, players[p.poisonBy] || p);
      if (p.role === 'jester') { p.bananaCd = Math.max(0, (p.bananaCd || 0) - dt); p.fakeCd = Math.max(0, (p.fakeCd || 0) - dt); }
      if (p.role === 'poltergeist') { p.hauntDoorCd = Math.max(0, (p.hauntDoorCd || 0) - dt); p.darkCd = Math.max(0, (p.darkCd || 0) - dt); p.dragCd = Math.max(0, (p.dragCd || 0) - (p.drag ? 0 : dt)); }
      p.shiftCd = Math.max(0, p.shiftCd - (p.shapeAs ? 0 : dt));
      p.gaCd = Math.max(0, p.gaCd - dt);
      if (p.shapeAs && (t > p.shapeUntil || !players[p.shapeAs])) { p.shapeAs = null; p.shiftCd = settings.shiftCd; }

      let { dx, dy } = p.input;
      // דרך על קליפת בננה? מחליק בלי שליטה לשנייה
      if (p.alive && !p.spectator && p.inVent === null && !p.slip && bananas.length) {
        const bn = bananas.find(b => b.by !== p.id && dist(b, p) < 28);
        if (bn) {
          bananas.splice(bananas.indexOf(bn), 1);
          const il = Math.hypot(dx, dy);
          p.slip = il > 0.1 ? { dx: dx / il, dy: dy / il, until: t + SLIP_TIME } : { dx: p.dir || 1, dy: 0, until: t + SLIP_TIME };
          toast(p, '🍌 החלקת על קליפת בננה!'); if (players[bn.by]) toast(players[bn.by], '🍌 ' + p.name + ' החליק על הבננה שלך!');
          // רק הליצן זורק בננות: בוט שהחליק יודע שיש ליצן, ואם ראה מי זרק – יודע מי הליצן ולא מדיח אותו
          const ow = players[bn.by];
          if (p.bot) p.bot.knowsJester = true;
          if (p.bot && ow && ow.alive) {
            const here = MAP.roomAt(bn.x, bn.y);
            const sawNow = ow.inVent === null && dist(ow, p) < sightR();
            const sawBefore = (p.bot.hist || []).some(e => e.id === ow.id && t - e.t < 25 && here && e.room === here.name);
            if (sawNow || sawBefore) p.bot.jesterId = ow.id;
          }
        }
      }
      if (p.slip) { if (t < p.slip.until && p.alive) { dx = p.slip.dx; dy = p.slip.dy; } else p.slip = null; }
      const len = p.inVent !== null || p.hiding != null || p.frozenUntil > t ? 0 : Math.hypot(dx, dy);
      if (len > 0) {
        dx /= len; dy /= len;
        const step = SPEED * settings.speed * dt * (p.drag ? 0.55 : 1) * (p.slip ? 1.7 : 1) * (settings.mode === 3 && team(p) === 'imp' ? (finalPhase() ? 1.7 : 1.12) : 1) * (p.sprintUntil > t ? 1.7 : 1) * (sab && sab.type === 'freeze' && p.alive && team(p) !== 'imp' ? 0.55 : 1); // גרירת גופה מאטה, החלקה מאיצה, המחפש מהיר
        if (!p.alive || p.spectator) {
          p.x = Math.max(0, Math.min(MAP.WORLD.w, p.x + dx * step));
          p.y = Math.max(0, Math.min(MAP.WORLD.h, p.y + dy * step));
        } else {
          const rr = p.assist ? 10 : 18;
          if (MAP.walkable(p.x + dx * step, p.y, rr) && !doorBlocked(p.x + dx * step, p.y)) p.x += dx * step;
          if (MAP.walkable(p.x, p.y + dy * step, rr) && !doorBlocked(p.x, p.y + dy * step)) p.y += dy * step;
        }
        if (Math.abs(dx) > 0.1) p.dir = dx > 0 ? 1 : -1;
        p.work = null; p.cam = false; p.sabWork = null;
      }
      if (p.drag) { // הגופה הולכת אחרי הרדוף, עד מרחק קצר ממקומה המקורי
        const body = bodies.find(b => b.id === p.drag.id);
        if (!body || !p.alive || p.inVent !== null || t > p.drag.until) { p.drag = null; p.dragCd = DRAG_CD; if (body) toast(p, '🫳 הגופה נשמטה'); }
        else {
          const bx = p.x - p.dir * 26, by = p.y + 6;
          if (Math.hypot(bx - p.drag.ox, by - p.drag.oy) > DRAG_DIST) { p.drag = null; p.dragCd = DRAG_CD; toast(p, '🫳 הגופה כבדה מדי – לא אפשר לגרור יותר רחוק'); }
          else if (MAP.walkable(bx, by)) { body.x = bx; body.y = by; }
        }
      }
      if (p.sabWork) {
        if (!sab || !p.alive) p.sabWork = null;
        else {
          p.sabWork.t += dt;
          if (p.isBot && p.sabWork.t >= 3.5) { const i = p.sabWork.i; p.sabWork = null; fixSab(i); }
        }
      }
      if (p.work) {
        const tk = MAP.TASKS[p.work.ref.i];
        if (dist(p, tk) > USE_RANGE + 5 || p.work.ref.done) p.work = null;
        else if (tk.kind === 'pair' && !list().some(o => o.id !== p.id && o.alive && !o.spectator && o.inVent === null && dist(o, p) < 140)) {
          // משימה זוגית: בלי שותף ליד – לא מתקדמים, וקוראים לעזרה
          p.work.wait = (p.work.wait || 0) + dt;
          const c = pairCalls.find(q => q.by === p.id);
          if (c) c.until = t + 1; else pairCalls.push({ by: p.id, x: tk.x, y: tk.y, until: t + 1 });
          if (p.isBot && p.work.wait > 14) { p.work = null; p.bot.wait = 1; }
        } else {
          p.work.t += dt * (tplOf(p.role) === 'taskmaster' ? 2 : 1);
          if ((!p.work.mini || p.isBot) && p.work.t >= (p.isBot && p.work.mini ? botTaskTime() : taskTime(p.work.ref.i))) { const r = p.work.ref; p.work = null; completeTask(p, r); if (phase !== 'play') break; }
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
    if (!meeting || phase !== 'meeting') return; // בוט שסיים את הדיון (למשל פסק דין) – אין מה להמשיך
    // תור דיבור: בוט מדבר רק כשאף אחד לא מדבר, ואחרי שמסיים לדבר הבא בתור ממתין רגע
    meeting.queue.sort((x, y) => y.at - x.at);
    const talking = humanTalking();
    if (talking) meeting.floor = Math.min(meeting.floor, meeting.t - 0.9);
    if (!talking && meeting.queue.length && meeting.t <= meeting.queue[0].at && meeting.t <= meeting.floor) {
      const q = meeting.queue.shift(), o = players[q.id];
      if (o && o.alive) {
        say(o, q.text, q.silent); meeting.floor = meeting.t - speechDur(q.text);
        if (q.deduce) { jesterHint = true; meeting.skipTalk += 2; for (const id in meeting.suspect) if (meeting.suspect[id] > 0) meeting.suspect[id] *= 0.4; }
      }
    }
    const voters = list().filter(p => p.alive && !p.spectator);
    if (meeting.t <= 0 || voters.every(v => meeting.votes[v.id])) { meeting.t = Math.max(0, meeting.t); meeting.reveal = settings.openVotes ? 5 : 1.2; }
  } else if (phase === 'eject') {
    eject.t -= dt;
    if (eject.t <= 0) endEject();
  }

  if (phase === 'end' && !endAwarded) { endAwarded = true; awardTour(); rememberGame(); }
  // הליכה בלובי
  if (phase === 'lobby') for (const p of humans()) {
    let { dx, dy } = p.input || { dx: 0, dy: 0 };
    const l = Math.hypot(dx, dy);
    if (l < 0.05) continue;
    dx /= l; dy /= l;
    const stp = SPEED * 0.85 * dt;
    if (lobbyWalkable(p.x + dx * stp, p.y)) p.x += dx * stp;
    if (lobbyWalkable(p.x, p.y + dy * stp)) p.y += dy * stp;
    if (Math.abs(dx) > 0.1) p.dir = dx > 0 ? 1 : -1;
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

// טורניר: ניקוד בסוף כל סיבוב – ניצחון 3, כל חיסול 1, כל הצבעה נכונה 1, שרדת עד הסוף 1
function awardTour() {
  if (!tour || !winner) return;
  const rank = winner.ranking ? winner.ranking.map(r => r.name) : null;
  for (const p of list()) {
    if (p.spectator || !p.stats) continue;
    const key = p.isBot ? 'b:' + p.name : p.id;
    const e = tour.scores[key] || (tour.scores[key] = { name: nm(p), color: COLORS[p.color].c, pts: 0, wins: 0 });
    e.name = nm(p); e.color = COLORS[p.color].c;
    let won = false, g = 0;
    if (winner.team === 'race') { const i = rank.indexOf(nm(p)); g += i === 0 ? 3 : i === 1 ? 2 : i === 2 ? 1 : 0; won = i === 0; }
    else if (winner.team === 'jester') won = p.id === winner.jester;
    if (!won && winner.also && winner.also.includes(p.id)) won = true;
    else if (winner.team !== 'nobody') won = team(p) === winner.team || (winner.team === 'imp' && team(p) === 'mole');
    if (won && winner.team !== 'race') g += 3;
    g += (p.stats.kills || 0) + (p.stats.goodVotes || 0) + (p.alive ? 1 : 0);
    e.pts += g; e.gain = g; if (won) e.wins++;
  }
  if (tour.round >= tour.total) tour.done = true;
}
const tourView = () => tour ? { round: tour.round, total: tour.total, done: tour.done, table: Object.values(tour.scores).sort((a, b) => b.pts - a.pts).map(e => ({ name: e.name, color: e.color, pts: e.pts, gain: e.gain || 0, wins: e.wins })) } : null;

// ---------- תצוגה לכל שחקן ----------
function viewFor(v) {
  const t = now();
  const seeAll = settings.reveal || phase === 'end' || (!v.alive && phase !== 'lobby');
  const showRoles = phase !== 'lobby';
  const ps = [];
  for (const p of list()) {
    if (phase === 'play' && !p.alive && v.alive && p.id !== v.id) continue; // רוחות נסתרות מהחיים
    if ((p.inVent !== null || p.hiding != null) && p.id !== v.id && !seeAll && !(team(v) === 'imp' && (finalPhase() || (team(p) === 'imp' && p.hiding == null)))) continue; // בתוך פתח/מסתור – בלתי נראה
    if (p.vanishUntil > t && p.id !== v.id && team(v) !== 'imp' && !seeAll) continue; // נעלם – בלתי נראה
    const disp = p.shapeAs && players[p.shapeAs] ? players[p.shapeAs] : p;
    const o = {
      id: p.id, x: Math.round(p.x), y: Math.round(p.y), dir: p.dir, name: disp.name, color: COLORS[disp.color].c,
      alive: p.alive, spec: !!p.spectator, bot: p.isBot, work: p.work && !p.work.mini ? p.work.t / taskTime(p.work.ref.i) : 0, hat: disp.hat, pet: disp.pet || 0,
      scan: p.work && MAP.TASKS[p.work.ref.i].kind === 'scan' ? 1 : 0, vent: p.inVent !== null || p.hiding != null || p.vanishUntil > t ? 1 : 0,
    };
    if (p.shieldUntil > t) o.shield = 1;
    if (p.slip) o.slip = 1;
    if (showRoles && p.role && (seeAll || p.id === v.id || (settings.mode === 3 && team(p) === 'imp') || ((team(v) === 'imp' || team(v) === 'mole') && team(p) === 'imp'))) {
      o.role = ROLES[p.role].name; o.team = team(p);
      if (p.shapeAs) o.realName = p.name;
    }
    ps.push(o);
  }
  const me = {
    id: v.id, alive: v.alive, spec: !!v.spectator, role: v.role ? ROLES[v.role].name : null, roleKey: v.role,
    team: v.role ? team(v) : null, desc: v.role ? roleDesc(v.role) : '',
    tasks: v.tasks.map(x => ({ name: MAP.TASKS[x.i].name, i: x.i, done: x.done })),
    killCd: Math.ceil(v.killCd), shiftCd: Math.ceil(v.shiftCd), shifted: !!v.shapeAs, gaCd: Math.ceil(v.gaCd),
    tpl: tplOf(v.role),
    verdict: v.role === 'judge' ? { ready: judgeReady(v), used: !!v.verdictUsed, done: v.tasks.filter(x => x.done).length, total: v.tasks.length } : null,
    emergencyUsed: v.emergencyUsed, work: v.work && !v.work.mini ? v.work.t / taskTime(v.work.ref.i) : 0,
    mini: v.work && v.work.mini ? v.work.ref.i : null, inVent: v.inVent, hat: v.hat, cam: !!v.cam, host: v.id === hostId,
    sabMini: v.sabWork && sab ? { kind: { lights: 'switches', oxygen: 'code', reactor: 'sliders', freeze: 'tapfill' }[sab.type], i: v.sabWork.i } : null,
    sabCd: Math.ceil(sabCd),
    guardCd: Math.ceil(v.guardCd || 0), photoCd: Math.ceil(v.photoCd || 0), investCd: Math.ceil(v.investCd || 0), vanishCd: Math.ceil(v.vanishCd || 0), vanished: v.vanishUntil > t, engVentCd: Math.ceil(v.engVentCd || 0), hideVentsLeft: settings.mode === 3 && v.role === 'crew' ? HIDE_VENTS - (v.hideVents || 0) : null, hiding: v.hiding != null ? 1 : 0, hideCd: Math.ceil(v.hideCd || 0), ventLeft: v.role === 'engineer' && v.inVent !== null && settings.engVent && v.ventSince ? Math.max(0, Math.ceil(settings.engVent - (t - v.ventSince))) : null,
    bananaCd: Math.ceil(v.bananaCd || 0), fakeCd: Math.ceil(v.fakeCd || 0), hauntDoorCd: Math.ceil(v.hauntDoorCd || 0), darkCd: Math.ceil(v.darkCd || 0), dragCd: Math.ceil(v.dragCd || 0), dragging: !!v.drag,
    photos: (v.photos || []).map(ph => ({ ago: Math.round(t - ph.t), room: ph.room, names: ph.names, bodies: ph.bodies })), notes: (v.notes || []).slice(-6),
    color: v.color,
    ward: v.role === 'guardian' && players[v.ward] ? { name: nm(players[v.ward]), alive: players[v.ward].alive, swap: !!v.wardSwap, died: v.wardDied ? v.wardDied.room : null } : null,
    pairWait: !!(v.work && MAP.TASKS[v.work.ref.i].kind === 'pair' && v.work.wait && pairCalls.some(c => c.by === v.id)),
    rewindUsed: !!v.rewindUsed, noiseCd: Math.ceil(v.noiseCd || 0),
    mod: v.role && MOD[v.role] && MOD[v.role][3] ? { ic: MOD[v.role][2], label: MOD[v.role][3], cd: Math.ceil(v.modCd || 0), left: MOD[v.role][5] ? MOD[v.role][5] - (v.modUsed || 0) : null, until: Math.max(0, Math.ceil((v.sprintUntil || 0) - t), Math.ceil((v.radarUntil || 0) - t)) } : null,
    visMul: tplOf(v.role) === 'scout' ? 1.4 : 1,
    eaten: v.eaten || 0, wrong: wrongEjects,
  };
  const out = {
    phase, me, players: ps, settings, hostId,
    bombs: bombs.map(b => ({ x: Math.round(b.x), y: Math.round(b.y), left: Math.max(0, Math.ceil(b.at - t)) })),
    traps: tplOf(v.role) === 'trapper' ? traps.filter(tr => tr.by === v.id).map(tr => ({ x: tr.x, y: tr.y })) : [],
    radar: v.radarUntil > t && v.alive ? list().filter(o => o.id !== v.id && o.alive && !o.spectator).map(o => ({ x: Math.round(o.x), y: Math.round(o.y) })) : [],
    bodies: bodies.map(b => ({ x: Math.round(b.x), y: Math.round(b.y), color: COLORS[b.color].c, rot: b.decayAt ? 1 : 0 })),
    hanuk: hanukOn(), candles: settings.mode === 5 && phase !== 'lobby' ? candleIdx().map(i => ({ i, lit: !!candleLit[i] })) : null,
    miracles: miracles.filter(m => m.until > t).map(m => ({ x: m.x, y: m.y, left: Math.round(m.until - t) })),
    tasks: settings.mode === 2 ? { done: v.stats ? v.stats.tasks : 0, total: settings.raceGoal } : { done: taskDone, total: taskTotal },
    map: settings.map,
    hide: settings.mode === 3 && phase === 'play' ? { final: finalPhase(), near: (() => { const sk = list().filter(q => q.alive && !q.spectator && team(q) === 'imp'); if (!sk.length || team(v) === 'imp') return 0; const d = Math.min(...sk.map(q => dist(q, v))); return d < 170 ? 5 : d < 270 ? 4 : d < 390 ? 3 : d < 540 ? 2 : d < 750 ? 1 : 0; })(), left: Math.max(0, Math.round(hideEndAt - t)), wait: Math.max(0, Math.ceil(Math.max(...list().map(q => (q.frozenUntil || 0) - t)))), hiders: list().filter(q => q.alive && !q.spectator && team(q) !== 'imp').length } : null,
    tour: tourView(),
    race: settings.mode === 2 && phase === 'play' ? { goal: settings.raceGoal, left: Math.max(0, Math.round(raceEndAt - t)), board: raceRanking().slice(0, 5) } : null,
    gusts: gusts.map(g => g.i),
    camsOn: list().some(q => q.cam && q.alive) && !(camsOffUntil > t),
    camsOff: camsOffUntil > t ? Math.ceil(camsOffUntil - t) : 0, camsCd: camsCd > t ? Math.ceil(camsCd - t) : 0,
    sab: sab ? { type: sab.type, t: Math.ceil(sab.t), fixed: sab.fixed.slice() } : null,
    doors: Object.keys(doorsUntil).filter(r => doorsUntil[r] > now()),
    hauntDoors: hauntDoors.filter(d => d.until > t).map(d => ({ x: d.x, y: d.y, w: d.w, h: d.h })),
    pairCalls: pairCalls.map(c => ({ x: c.x, y: c.y })),
    noises: noises.map(n => ({ id: n.id, x: n.x, y: n.y })),
    pings: settings.mode === 3 && phase === 'play' ? pings.filter(n => n.by !== v.id && Math.hypot(n.x - v.x, n.y - v.y) < (team(v) === 'imp' ? 1000 : 380)).map(n => ({ id: n.id, x: n.x, y: n.y })) : [],
    bananas: bananas.map(b => ({ x: Math.round(b.x), y: Math.round(b.y) })),
    darkRooms: Object.keys(darkRooms).filter(r => darkRooms[r] > t),
    doorCool: Object.fromEntries(Object.keys(doorCool).filter(r => doorCool[r] > now() && !(doorsUntil[r] > now())).map(r => [r, Math.ceil(doorCool[r] - now())])),
    toast: v.toast.splice(0),
    roster: list().map(p => ({ id: p.id, name: p.name, color: COLORS[p.color].c, alive: p.alive, spec: !!p.spectator, bot: p.isBot, colorIdx: p.color, hat: p.hat, pet: p.pet || 0 })),
    chat,
    near: phase === 'play' ? nearTalk.filter(e => now() - e.t < 6 && e.from !== v.id && Math.hypot(e.x - v.x, e.y - v.y) < HEAR_R).map(e => ({ id: e.id, from: e.from, name: e.name, text: e.text })) : [],
  };
  if (v.role === 'scientist' || seeAll) out.vitals = list().filter(p => !p.spectator).map(p => ({ name: p.name, color: COLORS[p.color].c, alive: p.alive }));
  if (meeting) {
    const by = players[meeting.by];
    const body = meeting.body && players[meeting.body];
    out.meeting = {
      t: Math.ceil(meeting.t), by: by ? by.name : '', body: body ? body.name : meeting.fake ? '?' : null, room: meeting.room, bodyRoom: meeting.bodyRoom,
      voted: Object.keys(meeting.votes), myVote: meeting.votes[v.id] || null,
      reveal: !!meeting.reveal,
      votes: meeting.reveal && settings.openVotes ? Object.entries(meeting.votes).map(([id, to]) => ({ w: 1, c: players[id] ? COLORS[players[id].color].c : '#888', to })) : null,
    };
  }
  if (phase === 'alert' && meeting) {
    const by = players[meeting.by], body = meeting.body && players[meeting.body];
    out.alert = { name: by ? by.name : '', color: by ? COLORS[by.color].c : '#fff', hat: by ? by.hat : 0,
      body: !!body || !!meeting.fake, bodyName: body ? body.name : null, bodyColor: body ? COLORS[body.color].c : meeting.fake ? COLORS[meeting.fakeColor].c : null, room: meeting.room };
  }
  if (eject) out.eject = eject;
  if (winner) out.winner = winner;
  if (phase === 'end') {
    const all = list().filter(q => !q.spectator && q.stats);
    const best = (key, minV) => { const top = all.slice().sort((x, y) => y.stats[key] - x.stats[key])[0]; return top && top.stats[key] >= minV ? { name: nm(top), val: top.stats[key], color: COLORS[top.color].c } : null; };
    const awards = [];
    const a1 = best('tasks', 1); if (a1) awards.push({ icon: '🛠️', title: 'הכי הרבה משימות', ...a1 });
    const a2 = best('kills', 1); if (a2) awards.push({ icon: '🔪', title: 'הכי הרבה חיסולים', ...a2 });
    const a3 = best('goodVotes', 1); if (a3) awards.push({ icon: '🎯', title: 'הצביע נכון הכי הרבה', ...a3 });
    const a4 = best('badVotes', 1); if (a4) awards.push({ icon: '🤦', title: 'הצביע נגד חפים מפשע', ...a4 });
    const a5 = best('reports', 1); if (a5) awards.push({ icon: '📢', title: 'הכי הרבה דיווחים', ...a5 });
    out.summary = { duration: Math.round(t - gameStartT), awards, events: events.slice(-60) };
    // הסטטיסטיקה האישית של המשחק הזה (הדפדפן שומר את הסיכום המצטבר)
    if (v.stats && !v.spectator && winner) {
      const w = winner, tm = team(v);
      const won = w.team === 'race' ? !!(w.ranking && w.ranking[0] && w.ranking[0].name === nm(v)) : (w.team === 'jester' ? v.id === w.jester : w.team !== 'nobody' && (tm === w.team || (w.team === 'imp' && tm === 'mole'))) || !!(w.also && w.also.includes(v.id));
      out.myStats = { game: Math.round(gameStartT), won, team: tm, role: v.role, mode: settings.mode, kills: v.stats.kills, tasks: v.stats.tasks, goodVotes: v.stats.goodVotes, badVotes: v.stats.badVotes, reports: v.stats.reports, ejected: !!v.ejected, alive: v.alive };
    }
  }
  if (customMapDefs[settings.map] && v.sentMap !== settings.map) { v.sentMap = settings.map; out.modMap = { id: settings.map, def: customMapDefs[settings.map] }; }
  if (phase === 'lobby') {
    out.colors = COLORS;
    const lsig = JSON.stringify([settings, humans().length]);
    if (!lobbyCache || lobbyCache.sig !== lsig) lobbyCache = { sig: lsig, info: lobbyInfo() };
    if (v.lobbySig !== lsig) { v.lobbySig = lsig; out.lobbyInfo = lobbyCache.info; }
  }
  return out;
}


  function join(name, id) {
    if (id && players[id]) { if (players[id].kicked) return null; players[id].conn = true; return id; }
    if (settings.locked && hostId && players[hostId]) return null; // החדר נעול
    if (humans().length >= MAX_HUMANS) return null; // החדר מלא
    const p = newPlayer(name, freeColor(), false);
    if (phase !== 'lobby') { p.alive = false; p.spectator = true; p.role = 'spectator'; }
    if (!hostId || !players[hostId]) hostId = p.id;
    return p.id;
  }
  function setConn(id, on) { const p = players[id]; if (p) { p.conn = on; p.lastSeen = now(); } }
  function setHost(id) { hostId = id; }
  // שמירה ושחזור של מצב המשחק (כדי שמארח שנפל יוכל להמשיך מאותה נקודה)
  function snapshot() {
    return JSON.stringify({ v: 1, raceEndAt, saved: now(), players, phase, hostId, settings, bodies, meeting, eject, winner, chat, taskTotal, taskDone, sab, doorsUntil, doorCool, hauntDoors, darkRooms, sabCd, alertT, gusts, usedLines: [...usedLines], lastMistake, bananas, jesterHint, noises, killLog, liars, meetingNo, hideEndAt, noImpGame, tour, endAwarded });
  }
  function restore(json) {
    const o = JSON.parse(json);
    players = o.players || {}; phase = o.phase || 'lobby'; hostId = o.hostId; Object.assign(settings, o.settings || {});
    MAP = MAPS[settings.map] || MAPS.big; raceEndAt = o.raceEndAt || 0;
    bodies = o.bodies || []; meeting = o.meeting || null; eject = o.eject || null; winner = o.winner || null; chat = o.chat || [];
    taskTotal = o.taskTotal || 0; taskDone = o.taskDone || 0; sab = o.sab || null; doorsUntil = o.doorsUntil || {}; doorCool = o.doorCool || {}; hauntDoors = o.hauntDoors || []; darkRooms = o.darkRooms || {};
    sabCd = o.sabCd || 0; alertT = o.alertT || 0; gusts = o.gusts || []; usedLines = new Set(o.usedLines || []); lastMistake = o.lastMistake || null; bananas = o.bananas || []; jesterHint = !!o.jesterHint; noises = o.noises || []; killLog = o.killLog || []; posHist = []; liars = o.liars || {}; meetingNo = o.meetingNo || 0; hideEndAt = o.hideEndAt || 0; noImpGame = !!o.noImpGame; tour = o.tour || null; endAwarded = !!o.endAwarded; if (!Array.isArray(settings.roleOff)) settings.roleOff = [];
    if (meeting && (meeting.floor === null || meeting.floor === undefined)) meeting.floor = Infinity;
    for (const p of Object.values(players)) { p.conn = p.isBot; p.lastSeen = now(); p.input = { dx: 0, dy: 0 }; p.talking = false; }
    last = now();
  }
  const setCustomRoles = list => { clearCustomRoles(); const keys = []; (Array.isArray(list) ? list : []).slice(0, opts && opts.pro ? 150 : 12).forEach(d => { const k = d && addCustomRole(d); if (k) keys.push(k); }); return keys; };
  const setCustomMaps = obj => { Object.keys(customMapDefs).forEach(k => delete customMapDefs[k]); Object.keys(obj || {}).forEach(k => { if (/^mod_\w{1,16}$/.test(k)) { customMapDefs[k] = obj[k]; MAPREG && MAPREG(k, obj[k]); } }); };
  return { setCustomRoles, setCustomMaps, join, act: (id, a) => act(typeof id === 'string' && Object.prototype.hasOwnProperty.call(players, id) ? players[id] : null, a), view: id => players[id] ? viewFor(players[id]) : null, tick, setConn, setHost, snapshot, restore, hasPlayer: id => !!players[id], isKicked: id => !!(players[id] && players[id].kicked), isLocked: () => !!settings.locked,
    keyOf: id => players[id] ? players[id].key : null,
    checkKey: (id, key) => !!(players[id] && players[id].key && typeof key === 'string' && players[id].key === key) };
}
if (typeof module !== 'undefined' && module.exports) module.exports = createGame;
else root.createGame = createGame;
createGame.adminPhrase = adminPhrase;
root.adminPhrase = adminPhrase;
})(this);
