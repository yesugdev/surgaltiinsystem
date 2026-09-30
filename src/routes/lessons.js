const express = require('express');
const { Subject, Class, User, Lesson, Submission } = require('../models');
const { requireRole, flash } = require('../middleware/auth');
const { clean, isId, toArray, parseInputDate, fmtScore, fmtDate } = require('../helpers');
const { ownerFilter, allowedSubjects, formSubjects, visibleSubjects, canUseAI, requireAI } = require('../access');
const { buildLessonPrompt } = require('../ai-prompt');
const md = require('../markdown');
const files = require('../files');
const QuestionParser = require('../../public/question-parser');
const LessonParser = require('../../public/lesson-parser');
const { parseQuestionsJson, toQuestionsJson } = require('../questions');

const router = express.Router();
router.use(requireRole('admin', 'teacher'));

const notFound = (res, what = 'Хичээл') => res.status(404).render('error', { title: 'Олдсонгүй', message: `${what} олдсонгүй.` });

async function loadLesson(req, res, next) {
  if (!isId(req.params.id)) return notFound(res);
  const lesson = await Lesson.findOne({ _id: req.params.id, ...ownerFilter(req.user) });
  if (!lesson) return notFound(res);
  req.lesson = lesson;
  next();
}

function findTask(req, res, next) {
  const task = isId(req.params.tid) ? req.lesson.tasks.id(req.params.tid) : null;
  if (!task) return notFound(res, 'Даалгавар');
  req.task = task;
  next();
}

const base = (lesson) => '/lessons/' + lesson._id;

/** Хичээлд оноогдсон ангийн сурагчид + (анги сольсон ч) илгээлттэй сурагчид */
async function lessonStudents(lesson, extraIds = []) {
  const students = await User.find({
    role: 'student',
    $or: [{ classId: { $in: lesson.classIds } }, { _id: { $in: extraIds } }],
  }).lean();
  const classes = await Class.find({ _id: { $in: students.map((s) => s.classId).filter(Boolean) } }).lean();
  const classMap = new Map(classes.map((c) => [String(c._id), c.name]));
  for (const s of students) s.className = classMap.get(String(s.classId)) || '—';
  students.sort((a, b) => a.className.localeCompare(b.className, 'mn') || a.fullName.localeCompare(b.fullName, 'mn'));
  return students;
}

async function removeSubmissions(filter) {
  const subs = await Submission.find(filter).select('files').lean();
  await files.deleteFiles(subs.flatMap((s) => s.files.map((f) => f.fileId)));
  await Submission.deleteMany(filter);
}

// ---------------- Markdown урьдчилан харах ----------------
router.post('/preview-md', (req, res) => {
  const html = md.render(String(req.body.text ?? '').slice(0, 300000));
  res.json({ html });
});

// ---------------- Жагсаалт ----------------
router.get('/', async (req, res) => {
  const filter = ownerFilter(req.user);
  const subjectFilter = isId(req.query.subject) ? req.query.subject : '';
  if (subjectFilter) filter.subject = subjectFilter;

  const lessons = await Lesson.find(filter).select('-theory').sort({ createdAt: -1 }).lean();
  const [classes, subjects, creators, counts] = await Promise.all([
    Class.find().select('name').lean(),
    visibleSubjects(req.user),
    User.find({ _id: { $in: lessons.map((l) => l.createdBy).filter(Boolean) } }).select('fullName').lean(),
    Submission.aggregate([
      { $match: { lesson: { $in: lessons.map((l) => l._id) }, submittedAt: { $ne: null } } },
      { $group: { _id: '$lesson', n: { $sum: 1 }, pending: { $sum: { $cond: [{ $or: ['$needsReview', { $eq: ['$score', null] }] }, 1, 0] } } } },
    ]),
  ]);
  const classMap = new Map(classes.map((c) => [String(c._id), c.name]));
  const subjectMap = new Map(subjects.map((s) => [String(s._id), s.name]));
  const creatorMap = new Map(creators.map((u) => [String(u._id), u.fullName]));
  const countMap = new Map(counts.map((c) => [String(c._id), c]));
  for (const l of lessons) {
    l.classNames = l.classIds.map((id) => classMap.get(String(id))).filter(Boolean);
    l.subjectName = l.subject ? subjectMap.get(String(l.subject)) : null;
    l.creatorName = creatorMap.get(String(l.createdBy)) || '—';
    l.quizCount = l.tasks.filter((t) => t.type === 'quiz').length;
    l.assignmentCount = l.tasks.filter((t) => t.type === 'assignment').length;
    l.submitted = countMap.get(String(l._id))?.n || 0;
    l.pending = countMap.get(String(l._id))?.pending || 0;
  }
  res.render('lessons/list', {
    title: 'Хичээл',
    lessons,
    subjects,
    subjectFilter,
    canCreate: subjects.some((s) => s.active),
  });
});

