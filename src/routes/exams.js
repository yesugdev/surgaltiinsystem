const express = require('express');
const mongoose = require('mongoose');
const { Subject, Class, User, Exam, Attempt } = require('../models');
const { requireRole, flash } = require('../middleware/auth');
const { clean, isId, toArray, parseInputDate, fmtDate, fmtScore } = require('../helpers');
const { finalizeExpired } = require('../grading');
const { buildImportPrompt } = require('../ai-prompt');
const QuestionParser = require('../../public/question-parser');
const { ownerFilter, allowedSubjects, formSubjects, visibleSubjects } = require('../access');
const { buildExamAnalysis, getTemplate, validateTemplate, SETTING_KEY } = require('../exam-analysis');
const files = require('../files');
const { Setting } = require('../models');

const router = express.Router();
router.use(requireRole('admin', 'teacher'));

const notFound = (res) => res.status(404).render('error', { title: 'Олдсонгүй', message: 'Шалгалт олдсонгүй.' });

async function renderForm(req, res, { title, exam, errors = [], status = 200 }) {
  const [classes, subjects] = await Promise.all([
    Class.find().sort({ name: 1 }).lean(),
    formSubjects(req.user, req.exam?.subject),
  ]);
  res.status(status).render('exams/form', { title, exam, classes, subjects, errors });
}

async function loadExam(req, res, next) {
  if (!isId(req.params.id)) return notFound(res);
  const exam = await Exam.findOne({ _id: req.params.id, ...ownerFilter(req.user) });
  if (!exam) return notFound(res);
  req.exam = exam;
  next();
}

async function hasAttempts(examId) {
  return !!(await Attempt.exists({ exam: examId }));
}

async function parseExamForm(req) {
  const body = req.body;
  const errors = [];
  const title = clean(body.title, 200);
  const duration = parseInt(body.durationMinutes, 10);
  const startAt = parseInputDate(body.startAt);
  const endAt = parseInputDate(body.endAt);
  const requested = toArray(body.classIds).filter(isId);
  const classIds = (await Class.find({ _id: { $in: requested } }).select('_id').lean()).map((c) => c._id);

  const subjects = await formSubjects(req.user, req.exam?.subject);
  const subject = subjects.find((s) => String(s._id) === String(body.subject))?._id || null;

  if (!title) errors.push('Шалгалтын нэрийг оруулна уу.');
  if (!subject) errors.push('Хичээлээ сонгоно уу.');
  if (!Number.isInteger(duration) || duration < 1 || duration > 600) errors.push('Үргэлжлэх хугацаа 1–600 минут байна.');
  if (startAt && endAt && endAt <= startAt) errors.push('Дуусах хугацаа эхлэх хугацаанаас хойш байх ёстой.');
  if (body.showAnswers === 'after_close' && !endAt) {
    errors.push('«Шалгалт хаагдсаны дараа» хариулт харуулах бол хаагдах цагийг тавина уу.');
  }

  return {
    errors,
    data: {
      title,
      subject,
      description: clean(body.description, 5000),
      durationMinutes: Number.isInteger(duration) ? duration : 40,
      startAt,
      endAt,
      classIds,
      shuffleQuestions: body.shuffleQuestions === 'on',
      showResults: body.showResults === 'on',
      showAnswers: ['never', 'after_close', 'after_submit'].includes(body.showAnswers) ? body.showAnswers : 'never',
    },
  };
}

