// Өрсөлдөөнт Coding — бодлогын жагсаалт, бодох, илгээлт, онооны самбар
// Нийтлэгдсэн бодлого бүх сурагчид нээлттэй, бүх сурагч нэг самбарт өрсөлдөнө.
// Удирдах: админ болон мэдээлэл зүйн багш (req.user.codingStaff).
const express = require('express');
const { Class, User, Problem, ProblemTest, CodeSubmission } = require('../models');
const { requireRole, flash } = require('../middleware/auth');
const { isId, clean } = require('../helpers');
const { problemOwnerFilter } = require('../access');
const judge = require('../judge');
const md = require('../markdown');
const { highlight } = require('../highlight');
const { TIERS, DIFFICULTIES, tierFor, solvePoints, toPoints, POINTS_PER_SOLVE } = require('../coding-ranks');
const { AVATARS, COLORS, avatarImg, tierName, findAvatar, findColor, cosmeticsFor, unlockedBetween } = require('../coding-cosmetics');

const router = express.Router();
router.use(requireRole());

const notFound = (res, what = 'Бодлого') => res.status(404).render('error', { title: 'Олдсонгүй', message: `${what} олдсонгүй.` });
const isStaff = (u) => !!u.codingStaff;

// Мэдээлэл зүйн бус багш, админ нээгээгүй ангийн сурагчид энэ хэсэг байхгүй мэт
router.use((req, res, next) => (req.user.codingPlayer || isStaff(req.user) ? next() : notFound(res, 'Хуудас')));

/** Бодлогын төлөв: upcoming | open | closed */
function phase(p, now = new Date()) {
  if (p.startAt && now < p.startAt) return 'upcoming';
  if (p.endAt && now > p.endAt) return 'closed';
  return 'open';
}

/** Сурагч: нийтлэгдсэн, эхэлсэн бодлого; багш: өөрийн удирдах (админ бүгд) */
async function findVisibleProblem(user, id) {
  if (!isId(id)) return null;
  if (isStaff(user)) return Problem.findOne({ _id: id, ...problemOwnerFilter(user) }).lean();
  const p = await Problem.findOne({ _id: id, published: true }).lean();
  return p && phase(p) !== 'upcoming' ? p : null;
}

async function loadProblem(req, res, next) {
  const p = await findVisibleProblem(req.user, req.params.id);
  if (!p) return notFound(res);
  req.problem = p;
  next();
}

/** Хэрэглэгч тус бүрийн хамгийн сайн оноо (багшийн туршилтыг тооцохгүй) */
async function bestScores(problemIds, userFilter = {}) {
  return CodeSubmission.aggregate([
    { $match: { problem: { $in: problemIds }, isStaff: false, status: 'done', ...userFilter } },
    { $sort: { score: -1, createdAt: 1 } },
    { $group: { _id: { p: '$problem', u: '$user' }, best: { $first: '$score' }, at: { $first: '$createdAt' }, attempts: { $sum: 1 } } },
  ]);
}

// ---------------- Жагсаалт ----------------
const PAGE_SIZE = 20;

/** Жагсаалтыг хуудаслана (?page=N); хэтэрсэн дугаарыг хамгийн сүүлийн хуудас руу */
function paginate(list, pageParam) {
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const page = Math.min(Math.max(parseInt(pageParam, 10) || 1, 1), pages);
  return { items: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), page, pages, total: list.length, from: (page - 1) * PAGE_SIZE + 1 };
}