// ---------------- Үүсгэх / тохиргоо ----------------
async function parseLessonForm(req) {
  const errors = [];
  const title = clean(req.body.title, 200);
  const subjects = await formSubjects(req.user, req.lesson?.subject);
  const subject = subjects.find((s) => String(s._id) === String(req.body.subject))?._id || null;
  const requested = toArray(req.body.classIds).filter(isId);
  const classIds = (await Class.find({ _id: { $in: requested } }).select('_id').lean()).map((c) => c._id);
  if (!title) errors.push('Хичээлийн сэдвийг оруулна уу.');
  if (!subject) errors.push('Хичээлийн төрлөө сонгоно уу.');
  return { errors, data: { title, subject, classIds, description: clean(req.body.description, 2000) } };
}

async function renderLessonForm(req, res, { title, lesson, errors = [], status = 200 }) {
  const [classes, subjects] = await Promise.all([
    Class.find().sort({ name: 1 }).lean(),
    formSubjects(req.user, req.lesson?.subject),
  ]);
  res.status(status).render('lessons/form', { title, lesson, classes, subjects, errors });
}

router.get('/new', async (req, res) => {
  if (!(await allowedSubjects(req.user)).length) {
    return res.status(403).render('error', {
      title: 'Хичээлийн төрөл оноогоогүй',
      message:
        req.user.role === 'admin'
          ? 'Идэвхтэй хичээлийн төрөл алга байна. Эхлээд «Хичээлийн төрөл» цэснээс нэмнэ үү.'
          : 'Танд хичээлийн төрөл оноогоогүй тул хичээл үүсгэх боломжгүй. Админд хандана уу.',
    });
  }
  await renderLessonForm(req, res, {
    title: 'Шинэ хичээл',
    lesson: { classIds: [], subject: isId(req.query.subject) ? req.query.subject : null },
  });
});

router.post('/', async (req, res) => {
  const { errors, data } = await parseLessonForm(req);
  if (errors.length) return renderLessonForm(req, res, { title: 'Шинэ хичээл', lesson: data, errors, status: 400 });
  const lesson = await Lesson.create({ ...data, createdBy: req.user._id });
  flash(req, 'success', canUseAI(req.user)
    ? 'Хичээл үүслээ. Одоо онол, даалгавраа AI-аар нэг дор эсвэл гараар оруулна уу.'
    : 'Хичээл үүслээ. Одоо онол бичиж, тест болон даалгавар нэмнэ үү.');
  res.redirect(base(lesson));
});

router.get('/:id', loadLesson, async (req, res) => {
  const lesson = req.lesson;
  const [subject, classes, counts] = await Promise.all([
    lesson.subject ? Subject.findById(lesson.subject).lean() : null,
    Class.find({ _id: { $in: lesson.classIds } }).sort({ name: 1 }).lean(),
    Submission.aggregate([
      { $match: { lesson: lesson._id, submittedAt: { $ne: null } } },
      { $group: { _id: '$taskId', n: { $sum: 1 }, pending: { $sum: { $cond: [{ $or: ['$needsReview', { $eq: ['$score', null] }] }, 1, 0] } } } },
    ]),
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c]));
  const theoryHtml = md.render(lesson.theory);
  res.render('lessons/show', {
    title: lesson.title,
    lesson,
    subject,
    classes,
    countMap,
    theoryHtml,
    toc: md.toc(theoryHtml),
  });
});

