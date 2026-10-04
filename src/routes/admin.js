const express = require('express');
const bcrypt = require('bcryptjs');
const { Subject, Class, User, Exam, Attempt, Lesson, Submission } = require('../models');
const files = require('../files');
const { requireRole, flash } = require('../middleware/auth');
const { clean, genPassword, USERNAME_RE, isId, escapeRegex, toArray } = require('../helpers');

const router = express.Router();
router.use(requireRole('admin'));

const ROLES = ['admin', 'teacher', 'student'];

function sanitizePrefix(p) {
  const s = clean(p, 16).toLowerCase().replace(/[^a-z0-9._-]/g, '');
  return s || 'st';
}

/** prefix + 001, 002 ... хэлбэрээр сул нэвтрэх нэрүүд үүсгэнэ */
async function usernameGenerator(prefix) {
  const re = new RegExp('^' + escapeRegex(prefix) + '\\d+$');
  const taken = new Set((await User.find({ username: re }).select('username').lean()).map((u) => u.username));
  let n = 1;
  return () => {
    let name;
    do name = prefix + String(n++).padStart(3, '0');
    while (taken.has(name));
    taken.add(name);
    return name;
  };
}

/** Формоос ирсэн хичээлийн id-уудаас бодит байгааг л үлдээнэ */
async function validSubjectIds(raw) {
  const ids = toArray(raw).filter(isId);
  if (!ids.length) return [];
  return (await Subject.find({ _id: { $in: ids } }).select('_id').lean()).map((s) => s._id);
}

function isDuplicateKey(err) {
  return err?.code === 11000;
}

// ---------------- Хянах самбар ----------------
router.get('/', async (req, res) => {
  const [subjects, classes, students, teachers, exams, submitted] = await Promise.all([
    Subject.countDocuments({ active: true }),
    Class.countDocuments(),
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'teacher' }),
    Exam.countDocuments(),
    Attempt.countDocuments({ submittedAt: { $ne: null } }),
  ]);
  res.render('admin/dashboard', {
    title: 'Хянах самбар',
    stats: { subjects, classes, students, teachers, exams, submitted },
  });
});

// ---------------- Хичээл ----------------
function parseSubjectForm(body) {
  return {
    name: clean(body.name, 100),
    code: clean(body.code, 20),
    description: clean(body.description, 2000),
  };
}

router.get('/subjects', async (req, res) => {
  const [subjects, teacherCounts, examCounts] = await Promise.all([
    Subject.find().collation({ locale: 'mn' }).sort({ active: -1, name: 1 }).lean(),
    User.aggregate([
      { $match: { role: 'teacher', active: true } },
      { $unwind: '$subjectIds' },
      { $group: { _id: '$subjectIds', n: { $sum: 1 } } },
    ]),
    Exam.aggregate([{ $match: { subject: { $ne: null } } }, { $group: { _id: '$subject', n: { $sum: 1 } } }]),
  ]);
  const tMap = new Map(teacherCounts.map((c) => [String(c._id), c.n]));
  const eMap = new Map(examCounts.map((c) => [String(c._id), c.n]));
  for (const s of subjects) {
    s.teacherCount = tMap.get(String(s._id)) || 0;
    s.examCount = eMap.get(String(s._id)) || 0;
  }
  res.render('admin/subjects', { title: 'Хичээлийн төрөл', subjects });
});

router.post('/subjects', async (req, res) => {
  const data = parseSubjectForm(req.body);
  if (!data.name) {
    flash(req, 'error', 'Хичээлийн нэрийг оруулна уу.');
    return res.redirect('/admin/subjects');
  }
  try {
    await Subject.create(data);
    flash(req, 'success', `"${data.name}" хичээл нэмэгдлээ. Одоо багш нарт оноож өгнө үү.`);
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
    flash(req, 'error', `"${data.name}" нэртэй хичээл аль хэдийн бүртгэлтэй байна.`);
  }
  res.redirect('/admin/subjects');
});