router.get('/', async (req, res) => {
  const u = req.user;
  if (isStaff(u)) {
    const all = await Problem.find(problemOwnerFilter(u)).select('-statement -refCode -generatorCode').lean();
    // №1 эхэнд; дугааргүй (ноорог) нь сүүлд, үүссэн дарааллаар
    all.sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity) || a.createdAt - b.createdAt);
    const pager = paginate(all, req.query.page);
    const problems = pager.items;
    const ids = problems.map((p) => p._id);
    const [creators, stats, health] = await Promise.all([
      User.find({ _id: { $in: problems.map((p) => p.createdBy) } }).select('fullName').lean(),
      CodeSubmission.aggregate([
        { $match: { problem: { $in: ids }, isStaff: false } },
        { $group: { _id: '$problem', n: { $sum: 1 }, users: { $addToSet: '$user' }, solvers: { $addToSet: { $cond: [{ $eq: ['$verdict', 'AC'] }, '$user', null] } } } },
      ]),
      judge.health(),
    ]);
    const creatorMap = new Map(creators.map((c) => [String(c._id), c.fullName]));
    const statMap = new Map(stats.map((s) => [String(s._id), s]));
    for (const p of problems) {
      p.creatorName = creatorMap.get(String(p.createdBy)) || '—';
      const s = statMap.get(String(p._id));
      p.subCount = s?.n || 0;
      p.userCount = s?.users.length || 0;
      p.solverCount = s ? s.solvers.filter(Boolean).length : 0;
      p.phase = phase(p);
    }
    return res.render('coding/index-staff', { title: 'Өрсөлдөөнт Coding', problems, health, pager });
  }

  // Сурагч: бүх нийтлэгдсэн бодлого (хуудаслан) + өөрийн зэрэглэл, байр
  const all = await Problem.find({ published: true }).select('number title difficulty startAt endAt testCount timeLimitMs languages createdAt').sort({ number: 1, createdAt: 1 }).lean();
  const mine = await bestScores(all.map((p) => p._id), { user: u._id });
  const mineMap = new Map(mine.map((m) => [String(m._id.p), m]));
  const pager = paginate(all, req.query.page);
  const problems = pager.items;
  for (const p of problems) {
    p.phase = phase(p);
    p.mine = mineMap.get(String(p._id)) || null;
  }
  const rows = await buildStandings(await standingsProblems(false));
  const meRow = rows.find((r) => String(r.student._id) === String(u._id));
  const myTotal = meRow ? meRow.total : 0;
  const myTier = meRow ? meRow.tier : tierFor(0); // rank: бүтэн бодсон бодлогын хүндийн зэргийн оноо
  res.render('coding/index-student', {
    title: 'Өрсөлдөөнт Coding',
    problems,
    pager,
    rankUp: await checkRankUp(u, myTier),
    me: {
      total: myTotal,
      tier: myTier,
      look: cosmeticsFor(u, myTier),
      initials: initials(u.fullName),
      rank: meRow?.rank || null,
      players: rows.filter((r) => r.total > 0).length,
      solved: mine.filter((m) => m.best === 100).length,
    },
    top: rows.filter((r) => r.rank).slice(0, 3),
    TIERS,
    DIFFICULTIES,
    POINTS_PER_SOLVE,
  });
});

/** Нэг сурагчийн одоогийн зэрэглэл (самбартай ижил тооцоо) */
async function userTier(userId) {
  const problems = await standingsProblems(false);
  const best = await bestScores(problems.map((p) => p._id), { user: userId });
  const diff = new Map(problems.map((p) => [String(p._id), p.difficulty]));
  return tierFor(best.reduce((sum, b) => sum + (b.best === 100 ? solvePoints(diff.get(String(b._id.p))) : 0), 0));
}

/**
 * Зэрэглэл ахисан бол (өмнө баярлуулснаас дээш) нэг удаа баярлуулах мэдээлэл буцаана.
 * Зэрэглэл буурвал (багш хүндийн зэрэг сольсон г.м.) дахин баярлуулахгүйн тулд өмнөх хэвээр.
 */
async function checkRankUp(user, tier) {
  if (user.role !== 'student') return null;
  const seen = TIERS.findIndex((t) => t.key === user.codingTierSeen) + 1 || 1;
  if (tier.level <= seen) return null;
  await User.updateOne({ _id: user._id }, { $set: { codingTierSeen: tier.key } });
  const unlocked = unlockedBetween(seen, tier.level);
  return {
    name: tier.name,
    icon: tier.icon,
    key: tier.key,
    avatars: unlocked.avatars.map((a) => a.icon),
    colors: unlocked.colors.map((c) => c.name),
  };
}

/** Нийт самбарт тооцох бодлогууд: нийтлэгдсэн, эхэлсэн (сурагчид showStandings-тай нь) */
async function standingsProblems(staff) {
  const list = await Problem.find(staff ? { published: true } : { published: true, showStandings: true })
    .select('number title difficulty startAt endAt').sort({ number: 1, createdAt: 1 }).lean();
  return list.filter((p) => phase(p) !== 'upcoming');
}