router.get('/:id/edit', loadLesson, (req, res) => renderLessonForm(req, res, { title: 'Хичээлийн тохиргоо', lesson: req.lesson }));

router.post('/:id', loadLesson, async (req, res) => {
  const { errors, data } = await parseLessonForm(req);
  if (errors.length) {
    return renderLessonForm(req, res, { title: 'Хичээлийн тохиргоо', lesson: { ...data, _id: req.lesson._id }, errors, status: 400 });
  }
  if (req.lesson.published && !data.classIds.length) {
    flash(req, 'error', 'Нийтлэгдсэн хичээлд дор хаяж нэг анги оноосон байх ёстой.');
    return res.redirect(base(req.lesson) + '/edit');
  }
  Object.assign(req.lesson, data);
  await req.lesson.save();
  flash(req, 'success', 'Хичээлийн тохиргоо хадгалагдлаа.');
  res.redirect(base(req.lesson));
});

router.post('/:id/publish', loadLesson, async (req, res) => {
  const l = req.lesson;
  if (!l.published) {
    const missing = !l.subject
      ? 'хичээлийн төрлөө сонгоно уу'
      : !l.classIds.length
        ? 'анги сонгоно уу'
        : !l.theory.trim() && !l.tasks.length
          ? 'онол эсвэл даалгавар нэмнэ үү'
          : null;
    if (missing) {
      flash(req, 'error', `Нийтлэхийн өмнө ${missing}.`);
      return res.redirect(base(l));
    }
  }
  l.published = !l.published;
  await l.save();
  flash(req, 'success', l.published ? 'Хичээл нийтлэгдлээ. Оноогдсон ангийн сурагчдад харагдана.' : 'Хичээлийг нийтлэлээс буцаалаа.');
  res.redirect(base(l));
});

router.post('/:id/delete', loadLesson, async (req, res) => {
  await removeSubmissions({ lesson: req.lesson._id });
  await files.deleteFiles(req.lesson.attachments.map((a) => a.fileId));
  await Lesson.deleteOne({ _id: req.lesson._id });
  flash(req, 'success', `"${req.lesson.title}" хичээл устгагдлаа.`);
  res.redirect('/lessons');
});

// ---------------- Онол ----------------
router.get('/:id/theory', loadLesson, (req, res) => {
  res.render('lessons/theory', { title: 'Онол засах', lesson: req.lesson, theoryHtml: md.render(req.lesson.theory) });
});

router.post('/:id/theory', loadLesson, async (req, res) => {
  req.lesson.theory = String(req.body.theory ?? '').slice(0, 300000);
  await req.lesson.save();
  flash(req, 'success', 'Онол хадгалагдлаа.');
  res.redirect(base(req.lesson));
});

// ---------------- Хавсралт файл ----------------
router.post('/:id/attachments', loadLesson, files.uploader('files', 10), async (req, res) => {
  const back = base(req.lesson) + '#attachments';
  // Засварлагчийн «Зураг оруулах» товч хуудас ачаалахгүйгээр (fetch) дууддаг
  if ((req.get('accept') || '').includes('application/json')) {
    const err = req.uploadError || (!req.files.length ? 'Файл сонгоно уу.' : req.lesson.attachments.length + req.files.length > 30 ? 'Нэг хичээлд хамгийн ихдээ 30 хавсралт байна.' : null)
      || (req.files.some((f) => !files.typeFor(f.originalname)?.startsWith('image/')) ? 'Зөвхөн зураг (JPG, PNG, GIF, WEBP) оруулна.' : null);
    if (err) return res.status(400).json({ error: err });
    const saved = await files.saveFiles(req.files, { kind: 'lesson', lessonId: req.lesson._id, uploadedBy: req.user._id });
    req.lesson.attachments.push(...saved);
    await req.lesson.save();
    return res.json({ files: saved.map((f) => ({ url: '/files/' + f.fileId, name: f.name })) });
  }
  if (req.uploadError) {
    flash(req, 'error', req.uploadError);
    return res.redirect(back);
  }
  if (!req.files.length) {
    flash(req, 'error', 'Файл сонгоно уу.');
    return res.redirect(back);
  }
  if (req.lesson.attachments.length + req.files.length > 30) {
    flash(req, 'error', 'Нэг хичээлд хамгийн ихдээ 30 хавсралт байна.');
    return res.redirect(back);
  }
  const saved = await files.saveFiles(req.files, { kind: 'lesson', lessonId: req.lesson._id, uploadedBy: req.user._id });
  req.lesson.attachments.push(...saved);
  await req.lesson.save();
  flash(req, 'success', `${saved.length} файл хавсаргалаа.`);
  res.redirect(back);
});

