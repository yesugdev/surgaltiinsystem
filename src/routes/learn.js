// Сурагчийн хичээл үзэх, даалгавар гүйцэтгэх хэсэг
const express = require('express');
const { Subject, Class, Lesson, Submission } = require('../models');
const { requireRole, flash } = require('../middleware/auth');
const { isId, clean } = require('../helpers');
const { parseAnswers, gradeQuestion } = require('../grading');
const md = require('../markdown');
const files = require('../files');

const router = express.Router();
router.use(requireRole('student'));

const notFound = (res, what = 'Хичээл') => res.status(404).render('error', { title: 'Олдсонгүй', message: `${what} олдсонгүй.` });

/** Сурагчийн ангид оноогдсон, нийтлэгдсэн хичээл */
async function loadLesson(req, res, next) {
  if (!req.user.classId || !isId(req.params.id)) return notFound(res);
  const lesson = await Lesson.findOne({ _id: req.params.id, published: true, classIds: req.user.classId }).lean();
  if (!lesson) return notFound(res);
  req.lesson = lesson;
  next();
}

function findTask(req, res, next) {
  const task = req.lesson.tasks.find((t) => String(t._id) === req.params.tid);
  if (!task) return notFound(res, 'Даалгавар');
  req.task = task;
  next();
}

const taskTotal = (t) => (t.type === 'quiz' ? t.questions.reduce((s, q) => s + q.points, 0) : t.maxPoints);
const lessonUrl = (l) => '/learn/' + l._id;
const taskUrl = (l, t) => `/learn/${l._id}/tasks/${t._id}`;

function taskState(task, sub, now = new Date()) {
  if (sub?.submittedAt) return sub.score == null || sub.needsReview ? 'pending' : 'graded';
  if (task.type === 'assignment' && task.dueAt && now > task.dueAt) return task.allowLate ? 'overdue' : 'closed';
  return 'todo';
}

// ---------------- Хичээлийн жагсаалт ----------------
router.get('/', async (req, res) => {
  const cls = req.user.classId ? await Class.findById(req.user.classId).lean() : null;
  let groups = [];
  if (cls) {
    const lessons = await Lesson.find({ published: true, classIds: cls._id }).select('-theory').sort({ createdAt: -1 }).lean();
    const [subjects, subs] = await Promise.all([
      Subject.find({ _id: { $in: lessons.map((l) => l.subject).filter(Boolean) } }).lean(),
      Submission.find({ student: req.user._id, lesson: { $in: lessons.map((l) => l._id) } }).select('lesson taskId score submittedAt').lean(),
    ]);
    const subMap = new Map(subs.map((s) => [String(s.lesson) + ':' + String(s.taskId), s]));
    const bySubject = new Map();
    for (const l of lessons) {
      l.taskCount = l.tasks.length;
      l.doneCount = l.tasks.filter((t) => subMap.get(String(l._id) + ':' + String(t._id))?.submittedAt).length;
      l.hasTheory = true;
      const key = String(l.subject || '');
      if (!bySubject.has(key)) bySubject.set(key, []);
      bySubject.get(key).push(l);
    }
    const subjectMap = new Map(subjects.map((s) => [String(s._id), s.name]));
    groups = [...bySubject.entries()]
      .map(([id, list]) => ({ name: subjectMap.get(id) || 'Бусад', lessons: list }))
      .sort((a, b) => a.name.localeCompare(b.name, 'mn'));
  }
  res.render('learn/list', { title: 'Хичээл', cls, groups });
});

// ---------------- Хичээл үзэх ----------------
router.get('/:id', loadLesson, async (req, res) => {
  const l = req.lesson;
  const [subject, subs] = await Promise.all([
    l.subject ? Subject.findById(l.subject).lean() : null,
    Submission.find({ student: req.user._id, lesson: l._id }).select('taskId score maxScore submittedAt needsReview').lean(),
  ]);
  const subMap = new Map(subs.map((s) => [String(s.taskId), s]));
  const now = new Date();
  const tasks = l.tasks.map((t) => {
    const sub = subMap.get(String(t._id)) || null;
    return { task: t, sub, state: taskState(t, sub, now), total: taskTotal(t) };
  });
  const theoryHtml = md.render(l.theory);
  res.render('learn/lesson', { title: l.title, lesson: l, subject, tasks, theoryHtml, toc: md.toc(theoryHtml) });
});