// ---------------- Онооны самбар ----------------
/**
 * Бүх сурагчийн онооны хүснэгт (оролцсон сурагчид). classId өгвөл тэр ангийн бүх сурагч.
 * Эрэмбэ: нийт оноо ↓, тэнцвэл сүүлийн оноогоо эрт авсан нь дээр.
 */
async function buildStandings(problems, { classId = null } = {}) {
  const ids = problems.map((p) => p._id);
  // Зөвхөн Coding нээгдсэн ангийн сурагчид
  const enabled = await Class.distinct('_id', { codingEnabled: true });
  let students;
  if (classId) {
    students = enabled.some((id) => String(id) === String(classId))
      ? await User.find({ role: 'student', classId, active: { $ne: false } }).select('fullName username classId codingAvatar codingColor').lean()
      : [];
  } else {
    const participants = await CodeSubmission.distinct('user', { problem: { $in: ids }, isStaff: false, status: 'done' });
    students = await User.find({ _id: { $in: participants }, role: 'student', classId: { $in: enabled }, active: { $ne: false } }).select('fullName username classId codingAvatar codingColor').lean();
  }
  const [best, classes] = await Promise.all([
    bestScores(ids, { user: { $in: students.map((s) => s._id) } }),
    Class.find({ _id: { $in: students.map((s) => s.classId).filter(Boolean) } }).select('name').lean(),
  ]);
  const classMap = new Map(classes.map((c) => [String(c._id), c.name]));
  const map = new Map(best.map((b) => [String(b._id.p) + ':' + String(b._id.u), b]));
  const rows = students.map((s) => {
    const cells = problems.map((p) => map.get(String(p._id) + ':' + String(s._id)) || null);
    // Нийт оноо: хүндийн зэргийн оноогоор (хэсэгчилсэн нь хувиар), эрэмбэ үүгээр
    const total = Math.round(cells.reduce((sum, c, i) => sum + (c ? toPoints(c.best, problems[i].difficulty) : 0), 0) * 10) / 10;
    const solved = cells.filter((c) => c && c.best === 100).length;
    // Rank оноо: зөвхөн бүтэн бодсон бодлогын хүндийн зэргийн оноо
    const rankPts = cells.reduce((sum, c, i) => sum + (c && c.best === 100 ? solvePoints(problems[i].difficulty) : 0), 0);
    const last = cells.reduce((m, c) => (c && c.best > 0 && c.at > m ? c.at : m), new Date(0));
    return {
      student: { ...s, className: classMap.get(String(s.classId)) || '', initials: initials(s.fullName) },
      cells, total, solved, last,
      tier: tierFor(rankPts),
      look: cosmeticsFor(s, tierFor(rankPts)),
      attempts: cells.reduce((n, c) => n + (c ? c.attempts : 0), 0),
    };
  });
  rows.sort((a, b) => b.total - a.total || a.last - b.last || a.student.fullName.localeCompare(b.student.fullName, 'mn'));
  let rank = 0;
  rows.forEach((r, i) => {
    if (i === 0 || r.total !== rows[i - 1].total || +r.last !== +rows[i - 1].last) rank = i + 1;
    r.rank = r.total > 0 ? rank : null;
  });
  return rows;
}

/** Самбарын ангийн шүүлтүүр: Coding нээгдсэн, сурагчтай анги */
async function standingsClasses() {
  const ids = await User.distinct('classId', { role: 'student', classId: { $ne: null } });
  return Class.find({ _id: { $in: ids }, codingEnabled: true }).collation({ locale: 'mn' }).sort({ name: 1 }).lean();
}

/** Нэг бодлогын самбарт ч зэрэглэлийг нийт оноогоор харуулна */
async function attachOverallTier(rows) {
  const overall = await buildStandings(await standingsProblems(false));
  const map = new Map(overall.map((r) => [String(r.student._id), r.tier]));
  for (const r of rows) r.tier = map.get(String(r.student._id)) || tierFor(0);
  return rows;
}

/** Нэрийн эхний үсгүүд (аватарт): «Бат Болд» → «ББ» */
const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