router.post('/:id/attachments/:fileId/delete', loadLesson, async (req, res) => {
  const att = req.lesson.attachments.find((a) => String(a.fileId) === req.params.fileId);
  if (att) {
    req.lesson.attachments = req.lesson.attachments.filter((a) => a !== att);
    await req.lesson.save();
    await files.deleteFiles([att.fileId]);
    flash(req, 'success', `«${att.name}» устгагдлаа.`);
  }
  res.redirect(base(req.lesson) + '#attachments');
});

// ---------------- AI-аар / текстээр нэг дор оруулах ----------------
async function renderImport(req, res, { text = '', mode = 'append', errors = [], status = 200 } = {}) {
  const [subject, classes, hasSubs] = await Promise.all([
    req.lesson.subject ? Subject.findById(req.lesson.subject).lean() : null,
    Class.find({ _id: { $in: req.lesson.classIds } }).select('name').lean(),
    Submission.exists({ lesson: req.lesson._id }),
  ]);
  res.status(status).render('lessons/import', {
    title: 'Онол, даалгавар оруулах',
    lesson: req.lesson,
    text,
    mode,
    errors,
    hasSubmissions: !!hasSubs,
    prompt: buildLessonPrompt({
      subjectName: subject?.name,
      lessonTitle: req.lesson.title,
      classNames: classes.map((c) => c.name).join(', '),
    }),
    example: LessonParser.EXAMPLE,
  });
}

function taskFromParsed(t) {
  if (t.type === 'quiz') {
    return {
      type: 'quiz',
      title: t.title,
      instructions: t.instructions,
      questions: t.questions.map((q) => ({ type: q.type, text: q.text, points: q.points, options: q.options, acceptedAnswers: q.acceptedAnswers })),
    };
  }
  return { type: 'assignment', title: t.title, instructions: t.instructions, maxPoints: t.maxPoints };
}

router.get('/:id/import', requireAI, loadLesson, (req, res) => renderImport(req, res));

router.post('/:id/import', requireAI, loadLesson, async (req, res) => {
  const text = String(req.body.text ?? '').slice(0, 600000);
  const mode = req.body.mode === 'replace' ? 'replace' : 'append';
  const parsed = LessonParser.parse(text);
  const messages = parsed.errors.map((e) => (e.section ? e.section + ': ' : '') + e.message);
  const l = req.lesson;

  if (mode === 'replace' && parsed.tasks.length && (await Submission.exists({ lesson: l._id }))) {
    messages.push('Сурагчид даалгавар гүйцэтгэсэн тул даалгавруудыг солих боломжгүй. «Нэмэх» горимыг сонгоно уу.');
  }
  const totalTasks = (mode === 'replace' ? 0 : l.tasks.length) + parsed.tasks.length;
  if (totalTasks > LessonParser.MAX_TASKS) messages.push(`Нэг хичээлд хамгийн ихдээ ${LessonParser.MAX_TASKS} даалгавар байна.`);
  if (!parsed.theory && !parsed.tasks.length && !messages.length) messages.push('Оруулах агуулга олдсонгүй.');
  if (messages.length) return renderImport(req, res, { text, mode, errors: messages, status: 400 });

  if (parsed.theory) {
    l.theory = mode === 'replace' || !l.theory.trim() ? parsed.theory : l.theory.trimEnd() + '\n\n' + parsed.theory;
  }
  const newTasks = parsed.tasks.map(taskFromParsed);
  if (mode === 'replace' && newTasks.length) l.tasks = newTasks;
  else l.tasks.push(...newTasks);
  await l.save();

  const parts = [];
  if (parsed.theory) parts.push('онол');
  const nq = newTasks.filter((t) => t.type === 'quiz').length;
  const na = newTasks.length - nq;
  if (nq) parts.push(`${nq} тест`);
  if (na) parts.push(`${na} даалгавар`);
  flash(req, 'success', `Амжилттай орлоо: ${parts.join(', ')}.`);
  res.redirect(base(l));
});

