const express = require('express');
const { Subject, Class, Exam, Attempt } = require('../models');
const { requireRole, flash } = require('../middleware/auth');
const { isId, shuffle } = require('../helpers');
const { GRACE_MS, parseAnswers, finalizeAttempt, finalizeExpired, examStatus } = require('../grading');

const router = express.Router();
router.use(requireRole('student'));

const notFound = (res) => res.status(404).render('error', { title: 'Олдсонгүй', message: 'Шалгалт олдсонгүй.' });

/** Сурагчийн ангид оноогдсон, нийтлэгдсэн шалгалт */
function findAssignedExam(user, examId) {
  if (!user.classId || !isId(String(examId))) return null;
  return Exam.findOne({ _id: examId, published: true, classIds: user.classId }).lean();
}

async function loadOwnAttempt(req, res, next) {
  const attempt = isId(req.params.aid) ? await Attempt.findOne({ _id: req.params.aid, student: req.user._id }).lean() : null;
  if (!attempt) return notFound(res);
  req.attempt = attempt;
  next();
}

function orderedQuestions(exam, attempt) {
  const byId = new Map(exam.questions.map((q) => [String(q._id), q]));
  return attempt.questionOrder.map((id) => byId.get(String(id))).filter(Boolean);
}

/** Зөв хариулт одоо харагдах эсэх, үгүй бол хэзээ нээгдэх */
function answersVisibility(exam, now = new Date()) {
  const mode = exam.showAnswers || 'never';
  if (mode === 'after_submit') return { visible: true, opensAt: null };
  if (mode === 'after_close' && exam.endAt) {
    return now >= exam.endAt ? { visible: true, opensAt: null } : { visible: false, opensAt: exam.endAt };
  }
  return { visible: false, opensAt: null };
}

// ---------------- Миний шалгалтууд ----------------
router.get('/', async (req, res) => {
  await finalizeExpired({ student: req.user._id });
  const cls = req.user.classId ? await Class.findById(req.user.classId).lean() : null;
  let exams = [];
  if (cls) {
    exams = await Exam.find({ published: true, classIds: cls._id })
      .select('-questions.options.isCorrect -questions.acceptedAnswers')
      .sort({ startAt: -1, createdAt: -1 })
      .lean();
    const attempts = await Attempt.find({ student: req.user._id, exam: { $in: exams.map((e) => e._id) } })
      .select('-draft -answers')
      .lean();
    const byExam = new Map(attempts.map((a) => [String(a.exam), a]));
    const subjects = await Subject.find({ _id: { $in: exams.map((e) => e.subject).filter(Boolean) } }).lean();
    const subjectMap = new Map(subjects.map((s) => [String(s._id), s.name]));
    const now = new Date();
    for (const e of exams) {
      e.subjectName = e.subject ? subjectMap.get(String(e.subject)) : null;
      e.attempt = byExam.get(String(e._id)) || null;
      e.status = examStatus(e, e.attempt, now);
      e.questionCount = e.questions.length;
      e.maxScore = e.questions.reduce((s, q) => s + q.points, 0);
    }
    const rank = { in_progress: 0, open: 1, upcoming: 2, submitted: 3, closed: 4 };
    exams.sort((a, b) => rank[a.status] - rank[b.status]);
  }
  res.render('student/dashboard', { title: 'Миний шалгалтууд', cls, exams });
});

// ---------------- Шалгалт эхлүүлэх ----------------
router.post('/exams/:id/start', async (req, res) => {
  const exam = await findAssignedExam(req.user, req.params.id);
  if (!exam) return notFound(res);

  const existing = await Attempt.findOne({ exam: exam._id, student: req.user._id }).select('_id').lean();
  if (existing) return res.redirect('/student/attempts/' + existing._id);

  const now = new Date();
  const status = examStatus(exam, null, now);
  if (status === 'upcoming') {
    flash(req, 'error', 'Шалгалт хараахан эхлээгүй байна.');
    return res.redirect('/student');
  }
  if (status === 'closed') {
    flash(req, 'error', 'Шалгалтын хугацаа дууссан байна.');
    return res.redirect('/student');
  }
  if (!exam.questions.length) {
    flash(req, 'error', 'Шалгалтад асуулт алга байна. Багшдаа хандана уу.');
    return res.redirect('/student');
  }

  const ids = exam.questions.map((q) => q._id);
  let deadline = now.getTime() + exam.durationMinutes * 60_000;
  if (exam.endAt) deadline = Math.min(deadline, new Date(exam.endAt).getTime());

  try {
    const attempt = await Attempt.create({
      exam: exam._id,
      student: req.user._id,
      startedAt: now,
      deadlineAt: new Date(deadline),
      questionOrder: exam.shuffleQuestions ? shuffle(ids) : ids,
      draft: {},
    });
    res.redirect('/student/attempts/' + attempt._id);
  } catch (err) {
    if (err?.code !== 11000) throw err;
    // Хоёр удаа дарсан тохиолдолд
    const a = await Attempt.findOne({ exam: exam._id, student: req.user._id }).select('_id').lean();
    res.redirect('/student/attempts/' + a._id);
  }
});

