// Өрсөлдөөнт Coding — бодлогын жагсаалт, бодох, илгээлт, rank самбар, дэлгүүр
// Бодлого бодож 🪙 зоос цуглуулна (дэлгүүр); 🏅 ranking оноо, зэрэглэл зөвхөн contest-оор (src/routes/contests.js).
// Удирдах: админ болон мэдээлэл зүйн багш (req.user.codingStaff).
const express = require('express');
const { Class, User, Problem, ProblemTest, CodeSubmission, CpTopic, Contest } = require('../models');
const { cpAccess, syncCpUnlock } = require('../cp');
const { lessonOpenFor } = require('../basics');
const { requireRole, flash } = require('../middleware/auth');
const { isId, clean } = require('../helpers');
const { problemOwnerFilter } = require('../access');
const judge = require('../judge');
const md = require('../markdown');
const { highlight } = require('../highlight');
const { TIERS, DIFFICULTIES, tierFor, toPoints, POINTS_PER_SOLVE, CONTEST_MAX_GAIN, PLACE_BONUS, PLACEMENT, tierByKey } = require('../coding-ranks');
const { AVATARS, COLORS, avatarImg, findAvatar, findColor, PRICES, priceOf, itemKey, owns, cosmeticsFor } = require('../coding-cosmetics');
const { contestState, inContest, wallet } = require('../contests');

const router = express.Router();
router.use(requireRole());

const notFound = (res, what = 'Бодлого') => res.status(404).render('error', { title: 'Олдсонгүй', message: `${what} олдсонгүй.` });
const isStaff = (u) => !!u.codingStaff;

// Мэдээлэл зүйн бус багш, админ нээгээгүй ангийн сурагчид энэ хэсэг байхгүй мэт
// Мэдээлэл зүйн бус багш, Coding нээгдээгүй сурагчид байхгүй мэт. Гүнзгий бэлтгэлийн сурагч зөвхөн сэдвийн бодлогоо бодно.
// Програмчлалын суурийн сурагч зөвхөн ангидаа нээгдсэн хичээлийн бодлогоо бодно.
router.use((req, res, next) => (req.user.codingPlayer || isStaff(req.user) || cpAccess(req.user) || req.user.basicsAccess ? next() : notFound(res, 'Хуудас')));
// Үндсэн тэмцээний хуудсууд (жагсаалт, самбар, аватар) — Coding нээгдсэн сурагч, багш
const mainOnly = (req, res, next) => (req.user.codingPlayer || isStaff(req.user) ? next() : notFound(res, 'Хуудас'));

/** Бодлогын төлөв: upcoming | open | closed */
function phase(p, now = new Date()) {
  if (p.startAt && now < p.startAt) return 'upcoming';
  if (p.endAt && now > p.endAt) return 'closed';
  return 'open';
}