// ---------------- Даалгавар ----------------
/**
 * Тест: асуултыг карт засварлагчаас (questionsJson) авна. AI эрхтэй хэрэглэгч текст форматаар
 * (questionsMode=text, questionsText) засаж болно.
 */
function parseTaskForm(body, type, allowText) {
  const errors = [];
  const data = {
    type,
    title: clean(body.title, 200),
    instructions: String(body.instructions ?? '').slice(0, 50000),
  };
  if (!data.title) errors.push('Даалгаврын нэрийг оруулна уу.');
  let questionsText = '';
  let questionsJson = '[]';
  if (type === 'quiz') {
    data.allowRetry = body.allowRetry === 'on';
    data.showAnswers = body.showAnswers === 'on';
    if (allowText && body.questionsMode === 'text') {
      questionsText = String(body.questionsText ?? '').slice(0, 300000);
      const r = QuestionParser.parse(questionsText);
      r.errors.forEach((e) => errors.push((e.question ? `${e.question}-р асуулт: ` : '') + e.message));
      data.questions = r.questions.map((q) => ({ type: q.type, text: q.text, points: q.points, options: q.options, acceptedAnswers: q.acceptedAnswers }));
      questionsJson = toQuestionsJson(data.questions);
    } else {
      // Алдаатай үед ч багшийн бичсэнийг алдахгүйн тулд ирсэн JSON-ийг буцааж өгнө
      questionsJson = String(body.questionsJson ?? '[]').slice(0, 2000000);
      const r = parseQuestionsJson(questionsJson);
      errors.push(...r.errors);
      data.questions = r.questions;
      questionsText = QuestionParser.stringify(data.questions);
    }
  } else {
    const pts = Number(body.maxPoints);
    if (!(pts >= 0.5 && pts <= 1000)) errors.push('Дээд оноо 0.5–1000 байна.');
    if (!data.instructions.trim()) errors.push('Даалгаврын зааврыг оруулна уу.');
    data.maxPoints = pts >= 0.5 ? pts : 10;
    data.dueAt = parseInputDate(body.dueAt);
    data.allowLate = body.allowLate === 'on';
  }
  return { errors, data, questionsText, questionsJson };
}

function renderTaskForm(res, { lesson, task, questionsText = '', questionsJson = '[]', questionsMode = 'visual', errors = [], locked = false, status = 200 }) {
  res.status(status).render('lessons/task-form', {
    title: task._id ? 'Даалгавар засах' : task.type === 'quiz' ? 'Тест нэмэх' : 'Даалгавар нэмэх',
    lesson,
    task,
    questionsText,
    questionsJson,
    questionsMode,
    instructionsHtml: md.render(task.instructions || ''),
    errors,
    locked,
  });
}

router.get('/:id/tasks/new', loadLesson, (req, res) => {
  const type = req.query.type === 'assignment' ? 'assignment' : 'quiz';
  const task = type === 'quiz'
    ? { type, title: '', instructions: '', allowRetry: true, showAnswers: true }
    : { type, title: '', instructions: '', maxPoints: 10, allowLate: true };
  renderTaskForm(res, { lesson: req.lesson, task });
});

router.post('/:id/tasks', loadLesson, async (req, res) => {
  const type = req.body.type === 'assignment' ? 'assignment' : 'quiz';
  const allowText = canUseAI(req.user);
  const { errors, data, questionsText, questionsJson } = parseTaskForm(req.body, type, allowText);
  if (req.lesson.tasks.length >= LessonParser.MAX_TASKS) errors.push(`Нэг хичээлд хамгийн ихдээ ${LessonParser.MAX_TASKS} даалгавар байна.`);
  if (errors.length) {
    return renderTaskForm(res, {
      lesson: req.lesson, task: data, questionsText, questionsJson,
      questionsMode: allowText && req.body.questionsMode === 'text' ? 'text' : 'visual', errors, status: 400,
    });
  }
  req.lesson.tasks.push(data);
  await req.lesson.save();
  flash(req, 'success', `«${data.title}» нэмэгдлээ.`);
  res.redirect(base(req.lesson) + '#tasks');
});