// ---------------- Жагсаалт ----------------
router.get('/', async (req, res) => {
  const filter = ownerFilter(req.user);
  const subjectFilter = isId(req.query.subject) ? req.query.subject : req.query.subject === 'none' ? 'none' : '';
  if (subjectFilter) filter.subject = subjectFilter === 'none' ? null : subjectFilter;

  const exams = await Exam.find(filter).sort({ createdAt: -1 }).lean();
  const [classes, counts, creators, subjects] = await Promise.all([
    Class.find().select('name').lean(),
    Attempt.aggregate([
      { $match: { exam: { $in: exams.map((e) => e._id) }, submittedAt: { $ne: null } } },
      { $group: { _id: '$exam', n: { $sum: 1 } } },
    ]),
    User.find({ _id: { $in: exams.map((e) => e.createdBy).filter(Boolean) } }).select('fullName').lean(),
    visibleSubjects(req.user),
  ]);
  const classMap = new Map(classes.map((c) => [String(c._id), c.name]));
  const countMap = new Map(counts.map((c) => [String(c._id), c.n]));
  const creatorMap = new Map(creators.map((u) => [String(u._id), u.fullName]));
  const subjectMap = new Map(subjects.map((s) => [String(s._id), s.name]));
  for (const e of exams) {
    e.classNames = e.classIds.map((id) => classMap.get(String(id))).filter(Boolean);
    e.submittedCount = countMap.get(String(e._id)) || 0;
    e.creatorName = creatorMap.get(String(e.createdBy)) || '—';
    e.subjectName = e.subject ? subjectMap.get(String(e.subject)) || '—' : null;
  }
  res.render('exams/list', {
    title: 'Шалгалтууд',
    exams,
    subjects,
    subjectFilter,
    canCreate: subjects.some((s) => s.active),
  });
});

// ---------------- Үүсгэх / засах ----------------
// ---------------- Анализын Excel загвар (админ) ----------------
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).render('error', { title: 'Хандах эрхгүй', message: 'Зөвхөн админ загвар солино.' });
  next();
}

router.get('/analysis-template', adminOnly, async (req, res) => {
  const t = await getTemplate();
  res.render('exams/analysis-template', { title: 'Анализын Excel загвар', template: t });
});

