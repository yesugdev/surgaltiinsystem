// Сурагчийн профайл: хичээлийн даалгавар, шалгалтын дүн, явцын үзүүлэлтүүдийг нэг дор цуглуулна.
const { Types } = require('mongoose');
const { Lesson, Submission, Exam, Attempt, Subject, Class, User } = require('./models');
const { ownerFilter } = require('./access');
const { splitName } = require('./subject-groups');

const pct = (score, max) => (max > 0 && score != null ? Math.round((score / max) * 1000) / 10 : null);
const avg = (xs) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
const taskMax = (t) => (t.type === 'quiz' ? (t.questions || []).reduce((s, q) => s + (q.points || 0), 0) : t.maxPoints || 0);

/** Багшийн хичээл/шалгалт оноогдсон ангиуд (админ: бүх анги) */
async function staffClassIds(viewer) {
  if (viewer.role === 'admin') return null; // null = бүгд
  const f = ownerFilter(viewer);
  const [l, e] = await Promise.all([Lesson.distinct('classIds', f), Exam.distinct('classIds', f)]);
  return [...new Set([...l, ...e].map(String))];
}

/** viewer энэ сурагчийн профайлыг харж болох эсэх */
async function canView(viewer, student) {
  if (!viewer || !student || student.role !== 'student') return false;
  if (viewer.role === 'student') return String(viewer._id) === String(student._id);
  if (viewer.role === 'admin') return true;
  if (!student.classId) return false;
  const ids = await staffClassIds(viewer);
  return ids.includes(String(student.classId));
}

function taskState(task, sub, now) {
  if (sub?.submittedAt) return sub.score == null || sub.needsReview ? 'pending' : 'graded';
  if (task.type === 'assignment' && task.dueAt && now > task.dueAt) return 'overdue';
  return 'todo';
}

function examState(exam, att, now) {
  if (att?.submittedAt || (att && now > att.deadlineAt)) return att.score == null || att.needsReview ? 'pending' : 'graded';
  if (att) return 'progress';
  if (exam.endAt && now > exam.endAt) return 'missed';
  if (exam.startAt && now < exam.startAt) return 'upcoming';
  return 'open';
}

/** ISO 7 хоногийн эхлэл (Даваа) — YYYY-MM-DD */
function weekKey(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}

/**
 * Профайлын бүх өгөгдөл. viewer — харж буй хэрэглэгч (сурагч өөрөө эсвэл багш/админ).
 * Багш зөвхөн өөрийн хичээл, шалгалтыг харна; сурагчид «дүн харуулахгүй» шалгалтын оноо нуугдана.
 */