router.get('/:id/tasks/:tid/edit', loadLesson, findTask, async (req, res) => {
  const locked = req.task.type === 'quiz' && !!(await Submission.exists({ lesson: req.lesson._id, taskId: req.task._id }));
  const isQuiz = req.task.type === 'quiz';
  renderTaskForm(res, {
    lesson: req.lesson,
    task: req.task,
    questionsText: isQuiz ? QuestionParser.stringify(req.task.questions) : '',
    questionsJson: isQuiz ? toQuestionsJson(req.task.questions) : '[]',
    locked,
  });
});

router.post('/:id/tasks/:tid', loadLesson, findTask, async (req, res) => {
  const task = req.task;
  const allowText = canUseAI(req.user);
  const locked = task.type === 'quiz' && !!(await Submission.exists({ lesson: req.lesson._id, taskId: task._id }));
  // Түгжигдсэн тестэд одоогийн асуултыг хэвээр дамжуулна
  const body = locked ? { ...req.body, questionsMode: 'visual', questionsJson: toQuestionsJson(task.questions) } : req.body;
  const { errors, data, questionsText, questionsJson } = parseTaskForm(body, task.type, allowText);
  if (errors.length) {
    return renderTaskForm(res, {
      lesson: req.lesson, task: { ...data, _id: task._id }, questionsText, questionsJson,
      questionsMode: allowText && body.questionsMode === 'text' ? 'text' : 'visual', errors, locked, status: 400,
    });
  }
  if (locked) delete data.questions; // гүйцэтгэсэн сурагчийн хариулт эвдрэхгүйн тулд асуултыг хөндөхгүй
  task.set(data);
  await req.lesson.save();
  flash(req, 'success', 'Даалгавар хадгалагдлаа.');
  res.redirect(base(req.lesson) + '#tasks');
});

router.post('/:id/tasks/:tid/delete', loadLesson, findTask, async (req, res) => {
  await removeSubmissions({ lesson: req.lesson._id, taskId: req.task._id });
  req.task.deleteOne();
  await req.lesson.save();
  flash(req, 'success', 'Даалгавар болон түүний бүх гүйцэтгэл устгагдлаа.');
  res.redirect(base(req.lesson) + '#tasks');
});

router.post('/:id/tasks/:tid/move', loadLesson, findTask, async (req, res) => {
  const arr = req.lesson.tasks.map((t) => t.toObject());
  const i = arr.findIndex((t) => t._id.equals(req.task._id));
  const j = req.body.dir === 'up' ? i - 1 : i + 1;
  if (j >= 0 && j < arr.length) {
    [arr[i], arr[j]] = [arr[j], arr[i]];
    req.lesson.tasks = arr;
    await req.lesson.save();
  }
  res.redirect(base(req.lesson) + '#tasks');
});

// ---------------- Гүйцэтгэл, дүгнэх ----------------
function submissionStatus(task, sub) {
  if (!sub || !sub.submittedAt) return 'none';
  if (sub.score == null || sub.needsReview) return 'pending';
  return 'graded';
}

const STATUS_LABELS = { none: 'Илгээгээгүй', pending: 'Дүгнэх шаардлагатай', graded: 'Дүгнэсэн' };

router.get('/:id/tasks/:tid', loadLesson, findTask, async (req, res) => {
  const subs = await Submission.find({ lesson: req.lesson._id, taskId: req.task._id }).select('-answers').lean();
  const byStudent = new Map(subs.map((s) => [String(s.student), s]));
  const students = await lessonStudents(req.lesson, subs.map((s) => s.student));
  const rows = students.map((st) => {
    const sub = byStudent.get(String(st._id)) || null;
    return { student: st, sub, status: submissionStatus(req.task, sub) };
  });
  const filter = ['none', 'pending', 'graded'].includes(req.query.status) ? req.query.status : '';
  const stats = {
    total: rows.length,
    submitted: rows.filter((r) => r.status !== 'none').length,
    pending: rows.filter((r) => r.status === 'pending').length,
  };
  res.render('lessons/task-submissions', {
    title: req.task.title,
    lesson: req.lesson,
    task: req.task,
    rows: filter ? rows.filter((r) => r.status === filter) : rows,
    stats,
    filter,
    STATUS_LABELS,
  });
});

