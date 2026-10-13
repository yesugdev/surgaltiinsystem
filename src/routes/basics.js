// 🧱 Програмчлалын суурь: roadmap хичээлүүд (онол + хялбар бодлого) — бүх сурагчид, анги бүрээр нээнэ.
// Удирдах: админ, мэдээлэл зүйн багш. Хичээл = CpTopic (track: 'basics'), бодлого = Problem.topic.
const express = require('express');
const { Class, User, Problem, CodeSubmission, CpTopic, LessonView } = require('../models');
const { requireRole, flash } = require('../middleware/auth');
const { isId, clean } = require('../helpers');
const { problemOwnerFilter } = require('../access');
const { BASICS_TRACK, lessonOpenFor } = require('../basics');
const { difficultyOf } = require('../coding-ranks');
const md = require('../markdown');
const files = require('../files');

const router = express.Router();
router.use(requireRole());

const notFound = (res, what = 'Хуудас') => res.status(404).render('error', { title: 'Олдсонгүй', message: `${what} олдсонгүй.` });
const isStaff = (u) => !!u.codingStaff;
router.use((req, res, next) => (req.user.basicsAccess ? next() : notFound(res)));
const staffOnly = (req, res, next) => (isStaff(req.user) ? next() : notFound(res));

async function loadLesson(req, res, next) {
  const lesson = isId(req.params.id) ? await CpTopic.findOne({ _id: req.params.id, ...BASICS_TRACK }) : null;
  if (!lesson || !lessonOpenFor(req.user, lesson)) return notFound(res, 'Хичээл');
  req.lesson = lesson;
  next();
}

/** Хичээлүүдийн нийтлэгдсэн бодлого: [{ _id, topic }] */
const lessonProblems = (lessonIds, staff) => Problem.find({ topic: { $in: lessonIds }, ...(staff ? {} : { published: true }) }).select('topic published').lean();

/** Хэрэглэгч бүрийн бүтэн бодсон бодлогууд: Map(userId → Set(problemId)) */
async function solvedBy(userIds, problemIds) {
  const rows = await CodeSubmission.aggregate([
    { $match: { user: { $in: userIds }, problem: { $in: problemIds }, status: 'done', verdict: 'AC' } },
    { $group: { _id: { u: '$user', p: '$problem' } } },
  ]);
  const map = new Map();
  for (const r of rows) {
    const k = String(r._id.u);
    if (!map.has(k)) map.set(k, new Set());
    map.get(k).add(String(r._id.p));
  }
  return map;
}

// ---------------- Roadmap ----------------
router.get('/', async (req, res) => {
  const staff = isStaff(req.user);
  const lessons = await CpTopic.find(staff ? BASICS_TRACK : { ...BASICS_TRACK, published: true }).select('-theory -attachments').sort({ order: 1, createdAt: 1 }).lean();
  const problems = await lessonProblems(lessons.map((l) => l._id), false);
  const solved = (await solvedBy([req.user._id], problems.map((p) => p._id))).get(String(req.user._id)) || new Set();
  const viewed = new Set((await LessonView.find({ user: req.user._id }).select('topic').lean()).map((v) => String(v.topic)));
  const classCount = staff ? await Class.countDocuments() : 0;
  const items = lessons.map((l, i) => {
    const ps = problems.filter((p) => String(p.topic) === String(l._id));
    return {
      ...l,
      n: i + 1,
      open: lessonOpenFor(req.user, l),
      viewed: viewed.has(String(l._id)),
      total: ps.length,
      solved: ps.filter((p) => solved.has(String(p._id))).length,
      classes: (l.classIds || []).length,
    };
  });
  const open = items.filter((l) => l.open);
  res.render('basics/index', {
    title: 'Програмчлалын суурь',
    lessons: items,
    staff,
    classCount,
    stats: {
      open: open.length,
      viewed: open.filter((l) => l.viewed).length,
      total: open.reduce((a, l) => a + l.total, 0),
      solved: open.reduce((a, l) => a + l.solved, 0),
    },
  });
});

// ---------------- Хичээл ----------------
function parseLesson(req) {
  const title = clean(req.body.title, 200);
  return {
    errors: title ? [] : ['Хичээлийн нэрийг оруулна уу.'],
    data: {
      title,
      icon: clean(req.body.icon, 16) || '📘',
      summary: clean(req.body.summary, 500),
      theory: String(req.body.theory ?? '').slice(0, 300000),
      published: req.body.published === 'on',
    },
  };
}

const formLocals = { base: '/basics/lessons', home: '/basics', homeLabel: 'Програмчлалын суурь', basics: true, SECTIONS: [] };

router.get('/lessons/new', staffOnly, (req, res) => {
  res.render('cp/topic-form', { ...formLocals, title: 'Шинэ хичээл', topic: { icon: '📘', published: true, theory: '' }, theoryHtml: '', errors: [] });
});

