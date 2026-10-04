// Шалгалт, хичээл зэрэг хичээлийн төрөлд (Subject) харьяалагдах контентын эрхийн нийтлэг дүрэм
const { Subject } = require('./models');

/**
 * Админ бүгдийг удирдана.
 * Багш зөвхөн өөрийн үүсгэсэн, өөрт оноогдсон хичээлийн төрлийн контентыг удирдана
 * (хичээлийн төрөл сонгоогүй хуучин контентыг ч харж, төрөл онооно).
 */
function ownerFilter(user) {
  if (user.role === 'admin') return {};
  return { createdBy: user._id, $or: [{ subject: { $in: user.subjectIds || [] } }, { subject: null }] };
}

// ---------- Өрсөлдөөнт Coding ----------
// Бодлого оруулах эрх: админ, эсвэл «Мэдээлэл зүй» төрөл оноогдсон багш. Бүх сурагчид хамтдаа өрсөлдөнө.
const INFORMATICS = { $or: [{ name: /мэдээлэл/i }, { code: /^(INFO|ICT|CS|IT)$/i }] };

/** Мэдээлэл зүйн багш эсэх (loadUser дотор нэг удаа тооцоолно) */
async function isCodingStaff(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role !== 'teacher' || !(user.subjectIds || []).length) return false;
  return !!(await Subject.exists({ _id: { $in: user.subjectIds }, ...INFORMATICS }));
}

/** Админ бүх бодлогыг, багш өөрийн үүсгэснийг удирдана */
function problemOwnerFilter(user) {
  return user.role === 'admin' ? {} : { createdBy: user._id };
}

/** Шинээр үүсгэхэд сонгож болох хичээлийн төрлүүд */
function allowedSubjects(user) {
  const filter = { active: true };
  if (user.role !== 'admin') filter._id = { $in: user.subjectIds || [] };
  return Subject.find(filter).collation({ locale: 'mn' }).sort({ name: 1 }).lean();
}

/** Маягтад харуулах төрлүүд: зөвшөөрөгдсөн + (засаж байгаа бол) одоогийн архивласан төрөл */
async function formSubjects(user, currentSubjectId) {
  const list = await allowedSubjects(user);
  if (currentSubjectId && !list.some((s) => s._id.equals(currentSubjectId))) {
    const cur = await Subject.findById(currentSubjectId).lean();
    const teacherOwns = user.role === 'admin' || (user.subjectIds || []).some((id) => String(id) === String(currentSubjectId));
    if (cur && teacherOwns) list.push({ ...cur, name: cur.name + ' (архивласан)' });
  }
  return list;
}

/** Хэрэглэгчид харагдах төрлүүд (жагсаалтын шүүлтүүрт) */
function visibleSubjects(user) {
  return Subject.find(user.role === 'admin' ? {} : { _id: { $in: user.subjectIds || [] } })
    .collation({ locale: 'mn' })
    .sort({ name: 1 })
    .lean();
}

/** AI prompt болон текстээр олноор оруулах боломж: админ, эсвэл админ эрх олгосон багш */
function canUseAI(user) {
  return !!user && (user.role === 'admin' || (user.role === 'teacher' && user.aiEnabled === true));
}

/** Эрхгүй хэрэглэгчээс уг боломжийг бүрэн нууна (хуудас байхгүй мэт 404) */
function requireAI(req, res, next) {
  if (canUseAI(req.user)) return next();
  res.status(404).render('error', { title: 'Олдсонгүй', message: 'Хуудас олдсонгүй.' });
}

module.exports = { ownerFilter, problemOwnerFilter, isCodingStaff, allowedSubjects, formSubjects, visibleSubjects, canUseAI, requireAI };