// Шалгах горим: нэг даалгаврын бүх сурагчийн ажлыг нэг хуудсанд дараалан шалгана
router.get('/:id/tasks/:tid/grade', loadLesson, findTask, async (req, res) => {
  const { lesson, task } = req;
  if (task.type !== 'assignment') return res.redirect(`${base(lesson)}/tasks/${task._id}`);
  const subs = await Submission.find({ lesson: lesson._id, taskId: task._id }).select('-answers').lean();
  const byStudent = new Map(subs.map((s) => [String(s.student), s]));
  const students = await lessonStudents(lesson, subs.map((s) => s.student));
  const rows = students.map((st) => {
    const sub = byStudent.get(String(st._id));
    return {
      name: st.fullName,
      username: st.username,
      className: st.className,
      sub: sub?.submittedAt
        ? {
            id: String(sub._id),
            submittedAt: fmtDate(sub.submittedAt),
            late: !!sub.late,
            attemptCount: sub.attemptCount || 1,
            text: sub.text || '',
            feedback: sub.feedback || '',
            score: sub.score,
            files: sub.files.map((f) => ({
              fileId: String(f.fileId),
              name: f.name,
              size: files.fmtSize(f.size),
              kind: files.viewKind(f.contentType),
            })),
          }
        : null,
    };
  });
  res.render('lessons/grade', {
    title: 'Шалгах · ' + task.title,
    lesson,
    task,
    rows,
    initial: isId(req.query.s) ? req.query.s : '',
    instructionsHtml: md.render(task.instructions),
  });
});

async function loadSubmission(req, res, next) {
  const sub = isId(req.params.sid)
    ? await Submission.findOne({ _id: req.params.sid, lesson: req.lesson._id, taskId: req.task._id })
    : null;
  if (!sub) return notFound(res, 'Гүйцэтгэл');
  req.sub = sub;
  next();
}

router.get('/:id/tasks/:tid/submissions/:sid', loadLesson, findTask, loadSubmission, async (req, res) => {
  const student = await User.findById(req.sub.student).lean();
  const cls = student?.classId ? await Class.findById(student.classId).lean() : null;
  // Дараагийн дүгнээгүй гүйцэтгэл рүү шилжих товчинд
  const next = await Submission.findOne({
    lesson: req.lesson._id,
    taskId: req.task._id,
    _id: { $ne: req.sub._id },
    submittedAt: { $ne: null },
    $or: [{ score: null }, { needsReview: true }],
  }).select('_id').lean();
  res.render('lessons/submission', {
    title: 'Гүйцэтгэл · ' + (student?.fullName || ''),
    lesson: req.lesson,
    task: req.task,
    sub: req.sub,
    student,
    cls,
    nextId: next?._id || null,
    answerMap: new Map(req.sub.answers.map((a) => [String(a.questionId), a])),
    instructionsHtml: md.render(req.task.instructions),
  });
});