async function loadSubject(req, res, next) {
  const subject = isId(req.params.id) ? await Subject.findById(req.params.id).lean() : null;
  if (!subject) return res.status(404).render('error', { title: 'Олдсонгүй', message: 'Хичээл олдсонгүй.' });
  req.subject = subject;
  next();
}

router.get('/subjects/:id', loadSubject, async (req, res) => {
  const [teachers, allTeachers, examCount] = await Promise.all([
    User.find({ role: 'teacher', subjectIds: req.subject._id }).sort({ fullName: 1 }).lean(),
    User.find({ role: 'teacher', active: true }).sort({ fullName: 1 }).lean(),
    Promise.all([Exam.countDocuments({ subject: req.subject._id }), Lesson.countDocuments({ subject: req.subject._id })]).then(([a, b]) => a + b),
  ]);
  res.render('admin/subject', { title: req.subject.name, subject: req.subject, teachers, allTeachers, examCount });
});

router.post('/subjects/:id', loadSubject, async (req, res) => {
  const data = parseSubjectForm(req.body);
  const back = '/admin/subjects/' + req.subject._id;
  if (!data.name) {
    flash(req, 'error', 'Хичээлийн нэрийг оруулна уу.');
    return res.redirect(back);
  }
  try {
    await Subject.updateOne({ _id: req.subject._id }, data);
    flash(req, 'success', 'Хичээлийн мэдээлэл хадгалагдлаа.');
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
    flash(req, 'error', `"${data.name}" нэртэй хичээл аль хэдийн бүртгэлтэй байна.`);
  }
  res.redirect(back);
});

// Энэ хичээлийг заадаг багш нарыг тохируулах
router.post('/subjects/:id/teachers', loadSubject, async (req, res) => {
  const ids = toArray(req.body.teacherIds).filter(isId);
  await User.updateMany(
    { role: 'teacher', subjectIds: req.subject._id, _id: { $nin: ids } },
    { $pull: { subjectIds: req.subject._id } }
  );
  await User.updateMany({ role: 'teacher', _id: { $in: ids } }, { $addToSet: { subjectIds: req.subject._id } });
  flash(req, 'success', 'Хичээл заах багш нар хадгалагдлаа.');
  res.redirect('/admin/subjects/' + req.subject._id);
});

router.post('/subjects/:id/toggle', loadSubject, async (req, res) => {
  const active = !req.subject.active;
  await Subject.updateOne({ _id: req.subject._id }, { active });
  flash(
    req,
    'success',
    active
      ? `"${req.subject.name}" хичээлийг идэвхжүүллээ.`
      : `"${req.subject.name}" хичээлийг архивлалаа. Шинэ шалгалт үүсгэх боломжгүй, хуучин шалгалтууд хэвээр.`
  );
  res.redirect('/admin/subjects/' + req.subject._id);
});

router.post('/subjects/:id/delete', loadSubject, async (req, res) => {
  const examCount = (await Exam.countDocuments({ subject: req.subject._id })) + (await Lesson.countDocuments({ subject: req.subject._id }));
  if (examCount) {
    flash(req, 'error', `Энэ төрлөөр ${examCount} шалгалт/хичээл байгаа тул устгах боломжгүй. Оронд нь архивлана уу.`);
    return res.redirect('/admin/subjects/' + req.subject._id);
  }
  await User.updateMany({ subjectIds: req.subject._id }, { $pull: { subjectIds: req.subject._id } });
  await Subject.deleteOne({ _id: req.subject._id });
  flash(req, 'success', `"${req.subject.name}" хичээл устгагдлаа.`);
  res.redirect('/admin/subjects');
});