router.get('/analysis-template/download', adminOnly, async (req, res) => {
  const t = await getTemplate();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="template.xlsx"; filename*=UTF-8''${encodeURIComponent('анализ-загвар.xlsx')}`);
  res.send(t.buffer);
});

router.post('/analysis-template', adminOnly, files.uploader('file', 1), async (req, res) => {
  const back = '/exams/analysis-template';
  const f = req.files[0];
  if (req.uploadError || !f) {
    flash(req, 'error', req.uploadError || 'Файл сонгоно уу.');
    return res.redirect(back);
  }
  if (!/\.xlsx$/i.test(f.originalname)) {
    flash(req, 'error', 'Зөвхөн .xlsx файл оруулна.');
    return res.redirect(back);
  }
  const problem = await validateTemplate(f.buffer);
  if (problem) {
    flash(req, 'error', problem);
    return res.redirect(back);
  }
  const [saved] = await files.saveFiles([f], { kind: 'setting', key: SETTING_KEY, uploadedBy: req.user._id });
  const prev = await Setting.findOne({ key: SETTING_KEY }).lean();
  await Setting.updateOne({ key: SETTING_KEY }, { value: { fileId: saved.fileId, name: saved.name } }, { upsert: true });
  if (prev?.value?.fileId) await files.deleteFiles([prev.value.fileId]);
  flash(req, 'success', `«${saved.name}» загвар хадгалагдлаа. Цаашид шалгалтын анализ энэ загвараар гарна.`);
  res.redirect(back);
});

router.post('/analysis-template/reset', adminOnly, async (req, res) => {
  const prev = await Setting.findOneAndDelete({ key: SETTING_KEY }).lean();
  if (prev?.value?.fileId) await files.deleteFiles([prev.value.fileId]);
  flash(req, 'success', 'Анхдагч загвар руу буцлаа.');
  res.redirect('/exams/analysis-template');
});

router.get('/new', async (req, res) => {
  if (!(await allowedSubjects(req.user)).length) {
    return res.status(403).render('error', {
      title: 'Хичээл оноогоогүй',
      message:
        req.user.role === 'admin'
          ? 'Идэвхтэй хичээл алга байна. Эхлээд «Хичээл» цэснээс хичээл нэмнэ үү.'
          : 'Танд хичээл оноогоогүй тул шалгалт үүсгэх боломжгүй. Админд хандана уу.',
    });
  }
  const preset = isId(req.query.subject) ? req.query.subject : null;
  await renderForm(req, res, {
    title: 'Шинэ шалгалт',
    exam: { durationMinutes: 40, showResults: true, classIds: [], subject: preset },
  });
});

router.post('/', async (req, res) => {
  const { errors, data } = await parseExamForm(req);
  if (errors.length) return renderForm(req, res, { title: 'Шинэ шалгалт', exam: data, errors, status: 400 });
  const exam = await Exam.create({ ...data, createdBy: req.user._id });
  flash(req, 'success', 'Шалгалт үүслээ. Одоо асуултуудаа нэмнэ үү.');
  res.redirect('/exams/' + exam._id);
});

router.get('/:id', loadExam, async (req, res) => {
  const [classes, attemptCount, subject] = await Promise.all([
    Class.find({ _id: { $in: req.exam.classIds } }).sort({ name: 1 }).lean(),
    Attempt.countDocuments({ exam: req.exam._id }),
    req.exam.subject ? Subject.findById(req.exam.subject).lean() : null,
  ]);
  res.render('exams/show', {
    title: req.exam.title,
    exam: req.exam,
    subject,
    classes,
    attemptCount,
    locked: attemptCount > 0,
  });
});

router.get('/:id/edit', loadExam, (req, res) => renderForm(req, res, { title: 'Шалгалт засах', exam: req.exam }));

router.post('/:id', loadExam, async (req, res) => {
  const { errors, data } = await parseExamForm(req);
  if (errors.length) {
    return renderForm(req, res, { title: 'Шалгалт засах', exam: { ...data, _id: req.exam._id }, errors, status: 400 });
  }
  if (req.exam.published && !data.classIds.length) {
    flash(req, 'error', 'Нийтлэгдсэн шалгалтад дор хаяж нэг анги оноосон байх ёстой.');
    return res.redirect('/exams/' + req.exam._id + '/edit');
  }
  Object.assign(req.exam, data);
  await req.exam.save();
  flash(req, 'success', 'Шалгалтын тохиргоо хадгалагдлаа.');
  res.redirect('/exams/' + req.exam._id);
});

router.post('/:id/publish', loadExam, async (req, res) => {
  const exam = req.exam;
  if (!exam.published) {
    if (!exam.subject) {
      flash(req, 'error', 'Нийтлэхийн өмнө тохиргооноос хичээлээ сонгоно уу.');
      return res.redirect('/exams/' + exam._id);
    }
    if (!exam.questions.length) {
      flash(req, 'error', 'Нийтлэхийн өмнө дор хаяж нэг асуулт нэмнэ үү.');
      return res.redirect('/exams/' + exam._id);
    }
    if (!exam.classIds.length) {
      flash(req, 'error', 'Нийтлэхийн өмнө шалгалт өгөх анги сонгоно уу.');
      return res.redirect('/exams/' + exam._id);
    }
  }
  exam.published = !exam.published;
  await exam.save();
  flash(
    req,
    'success',
    exam.published ? 'Шалгалт нийтлэгдлээ. Сурагчид харж эхэлнэ.' : 'Шалгалтыг нийтлэлээс буцаалаа.'
  );
  res.redirect('/exams/' + exam._id);
});

router.post('/:id/delete', loadExam, async (req, res) => {
  await Attempt.deleteMany({ exam: req.exam._id });
  await Exam.deleteOne({ _id: req.exam._id });
  flash(req, 'success', `"${req.exam.title}" шалгалт устгагдлаа.`);
  res.redirect('/exams');
});

// ---------------- Асуултууд ----------------
function parseQuestionForm(body) {
  const errors = [];
  const type = ['single', 'multiple', 'text'].includes(body.type) ? body.type : 'single';
  const text = String(toArray(body.text)[0] ?? '').trim().slice(0, 10000);
  const points = Number(body.points);

  const correctIdx = new Set(toArray(body.optionCorrect).map(String));
  const options = toArray(body.optionText)
    .map((t, i) => ({ text: String(t).trim().slice(0, 2000), isCorrect: correctIdx.has(String(i)) }))
    .filter((o) => o.text);
  const acceptedAnswers = String(body.acceptedAnswers ?? '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);

  if (!text) errors.push('Асуултын текстийг оруулна уу.');
  if (!(points > 0 && points <= 1000)) errors.push('Оноо 0-ээс их, 1000-аас бага байна.');
  if (type !== 'text') {
    const nCorrect = options.filter((o) => o.isCorrect).length;
    if (options.length < 2) errors.push('Дор хаяж 2 хариултын сонголт оруулна уу.');
    if (type === 'single' && nCorrect !== 1) errors.push('Нэг сонголттой асуултад яг 1 зөв хариулт тэмдэглэнэ.');
    if (type === 'multiple' && nCorrect < 1) errors.push('Дор хаяж 1 зөв хариулт тэмдэглэнэ үү.');
    if (options.length > 20) errors.push('Хамгийн ихдээ 20 сонголт оруулна.');
  }

  return {
    errors,
    data: {
      type,
      text,
      points: points > 0 ? points : 1,
      options: type === 'text' ? [] : options,
      acceptedAnswers: type === 'text' ? acceptedAnswers : [],
    },
  };
}

async function guardLocked(req, res, next) {
  if (await hasAttempts(req.exam._id)) {
    flash(req, 'error', 'Сурагч шалгалт өгч эхэлсэн тул асуултыг өөрчлөх боломжгүй.');
    return res.redirect('/exams/' + req.exam._id);
  }
  next();
}

const blankQuestion = () => ({
  type: 'single',
  text: '',
  points: 1,
  options: [{ text: '' }, { text: '' }, { text: '' }, { text: '' }],
  acceptedAnswers: [],
});

router.get('/:id/questions/new', loadExam, guardLocked, (req, res) => {
  res.render('exams/question-form', { title: 'Асуулт нэмэх', exam: req.exam, question: blankQuestion(), errors: [] });
});

router.post('/:id/questions', loadExam, guardLocked, async (req, res) => {
  const { errors, data } = parseQuestionForm(req.body);
  if (errors.length) {
    return res.status(400).render('exams/question-form', { title: 'Асуулт нэмэх', exam: req.exam, question: data, errors });
  }
  req.exam.questions.push(data);
  await req.exam.save();
  flash(req, 'success', 'Асуулт нэмэгдлээ.');
  res.redirect(req.body.next === 'new' ? `/exams/${req.exam._id}/questions/new` : `/exams/${req.exam._id}`);
});

// ---------------- Асуулт олноор оруулах (текст буулгах) ----------------
async function renderImport(req, res, { text = '', mode = 'append', errors = [], status = 200 } = {}) {
  const subject = req.exam.subject ? await Subject.findById(req.exam.subject).lean() : null;
  res.status(status).render('exams/import', {
    title: 'Асуулт олноор оруулах',
    exam: req.exam,
    text,
    mode,
    errors,
    prompt: buildImportPrompt({ subjectName: subject?.name, examTitle: req.exam.title }),
    example: QuestionParser.EXAMPLE,
  });
}

router.get('/:id/questions/import', loadExam, guardLocked, (req, res) => renderImport(req, res));

router.post('/:id/questions/import', loadExam, guardLocked, async (req, res) => {
  const text = String(req.body.text ?? '').slice(0, 500_000);
  const mode = req.body.mode === 'replace' ? 'replace' : 'append';
  const { questions, errors } = QuestionParser.parse(text);

  const messages = errors.map((e) => (e.question ? `${e.question}-р асуулт: ` : e.line ? `${e.line}-р мөр: ` : '') + e.message);
  const total = (mode === 'replace' ? 0 : req.exam.questions.length) + questions.length;
  if (total > QuestionParser.MAX_QUESTIONS) messages.push(`Нэг шалгалтад хамгийн ихдээ ${QuestionParser.MAX_QUESTIONS} асуулт байна.`);
  if (messages.length) return renderImport(req, res, { text, mode, errors: messages, status: 400 });

  const docs = questions.map((q) => ({
    type: q.type,
    text: q.text,
    points: q.points,
    options: q.options,
    acceptedAnswers: q.acceptedAnswers,
  }));
  if (mode === 'replace') req.exam.questions = docs;
  else req.exam.questions.push(...docs);
  await req.exam.save();

  flash(req, 'success', `${docs.length} асуулт ${mode === 'replace' ? 'оруулж, хуучин асуултуудыг сольлоо' : 'нэмэгдлээ'}.`);
  res.redirect('/exams/' + req.exam._id);
});

function findQuestion(req, res, next) {
  const q = isId(req.params.qid) ? req.exam.questions.id(req.params.qid) : null;
  if (!q) return res.status(404).render('error', { title: 'Олдсонгүй', message: 'Асуулт олдсонгүй.' });
  req.question = q;
  next();
}

router.get('/:id/questions/:qid/edit', loadExam, guardLocked, findQuestion, (req, res) => {
  res.render('exams/question-form', { title: 'Асуулт засах', exam: req.exam, question: req.question, errors: [] });
});

router.post('/:id/questions/:qid', loadExam, guardLocked, findQuestion, async (req, res) => {
  const { errors, data } = parseQuestionForm(req.body);
  if (errors.length) {
    return res
      .status(400)
      .render('exams/question-form', { title: 'Асуулт засах', exam: req.exam, question: { ...data, _id: req.question._id }, errors });
  }
  req.question.set(data);
  await req.exam.save();
  flash(req, 'success', 'Асуулт хадгалагдлаа.');
  res.redirect(`/exams/${req.exam._id}#q-${req.question._id}`);
});