router.post('/:id/tasks/:tid/submissions/:sid/grade', loadLesson, findTask, loadSubmission, async (req, res) => {
  const { task, sub } = req;
  const back = `${base(req.lesson)}/tasks/${task._id}/submissions/${sub._id}`;
  // Шалгах горим хуудас ачаалахгүйгээр (fetch) хадгалдаг — тэр үед JSON буцаана
  const wantsJson = (req.get('accept') || '').includes('application/json');
  if (task.type === 'assignment') {
    const pts = Number(req.body.score);
    if (req.body.score === '' || !(pts >= 0 && pts <= task.maxPoints)) {
      const msg = `Оноо 0–${fmtScore(task.maxPoints)} хооронд байна.`;
      if (wantsJson) return res.status(400).json({ error: msg });
      flash(req, 'error', msg);
      return res.redirect(back);
    }
    sub.score = pts;
    sub.maxScore = task.maxPoints;
  } else {
    const qMap = new Map(task.questions.map((q) => [String(q._id), q]));
    for (const ans of sub.answers) {
      const q = qMap.get(String(ans.questionId));
      const raw = req.body['points_' + ans.questionId];
      if (!q || raw === undefined || raw === '') continue;
      ans.points = Math.min(Math.max(Number(raw) || 0, 0), q.points);
      ans.isCorrect = ans.points >= q.points;
    }
    sub.score = sub.answers.reduce((s, a) => s + a.points, 0);
  }
  sub.needsReview = false;
  sub.feedback = clean(req.body.feedback, 5000);
  sub.gradedBy = req.user._id;
  sub.gradedAt = new Date();
  await sub.save();
  if (wantsJson) return res.json({ ok: true, score: sub.score, maxScore: sub.maxScore, feedback: sub.feedback });
  flash(req, 'success', 'Дүн хадгалагдлаа.');
  res.redirect(req.body.next && isId(req.body.next) ? `${base(req.lesson)}/tasks/${task._id}/submissions/${req.body.next}` : back);
});

// Сурагчийг дахин гүйцэтгэх боломжтой болгох
router.post('/:id/tasks/:tid/submissions/:sid/delete', loadLesson, findTask, loadSubmission, async (req, res) => {
  await removeSubmissions({ _id: req.sub._id });
  flash(req, 'success', 'Гүйцэтгэлийг устгалаа. Сурагч дахин гүйцэтгэх боломжтой.');
  res.redirect(`${base(req.lesson)}/tasks/${req.task._id}`);
});

// ---------------- Дүнгийн хүснэгт ----------------
async function buildGradebook(lesson) {
  const subs = await Submission.find({ lesson: lesson._id }).select('student taskId score maxScore needsReview submittedAt late').lean();
  const students = await lessonStudents(lesson, subs.map((s) => s.student));
  const map = new Map(subs.map((s) => [String(s.student) + ':' + String(s.taskId), s]));
  const tasks = lesson.tasks.map((t) => ({ _id: t._id, title: t.title, type: t.type, total: t.type === 'quiz' ? t.questions.reduce((s, q) => s + q.points, 0) : t.maxPoints }));
  const maxTotal = tasks.reduce((s, t) => s + t.total, 0);
  const rows = students.map((st) => {
    let sum = 0;
    let done = 0;
    const cells = tasks.map((t) => {
      const sub = map.get(String(st._id) + ':' + String(t._id)) || null;
      if (sub?.submittedAt) done++;
      if (sub?.score != null) sum += sub.score;
      return { task: t, sub, status: submissionStatus(t, sub) };
    });
    return { student: st, cells, sum, done, pct: maxTotal ? (sum / maxTotal) * 100 : null };
  });
  return { tasks, rows, maxTotal };
}

router.get('/:id/grades', loadLesson, async (req, res) => {
  const gb = await buildGradebook(req.lesson);
  res.render('lessons/grades', { title: 'Дүн · ' + req.lesson.title, lesson: req.lesson, ...gb });
});

router.get('/:id/grades.csv', loadLesson, async (req, res) => {
  const { tasks, rows, maxTotal } = await buildGradebook(req.lesson);
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [['Анги', 'Сурагч', 'Нэвтрэх нэр', ...tasks.map((t) => `${t.title} (${fmtScore(t.total)})`), `Нийт (${fmtScore(maxTotal)})`, 'Хувь']];
  for (const r of rows) {
    lines.push([
      r.student.className,
      r.student.fullName,
      r.student.username,
      ...r.cells.map((c) => (c.sub?.score != null ? fmtScore(c.sub.score) : c.status === 'pending' ? 'шалгаагүй' : '')),
      fmtScore(r.sum),
      r.pct == null ? '' : fmtScore(r.pct),
    ]);
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="lesson-${req.lesson._id}-grades.csv"`);
  res.send('﻿' + lines.map((l) => l.map(esc).join(',')).join('\r\n'));
});

module.exports = router;
