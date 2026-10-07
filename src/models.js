const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

// ---------- Анги / бүлэг ----------
const classSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    schoolYear: { type: String, trim: true, maxlength: 20 },
    description: { type: String, trim: true, maxlength: 2000 },
    // Өрсөлдөөнт Coding-д оролцох эсэх (админ ангиар нээнэ)
    codingEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);
// "10А" ба "10а" нэг анги гэж үзнэ
classSchema.index({ name: 1 }, { unique: true, collation: { locale: 'mn', strength: 2 } });

// ---------- Хичээл ----------
// Шалгалт болон цаашид хичээлийн контент энэ объектод харьяалагдана
const subjectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    code: { type: String, trim: true, maxlength: 20 },
    description: { type: String, trim: true, maxlength: 2000 },
    // Архивласан хичээлээр шинэ шалгалт үүсгэхгүй, хуучин шалгалт хэвээр үлдэнэ
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);
subjectSchema.index({ name: 1 }, { unique: true, collation: { locale: 'mn', strength: 2 } });

// ---------- Хэрэглэгч (админ, багш, сурагч) ----------
const userSchema = new Schema(
  {
    // Нэвтрэх нэрийг жижиг үсгээр хадгалж, том/жижиг үсэг ялгахгүй давтагдашгүй байлгана
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true, trim: true, maxlength: 150 },
    role: { type: String, required: true, enum: ['admin', 'teacher', 'student'] },
    classId: { type: Types.ObjectId, ref: 'Class', default: null, index: true },
    // Багшийн заадаг хичээлүүд
    subjectIds: { type: [{ type: Types.ObjectId, ref: 'Subject' }], default: [], index: true },
    // Багш AI prompt, текстээр олноор оруулах боломжийг ашиглах эрх (админд үргэлж нээлттэй)
    aiEnabled: { type: Boolean, default: false },
    // Өрсөлдөөнт Coding: зэрэглэлээр нээгддэг аватар, өнгө; хамгийн сүүлд баярлуулсан зэрэглэл
    codingAvatar: { type: String, default: '' },
    codingColor: { type: String, default: '' },
    codingTierSeen: { type: String, default: 'newbie' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);
userSchema.index({ role: 1, fullName: 1 });

// ---------- Шалгалт (асуултууд дотроо) ----------
const optionSchema = new Schema({
  text: { type: String, required: true, maxlength: 2000 },
  isCorrect: { type: Boolean, default: false },
});

const questionSchema = new Schema({
  type: { type: String, required: true, enum: ['single', 'multiple', 'text'] },
  text: { type: String, required: true, maxlength: 10000 },
  points: { type: Number, required: true, min: 0.01, max: 1000, default: 1 },
  options: { type: [optionSchema], default: [] },
  // Нээлттэй асуултын зөв хариултууд. Хоосон бол багш гараар дүгнэнэ.
  acceptedAnswers: { type: [String], default: [] },
});

const examSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 5000 },
    subject: { type: Types.ObjectId, ref: 'Subject', default: null, index: true },
    createdBy: { type: Types.ObjectId, ref: 'User', index: true },
    durationMinutes: { type: Number, required: true, min: 1, max: 600, default: 40 },
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },
    shuffleQuestions: { type: Boolean, default: false },
    showResults: { type: Boolean, default: true },
    // Сурагчид зөв хариултыг хэзээ харуулах
    showAnswers: { type: String, enum: ['never', 'after_close', 'after_submit'], default: 'never' },
    published: { type: Boolean, default: false },
    classIds: { type: [{ type: Types.ObjectId, ref: 'Class' }], default: [], index: true },
    questions: { type: [questionSchema], default: [] },
  },
  { timestamps: true }
);
examSchema.virtual('maxScore').get(function () {
  return this.questions.reduce((s, q) => s + q.points, 0);
});

// ---------- Шалгалт өгсөн оролдлого ----------
const answerSchema = new Schema(
  {
    questionId: { type: Types.ObjectId, required: true },
    selectedOptions: { type: [Types.ObjectId], default: [] },
    textAnswer: { type: String, default: null },
    isCorrect: { type: Boolean, default: null }, // null = багш дүгнэх шаардлагатай
    points: { type: Number, default: 0 },
  },
  { _id: false }
);