router.post('/:id/questions/:qid/delete', loadExam, guardLocked, findQuestion, async (req, res) => {
  req.question.deleteOne();
  if (!req.exam.questions.length) req.exam.published = false;
  await req.exam.save();
  flash(req, 'success', 'Асуулт устгагдлаа.');
  res.redirect('/exams/' + req.exam._id);
});

// Дараалал солих нь дүгнэлтэд нөлөөлөхгүй тул түгжихгүй
router.post('/:id/questions/:qid/move', loadExam, findQuestion, async (req, res) => {
  const qs = req.exam.questions;
  const i = qs.findIndex((q) => q._id.equals(req.question._id));
  const j = req.body.dir === 'up' ? i - 1 : i + 1;
  if (j >= 0 && j < qs.length) {
    const arr = qs.map((q) => q.toObject());
    [arr[i], arr[j]] = [arr[j], arr[i]];
    req.exam.questions = arr;
    await req.exam.save();
  }
  res.redirect(`/exams/${req.exam._id}#q-${req.question._id}`);
});

// ---------------- Үр дүн ----------------
async function buildResults(exam) {
  await finalizeExpired({ exam: exam._id });
  const attempts = await Attempt.find({ exam: exam._id }).lean();
  const attemptByStudent = new Map(attempts.map((a) => [String(a.student), a]));

  const students = await User.find({
    role: 'student',
    $or: [{ classId: { $in: exam.classIds } }, { _id: { $in: attempts.map((a) => a.student) } }],
  })
    .sort({ fullName: 1 })
    .lean();
  const classes = await Class.find({ _id: { $in: students.map((s) => s.classId).filter(Boolean) } }).lean();
  const classMap = new Map(classes.map((c) => [String(c._id), c.name]));

  const rows = students.map((s) => {
    const a = attemptByStudent.get(String(s._id)) || null;
    let status = 'not_started';
    if (a?.submittedAt) status = a.needsReview ? 'review' : 'submitted';
    else if (a) status = 'in_progress';
    return { student: s, className: classMap.get(String(s.classId)) || '—', attempt: a, status };
  });
  rows.sort((x, y) => x.className.localeCompare(y.className, 'mn') || x.student.fullName.localeCompare(y.student.fullName, 'mn'));

  const submitted = attempts.filter((a) => a.submittedAt);
  const scores = submitted.map((a) => (a.maxScore ? (a.score / a.maxScore) * 100 : 0));
  const stats = {
    total: rows.length,
    submitted: submitted.length,
    inProgress: attempts.length - submitted.length,
    review: submitted.filter((a) => a.needsReview).length,
    avg: scores.length ? scores.reduce((s, x) => s + x, 0) / scores.length : null,
    max: scores.length ? Math.max(...scores) : null,
    min: scores.length ? Math.min(...scores) : null,
  };

  // Асуулт бүрийн зөв хариулсан хувь
  const perQuestion = exam.questions.map((q, i) => {
    let answered = 0;
    let correct = 0;
    for (const a of submitted) {
      const ans = a.answers.find((x) => String(x.questionId) === String(q._id));
      if (!ans) continue;
      answered++;
      if (ans.isCorrect) correct++;
    }
    return { index: i + 1, question: q, answered, correct, rate: answered ? (correct / answered) * 100 : null };
  });

  return { rows, stats, perQuestion };
}

