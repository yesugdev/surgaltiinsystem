// 🏁 Contest — ranking оноо зөвхөн эндээс. Үүсгэх, эхлүүлэх, дуусгах, дүн баталгаажуулах: ЗӨВХӨН админ.
// Мэдээлэл зүйн багш үзэж болно. Сурагч: анги нь сонгогдсон, Coding нээлттэй.
const express = require('express');
const { Class, Problem, CodeSubmission, Contest, ContestResult } = require('../models');
const { requireRole, flash } = require('../middleware/auth');
const { isId, clean, toArray, parseInputDate } = require('../helpers');
const { contestState, STATES, inContest, contestProblems, contestStandings, ratingChanges, finalizeContest } = require('../contests');
const { tierFor, difficultyOf, PLACE_BONUS, CONTEST_MAX_GAIN, PLACEMENT, tierByKey } = require('../coding-ranks');

const router = express.Router();
router.use(requireRole());

const notFound = (res, what = 'Contest') => res.status(404).render('error', { title: 'Олдсонгүй', message: `${what} олдсонгүй.` });
const isAdmin = (u) => u.role === 'admin';
router.use((req, res, next) => (req.user.codingPlayer || req.user.codingStaff ? next() : notFound(res, 'Хуудас')));
const adminOnly = (req, res, next) => (isAdmin(req.user) ? next() : notFound(res, 'Хуудас'));

async function loadContest(req, res, next) {
  const c = isId(req.params.id) ? await Contest.findById(req.params.id) : null;
  if (!c) return notFound(res);
  if (!req.user.codingStaff && (!inContest(req.user, c) || contestState(c) === 'draft')) return notFound(res);
  req.contest = c;
  req.state = contestState(c);
  next();
}

const codingClasses = () => Class.find({ codingEnabled: true }).collation({ locale: 'mn' }).sort({ name: 1 }).select('name').lean();

// ---------------- Жагсаалт ----------------
router.get('/', async (req, res) => {
  const u = req.user;
  const staff = !!u.codingStaff;
  const filter = staff ? {} : { classIds: u.classId, startAt: { $ne: null } };
  const contests = await Contest.find(filter).sort({ startAt: -1, createdAt: -1 }).lean();
  const counts = await Problem.aggregate([{ $match: { contest: { $in: contests.map((c) => c._id) } } }, { $group: { _id: '$contest', n: { $sum: 1 } } }]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.n]));
  const mine = staff ? [] : await ContestResult.find({ user: u._id, contest: { $in: contests.map((c) => c._id) } }).lean();
  const mineMap = new Map(mine.map((r) => [String(r.contest), r]));
  const classes = await Class.find({ _id: { $in: contests.flatMap((c) => c.classIds) } }).select('name').lean();
  const classMap = new Map(classes.map((c) => [String(c._id), c.name]));
  const list = contests.map((c) => ({
    ...c,
    state: contestState(c),
    problemCount: countMap.get(String(c._id)) || 0,
    classNames: c.classIds.map((id) => classMap.get(String(id))).filter(Boolean),
    mine: mineMap.get(String(c._id)) || null,
  }));
  const order = { running: 0, scheduled: 1, ended: 2, draft: 3, finalized: 4 };
  list.sort((a, b) => order[a.state] - order[b.state] || (b.startAt || b.createdAt) - (a.startAt || a.createdAt));
  res.render('contests/index', { title: 'Contest', contests: list, STATES, admin: isAdmin(u), staff, tier: tierFor(u.ratingPoints), user: u });
});

// ---------------- Үүсгэх / засах (админ) ----------------
function parseContest(req) {
  const errors = [];
  const title = clean(req.body.title, 200);
  const durationMin = Math.round(Number(req.body.durationMin));
  const startAt = parseInputDate(req.body.startAt);
  if (!title) errors.push('Contest-ийн нэрийг оруулна уу.');
  if (!(durationMin >= 5 && durationMin <= 600)) errors.push('Үргэлжлэх хугацаа 5–600 минут байна.');
  return {
    errors,
    data: {
      title,
      kind: req.body.kind === 'placement' ? 'placement' : 'regular',
      description: String(req.body.description ?? '').slice(0, 5000),
      durationMin,
      startAt: startAt || null,
      classIds: toArray(req.body.classIds).filter(isId),
    },
  };
}

async function renderForm(res, contest, errors = [], status = 200) {
  res.status(status).render('contests/form', { title: contest._id ? 'Contest засах' : 'Шинэ contest', contest, classes: await codingClasses(), errors });
}

router.get('/new', adminOnly, (req, res) => renderForm(res, { kind: req.query.kind === 'placement' ? 'placement' : 'regular', durationMin: 90, classIds: [] }));