async function buildProfile(student, viewer) {
  const now = new Date();
  const isStaff = viewer.role !== 'student';
  const scope = viewer.role === 'teacher' ? ownerFilter(viewer) : {};

  const [subs, atts] = await Promise.all([
    Submission.find({ student: student._id }).select('lesson taskId type score maxScore submittedAt needsReview late attemptCount').lean(),
    Attempt.find({ student: student._id }).select('exam score maxScore startedAt submittedAt deadlineAt needsReview').lean(),
  ]);

  const classOr = (ids) => (student.classId ? [{ classIds: student.classId }, { _id: { $in: ids } }] : [{ _id: { $in: ids } }]);
  const [lessons, exams, cls] = await Promise.all([
    Lesson.find({ ...scope, published: true, $or: classOr([...new Set(subs.map((s) => String(s.lesson)))]) })
      .select('title subject createdAt tasks._id tasks.type tasks.title tasks.questions.points tasks.maxPoints tasks.dueAt')
      .sort({ createdAt: 1 })
      .lean(),
    Exam.find({ ...scope, published: true, $or: classOr(atts.map((a) => a.exam)) })
      .select('title subject startAt endAt showResults durationMinutes questions.points createdAt')
      .sort({ createdAt: 1 })
      .lean(),
    student.classId ? Class.findById(student.classId).select('name').lean() : null,
  ]);

  const subjectIds = [...new Set([...lessons, ...exams].map((x) => x.subject).filter(Boolean).map(String))];
  const subjects = await Subject.find({ _id: { $in: subjectIds } }).select('name').lean();
  const subjectName = new Map(subjects.map((s) => [String(s._id), s.name]));
  // «Математик 10» → «Математик» (сурагч нэг ангид суралцдаг тул төрлөөр нь нэгтгэнэ)
  const subjOf = (x) => (x.subject && subjectName.has(String(x.subject)) ? splitName(subjectName.get(String(x.subject))).base : 'Бусад');

  // Ангийн (бүх оролцогчийн) дундаж — харьцуулалтад
  const lessonIds = lessons.map((l) => l._id);
  const examIds = exams.map((e) => e._id);
  const [taskAvgRows, examAvgRows] = await Promise.all([
    Submission.aggregate([
      { $match: { lesson: { $in: lessonIds }, submittedAt: { $ne: null }, score: { $ne: null }, maxScore: { $gt: 0 }, needsReview: { $ne: true } } },
      { $group: { _id: { l: '$lesson', t: '$taskId' }, p: { $avg: { $divide: ['$score', '$maxScore'] } }, n: { $sum: 1 } } },
    ]),
    Attempt.aggregate([
      { $match: { exam: { $in: examIds }, score: { $ne: null }, maxScore: { $gt: 0 }, needsReview: { $ne: true } } },
      { $group: { _id: '$exam', p: { $avg: { $divide: ['$score', '$maxScore'] } }, n: { $sum: 1 } } },
    ]),
  ]);
  const taskAvg = new Map(taskAvgRows.map((r) => [String(r._id.l) + ':' + String(r._id.t), Math.round(r.p * 1000) / 10]));
  const examAvg = new Map(examAvgRows.map((r) => [String(r._id), Math.round(r.p * 1000) / 10]));

  // ---- Хичээлийн даалгаврууд
  const subMap = new Map(subs.map((s) => [String(s.lesson) + ':' + String(s.taskId), s]));
  const lessonRows = lessons.map((l) => {
    const tasks = l.tasks.map((t) => {
      const sub = subMap.get(String(l._id) + ':' + String(t._id)) || null;
      const max = sub?.maxScore || taskMax(t);
      const state = taskState(t, sub, now);
      const score = state === 'graded' ? sub.score : null;
      let url = isStaff ? `/lessons/${l._id}/tasks/${t._id}` : `/learn/${l._id}/tasks/${t._id}`;
      if (isStaff && sub) url += '/submissions/' + sub._id;
      return {
        id: String(t._id),
        title: t.title,
        type: t.type,
        state,
        score,
        max,
        pct: pct(score, max),
        classAvg: taskAvg.get(String(l._id) + ':' + String(t._id)) ?? null,
        submittedAt: sub?.submittedAt || null,
        late: !!sub?.late,
        attempts: sub?.attemptCount || 0,
        dueAt: t.dueAt || null,
        url,
      };
    });
    const graded = tasks.filter((t) => t.state === 'graded');
    const done = tasks.filter((t) => t.state === 'graded' || t.state === 'pending').length;
    return {
      id: String(l._id),
      title: l.title,
      subject: subjOf(l),
      url: isStaff ? '/lessons/' + l._id : '/learn/' + l._id,
      tasks,
      done,
      total: tasks.length,
      score: graded.reduce((s, t) => s + t.score, 0),
      max: graded.reduce((s, t) => s + t.max, 0),
      pct: pct(graded.reduce((s, t) => s + t.score, 0), graded.reduce((s, t) => s + t.max, 0)),
    };
  });

  // ---- Шалгалтууд
  const attMap = new Map(atts.map((a) => [String(a.exam), a]));
  const examRows = exams.map((e) => {
    const att = attMap.get(String(e._id)) || null;
    const state = examState(e, att, now);
    const hidden = !isStaff && e.showResults === false;
    const max = att?.maxScore || (e.questions || []).reduce((s, q) => s + (q.points || 0), 0);
    const score = state === 'graded' && !hidden ? att.score : null;
    return {
      id: String(e._id),
      title: e.title,
      subject: subjOf(e),
      state,
      hidden: hidden && state === 'graded',
      score,
      max,
      pct: pct(score, max),
      classAvg: hidden ? null : (examAvg.get(String(e._id)) ?? null),
      date: att?.submittedAt || att?.startedAt || e.startAt || null,
      startAt: e.startAt || null,
      endAt: e.endAt || null,
      url: isStaff ? (att ? `/exams/${e._id}/attempts/${att._id}` : `/exams/${e._id}`) : att && state !== 'progress' ? `/student/attempts/${att._id}/result` : '/student',
    };
  });

  // ---- Нэгтгэл
  const allTasks = lessonRows.flatMap((l) => l.tasks.map((t) => ({ ...t, lesson: l.title, subject: l.subject })));
  const gradedTasks = allTasks.filter((t) => t.pct != null);
  const gradedExams = examRows.filter((e) => e.pct != null);
  const statusCounts = { graded: 0, pending: 0, todo: 0, overdue: 0 };
  for (const t of allTasks) statusCounts[t.state]++;

  const subjMap = new Map();
  const bucket = (name) => {
    if (!subjMap.has(name)) subjMap.set(name, { name, taskPcts: [], examPcts: [], done: 0, total: 0 });
    return subjMap.get(name);
  };
  for (const t of allTasks) {
    const b = bucket(t.subject);
    b.total++;
    if (t.state === 'graded' || t.state === 'pending') b.done++;
    if (t.pct != null) b.taskPcts.push(t.pct);
  }
  for (const e of gradedExams) bucket(e.subject).examPcts.push(e.pct);
  const bySubject = [...subjMap.values()]
    .map((b) => ({ name: b.name, taskAvg: avg(b.taskPcts), examAvg: avg(b.examPcts), completion: b.total ? Math.round((b.done / b.total) * 100) : null, done: b.done, total: b.total }))
    .sort((a, b) => a.name.localeCompare(b.name, 'mn'));

  // Цаг хугацааны дагуух дүн (сурагчийн илгээсэн огноогоор)
  const timeline = [
    ...gradedTasks.filter((t) => t.submittedAt).map((t) => ({ kind: 'task', date: t.submittedAt, pct: t.pct, title: t.title, sub: t.lesson, score: t.score, max: t.max, classAvg: t.classAvg, url: t.url })),
    ...gradedExams.filter((e) => e.date).map((e) => ({ kind: 'exam', date: e.date, pct: e.pct, title: e.title, sub: e.subject, score: e.score, max: e.max, classAvg: e.classAvg, url: e.url })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Сүүлийн 16 долоо хоногийн идэвх (илгээсэн даалгавар + шалгалт)
  const weeks = [];
  const start = new Date(now);
  start.setDate(start.getDate() - 7 * 15);
  for (let i = 0; i < 16; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + 7 * i);
    weeks.push({ week: weekKey(d), tasks: 0, exams: 0 });
  }
  const wIndex = new Map(weeks.map((w, i) => [w.week, i]));
  for (const t of allTasks) if (t.submittedAt && wIndex.has(weekKey(t.submittedAt))) weeks[wIndex.get(weekKey(t.submittedAt))].tasks++;
  for (const a of atts) {
    const d = a.submittedAt || (now > a.deadlineAt ? a.deadlineAt : null);
    if (d && wIndex.has(weekKey(d))) weeks[wIndex.get(weekKey(d))].exams++;
  }

  const dates = [...allTasks.map((t) => t.submittedAt), ...atts.map((a) => a.submittedAt || a.startedAt)].filter(Boolean).map((d) => +new Date(d));
  const summary = {
    tasksTotal: allTasks.length,
    tasksDone: statusCounts.graded + statusCounts.pending,
    completion: allTasks.length ? Math.round(((statusCounts.graded + statusCounts.pending) / allTasks.length) * 100) : null,
    taskAvg: avg(gradedTasks.map((t) => t.pct)),
    examsTotal: examRows.length,
    examsTaken: examRows.filter((e) => ['graded', 'pending'].includes(e.state)).length,
    examAvg: avg(gradedExams.map((e) => e.pct)),
    examsPending: examRows.filter((e) => e.state === 'pending').length,
    lastActive: dates.length ? new Date(Math.max(...dates)) : null,
  };

  return { cls, summary, statusCounts, bySubject, timeline, weeks, lessons: lessonRows.reverse(), exams: examRows };
}

/** Багшийн «Сурагчид» хуудсанд: ангийн сурагч бүрийн товч үзүүлэлт (цөөн query-гээр) */
async function classOverview(classId, viewer) {
  const scope = viewer.role === 'teacher' ? ownerFilter(viewer) : {};
  const cid = new Types.ObjectId(String(classId));
  const [students, lessons, exams] = await Promise.all([
    User.find({ role: 'student', classId: cid }).select('fullName username active').collation({ locale: 'mn' }).sort({ fullName: 1 }).lean(),
    Lesson.find({ ...scope, published: true, classIds: cid }).select('tasks._id').lean(),
    Exam.find({ ...scope, published: true, classIds: cid }).select('_id').lean(),
  ]);
  const ids = students.map((s) => s._id);
  const taskTotal = lessons.reduce((s, l) => s + l.tasks.length, 0);
  const [subRows, attRows] = await Promise.all([
    Submission.aggregate([
      { $match: { student: { $in: ids }, lesson: { $in: lessons.map((l) => l._id) }, submittedAt: { $ne: null } } },
      {
        $group: {
          _id: '$student',
          done: { $sum: 1 },
          p: { $avg: { $cond: [{ $and: [{ $gt: ['$maxScore', 0] }, { $ne: ['$score', null] }, { $ne: ['$needsReview', true] }] }, { $divide: ['$score', '$maxScore'] }, null] } },
          last: { $max: '$submittedAt' },
        },
      },
    ]),
    Attempt.aggregate([
      { $match: { student: { $in: ids }, exam: { $in: exams.map((e) => e._id) } } },
      {
        $group: {
          _id: '$student',
          taken: { $sum: 1 },
          p: { $avg: { $cond: [{ $and: [{ $gt: ['$maxScore', 0] }, { $ne: ['$score', null] }, { $ne: ['$needsReview', true] }] }, { $divide: ['$score', '$maxScore'] }, null] } },
          last: { $max: { $ifNull: ['$submittedAt', '$startedAt'] } },
        },
      },
    ]),
  ]);
  const subBy = new Map(subRows.map((r) => [String(r._id), r]));
  const attBy = new Map(attRows.map((r) => [String(r._id), r]));
  const r1 = (x) => (x == null ? null : Math.round(x * 1000) / 10);
  const rows = students.map((s) => {
    const a = subBy.get(String(s._id));
    const b = attBy.get(String(s._id));
    const last = [a?.last, b?.last].filter(Boolean).map((d) => +new Date(d));
    return {
      id: String(s._id),
      fullName: s.fullName,
      username: s.username,
      active: s.active,
      done: a?.done || 0,
      completion: taskTotal ? Math.round(((a?.done || 0) / taskTotal) * 100) : null,
      taskAvg: r1(a?.p),
      examsTaken: b?.taken || 0,
      examAvg: r1(b?.p),
      lastActive: last.length ? new Date(Math.max(...last)) : null,
    };
  });
  return { rows, taskTotal, examTotal: exams.length };
}

module.exports = { buildProfile, classOverview, canView, staffClassIds };