// ---------------- Анги, бүлэг ----------------
router.get('/classes', async (req, res) => {
  const classes = await Class.find().sort({ name: 1 }).lean();
  const counts = await User.aggregate([
    { $match: { role: 'student', classId: { $ne: null } } },
    { $group: { _id: '$classId', n: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.n]));
  for (const c of classes) c.studentCount = countMap.get(String(c._id)) || 0;
  res.render('admin/classes', { title: 'Анги, бүлэг', classes });
});

router.post('/classes', async (req, res) => {
  const name = clean(req.body.name, 100);
  if (!name) {
    flash(req, 'error', 'Ангийн нэрийг оруулна уу.');
    return res.redirect('/admin/classes');
  }
  try {
    const cls = await Class.create({
      name,
      schoolYear: clean(req.body.schoolYear, 20),
      description: clean(req.body.description, 2000),
    });
    flash(req, 'success', `"${name}" анги үүслээ.`);
    res.redirect('/admin/classes/' + cls._id);
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
    flash(req, 'error', `"${name}" нэртэй анги аль хэдийн бүртгэлтэй байна.`);
    res.redirect('/admin/classes');
  }
});

// Өрсөлдөөнт Coding-ийг бүх ангид нэг дор нээх / хаах
router.post('/classes/coding-all', async (req, res) => {
  const enable = req.body.enable === '1';
  await Class.updateMany({}, { $set: { codingEnabled: enable } });
  flash(req, 'success', enable ? 'Өрсөлдөөнт Coding бүх ангид нээгдлээ.' : 'Өрсөлдөөнт Coding бүх ангид хаагдлаа.');
  res.redirect('/admin/classes');
});

async function loadClass(req, res, next) {
  const cls = isId(req.params.id) ? await Class.findById(req.params.id).lean() : null;
  if (!cls) return res.status(404).render('error', { title: 'Олдсонгүй', message: 'Анги олдсонгүй.' });
  req.cls = cls;
  next();
}

async function renderClass(req, res, extra = {}) {
  const students = await User.find({ role: 'student', classId: req.cls._id }).sort({ fullName: 1 }).lean();
  res.render('admin/class', {
    title: req.cls.name,
    cls: req.cls,
    students,
    bulkText: '',
    bulkPrefix: 'st',
    bulkErrors: [],
    ...extra,
  });
}

router.get('/classes/:id', loadClass, (req, res) => renderClass(req, res));

router.post('/classes/:id', loadClass, async (req, res) => {
  const name = clean(req.body.name, 100);
  if (!name) {
    flash(req, 'error', 'Ангийн нэрийг оруулна уу.');
    return res.redirect('/admin/classes/' + req.cls._id);
  }
  try {
    await Class.updateOne(
      { _id: req.cls._id },
      { name, schoolYear: clean(req.body.schoolYear, 20), description: clean(req.body.description, 2000) }
    );
    flash(req, 'success', 'Ангийн мэдээлэл хадгалагдлаа.');
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
    flash(req, 'error', `"${name}" нэртэй анги аль хэдийн бүртгэлтэй байна.`);
  }
  res.redirect('/admin/classes/' + req.cls._id);
});

// Тухайн ангид Өрсөлдөөнт Coding нээх / хаах
router.post('/classes/:id/coding', loadClass, async (req, res) => {
  const enable = !req.cls.codingEnabled;
  await Class.updateOne({ _id: req.cls._id }, { $set: { codingEnabled: enable } });
  flash(req, 'success', `"${req.cls.name}" ангид Өрсөлдөөнт Coding ${enable ? 'нээгдлээ' : 'хаагдлаа'}.`);
  const back = req.body.back === 'class' ? '/admin/classes/' + req.cls._id : '/admin/classes';
  res.redirect(back);
});

router.post('/classes/:id/delete', loadClass, async (req, res) => {
  await User.updateMany({ classId: req.cls._id }, { $set: { classId: null } });
  await Exam.updateMany({ classIds: req.cls._id }, { $pull: { classIds: req.cls._id } });
  await Lesson.updateMany({ classIds: req.cls._id }, { $pull: { classIds: req.cls._id } });
  await Class.deleteOne({ _id: req.cls._id });
  flash(req, 'success', `"${req.cls.name}" анги устгагдлаа. Сурагчид ангигүй болсон.`);
  res.redirect('/admin/classes');
});

// Нэг сурагч нэмэх
router.post('/classes/:id/students', loadClass, async (req, res) => {
  const fullName = clean(req.body.fullName, 150);
  let username = clean(req.body.username, 32).toLowerCase();
  let password = String(req.body.password ?? '').trim();
  const back = '/admin/classes/' + req.cls._id;

  if (!fullName) {
    flash(req, 'error', 'Сурагчийн нэрийг оруулна уу.');
    return res.redirect(back);
  }
  if (username && !USERNAME_RE.test(username)) {
    flash(req, 'error', 'Нэвтрэх нэр 3–32 тэмдэгт, зөвхөн латин үсэг, тоо, . _ - байна.');
    return res.redirect(back);
  }
  if (password && password.length < 6) {
    flash(req, 'error', 'Нууц үг хамгийн багадаа 6 тэмдэгт байна.');
    return res.redirect(back);
  }
  if (!username) username = (await usernameGenerator(sanitizePrefix(req.body.prefix)))();
  if (!password) password = genPassword();

  try {
    await User.create({
      username,
      passwordHash: await bcrypt.hash(password, 10),
      fullName,
      role: 'student',
      classId: req.cls._id,
    });
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
    flash(req, 'error', `"${username}" нэвтрэх нэр аль хэдийн бүртгэлтэй байна.`);
    return res.redirect(back);
  }
  flash(req, 'success', `${fullName} нэмэгдлээ → нэвтрэх нэр: ${username}, нууц үг: ${password}`);
  res.redirect(back);
});

// Олон сурагч нэг дор нэмэх. Мөр бүр: "Нэр" | "Нэр, нэвтрэх нэр" | "Нэр, нэвтрэх нэр, нууц үг"
router.post('/classes/:id/students/bulk', loadClass, async (req, res) => {
  const text = String(req.body.lines ?? '').slice(0, 100_000);
  const prefix = sanitizePrefix(req.body.prefix);
  const rows = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split(/\t|,|;/).map((p) => p.trim()));

  const errors = [];
  if (!rows.length) errors.push('Сурагчдын жагсаалт хоосон байна.');
  if (rows.length > 500) errors.push('Нэг удаад хамгийн ихдээ 500 сурагч нэмнэ.');

  const explicit = rows.map((r) => (r[1] || '').toLowerCase()).filter(Boolean);
  const existing = new Set(
    (await User.find({ username: { $in: explicit } }).select('username').lean()).map((u) => u.username)
  );
  const seen = new Set();
  rows.forEach((r, i) => {
    const line = i + 1;
    const [name, uname = '', pass = ''] = r;
    if (!name) errors.push(`${line}-р мөр: нэр хоосон байна.`);
    if (name && name.length > 150) errors.push(`${line}-р мөр: нэр хэт урт байна.`);
    const u = uname.toLowerCase();
    if (u) {
      if (!USERNAME_RE.test(u)) errors.push(`${line}-р мөр: "${uname}" нэвтрэх нэр буруу (латин үсэг, тоо, . _ -).`);
      else if (existing.has(u)) errors.push(`${line}-р мөр: "${u}" нэвтрэх нэр аль хэдийн бүртгэлтэй.`);
      else if (seen.has(u)) errors.push(`${line}-р мөр: "${u}" нэвтрэх нэр жагсаалтад давхардсан.`);
      seen.add(u);
    }
    if (pass && pass.length < 6) errors.push(`${line}-р мөр: нууц үг хамгийн багадаа 6 тэмдэгт.`);
  });

  if (errors.length) {
    return renderClass(req, res, { bulkText: text, bulkPrefix: prefix, bulkErrors: errors });
  }

  const nextName = await usernameGenerator(prefix);
  const credentials = [];
  const docs = [];
  for (const [name, uname = '', pass = ''] of rows) {
    let username = uname.toLowerCase();
    if (!username) {
      do username = nextName();
      while (seen.has(username));
    }
    const password = pass || genPassword();
    credentials.push({ fullName: name, username, password });
    docs.push({
      username,
      passwordHash: await bcrypt.hash(password, 10),
      fullName: name,
      role: 'student',
      classId: req.cls._id,
    });
  }

  try {
    await User.insertMany(docs, { ordered: true });
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
    return renderClass(req, res, {
      bulkText: text,
      bulkPrefix: prefix,
      bulkErrors: ['Нэвтрэх нэр давхардлаа (өөр хэрэглэгч зэрэг бүртгэсэн байж магадгүй). Дахин оролдоно уу.'],
    });
  }

  res.render('admin/credentials', { title: 'Нэвтрэх мэдээлэл', cls: req.cls, credentials });
});