router.post('/', adminOnly, async (req, res) => {
  const { errors, data } = parseContest(req);
  const allowed = new Set((await codingClasses()).map((c) => String(c._id)));
  data.classIds = data.classIds.filter((id) => allowed.has(String(id)));
  if (!data.classIds.length) errors.push('Оролцох ангиа сонгоно уу (Coding нээгдсэн анги).');
  if (errors.length) return renderForm(res, data, errors, 400);
  const c = await Contest.create({ ...data, endAt: data.startAt ? new Date(+data.startAt + data.durationMin * 60000) : null, createdBy: req.user._id });
  flash(req, 'success', 'Contest үүслээ. Одоо бодлогуудаа нэмнэ үү.');
  res.redirect('/coding/contests/' + c._id);
});

router.get('/:id/edit', adminOnly, loadContest, (req, res) => {
  if (req.state === 'finalized') return res.redirect('/coding/contests/' + req.contest._id);
  renderForm(res, req.contest);
});

router.post('/:id', adminOnly, loadContest, async (req, res) => {
  const c = req.contest;
  if (req.state === 'finalized') return res.redirect('/coding/contests/' + c._id);
  const { errors, data } = parseContest(req);
  const allowed = new Set((await codingClasses()).map((x) => String(x._id)));
  data.classIds = data.classIds.filter((id) => allowed.has(String(id)));
  if (!data.classIds.length) errors.push('Оролцох ангиа сонгоно уу (Coding нээгдсэн анги).');
  if (errors.length) return renderForm(res, { ...data, _id: c._id }, errors, 400);
  // Эхэлсэн contest-ийн эхлэх цагийг өөрчлөхгүй — зөвхөн үргэлжлэх хугацаа (дуусах цаг) шинэчлэгдэнэ
  if (['running', 'ended'].includes(req.state)) data.startAt = c.startAt;
  Object.assign(c, data, { endAt: data.startAt ? new Date(+data.startAt + data.durationMin * 60000) : null });
  await c.save();
  flash(req, 'success', 'Contest хадгалагдлаа.');
  res.redirect('/coding/contests/' + c._id);
});

// ---------------- Харах ----------------
router.get('/:id', loadContest, async (req, res) => {
  const c = req.contest.toObject();
  const u = req.user;
  const staff = !!u.codingStaff;
  const state = req.state;
  const showProblems = staff || ['running', 'ended', 'finalized'].includes(state);
  const problems = showProblems ? await contestProblems(c._id) : [];
  const { rows, maxScore } = showProblems ? await contestStandings(c, problems) : { rows: [], maxScore: 0 };
  const results = state === 'finalized' ? await ContestResult.find({ contest: c._id }).lean() : [];
  const resultMap = new Map(results.map((r) => [String(r.user), r]));
  // Дүн гараагүй үед админд урьдчилсан ranking оноо
  const preview = isAdmin(u) && state !== 'finalized' ? new Map(ratingChanges(c, rows, maxScore).map((ch) => [String(ch.row.student._id), ch])) : new Map();
  const shown = rows.filter((r) => r.participated || staff);
  const me = rows.find((r) => String(r.student._id) === String(u._id)) || null;
  const pending = isAdmin(u) && state === 'ended' && problems.length
    ? await CodeSubmission.countDocuments({ problem: { $in: problems.map((p) => p._id) }, status: { $in: ['queued', 'running'] } })
    : 0;
  const classes = await Class.find({ _id: { $in: c.classIds } }).collation({ locale: 'mn' }).sort({ name: 1 }).select('name').lean();
  res.render('contests/show', {
    title: c.title,
    contest: c,
    state,
    STATES,
    problems: problems.map((p) => ({ ...p, diff: difficultyOf(p.difficulty), mine: me ? me.cells[problems.indexOf(p)] : null })),
    rows: shown.map((r) => ({ ...r, result: resultMap.get(String(r.student._id)) || null, preview: preview.get(String(r.student._id)) || null })),
    maxScore,
    me,
    myResult: me ? resultMap.get(String(u._id)) || null : null,
    staff,
    admin: isAdmin(u),
    classNames: classes.map((x) => x.name),
    pending,
    drafts: isAdmin(u) && state !== 'finalized'
      ? await Problem.find({ topic: null, contest: null, published: false }).select('title difficulty testCount').sort({ createdAt: -1 }).limit(50).lean()
      : [],
    tierFor,
    PLACE_BONUS,
    CONTEST_MAX_GAIN,
    PLACEMENT: PLACEMENT.map((p) => ({ ...p, tier: tierByKey(p.tier) })),
  });
});

