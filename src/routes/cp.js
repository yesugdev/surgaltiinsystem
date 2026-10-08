// 🎯 Гүнзгий бэлтгэл (competitive programming): сэдэв = онол + бодлогууд
// Сурагч: админ сонгосон эсвэл Програмист зэрэглэлд хүрсэн. Удирдах: админ, мэдээлэл зүйн багш.
const express = require('express');
const { Class, User, Problem, CodeSubmission, CpTopic } = require('../models');
const { requireRole, flash } = require('../middleware/auth');
const { isId, clean, escapeRegex } = require('../helpers');
const { problemOwnerFilter } = require('../access');
const { SECTIONS, sectionOf, cpAccess, CP_UNLOCK_LEVEL } = require('../cp');
const { TIERS, difficultyOf } = require('../coding-ranks');
const md = require('../markdown');
const files = require('../files');

const router = express.Router();
router.use(requireRole());

const notFound = (res, what = 'Хуудас') => res.status(404).render('error', { title: 'Олдсонгүй', message: `${what} олдсонгүй.` });
const isStaff = (u) => !!u.codingStaff;
router.use((req, res, next) => (cpAccess(req.user) ? next() : notFound(res)));
const staffOnly = (req, res, next) => (isStaff(req.user) ? next() : notFound(res));

async function loadTopic(req, res, next) {
  if (!isId(req.params.id)) return notFound(res, 'Сэдэв');
  const topic = await CpTopic.findOne(isStaff(req.user) ? { _id: req.params.id } : { _id: req.params.id, published: true });
  if (!topic) return notFound(res, 'Сэдэв');
  req.topic = topic;
  next();
}

/** Сэдэв бүрийн бодлого (сурагчид — нийтлэгдсэн) */
function topicProblemFilter(user, topicIds) {
  const f = { topic: { $in: topicIds } };
  return isStaff(user) ? f : { ...f, published: true };
}

/** Хэрэглэгчийн бүтэн бодсон бодлогууд */
async function solvedSet(userId, problemIds) {
  const ids = await CodeSubmission.distinct('problem', { user: userId, problem: { $in: problemIds }, status: 'done', verdict: 'AC' });
  return new Set(ids.map(String));
}

// ---------------- Сэдвүүдийн жагсаалт ----------------
router.get('/', async (req, res) => {
  const staff = isStaff(req.user);
  const topics = await CpTopic.find(staff ? {} : { published: true }).select('-theory -attachments').sort({ order: 1, createdAt: 1 }).lean();
  const problems = await Problem.find(topicProblemFilter(req.user, topics.map((t) => t._id))).select('topic published').lean();
  const solved = await solvedSet(req.user._id, problems.map((p) => p._id));
  const byTopic = new Map();
  for (const p of problems) {
    const k = String(p.topic);
    if (!byTopic.has(k)) byTopic.set(k, { total: 0, solved: 0, drafts: 0 });
    const s = byTopic.get(k);
    if (p.published) s.total++;
    else s.drafts++;
    if (solved.has(String(p._id))) s.solved++;
  }
  const sections = SECTIONS.map((sec) => ({
    ...sec,
    topics: topics.filter((t) => sectionOf(t.section).key === sec.key).map((t) => ({ ...t, stat: byTopic.get(String(t._id)) || { total: 0, solved: 0, drafts: 0 } })),
  })).filter((sec) => sec.topics.length);
  const totals = [...byTopic.values()].reduce((a, s) => ({ total: a.total + s.total, solved: a.solved + s.solved }), { total: 0, solved: 0 });
  res.render('cp/index', {
    title: 'Гүнзгий бэлтгэл',
    sections,
    totals,
    staff,
    selectedCount: staff ? await User.countDocuments({ role: 'student', $or: [{ cpSelected: true }, { cpRankUnlocked: true }] }) : 0,
    unlockTier: TIERS[CP_UNLOCK_LEVEL - 1],
  });
});

// ---------------- Сэдэв (онол + бодлогууд) ----------------
router.get('/topics/new', staffOnly, (req, res) => {
  res.render('cp/topic-form', {
    title: 'Шинэ сэдэв',
    topic: { section: SECTIONS.some((s) => s.key === req.query.section) ? req.query.section : 'basics', icon: '📘', published: true, theory: '' },
    theoryHtml: '',
    SECTIONS,
    errors: [],
  });
});