// ---------------- Шалгалт өгөх ----------------
router.get('/attempts/:aid', loadOwnAttempt, async (req, res) => {
  const attempt = req.attempt;
  if (attempt.submittedAt) return res.redirect(`/student/attempts/${attempt._id}/result`);
  if (Date.now() > attempt.deadlineAt.getTime() + GRACE_MS) {
    await finalizeAttempt(attempt._id, attempt.deadlineAt);
    flash(req, 'info', 'Шалгалтын хугацаа дууссан тул хадгалагдсан хариултуудаар илгээгдлээ.');
    return res.redirect(`/student/attempts/${attempt._id}/result`);
  }
  const exam = await Exam.findById(attempt.exam).lean();
  if (!exam) return notFound(res);

  const questions = orderedQuestions(exam, attempt).map((q) => ({
    _id: q._id,
    type: q.type,
    text: q.text,
    points: q.points,
    // Зөв хариултыг хөтөч рүү илгээхгүй
    options: q.options.map((o) => ({ _id: o._id, text: o.text })),
  }));

  res.set('Cache-Control', 'no-store');
  res.render('student/take', {
    title: exam.title,
    exam,
    attempt,
    questions,
    draft: attempt.draft || {},
    serverNow: Date.now(),
  });
});

// Автоматаар хадгалах (fetch)
router.post('/attempts/:aid/save', loadOwnAttempt, async (req, res) => {
  const attempt = req.attempt;
  if (attempt.submittedAt || Date.now() > attempt.deadlineAt.getTime() + GRACE_MS) {
    return res.status(409).json({ ok: false, reason: 'closed' });
  }
  const exam = await Exam.findById(attempt.exam).lean();
  const draft = parseAnswers(orderedQuestions(exam, attempt), req.body);
  await Attempt.updateOne({ _id: attempt._id, submittedAt: null }, { $set: { draft } });
  res.json({ ok: true, savedAt: Date.now() });
});

router.post('/attempts/:aid/submit', loadOwnAttempt, async (req, res) => {
  const attempt = req.attempt;
  if (!attempt.submittedAt) {
    const now = Date.now();
    if (now <= attempt.deadlineAt.getTime() + GRACE_MS) {
      const exam = await Exam.findById(attempt.exam).lean();
      const draft = parseAnswers(orderedQuestions(exam, attempt), req.body);
      await Attempt.updateOne({ _id: attempt._id, submittedAt: null }, { $set: { draft } });
      await finalizeAttempt(attempt._id, new Date(Math.min(now, attempt.deadlineAt.getTime())));
    } else {
      // Хугацаа хэтэрсэн: зөвхөн өмнө хадгалагдсан хариултаар дүгнэнэ
      await finalizeAttempt(attempt._id, attempt.deadlineAt);
    }
  }
  flash(req, 'success', 'Шалгалт амжилттай илгээгдлээ.');
  res.redirect(`/student/attempts/${attempt._id}/result`);
});

// ---------------- Үр дүн ----------------
router.get('/attempts/:aid/result', loadOwnAttempt, async (req, res) => {
  const attempt = req.attempt;
  if (!attempt.submittedAt) return res.redirect('/student/attempts/' + attempt._id);
  const exam = await Exam.findById(attempt.exam).lean();
  if (!exam) return notFound(res);
  const answerMap = new Map(attempt.answers.map((a) => [String(a.questionId), a]));
  const answers = answersVisibility(exam);
  let questions = orderedQuestions(exam, attempt);
  if (!answers.visible) {
    // Зөв хариулт нээгдээгүй бол загвар руу ч дамжуулахгүй
    questions = questions.map((q) => ({
      ...q,
      acceptedAnswers: [],
      options: q.options.map((o) => ({ _id: o._id, text: o.text })),
    }));
  }
  res.render('student/result', {
    title: 'Үр дүн · ' + exam.title,
    exam,
    attempt,
    questions,
    answerMap,
    answers,
  });
});

module.exports = router;