const STATUS_LABELS = {
  not_started: 'Эхлээгүй',
  in_progress: 'Өгч байна',
  submitted: 'Илгээсэн',
  review: 'Шалгах шаардлагатай',
};

router.get('/:id/results', loadExam, async (req, res) => {
  const { rows, stats, perQuestion } = await buildResults(req.exam);
  res.render('exams/results', { title: 'Үр дүн · ' + req.exam.title, exam: req.exam, rows, stats, perQuestion, STATUS_LABELS });
});

router.get('/:id/results.csv', loadExam, async (req, res) => {
  const { rows } = await buildResults(req.exam);
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [['Анги', 'Сурагч', 'Нэвтрэх нэр', 'Төлөв', 'Оноо', 'Дээд оноо', 'Хувь', 'Эхэлсэн', 'Илгээсэн']];
  for (const r of rows) {
    const a = r.attempt;
    lines.push([
      r.className,
      r.student.fullName,
      r.student.username,
      STATUS_LABELS[r.status],
      a?.submittedAt ? fmtScore(a.score) : '',
      a?.submittedAt ? fmtScore(a.maxScore) : '',
      a?.submittedAt && a.maxScore ? fmtScore((a.score / a.maxScore) * 100) : '',
      a ? fmtDate(a.startedAt) : '',
      a?.submittedAt ? fmtDate(a.submittedAt) : '',
    ]);
  }
  const csv = '﻿' + lines.map((l) => l.map(esc).join(',')).join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="exam-${req.exam._id}-results.csv"`);
  res.send(csv);
});

// Сургуулийн «анализ-хөндлөн» Excel загвараар дүн шинжилгээ (анги бүр тусдаа хуудас)
router.get('/:id/analysis.xlsx', loadExam, async (req, res) => {
  const exam = req.exam;
  await finalizeExpired({ exam: exam._id });
  const attempts = await Attempt.find({ exam: exam._id, submittedAt: { $ne: null } }).lean();
  const byStudent = new Map(attempts.map((a) => [String(a.student), a]));
  const takers = await User.find({ _id: { $in: attempts.map((a) => a.student) } }).select('fullName classId').lean();
  const classIds = [...new Set([...exam.classIds.map(String), ...takers.map((t) => String(t.classId || ''))])].filter(isId);
  const [classes, expected, creator] = await Promise.all([
    Class.find({ _id: { $in: classIds } }).collation({ locale: 'mn' }).sort({ name: 1 }).lean(),
    User.aggregate([{ $match: { role: 'student', classId: { $in: classIds.map((id) => new mongoose.Types.ObjectId(id)) } } }, { $group: { _id: '$classId', n: { $sum: 1 } } }]),
    exam.createdBy ? User.findById(exam.createdBy).select('fullName').lean() : null,
  ]);
  const expectedMap = new Map(expected.map((e) => [String(e._id), e.n]));
  const total = exam.questions.reduce((s, q) => s + q.points, 0);

  const groups = classes.map((cls) => ({
    className: cls.name,
    expectedCount: expectedMap.get(String(cls._id)) || 0,
    students: takers
      .filter((t) => String(t.classId) === String(cls._id))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'mn'))
      .map((t) => {
        const a = byStudent.get(String(t._id));
        const pts = new Map(a.answers.map((x) => [String(x.questionId), x.points]));
        return {
          name: t.fullName,
          // Асуултын дарааллаар (сурагчид холилдсон ч гэсэн)
          scores: exam.questions.map((q) => (pts.has(String(q._id)) ? pts.get(String(q._id)) : null)),
          max: a.maxScore ?? total,
        };
      }),
  }));
  // Анги сольсон/ангигүй сурагчид
  const known = new Set(classes.map((c) => String(c._id)));
  const orphans = takers.filter((t) => !known.has(String(t.classId)));
  if (orphans.length) {
    groups.push({
      className: 'Бусад',
      expectedCount: orphans.length,
      students: orphans.map((t) => {
        const a = byStudent.get(String(t._id));
        const pts = new Map(a.answers.map((x) => [String(x.questionId), x.points]));
        return { name: t.fullName, scores: exam.questions.map((q) => pts.get(String(q._id)) ?? null), max: a.maxScore ?? total };
      }),
    });
  }

  const firstSubmit = attempts.reduce((m, a) => (!m || a.submittedAt < m ? a.submittedAt : m), null);
  const { buffer: template } = await getTemplate();
  const xlsx = await buildExamAnalysis(template, {
    questions: exam.questions,
    groups,
    date: exam.startAt || firstSubmit || new Date(),
    teacherName: creator?.fullName || '',
  });
  const fileName = `${exam.title.replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 80) || 'shalgalt'} - анализ.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="analysis.xlsx"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
  res.send(xlsx);
});