// ---------------- Миний аватар (сурагч) ----------------
router.get('/profile', async (req, res) => {
  if (req.user.role !== 'student') return notFound(res, 'Хуудас');
  const tier = await userTier(req.user._id);
  res.render('coding/profile', {
    title: 'Миний аватар',
    tier,
    look: cosmeticsFor(req.user, tier),
    initials: initials(req.user.fullName),
    AVATARS,
    avatarImg,
    COLORS,
    tierName,
    selectedAvatar: req.user.codingAvatar,
    selectedColor: req.user.codingColor || 'tier',
  });
});

router.post('/profile', async (req, res) => {
  if (req.user.role !== 'student') return notFound(res, 'Хуудас');
  const tier = await userTier(req.user._id);
  const a = findAvatar(clean(req.body.avatar, 20));
  const c = findColor(clean(req.body.color, 20));
  // Түгжээтэй зүйлийг сонгож болохгүй (хөтчөөс хуурсан ч)
  const update = {};
  if (req.body.avatar === '' || (a && a.level <= tier.level)) update.codingAvatar = a ? a.key : '';
  if (c && c.level <= tier.level) update.codingColor = c.key === 'tier' ? '' : c.key;
  const locked = (a && a.level > tier.level) || (c && c.level > tier.level);
  await User.updateOne({ _id: req.user._id }, { $set: update });
  flash(req, locked ? 'error' : 'success', locked ? 'Түгжээтэй зүйлийг сонгох боломжгүй — зэрэглэлээ ахиулаарай!' : 'Аватар хадгалагдлаа.');
  res.redirect('/coding/profile');
});

router.get('/standings', async (req, res) => {
  const problems = await standingsProblems(isStaff(req.user));
  const classes = await standingsClasses();
  const classId = classes.find((c) => String(c._id) === req.query.class)?._id || null;
  res.render('coding/standings', {
    title: 'Онооны самбар',
    problems,
    rows: await buildStandings(problems, { classId }),
    TIERS,
    DIFFICULTIES,
    POINTS_PER_SOLVE,
    classes,
    classId: classId ? String(classId) : '',
    single: null,
    LANGUAGES: judge.LANGUAGES,
  });
});

// ---------------- Илгээлт харах ----------------
async function loadSubmission(req, res, next) {
  const sub = isId(req.params.sid) ? await CodeSubmission.findById(req.params.sid).lean() : null;
  if (!sub) return notFound(res, 'Илгээлт');
  const problem = await Problem.findById(sub.problem).select('-refCode -generatorCode').lean();
  if (!problem) return notFound(res, 'Илгээлт');
  const u = req.user;
  const ok = isStaff(u) ? !!(await Problem.exists({ _id: problem._id, ...problemOwnerFilter(u) })) : String(sub.user) === String(u._id);
  if (!ok) return notFound(res, 'Илгээлт');
  req.sub = sub;
  req.problem = problem;
  next();
}

async function resultContext(sub, problem) {
  const samples = sub.results.some((r) => r.sample)
    ? await ProblemTest.find({ problem: problem._id, sample: true }).sort({ order: 1 }).select('input output order').lean()
    : [];
  // results дахь жишээ тестүүдийн дарааллаар оролт/хүлээгдэж буй гаралтыг холбоно
  let si = 0;
  const results = sub.results.map((r, i) => ({ ...r, n: i + 1, test: r.sample ? samples[si++] : null }));
  return { sub, problem, results, LANGUAGES: judge.LANGUAGES, VERDICTS: judge.VERDICTS };
}

router.get('/submissions/:sid/status', loadSubmission, async (req, res) => {
  const { sub } = req;
  const ctx = await resultContext(sub, req.problem);
  // Өөрийн илгээлт бүтэн зөв бол зэрэглэл ахисан эсэхийг шалгана (баярын цонх)
  const rankUp = sub.status === 'done' && sub.verdict === 'AC' && String(sub.user) === String(req.user._id)
    ? await checkRankUp(req.user, await userTier(req.user._id))
    : null;
  res.render('coding/_result', { ...ctx, compact: req.query.compact === '1' }, (err, html) => {
    if (err) return res.status(500).json({ error: 'render' });
    res.json({ status: sub.status, verdict: sub.verdict, score: toPoints(sub.score, req.problem.difficulty), html, rankUp });
  });
});