const attemptSchema = new Schema(
  {
    exam: { type: Types.ObjectId, ref: 'Exam', required: true },
    student: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    startedAt: { type: Date, required: true },
    deadlineAt: { type: Date, required: true },
    submittedAt: { type: Date, default: null },
    questionOrder: { type: [Types.ObjectId], default: [] },
    // Илгээхээс өмнөх түр хариултууд: { questionId: [optionId] | "текст" }
    draft: { type: Schema.Types.Mixed, default: {} },
    answers: { type: [answerSchema], default: [] },
    score: { type: Number, default: null },
    maxScore: { type: Number, default: null },
    needsReview: { type: Boolean, default: false },
  },
  { timestamps: true, minimize: false }
);
attemptSchema.index({ exam: 1, student: 1 }, { unique: true });
attemptSchema.index({ submittedAt: 1, deadlineAt: 1 });

// ---------- Хичээл (онол + даалгавар) ----------
const fileRefSchema = new Schema(
  {
    fileId: { type: Types.ObjectId, required: true }, // GridFS файл
    name: { type: String, required: true, maxlength: 255 },
    size: { type: Number, default: 0 },
    contentType: { type: String, default: 'application/octet-stream' },
  },
  { _id: false }
);

const taskSchema = new Schema({
  type: { type: String, required: true, enum: ['quiz', 'assignment'] },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  instructions: { type: String, default: '', maxlength: 50000 }, // markdown
  // Тест
  questions: { type: [questionSchema], default: [] },
  allowRetry: { type: Boolean, default: true },
  showAnswers: { type: Boolean, default: true },
  // Заавартай даалгавар (файл илгээх)
  maxPoints: { type: Number, default: 10, min: 0.5, max: 1000 },
  dueAt: { type: Date, default: null },
  allowLate: { type: Boolean, default: true },
});
taskSchema.virtual('totalPoints').get(function () {
  return this.type === 'quiz' ? this.questions.reduce((s, q) => s + q.points, 0) : this.maxPoints;
});

const lessonSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    subject: { type: Types.ObjectId, ref: 'Subject', default: null, index: true },
    createdBy: { type: Types.ObjectId, ref: 'User', index: true },
    classIds: { type: [{ type: Types.ObjectId, ref: 'Class' }], default: [], index: true },
    published: { type: Boolean, default: false },
    theory: { type: String, default: '', maxlength: 300000 }, // markdown
    attachments: { type: [fileRefSchema], default: [] },
    tasks: { type: [taskSchema], default: [] },
  },
  { timestamps: true }
);