/** Сурагч: нийтлэгдсэн, эхэлсэн бодлого; багш: өөрийн удирдах (админ бүгд) */
async function findVisibleProblem(user, id) {
  if (!isId(id)) return null;
  if (isStaff(user)) {
    const own = await Problem.findOne({ _id: id, ...problemOwnerFilter(user) }).lean();
    if (own?.topic) own.topicDoc = await CpTopic.findById(own.topic).select('title icon track').lean();
    if (own?.contest) {
      const c = await Contest.findById(own.contest).select('title startAt endAt finalizedAt kind').lean();
      if (c) own.contestDoc = { ...c, state: contestState(c) };
    }
    return own;
  }
  const raw = await Problem.findOne({ _id: id }).lean();
  if (raw?.contest) {
    // Contest-ийн бодлого: зөвхөн сонгогдсон ангийн сурагчид, contest эхэлснээс хойш (дууссаны дараа дасгал болно)
    const c = await Contest.findById(raw.contest).select('title startAt endAt finalizedAt kind classIds').lean();
    if (!c || !user.codingPlayer || !inContest(user, c) || ['draft', 'scheduled'].includes(contestState(c))) return null;
    raw.contestDoc = { _id: c._id, title: c.title, startAt: c.startAt, endAt: c.endAt, kind: c.kind, state: contestState(c) };
    return raw;
  }
  const p = raw && raw.published ? raw : null;
  if (!p || phase(p) === 'upcoming') return null;
  if (p.topic) {
    const t = await CpTopic.findById(p.topic).select('title icon track published classIds').lean();
    if (!t || !t.published) return null;
    // Програмчлалын суурь: ангид нь нээгдсэн хичээл; Гүнзгий бэлтгэл: эрхтэй сурагч
    if (t.track === 'basics' ? !lessonOpenFor(user, t) : !cpAccess(user)) return null;
    p.topicDoc = { _id: t._id, title: t.title, icon: t.icon, track: t.track };
    return p;
  }
  return user.codingPlayer ? p : null;
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

router.get('/', mainOnly, async (req, res) => {
  const u = req.user;
  if (isStaff(u)) {
    // Үндсэн тэмцээн (сэдэвтэй бодлого Гүнзгий бэлтгэлд удирдагдана)
    const all = await Problem.find({ ...problemOwnerFilter(u), topic: null, contest: null }).select('-statement -refCode -generatorCode').lean();
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
    return res.render('coding/index-staff', { title: 'Өрсөлдөөнт Coding', problems, health, pager, isAdmin: u.role === 'admin' });
  }

  // Сурагч: бүх нийтлэгдсэн бодлого (хуудаслан) + зэрэглэл (contest-оор), зоос, contest-ууд
  const all = await Problem.find({ published: true, topic: null, contest: null }).select('number title difficulty startAt endAt testCount timeLimitMs languages createdAt').sort({ number: 1, createdAt: 1 }).lean();
  const mine = await bestScores(all.map((p) => p._id), { user: u._id });
  const mineMap = new Map(mine.map((m) => [String(m._id.p), m]));
  const pager = paginate(all, req.query.page);
  const problems = pager.items;
  for (const p of problems) {
    p.phase = phase(p);
    p.mine = mineMap.get(String(p._id)) || null;
  }
  const myTier = tierFor(u.ratingPoints);
  const board = await leaderboard();
  const meIdx = board.findIndex((r) => String(r.student._id) === String(u._id));
  const contests = (await Contest.find({ classIds: u.classId, startAt: { $ne: null }, finalizedAt: null }).select('title kind startAt endAt classIds').sort({ startAt: 1 }).lean())
    .map((c) => ({ ...c, state: contestState(c) })).filter((c) => ['scheduled', 'running'].includes(c.state));
  res.render('coding/index-student', {
    title: 'Өрсөлдөөнт Coding',
    problems,
    pager,
    rankUp: await checkRankUp(u, myTier),
    me: {
      tier: myTier,
      look: cosmeticsFor(u),
      initials: initials(u.fullName),
      rank: meIdx >= 0 ? board[meIdx].rank : null,
      players: board.length,
      solved: mine.filter((m) => m.best === 100).length,
      wallet: await wallet(u),
      placementDone: !!u.placementDone,
    },
    contests,
    top: board.slice(0, 3),
    TIERS,
    DIFFICULTIES,
  });
});

/** Сурагчийн зэрэглэл — зөвхөн contest-ийн ranking оноогоор */
const ratingTier = (user) => tierFor(user.ratingPoints);

/** Rank самбар: Coding нээгдсэн ангийн, ranking оноотой эсвэл түвшин тогтоосон сурагчид */
async function leaderboard({ classId = null } = {}) {
  const enabled = await Class.distinct('_id', { codingEnabled: true });
  const filter = { role: 'student', active: { $ne: false }, classId: classId ? classId : { $in: enabled }, $or: [{ ratingPoints: { $gt: 0 } }, { placementDone: true }] };
  if (classId && !enabled.some((id) => String(id) === String(classId))) return [];
  const students = await User.find(filter).select('fullName username classId codingAvatar codingColor codingOwned ratingPoints placementDone').lean();
  const classes = await Class.find({ _id: { $in: students.map((s) => s.classId).filter(Boolean) } }).select('name').lean();
  const classMap = new Map(classes.map((c) => [String(c._id), c.name]));
  students.sort((a, b) => b.ratingPoints - a.ratingPoints || a.fullName.localeCompare(b.fullName, 'mn'));
  let rank = 0;
  return students.map((s, i) => {
    if (i === 0 || s.ratingPoints !== students[i - 1].ratingPoints) rank = i + 1;
    return { student: { ...s, className: classMap.get(String(s.classId)) || '', initials: initials(s.fullName) }, rank, tier: tierFor(s.ratingPoints), look: cosmeticsFor(s) };
  });
}

/**
 * Зэрэглэл ахисан бол (өмнө баярлуулснаас дээш) нэг удаа баярлуулах мэдээлэл буцаана.
 * Зэрэглэл буурвал (багш хүндийн зэрэг сольсон г.м.) дахин баярлуулахгүйн тулд өмнөх хэвээр.
 */
async function checkRankUp(user, tier) {
  if (user.role !== 'student') return null;
  // Програмист болсон бол Гүнзгий бэлтгэл нээгдэнэ (нэг удаа)
  const cpNew = await syncCpUnlock(user, tier);
  const seen = TIERS.findIndex((t) => t.key === user.codingTierSeen) + 1 || 1;
  if (tier.level <= seen) return null;
  await User.updateOne({ _id: user._id }, { $set: { codingTierSeen: tier.key } });
  return { name: tier.name, icon: tier.icon, key: tier.key, avatars: [], colors: [], cp: cpNew };
}

/** Нийт самбарт тооцох бодлогууд: нийтлэгдсэн, эхэлсэн (сурагчид showStandings-тай нь) */
async function standingsProblems(staff) {
  const list = await Problem.find(staff ? { published: true, topic: null, contest: null } : { published: true, showStandings: true, topic: null, contest: null })
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
      ? await User.find({ role: 'student', classId, active: { $ne: false } }).select('fullName username classId codingAvatar codingColor codingOwned ratingPoints').lean()
      : [];
  } else {
    const participants = await CodeSubmission.distinct('user', { problem: { $in: ids }, isStaff: false, status: 'done' });
    students = await User.find({ _id: { $in: participants }, role: 'student', classId: { $in: enabled }, active: { $ne: false } }).select('fullName username classId codingAvatar codingColor codingOwned ratingPoints').lean();
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
    const last = cells.reduce((m, c) => (c && c.best > 0 && c.at > m ? c.at : m), new Date(0));
    return {
      student: { ...s, className: classMap.get(String(s.classId)) || '', initials: initials(s.fullName) },
      cells, total, solved, last,
      tier: tierFor(s.ratingPoints), // зэрэглэл — contest-ийн ranking оноогоор
      look: cosmeticsFor(s),
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

/** Нэрийн эхний үсгүүд (аватарт): «Бат Болд» → «ББ» */
const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

// ---------------- Миний аватар (сурагч) ----------------
router.get('/profile', mainOnly, async (req, res) => {
  if (req.user.role !== 'student') return notFound(res, 'Хуудас');
  const u = req.user;
  res.render('coding/profile', {
    title: 'Миний аватар',
    tier: ratingTier(u),
    look: cosmeticsFor(u),
    initials: initials(u.fullName),
    avatars: AVATARS.filter((a) => owns(u, 'avatar', a)),
    colors: COLORS.filter((c) => owns(u, 'color', c)),
    lockedCount: AVATARS.filter((a) => !owns(u, 'avatar', a)).length + COLORS.filter((c) => !owns(u, 'color', c)).length,
    avatarImg,
    selectedAvatar: u.codingAvatar,
    selectedColor: u.codingColor || 'tier',
    wallet: await wallet(u),
  });
});

router.post('/profile', mainOnly, async (req, res) => {
  if (req.user.role !== 'student') return notFound(res, 'Хуудас');
  const u = req.user;
  const a = findAvatar(clean(req.body.avatar, 20));
  const c = findColor(clean(req.body.color, 20));
  // Худалдаж аваагүй зүйлийг сонгож болохгүй (хөтчөөс хуурсан ч)
  const update = {};
  if (req.body.avatar === '' || owns(u, 'avatar', a)) update.codingAvatar = a ? a.key : '';
  if (owns(u, 'color', c)) update.codingColor = c.key === 'tier' ? '' : c.key;
  const locked = (a && !owns(u, 'avatar', a)) || (c && !owns(u, 'color', c));
  await User.updateOne({ _id: u._id }, { $set: update });
  flash(req, locked ? 'error' : 'success', locked ? 'Эхлээд дэлгүүрээс худалдаж аваарай!' : 'Аватар хадгалагдлаа.');
  res.redirect('/coding/profile');
});

// ---------------- 🛒 Дэлгүүр: зоосоор аватар, өнгө ----------------
router.get('/shop', mainOnly, async (req, res) => {
  if (req.user.role !== 'student') return notFound(res, 'Хуудас');
  const u = req.user;
  const item = (kind) => (x) => ({ ...x, kind, price: priceOf(x), owned: owns(u, kind, x) });
  res.render('coding/shop', {
    title: 'Дэлгүүр',
    wallet: await wallet(u),
    look: cosmeticsFor(u),
    initials: initials(u.fullName),
    avatars: AVATARS.map(item('avatar')),
    colors: COLORS.map(item('color')),
    avatarImg,
    DIFFICULTIES,
  });
});

router.post('/shop/buy', mainOnly, async (req, res) => {
  if (req.user.role !== 'student') return notFound(res, 'Хуудас');
  const u = req.user;
  const kind = req.body.kind === 'color' ? 'color' : 'avatar';
  const x = kind === 'color' ? findColor(clean(req.body.key, 20)) : findAvatar(clean(req.body.key, 20));
  if (!x) return notFound(res, 'Бараа');
  if (owns(u, kind, x)) {
    flash(req, 'success', 'Танд аль хэдийн байгаа.');
    return res.redirect('/coding/shop');
  }
  const price = priceOf(x);
  const w = await wallet(u);
  if (w.balance < price) {
    flash(req, 'error', `Зоос хүрэлцэхгүй байна: ${price} 🪙 хэрэгтэй, танд ${w.balance} 🪙 байна. Бодлого бодож зоос цуглуулаарай!`);
    return res.redirect('/coding/shop');
  }
  // Зэрэг хоёр удаа дарахад давхар зарцуулахгүй: зарцуулсан зоос өөрчлөгдөөгүй үед л
  const r = await User.updateOne(
    // Хуучин хэрэглэгчид coinsSpent талбаргүй байж болно — 0 бол «байхгүй»-г ч зөвшөөрнө
    { _id: u._id, coinsSpent: u.coinsSpent ? u.coinsSpent : { $in: [0, null] }, codingOwned: { $ne: itemKey(kind, x.key) } },
    { $inc: { coinsSpent: price }, $push: { codingOwned: itemKey(kind, x.key) }, $set: kind === 'color' ? { codingColor: x.key } : { codingAvatar: x.key } }
  );
  flash(req, r.modifiedCount ? 'success' : 'error', r.modifiedCount ? `🎉 Худалдаж авлаа! ${kind === 'color' ? x.name + ' өнгө' : x.icon + ' аватар'} танд тохируулагдлаа.` : 'Дахин оролдоно уу.');
  res.redirect('/coding/shop');
});

router.get('/standings', mainOnly, async (req, res) => {
  const classes = await standingsClasses();
  const classId = classes.find((c) => String(c._id) === req.query.class)?._id || null;
  res.render('coding/leaderboard', {
    title: 'Rank самбар',
    rows: await leaderboard({ classId }),
    classes,
    classId: classId ? String(classId) : '',
    TIERS,
    CONTEST_MAX_GAIN,
    PLACE_BONUS,
    PLACEMENT: PLACEMENT.map((p) => ({ ...p, tier: tierByKey(p.tier) })),
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
  // Зэрэглэл зөвхөн contest-ийн дүнгээр ахина — илгээлтээр баярын цонх гарахгүй
  const rankUp = null;
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
    statementHtml: md.renderStatement(p.statement),
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
    rows: await buildStandings([p], { classId }),
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