router.post('/lessons', staffOnly, async (req, res) => {
  const { errors, data } = parseLesson(req);
  if (errors.length) return res.status(400).render('cp/topic-form', { ...formLocals, title: 'Шинэ хичээл', topic: data, theoryHtml: md.render(data.theory), errors });
  const last = await CpTopic.findOne(BASICS_TRACK).sort({ order: -1 }).select('order').lean();
  const lesson = await CpTopic.create({ ...data, track: 'basics', classIds: [], order: (last?.order || 0) + 10, createdBy: req.user._id });
  flash(req, 'success', 'Хичээл үүслээ. «Анги бүрээр нээх» хэсгээс ангидаа нээгээрэй.');
  res.redirect('/basics/lessons/' + lesson._id);
});

router.get('/lessons/:id', loadLesson, async (req, res) => {
  const l = req.lesson;
  const staff = isStaff(req.user);
  let firstView = false;
  if (!staff) {
    const r = await LessonView.updateOne({ user: req.user._id, topic: l._id }, { $setOnInsert: { viewedAt: new Date() } }, { upsert: true });
    firstView = r.upsertedCount > 0;
  }
  const problems = await Problem.find({ topic: l._id, ...(staff ? {} : { published: true }) })
    .select('title difficulty published testCount createdBy createdAt').sort({ createdAt: 1 }).lean();
  const solved = (await solvedBy([req.user._id], problems.map((p) => p._id))).get(String(req.user._id)) || new Set();
  const mine = staff ? new Set((await Problem.find({ ...problemOwnerFilter(req.user), topic: l._id }).select('_id').lean()).map((p) => String(p._id))) : new Set();
  const all = (await CpTopic.find(staff ? BASICS_TRACK : { ...BASICS_TRACK, published: true }).select('title icon order published classIds').sort({ order: 1, createdAt: 1 }).lean())
    .filter((x) => lessonOpenFor(req.user, x));
  const idx = all.findIndex((x) => String(x._id) === String(l._id));
  const theoryHtml = md.render(l.theory);
  res.render('basics/lesson', {
    title: l.title,
    lesson: l,
    n: idx + 1,
    theoryHtml,
    toc: md.toc(theoryHtml),
    problems: problems.map((p, i) => ({ ...p, n: i + 1, solved: solved.has(String(p._id)), diff: difficultyOf(p.difficulty), canEdit: mine.has(String(p._id)) })),
    staff,
    firstView,
    openClasses: staff ? await Class.find({ _id: { $in: l.classIds } }).collation({ locale: 'mn' }).sort({ name: 1 }).select('name').lean() : [],
    viewers: staff ? await LessonView.countDocuments({ topic: l._id }) : 0,
    prev: all[idx - 1] || null,
    next: all[idx + 1] || null,
  });
});

router.get('/lessons/:id/edit', staffOnly, loadLesson, (req, res) => {
  res.render('cp/topic-form', { ...formLocals, title: 'Хичээл засах', topic: req.lesson, theoryHtml: md.render(req.lesson.theory), errors: [] });
});

router.post('/lessons/:id', staffOnly, loadLesson, async (req, res) => {
  const { errors, data } = parseLesson(req);
  if (errors.length) {
    return res.status(400).render('cp/topic-form', { ...formLocals, title: 'Хичээл засах', topic: { ...data, _id: req.lesson._id }, theoryHtml: md.render(data.theory), errors });
  }
  Object.assign(req.lesson, data);
  await req.lesson.save();
  flash(req, 'success', 'Хичээл хадгалагдлаа.');
  res.redirect('/basics/lessons/' + req.lesson._id);
});

router.post('/lessons/:id/move', staffOnly, loadLesson, async (req, res) => {
  const all = await CpTopic.find(BASICS_TRACK).sort({ order: 1, createdAt: 1 });
  const i = all.findIndex((x) => x._id.equals(req.lesson._id));
  const j = req.body.dir === 'up' ? i - 1 : i + 1;
  if (j >= 0 && j < all.length) {
    [all[i], all[j]] = [all[j], all[i]];
    for (const [k, t] of all.entries()) if (t.order !== (k + 1) * 10) await CpTopic.updateOne({ _id: t._id }, { order: (k + 1) * 10 });
  }
  res.redirect('/basics#lesson-' + req.lesson._id);
});

router.post('/lessons/:id/delete', staffOnly, loadLesson, async (req, res) => {
  // Бодлогуудыг устгахгүй — хичээлгүй ноорог болгоно (үндсэн тэмцээнд санамсаргүй орохгүй)
  const r = await Problem.updateMany({ topic: req.lesson._id }, { $set: { topic: null, published: false } });
  await files.deleteFiles(req.lesson.attachments.map((a) => a.fileId));
  await LessonView.deleteMany({ topic: req.lesson._id });
  await CpTopic.deleteOne({ _id: req.lesson._id });
  flash(req, 'success', `"${req.lesson.title}" хичээл устгагдлаа.${r.modifiedCount ? ` ${r.modifiedCount} бодлого ноорог болж Өрсөлдөөнт Coding-ийн жагсаалтад шилжлээ.` : ''}`);
  res.redirect('/basics');
});