// ---------------- Удирдах (админ) ----------------
router.post('/:id/start', adminOnly, loadContest, async (req, res) => {
  const c = req.contest;
  if (!['draft', 'scheduled'].includes(req.state)) return res.redirect('/coding/contests/' + c._id);
  const problems = await contestProblems(c._id);
  const bad = problems.filter((p) => !p.testCount || !String(p.statement || '').trim());
  if (!problems.length || bad.length) {
    flash(req, 'error', !problems.length ? 'Contest-д бодлого нэмнэ үү.' : `Тест эсвэл өгүүлбэргүй бодлого: ${bad.map((p) => p.letter + '. ' + p.title).join(', ')}`);
    return res.redirect('/coding/contests/' + c._id);
  }
  const now = new Date();
  c.startAt = now;
  c.endAt = new Date(+now + c.durationMin * 60000);
  await c.save();
  flash(req, 'success', `Contest эхэллээ! ${c.durationMin} минутын дараа дуусна.`);
  res.redirect('/coding/contests/' + c._id);
});

router.post('/:id/end', adminOnly, loadContest, async (req, res) => {
  const c = req.contest;
  if (req.state === 'running') {
    c.endAt = new Date();
    await c.save();
    flash(req, 'success', 'Contest дууслаа. Дүнгээ шалгаад баталгаажуулна уу.');
  }
  res.redirect('/coding/contests/' + c._id);
});

router.post('/:id/finalize', adminOnly, loadContest, async (req, res) => {
  const c = req.contest;
  if (req.state !== 'ended') return res.redirect('/coding/contests/' + c._id);
  const r = await finalizeContest(c._id);
  flash(req, r ? 'success' : 'error', r ? `Дүн баталгаажлаа. ${r.changes.length} сурагчид ranking оноо олголоо.` : 'Дүнг баталгаажуулж чадсангүй (аль хэдийн баталгаажсан байж магадгүй).');
  res.redirect('/coding/contests/' + c._id);
});

// Хуурсан сурагчийг хасах / буцаах (дүн гарахаас өмнө)
router.post('/:id/exclude/:uid', adminOnly, loadContest, async (req, res) => {
  const c = req.contest;
  if (req.state !== 'finalized' && isId(req.params.uid)) {
    const has = c.excluded.some((id) => String(id) === req.params.uid);
    await Contest.updateOne({ _id: c._id }, has ? { $pull: { excluded: req.params.uid } } : { $addToSet: { excluded: req.params.uid } });
    flash(req, 'success', has ? 'Сурагчийг буцааж нэмлээ.' : 'Сурагчийг дүнгээс хаслаа — ranking оноо авахгүй.');
  }
  res.redirect('/coding/contests/' + c._id + '#standings');
});

// Ноорог бодлогыг contest-д нэмэх / хасах (эхлэхээс өмнө)
router.post('/:id/problems/attach', adminOnly, loadContest, async (req, res) => {
  const c = req.contest;
  if (['draft', 'scheduled'].includes(req.state) && isId(req.body.problem)) {
    const r = await Problem.updateOne({ _id: req.body.problem, topic: null, contest: null, published: false }, { $set: { contest: c._id, startAt: null, endAt: null } });
    flash(req, r.modifiedCount ? 'success' : 'error', r.modifiedCount ? 'Бодлого нэмэгдлээ.' : 'Бодлогыг нэмж чадсангүй.');
  }
  res.redirect('/coding/contests/' + c._id);
});

router.post('/:id/problems/:pid/detach', adminOnly, loadContest, async (req, res) => {
  const c = req.contest;
  if (['draft', 'scheduled'].includes(req.state) && isId(req.params.pid)) {
    await Problem.updateOne({ _id: req.params.pid, contest: c._id }, { $set: { contest: null, published: false } });
    flash(req, 'success', 'Бодлогыг contest-оос хаслаа (ноорог болж үндсэн жагсаалтад шилжлээ).');
  }
  res.redirect('/coding/contests/' + c._id);
});

router.post('/:id/delete', adminOnly, loadContest, async (req, res) => {
  const c = req.contest;
  if (req.state === 'finalized') {
    flash(req, 'error', 'Дүн гарсан contest-ийг устгах боломжгүй (ranking оноо олгогдсон).');
    return res.redirect('/coding/contests/' + c._id);
  }
  const r = await Problem.updateMany({ contest: c._id }, { $set: { contest: null, published: false } });
  await Contest.deleteOne({ _id: c._id });
  flash(req, 'success', `"${c.title}" устгагдлаа.${r.modifiedCount ? ` ${r.modifiedCount} бодлого ноорог болж үндсэн жагсаалтад шилжлээ.` : ''}`);
  res.redirect('/coding/contests');
});

module.exports = router;