function parseTopic(req) {
  const title = clean(req.body.title, 200);
  return {
    errors: title ? [] : ['Сэдвийн нэрийг оруулна уу.'],
    data: {
      title,
      section: SECTIONS.some((s) => s.key === req.body.section) ? req.body.section : 'basics',
      icon: clean(req.body.icon, 16) || '📘',
      summary: clean(req.body.summary, 500),
      theory: String(req.body.theory ?? '').slice(0, 300000),
      published: req.body.published === 'on',
    },
  };
}

router.post('/topics', staffOnly, async (req, res) => {
  const { errors, data } = parseTopic(req);
  if (errors.length) return res.status(400).render('cp/topic-form', { title: 'Шинэ сэдэв', topic: data, theoryHtml: md.render(data.theory), SECTIONS, errors });
  const last = await CpTopic.findOne().sort({ order: -1 }).select('order').lean();
  const topic = await CpTopic.create({ ...data, order: (last?.order || 0) + 10, createdBy: req.user._id });
  flash(req, 'success', 'Сэдэв үүслээ. Одоо бодлого нэмнэ үү.');
  res.redirect('/cp/topics/' + topic._id);
});

router.get('/topics/:id', loadTopic, async (req, res) => {
  const t = req.topic;
  const staff = isStaff(req.user);
  const problems = await Problem.find(topicProblemFilter(req.user, [t._id]))
    .select('title difficulty published testCount timeLimitMs createdBy createdAt').sort({ createdAt: 1 }).lean();
  const solved = await solvedSet(req.user._id, problems.map((p) => p._id));
  // Багш зөвхөн өөрийн бодлогыг засна (админ бүгдийг)
  const mine = staff ? new Set((await Problem.find({ ...problemOwnerFilter(req.user), topic: t._id }).select('_id').lean()).map((p) => String(p._id))) : new Set();
  const theoryHtml = md.render(t.theory);
  const all = await CpTopic.find(staff ? {} : { published: true }).select('title icon order').sort({ order: 1, createdAt: 1 }).lean();
  const idx = all.findIndex((x) => String(x._id) === String(t._id));
  res.render('cp/topic', {
    title: t.title,
    topic: t,
    section: sectionOf(t.section),
    theoryHtml,
    toc: md.toc(theoryHtml),
    problems: problems.map((p, i) => ({ ...p, n: i + 1, solved: solved.has(String(p._id)), diff: difficultyOf(p.difficulty), canEdit: mine.has(String(p._id)) })),
    staff,
    prev: all[idx - 1] || null,
    next: all[idx + 1] || null,
  });
});

router.get('/topics/:id/edit', staffOnly, loadTopic, (req, res) => {
  res.render('cp/topic-form', { title: 'Сэдэв засах', topic: req.topic, theoryHtml: md.render(req.topic.theory), SECTIONS, errors: [] });
});

router.post('/topics/:id', staffOnly, loadTopic, async (req, res) => {
  const { errors, data } = parseTopic(req);
  if (errors.length) {
    return res.status(400).render('cp/topic-form', { title: 'Сэдэв засах', topic: { ...data, _id: req.topic._id }, theoryHtml: md.render(data.theory), SECTIONS, errors });
  }
  Object.assign(req.topic, data);
  await req.topic.save();
  flash(req, 'success', 'Сэдэв хадгалагдлаа.');
  res.redirect('/cp/topics/' + req.topic._id);
});

// Дарааллыг солих (дээш / доош)
router.post('/topics/:id/move', staffOnly, loadTopic, async (req, res) => {
  const all = await CpTopic.find().sort({ order: 1, createdAt: 1 });
  const i = all.findIndex((x) => x._id.equals(req.topic._id));
  const j = req.body.dir === 'up' ? i - 1 : i + 1;
  if (j >= 0 && j < all.length) {
    [all[i], all[j]] = [all[j], all[i]];
    for (const [k, t] of all.entries()) if (t.order !== (k + 1) * 10) await CpTopic.updateOne({ _id: t._id }, { order: (k + 1) * 10 });
  }
  res.redirect('/cp#topic-' + req.topic._id);
});