router.post('/lessons/:id/attachments', staffOnly, loadLesson, files.uploader('files', 5), async (req, res) => {
  const err = req.uploadError || (!req.files.length ? 'Зураг сонгоно уу.' : null)
    || (req.files.some((f) => !files.typeFor(f.originalname)?.startsWith('image/')) ? 'Зөвхөн зураг (JPG, PNG, GIF, WEBP) оруулна.' : null)
    || (req.lesson.attachments.length + req.files.length > 40 ? 'Нэг хичээлд хамгийн ихдээ 40 зураг.' : null);
  if (err) return res.status(400).json({ error: err });
  const saved = await files.saveFiles(req.files, { kind: 'cptopic', topicId: req.lesson._id, uploadedBy: req.user._id });
  req.lesson.attachments.push(...saved);
  await req.lesson.save();
  res.json({ files: saved.map((f) => ({ url: '/files/' + f.fileId, name: f.name })) });
});

// ---------------- Анги бүрээр нээх ----------------
router.get('/classes', staffOnly, async (req, res) => {
  const [classes, lessons] = await Promise.all([
    Class.find().collation({ locale: 'mn' }).sort({ name: 1 }).select('name').lean(),
    CpTopic.find(BASICS_TRACK).select('title icon published classIds order').sort({ order: 1, createdAt: 1 }).lean(),
  ]);
  const open = new Set(lessons.flatMap((l) => (l.classIds || []).map((c) => `${l._id}:${c}`)));
  res.render('basics/classes', { title: 'Анги бүрээр нээх', classes, lessons, open });
});

router.post('/classes', staffOnly, async (req, res) => {
  const picked = [].concat(req.body.open || []).map(String);
  const [classes, lessons] = await Promise.all([Class.find().select('_id').lean(), CpTopic.find(BASICS_TRACK).select('_id classIds')]);
  const classIds = new Set(classes.map((c) => String(c._id)));
  let changed = 0;
  for (const l of lessons) {
    const next = picked.filter((v) => v.startsWith(l._id + ':')).map((v) => v.split(':')[1]).filter((c) => classIds.has(c));
    const cur = (l.classIds || []).map(String);
    if (next.length !== cur.length || next.some((c) => !cur.includes(c))) {
      l.classIds = next;
      await l.save();
      changed++;
    }
  }
  flash(req, 'success', changed ? `${changed} хичээлийн нээлттэй ангиудыг шинэчиллээ.` : 'Өөрчлөлт алга.');
  res.redirect('/basics/classes');
});

// ---------------- Сурагчдын явц ----------------
router.get('/progress', staffOnly, async (req, res) => {
  const classes = await Class.find().collation({ locale: 'mn' }).sort({ name: 1 }).select('name').lean();
  const classId = isId(req.query.class) ? req.query.class : classes[0] ? String(classes[0]._id) : '';
  const lessons = classId
    ? await CpTopic.find({ ...BASICS_TRACK, classIds: classId }).select('title icon order').sort({ order: 1, createdAt: 1 }).lean()
    : [];
  const students = classId
    ? await User.find({ role: 'student', classId, active: { $ne: false } }).select('fullName username').collation({ locale: 'mn' }).sort({ fullName: 1 }).lean()
    : [];
  const problems = await lessonProblems(lessons.map((l) => l._id), false);
  const [views, solved] = await Promise.all([
    LessonView.find({ user: { $in: students.map((s) => s._id) }, topic: { $in: lessons.map((l) => l._id) } }).select('user topic').lean(),
    solvedBy(students.map((s) => s._id), problems.map((p) => p._id)),
  ]);
  const viewed = new Set(views.map((v) => `${v.user}:${v.topic}`));
  const byLesson = new Map(lessons.map((l) => [String(l._id), problems.filter((p) => String(p.topic) === String(l._id)).map((p) => String(p._id))]));
  const rows = students.map((s) => {
    const mySolved = solved.get(String(s._id)) || new Set();
    const cells = lessons.map((l) => {
      const ids = byLesson.get(String(l._id));
      return { viewed: viewed.has(`${s._id}:${l._id}`), solved: ids.filter((id) => mySolved.has(id)).length, total: ids.length };
    });
    return { ...s, cells, viewedCount: cells.filter((c) => c.viewed).length, solvedCount: cells.reduce((a, c) => a + c.solved, 0) };
  });
  res.render('basics/progress', { title: 'Програмчлалын суурь — явц', classes, classId, lessons, rows, totalProblems: problems.length });
});

module.exports = router;