router.get('/submissions/:sid', loadSubmission, async (req, res) => {
  const { sub, problem } = req;
  const author = await User.findById(sub.user).select('fullName username').lean();
  const lang = judge.LANGUAGES[sub.language];
  res.render('coding/submission', {
    title: 'Илгээлт',
    ...(await resultContext(sub, problem)),
    author,
    codeHtml: highlight(sub.code, lang?.mode === 'cpp' ? 'cpp' : 'python').html,
    canRejudge: isStaff(req.user),
  });
});

// ---------------- Бодлого бодох ----------------
router.get('/:id', loadProblem, async (req, res) => {
  const p = req.problem;
  const [samples, mySubs] = await Promise.all([
    ProblemTest.find({ problem: p._id, sample: true }).sort({ order: 1 }).select('input output').lean(),
    CodeSubmission.find({ problem: p._id, user: req.user._id }).select('language status verdict score passed total timeMs memoryKb createdAt').sort({ createdAt: -1 }).limit(30).lean(),
  ]);
  res.render('coding/problem', {
    title: p.title,
    problem: p,
    statementHtml: md.render(p.statement),
    samples,
    mySubs,
    phase: phase(p),
    staff: isStaff(req.user),
    languages: p.languages.filter((l) => judge.LANGUAGES[l]),
    // Сурагчдын ихэнх Python 3.8 ашигладаг тул анх удаа бол түүнийг сонгоно
    lastLanguage: mySubs[0]?.language || (p.languages.includes('py38') ? 'py38' : p.languages[0]),
    LANGUAGES: judge.LANGUAGES,
    VERDICTS: judge.VERDICTS,
  });
});

router.post('/:id/submit', loadProblem, async (req, res) => {
  const p = req.problem;
  const u = req.user;
  const fail = (status, error) => res.status(status).json({ error });
  if (!isStaff(u) && phase(p) === 'closed') return fail(403, 'Бодлогын хугацаа дууссан тул илгээх боломжгүй.');
  const language = clean(req.body.language, 20);
  if (!p.languages.includes(language) || !judge.LANGUAGES[language]) return fail(400, 'Энэ бодлогод уг хэлээр илгээх боломжгүй.');
  const code = String(req.body.code ?? '');
  if (!code.trim()) return fail(400, 'Кодоо бичнэ үү.');
  if (code.length > 65536) return fail(400, 'Код хэт урт (64KB хүртэл).');
  if (!p.testCount) return fail(400, 'Энэ бодлогод тест оруулаагүй байна.');

  // Хэт олон илгээлтээс сэргийлнэ
  const pending = await CodeSubmission.exists({ user: u._id, status: { $in: ['queued', 'running'] } });
  if (pending) return fail(429, 'Өмнөх илгээлт тань шалгагдаж байна. Дуусахыг хүлээнэ үү.');
  const last = await CodeSubmission.findOne({ user: u._id }).sort({ createdAt: -1 }).select('createdAt').lean();
  if (last && Date.now() - last.createdAt < 5000) return fail(429, 'Хэт ойрхон илгээж байна. Хэдэн секунд хүлээнэ үү.');

  const sub = await CodeSubmission.create({ problem: p._id, user: u._id, isStaff: isStaff(u), language, code });
  judge.kick();
  res.json({ id: String(sub._id) });
});

router.get('/:id/standings', loadProblem, async (req, res) => {
  const p = req.problem;
  if (!isStaff(req.user) && !p.showStandings) return notFound(res, 'Онооны самбар');
  const classes = await standingsClasses();
  const classId = classes.find((c) => String(c._id) === req.query.class)?._id || null;
  res.render('coding/standings', {
    title: 'Онооны самбар · ' + p.title,
    problems: [p],
    rows: await attachOverallTier(await buildStandings([p], { classId })),
    TIERS,
    DIFFICULTIES,
    POINTS_PER_SOLVE,
    classes,
    classId: classId ? String(classId) : '',
    single: p,
    LANGUAGES: judge.LANGUAGES,
  });
});

module.exports = router;