// ---------------- Хэрэглэгчид ----------------
router.get('/users', async (req, res) => {
  const role = ROLES.includes(req.query.role) ? req.query.role : 'teacher';
  const q = clean(req.query.q, 100);
  const classFilter = isId(req.query.classId) ? req.query.classId : '';

  const filter = { role };
  if (q) {
    const re = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ fullName: re }, { username: re }];
  }
  if (role === 'student' && classFilter) filter.classId = classFilter;
  if (role === 'student' && req.query.classId === 'none') filter.classId = null;

  const [users, classes, subjects] = await Promise.all([
    User.find(filter).sort({ fullName: 1 }).limit(1000).lean(),
    Class.find().sort({ name: 1 }).lean(),
    Subject.find().collation({ locale: 'mn' }).sort({ name: 1 }).lean(),
  ]);
  const classMap = new Map(classes.map((c) => [String(c._id), c.name]));
  const subjectMap = new Map(subjects.map((s) => [String(s._id), s.name]));
  for (const u of users) {
    u.className = u.classId ? classMap.get(String(u.classId)) : null;
    u.subjectNames = (u.subjectIds || []).map((id) => subjectMap.get(String(id))).filter(Boolean);
  }

  res.render('admin/users', {
    title: 'Хэрэглэгчид',
    role,
    users,
    classes,
    subjects: subjects.filter((s) => s.active),
    q,
    classFilter: req.query.classId === 'none' ? 'none' : classFilter,
  });
});