router.post('/topics/:id/delete', staffOnly, loadTopic, async (req, res) => {
  // Бодлогуудыг устгахгүй — сэдэвгүй ноорог болгоно (үндсэн тэмцээнд санамсаргүй орохгүй)
  const r = await Problem.updateMany({ topic: req.topic._id }, { $set: { topic: null, published: false } });
  await files.deleteFiles(req.topic.attachments.map((a) => a.fileId));
  await CpTopic.deleteOne({ _id: req.topic._id });
  flash(req, 'success', `"${req.topic.title}" сэдэв устгагдлаа.${r.modifiedCount ? ` ${r.modifiedCount} бодлого ноорог болж Өрсөлдөөнт Coding-ийн жагсаалтад шилжлээ.` : ''}`);
  res.redirect('/cp');
});

// Онолд зураг оруулах (засварлагчийн «Зураг» товч)
router.post('/topics/:id/attachments', staffOnly, loadTopic, files.uploader('files', 5), async (req, res) => {
  const err = req.uploadError || (!req.files.length ? 'Зураг сонгоно уу.' : null)
    || (req.files.some((f) => !files.typeFor(f.originalname)?.startsWith('image/')) ? 'Зөвхөн зураг (JPG, PNG, GIF, WEBP) оруулна.' : null)
    || (req.topic.attachments.length + req.files.length > 40 ? 'Нэг сэдэвт хамгийн ихдээ 40 зураг.' : null);
  if (err) return res.status(400).json({ error: err });
  const saved = await files.saveFiles(req.files, { kind: 'cptopic', topicId: req.topic._id, uploadedBy: req.user._id });
  req.topic.attachments.push(...saved);
  await req.topic.save();
  res.json({ files: saved.map((f) => ({ url: '/files/' + f.fileId, name: f.name })) });
});

// ---------------- Сурагч сонгох (админ, мэдээлэл зүйн багш) ----------------
router.get('/students', staffOnly, async (req, res) => {
  const classes = await Class.find().collation({ locale: 'mn' }).sort({ name: 1 }).lean();
  const filter = { role: 'student', active: { $ne: false } };
  const classId = isId(req.query.class) ? req.query.class : '';
  if (classId) filter.classId = classId;
  const q = clean(req.query.q, 100);
  if (q) filter.$or = [{ fullName: new RegExp(escapeRegex(q), 'i') }, { username: new RegExp(escapeRegex(q), 'i') }];
  if (req.query.only === '1') filter.$and = [{ $or: [{ cpSelected: true }, { cpRankUnlocked: true }] }];
  const students = await User.find(filter).select('fullName username classId cpSelected cpRankUnlocked').collation({ locale: 'mn' }).sort({ fullName: 1 }).limit(500).lean();
  const classMap = new Map(classes.map((c) => [String(c._id), c.name]));
  res.render('cp/students', {
    title: 'Гүнзгий бэлтгэлийн сурагчид',
    students: students.map((s) => ({ ...s, className: classMap.get(String(s.classId)) || '—' })),
    classes,
    query: { class: classId, q, only: req.query.only === '1' },
    unlockTier: TIERS[CP_UNLOCK_LEVEL - 1],
  });
});

router.post('/students/:uid/toggle', staffOnly, async (req, res) => {
  const s = isId(req.params.uid) ? await User.findOne({ _id: req.params.uid, role: 'student' }) : null;
  if (!s) return notFound(res, 'Сурагч');
  s.cpSelected = !s.cpSelected;
  await s.save();
  flash(req, 'success', `${s.fullName}: ${s.cpSelected ? 'Гүнзгий бэлтгэлд нэмлээ' : 'сонголтыг цуцаллаа'}.${!s.cpSelected && s.cpRankUnlocked ? ' (Зэрэглэлээр нээгдсэн тул хандах эрх хэвээр.)' : ''}`);
  res.redirect(String(req.body.back || '').startsWith('/cp/students') ? req.body.back : '/cp/students');
});

module.exports = router;