// Сурагчийн даалгаврын гүйцэтгэл (тест эсвэл файл илгээлт). Даалгавар бүрт нэг бичлэг.
const submissionSchema = new Schema(
  {
    lesson: { type: Types.ObjectId, ref: 'Lesson', required: true },
    taskId: { type: Types.ObjectId, required: true },
    student: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true, enum: ['quiz', 'assignment'] },
    // Тест
    answers: { type: [answerSchema], default: [] },
    attemptCount: { type: Number, default: 0 },
    // Даалгавар
    files: { type: [fileRefSchema], default: [] },
    text: { type: String, default: '', maxlength: 20000 },
    late: { type: Boolean, default: false },
    // Дүн
    submittedAt: { type: Date, default: null },
    score: { type: Number, default: null }, // null = дүгнэгдээгүй
    maxScore: { type: Number, default: null },
    needsReview: { type: Boolean, default: false },
    feedback: { type: String, default: '', maxlength: 5000 },
    gradedBy: { type: Types.ObjectId, ref: 'User', default: null },
    gradedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
submissionSchema.index({ lesson: 1, taskId: 1, student: 1 }, { unique: true });

// ---------- Системийн тохиргоо (key → value) ----------
const settingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

// ---------- Өрсөлдөөнт Coding: бодлого, тест, илгээлт ----------
const problemSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    // Бодлогын дугаар: анх нийтлэгдэх үед 1, 2, 3… (дахин ашиглахгүй)
    number: { type: Number, default: null, index: true },
    // Хүндийн зэрэг: бүтэн бодвол хялбар 25, дунд 50, хүнд 100 оноо (src/coding-ranks.js)
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
    subject: { type: Types.ObjectId, ref: 'Subject', default: null, index: true },
    createdBy: { type: Types.ObjectId, ref: 'User', index: true },
    classIds: { type: [{ type: Types.ObjectId, ref: 'Class' }], default: [], index: true },
    published: { type: Boolean, default: false },
    statement: { type: String, default: '', maxlength: 200000 }, // markdown
    attachments: { type: [fileRefSchema], default: [] }, // өгүүлбэр доторх зураг
    timeLimitMs: { type: Number, default: 1000, min: 100, max: 10000 },
    memoryLimitMb: { type: Number, default: 256, min: 16, max: 1024 },
    languages: { type: [String], default: ['cpp17', 'py38', 'py3'] },
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },
    showStandings: { type: Boolean, default: true },
    // Багшийн зөв бодолт: тестийн гаралтыг автоматаар үүсгэнэ (сурагчид харагдахгүй)
    refLanguage: { type: String, default: '' },
    refCode: { type: String, default: '', maxlength: 100000 },
    generatorCode: { type: String, default: '', maxlength: 100000 },
    testCount: { type: Number, default: 0 },
    sampleCount: { type: Number, default: 0 },
    testsSize: { type: Number, default: 0 }, // байт
  },
  { timestamps: true }
);

const problemTestSchema = new Schema({
  problem: { type: Types.ObjectId, ref: 'Problem', required: true },
  order: { type: Number, required: true },
  name: { type: String, default: '', maxlength: 200 }, // эх файлын нэр (zip-ээс)
  input: { type: String, default: '' },
  output: { type: String, default: '' },
  sample: { type: Boolean, default: false }, // сурагчид харагдах жишээ
});
problemTestSchema.index({ problem: 1, order: 1 });

const testResultSchema = new Schema(
  {
    verdict: String,
    timeMs: Number,
    memoryKb: Number,
    sample: Boolean,
    output: String, // зөвхөн жишээ тестэд (богиносгосон)
    stderr: String,
  },
  { _id: false }
);

const codeSubmissionSchema = new Schema(
  {
    problem: { type: Types.ObjectId, ref: 'Problem', required: true },
    user: { type: Types.ObjectId, ref: 'User', required: true },
    isStaff: { type: Boolean, default: false }, // багшийн туршилт — самбарт тооцохгүй
    language: { type: String, required: true },
    code: { type: String, required: true, maxlength: 65536 },
    status: { type: String, enum: ['queued', 'running', 'done', 'error'], default: 'queued', index: true },
    verdict: { type: String, default: '' }, // AC WA TLE MLE RE CE OLE
    score: { type: Number, default: 0 }, // 0–100
    passed: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    timeMs: { type: Number, default: 0 },
    memoryKb: { type: Number, default: 0 },
    compileOutput: { type: String, default: '' },
    results: { type: [testResultSchema], default: [] },
    error: { type: String, default: '' },
    judgedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
codeSubmissionSchema.index({ problem: 1, user: 1, createdAt: -1 });
codeSubmissionSchema.index({ status: 1, createdAt: 1 });

module.exports = {
  Problem: mongoose.model('Problem', problemSchema),
  ProblemTest: mongoose.model('ProblemTest', problemTestSchema),
  CodeSubmission: mongoose.model('CodeSubmission', codeSubmissionSchema),
  Setting: mongoose.model('Setting', settingSchema),
  Lesson: mongoose.model('Lesson', lessonSchema),
  Submission: mongoose.model('Submission', submissionSchema),
  Subject: mongoose.model('Subject', subjectSchema),
  Class: mongoose.model('Class', classSchema),
  User: mongoose.model('User', userSchema),
  Exam: mongoose.model('Exam', examSchema),
  Attempt: mongoose.model('Attempt', attemptSchema),
};