router.post('/users', async (req, res) => {
  const role = ROLES.includes(req.body.role) ? req.body.role : 'teacher';
  const back = '/admin/users?role=' + role;
  const fullName = clean(req.body.fullName, 150);
  const username = clean(req.body.username, 32).toLowerCase();
  let password = String(req.body.password ?? '').trim();
  const classId = role === 'student' && isId(req.body.classId) ? req.body.classId : null;
  const subjectIds = role === 'teacher' ? await validSubjectIds(req.body.subjectIds) : [];
  const aiEnabled = role === 'teacher' && req.body.aiEnabled === 'on';

  if (!fullName || !username) {
    flash(req, 'error', 'Нэр болон нэвтрэх нэрийг оруулна уу.');
    return res.redirect(back);
  }
  if (!USERNAME_RE.test(username)) {
    flash(req, 'error', 'Нэвтрэх нэр 3–32 тэмдэгт, зөвхөн латин үсэг, тоо, . _ - байна.');
    return res.redirect(back);
  }
  if (password && password.length < 6) {
    flash(req, 'error', 'Нууц үг хамгийн багадаа 6 тэмдэгт байна.');
    return res.redirect(back);
  }
  if (!password) password = genPassword(8);

  try {
    await User.create({ username, passwordHash: await bcrypt.hash(password, 10), fullName, role, classId, subjectIds, aiEnabled });
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
    flash(req, 'error', `"${username}" нэвтрэх нэр аль хэдийн бүртгэлтэй байна.`);
    return res.redirect(back);
  }
  flash(req, 'success', `${fullName} бүртгэгдлээ → нэвтрэх нэр: ${username}, нууц үг: ${password}`);
  res.redirect(back);
});

