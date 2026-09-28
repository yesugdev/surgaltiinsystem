const { Exam, Attempt } = require('./models');
const { normalizeText, toArray } = require('./helpers');

/** Хугацаа дууссаны дараа сүлжээний саатлыг тооцож хүлээх хугацаа */
const GRACE_MS = 30_000;

/** Илгээсэн формоос ноорог хариултыг задлана: { questionId: [optionId] | "текст" } */
function parseAnswers(questions, body) {
  const draft = {};
  for (const q of questions) {
    const key = String(q._id);
    const raw = body['q_' + key];
    if (q.type === 'text') {
      const t = String(toArray(raw)[0] ?? '').slice(0, 5000);
      if (t.trim()) draft[key] = t;
    } else {
      const valid = new Set(q.options.map((o) => String(o._id)));
      let ids = [...new Set(toArray(raw).map(String))].filter((id) => valid.has(id));
      if (q.type === 'single') ids = ids.slice(0, 1);
      if (ids.length) draft[key] = ids;
    }
  }
  return draft;
}

function gradeQuestion(q, value) {
  const base = { questionId: q._id, selectedOptions: [], textAnswer: null };
  if (value == null) return { ...base, isCorrect: false, points: 0 };

  if (q.type === 'text') {
    const accepted = q.acceptedAnswers.map(normalizeText).filter(Boolean);
    if (!accepted.length) return { ...base, textAnswer: value, isCorrect: null, points: 0 };
    const ok = accepted.includes(normalizeText(value));
    return { ...base, textAnswer: value, isCorrect: ok, points: ok ? q.points : 0 };
  }

  const correct = q.options.filter((o) => o.isCorrect).map((o) => String(o._id)).sort();
  const selected = [...value].map(String).sort();
  const ok = correct.length === selected.length && correct.every((id, i) => id === selected[i]);
  return { ...base, selectedOptions: selected, isCorrect: ok, points: ok ? q.points : 0 };
}

/** Оролдлогыг дуусгаж, хариултыг автоматаар дүгнэнэ. Аль хэдийн дууссан бол юу ч хийхгүй. */
async function finalizeAttempt(attemptId, submittedAt = new Date()) {
  const attempt = await Attempt.findById(attemptId).lean();
  if (!attempt || attempt.submittedAt) return;
  const exam = await Exam.findById(attempt.exam).lean();
  const order = attempt.questionOrder.map(String);
  const questions = exam ? exam.questions.filter((q) => order.includes(String(q._id))) : [];

  const draft = attempt.draft || {};
  let score = 0;
  let maxScore = 0;
  let needsReview = false;
  const answers = questions.map((q) => {
    const g = gradeQuestion(q, draft[String(q._id)]);
    score += g.points;
    maxScore += q.points;
    if (g.isCorrect === null) needsReview = true;
    return g;
  });

  // submittedAt: null нөхцөл нь давхар дүгнэхээс хамгаална
  await Attempt.updateOne(
    { _id: attempt._id, submittedAt: null },
    { $set: { submittedAt, answers, score, maxScore, needsReview } }
  );
}

/** Хугацаа нь дууссан ч илгээгдээгүй оролдлогуудыг дуусгана */
async function finalizeExpired(filter = {}) {
  const expired = await Attempt.find({
    ...filter,
    submittedAt: null,
    deadlineAt: { $lt: new Date(Date.now() - GRACE_MS) },
  })
    .select('_id deadlineAt')
    .lean();
  for (const a of expired) await finalizeAttempt(a._id, a.deadlineAt);
}

/** Сурагчид харагдах шалгалтын төлөв */
function examStatus(exam, attempt, now = new Date()) {
  if (attempt?.submittedAt) return 'submitted';
  if (attempt) return 'in_progress';
  if (exam.startAt && now < exam.startAt) return 'upcoming';
  if (exam.endAt && now >= exam.endAt) return 'closed';
  return 'open';
}

module.exports = { GRACE_MS, parseAnswers, gradeQuestion, finalizeAttempt, finalizeExpired, examStatus };