// ---------------- Даалгавар ----------------
router.get('/:id/tasks/:tid', loadLesson, findTask, async (req, res) => {
  const { lesson, task } = req;
  const sub = await Submission.findOne({ lesson: lesson._id, taskId: task._id, student: req.user._id }).lean();
  const common = {
    title: task.title,
    lesson,
    task,
    sub,
    total: taskTotal(task),
    instructionsHtml: md.render(task.instructions),
    state: taskState(task, sub),
  };
  if (task.type === 'quiz') {
    const retry = req.query.retry === '1' && task.allowRetry && sub?.submittedAt;
    const showForm = !sub?.submittedAt || retry;
    return res.render('learn/quiz', {
      ...common,
      showForm,
      // Зөв хариултыг зөвхөн илгээсний дараа, зөвшөөрсөн үед л дамжуулна
      questions: showForm || !task.showAnswers
        ? task.questions.map((q) => ({ ...q, acceptedAnswers: [], options: q.options.map((o) => ({ _id: o._id, text: o.text })) }))
        : task.questions,
      answerMap: new Map((sub?.answers || []).map((a) => [String(a.questionId), a])),
    });
  }
  res.render('learn/assignment', { ...common, ACCEPT: files.ACCEPT, MAX_FILE_MB: files.MAX_FILE_MB });
});

router.post('/:id/tasks/:tid/quiz', loadLesson, findTask, async (req, res) => {
  const { lesson, task } = req;
  if (task.type !== 'quiz') return notFound(res, 'Тест');
  const existing = await Submission.findOne({ lesson: lesson._id, taskId: task._id, student: req.user._id });
  if (existing?.submittedAt && !task.allowRetry) {
    flash(req, 'error', 'Энэ тестийг дахин өгөх боломжгүй.');
    return res.redirect(taskUrl(lesson, task));
  }
  const draft = parseAnswers(task.questions, req.body);
  let score = 0;
  let maxScore = 0;
  let needsReview = false;
  const answers = task.questions.map((q) => {
    const g = gradeQuestion(q, draft[String(q._id)]);
    score += g.points;
    maxScore += q.points;
    if (g.isCorrect === null) needsReview = true;
    return g;
  });
  await Submission.findOneAndUpdate(
    { lesson: lesson._id, taskId: task._id, student: req.user._id },
    {
      $set: { type: 'quiz', answers, score, maxScore, needsReview, submittedAt: new Date(), feedback: '', gradedBy: null, gradedAt: null },
      $inc: { attemptCount: 1 },
    },
    { upsert: true }
  );
  flash(req, 'success', needsReview ? 'Тест илгээгдлээ. Зарим асуултыг багш шалгана.' : `Тест илгээгдлээ. Таны оноо: ${Math.round(score * 100) / 100} / ${maxScore}`);
  res.redirect(taskUrl(lesson, task));
});

router.post('/:id/tasks/:tid/assignment', loadLesson, findTask, files.uploader('files', 5), async (req, res) => {
  const { lesson, task } = req;
  const back = taskUrl(lesson, task);
  if (task.type !== 'assignment') return notFound(res, 'Даалгавар');
  if (req.uploadError) {
    flash(req, 'error', req.uploadError);
    return res.redirect(back);
  }
  const existing = await Submission.findOne({ lesson: lesson._id, taskId: task._id, student: req.user._id });
  if (existing?.score != null) {
    flash(req, 'error', 'Даалгавар дүгнэгдсэн тул дахин илгээх боломжгүй.');
    return res.redirect(back);
  }
  const now = new Date();
  const late = !!(task.dueAt && now > task.dueAt);
  if (late && !task.allowLate) {
    flash(req, 'error', 'Даалгаврын хугацаа дууссан.');
    return res.redirect(back);
  }
  const text = clean(req.body.text, 20000);
  if (!req.files.length && !text && !existing?.files.length) {
    flash(req, 'error', 'Файл хавсаргах эсвэл хариултаа бичнэ үү.');
    return res.redirect(back);
  }

  let fileRefs = existing?.files || [];
  if (req.files.length) {
    // Шинэ файл илгээвэл өмнөх файлуудыг солино
    const saved = await files.saveFiles(req.files, { kind: 'submission', lessonId: lesson._id, taskId: task._id, studentId: req.user._id });
    await files.deleteFiles(fileRefs.map((f) => f.fileId));
    fileRefs = saved;
  }
  await Submission.findOneAndUpdate(
    { lesson: lesson._id, taskId: task._id, student: req.user._id },
    {
      $set: { type: 'assignment', files: fileRefs, text, late, submittedAt: now, score: null, maxScore: task.maxPoints, needsReview: false },
      $inc: { attemptCount: 1 },
    },
    { upsert: true }
  );
  flash(req, 'success', existing?.submittedAt ? 'Даалгавар дахин илгээгдлээ.' : 'Даалгавар илгээгдлээ. Багш дүгнэсний дараа оноо харагдана.');
  res.redirect(back);
});

module.exports = router;