async function loadTargetUser(req, res, next) {
  const target = isId(req.params.id) ? await User.findById(req.params.id).lean() : null;
  if (!target) return res.status(404).render('error', { title: 'Олдсонгүй', message: 'Хэрэглэгч олдсонгүй.' });
  req.target = target;
  next();
}

router.get('/users/:id', loadTargetUser, async (req, res) => {
  const [classes, subjects] = await Promise.all([
    Class.find().sort({ name: 1 }).lean(),
    Subject.find().collation({ locale: 'mn' }).sort({ active: -1, name: 1 }).lean(),
  ]);
  res.render('admin/user-edit', { title: req.target.fullName, target: req.target, classes, subjects });
});

router.post('/users/:id', loadTargetUser, async (req, res) => {
  const target = req.target;
  const isSelf = String(target._id) === String(req.user._id);
  const back = '/admin/users/' + target._id;

  const fullName = clean(req.body.fullName, 150);
  const username = clean(req.body.username, 32).toLowerCase();
  const role = isSelf ? target.role : ROLES.includes(req.body.role) ? req.body.role : target.role;
  const active = isSelf ? true : req.body.active === 'on';
  const classId = role === 'student' && isId(req.body.classId) ? req.body.classId : null;
  const subjectIds = role === 'teacher' ? await validSubjectIds(req.body.subjectIds) : [];
  const aiEnabled = role === 'teacher' && req.body.aiEnabled === 'on';

  if (!fullName || !USERNAME_RE.test(username)) {
    flash(req, 'error', 'Нэр болон зөв нэвтрэх нэр оруулна уу.');
    return res.redirect(back);
  }
  try {
    await User.updateOne({ _id: target._id }, { fullName, username, role, active, classId, subjectIds, aiEnabled });
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
    flash(req, 'error', `"${username}" нэвтрэх нэр аль хэдийн бүртгэлтэй байна.`);
    return res.redirect(back);
  }
  flash(req, 'success', 'Хэрэглэгчийн мэдээлэл хадгалагдлаа.');
  res.redirect(back);
});

router.post('/users/:id/reset-password', loadTargetUser, async (req, res) => {
  let password = String(req.body.password ?? '').trim();
  if (password && password.length < 6) {
    flash(req, 'error', 'Нууц үг хамгийн багадаа 6 тэмдэгт байна.');
    return res.redirect('/admin/users/' + req.target._id);
  }
  if (!password) password = genPassword(req.target.role === 'student' ? 6 : 8);
  await User.updateOne({ _id: req.target._id }, { passwordHash: await bcrypt.hash(password, 10) });
  flash(req, 'success', `${req.target.fullName}-ийн шинэ нууц үг: ${password}`);
  res.redirect('/admin/users/' + req.target._id);
});

router.post('/users/:id/delete', loadTargetUser, async (req, res) => {
  const target = req.target;
  if (String(target._id) === String(req.user._id)) {
    flash(req, 'error', 'Өөрийгөө устгах боломжгүй.');
    return res.redirect('/admin/users/' + target._id);
  }
  await Attempt.deleteMany({ student: target._id });
  const subs = await Submission.find({ student: target._id }).select('files').lean();
  await files.deleteFiles(subs.flatMap((s) => s.files.map((f) => f.fileId)));
  await Submission.deleteMany({ student: target._id });
  await User.deleteOne({ _id: target._id });
  flash(req, 'success', `${target.fullName} устгагдлаа.`);
  res.redirect('/admin/users?role=' + target.role);
});

module.exports = router;