async function loadAttempt(req, res, next) {
  const attempt = isId(req.params.aid) ? await Attempt.findOne({ _id: req.params.aid, exam: req.exam._id }) : null;
  if (!attempt) return res.status(404).render('error', { title: 'Олдсонгүй', message: 'Оролдлого олдсонгүй.' });
  req.attempt = attempt;
  next();
}

router.get('/:id/attempts/:aid', loadExam, loadAttempt, async (req, res) => {
  await finalizeExpired({ _id: req.attempt._id });
  const attempt = await Attempt.findById(req.attempt._id).lean();
  const student = await User.findById(attempt.student).lean();
  const cls = student?.classId ? await Class.findById(student.classId).lean() : null;
  const answerMap = new Map(attempt.answers.map((a) => [String(a.questionId), a]));
  const order = attempt.questionOrder.map(String);
  const questions = req.exam.questions
    .filter((q) => order.includes(String(q._id)))
    .sort((a, b) => order.indexOf(String(a._id)) - order.indexOf(String(b._id)));
  res.render('exams/attempt', {
    title: 'Хариулт · ' + (student?.fullName || ''),
    exam: req.exam,
    attempt,
    student,
    cls,
    questions,
    answerMap,
  });
});

// Багш оноог гараар засах (ялангуяа нээлттэй асуулт)
router.post('/:id/attempts/:aid/grade', loadExam, loadAttempt, async (req, res) => {
  const attempt = req.attempt;
  if (!attempt.submittedAt) {
    flash(req, 'error', 'Сурагч шалгалтаа илгээгээгүй байна.');
    return res.redirect(`/exams/${req.exam._id}/attempts/${attempt._id}`);
  }
  const qMap = new Map(req.exam.questions.map((q) => [String(q._id), q]));
  for (const ans of attempt.answers) {
    const q = qMap.get(String(ans.questionId));
    const raw = req.body['points_' + ans.questionId];
    if (!q || raw === undefined || raw === '') continue;
    const pts = Math.min(Math.max(Number(raw) || 0, 0), q.points);
    ans.points = pts;
    ans.isCorrect = pts >= q.points;
  }
  attempt.score = attempt.answers.reduce((s, a) => s + a.points, 0);
  attempt.needsReview = false;
  await attempt.save();
  flash(req, 'success', 'Дүн хадгалагдлаа.');
  res.redirect(`/exams/${req.exam._id}/attempts/${attempt._id}`);
});

// Сурагчийг дахин өгөх боломжтой болгох
router.post('/:id/attempts/:aid/delete', loadExam, loadAttempt, async (req, res) => {
  await Attempt.deleteOne({ _id: req.attempt._id });
  flash(req, 'success', 'Оролдлогыг устгалаа. Сурагч шалгалтыг дахин өгөх боломжтой.');
  res.redirect(`/exams/${req.exam._id}/results`);
});

module.exports = router;
