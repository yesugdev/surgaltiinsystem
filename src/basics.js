// 🧱 Програмчлалын суурь: бүх сурагчид зориулсан roadmap хичээлүүд (онол + хялбар бодлого).
// Хичээл бүр CpTopic (track: 'basics') — анги бүрээр нээнэ (classIds). Онол: src/basics-content/<key>.md
const { CpTopic } = require('./models');
const { seedTopics } = require('./cp');

const BASICS_TRACK = { track: 'basics' };

const BASICS_LESSONS = [
  { key: 'basics-algorithm', order: 10, icon: '🧭', title: 'Алгоритм', summary: 'Алхам алхмаар бодох, блок схем, анхны C++ програм' },
  { key: 'basics-variables', order: 20, icon: '📦', title: 'Хувьсагч', summary: 'Утга хадгалах, оролт уншиж гаралт хэвлэх' },
  { key: 'basics-types', order: 30, icon: '🔢', title: 'Өгөгдлийн төрөл', summary: 'int, long long, double, char, bool, string' },
  { key: 'basics-operators', order: 40, icon: '➗', title: 'Оператор', summary: 'Арифметик, харьцуулах, логик оператор, / ба %' },
  { key: 'basics-conditions', order: 50, icon: '🔀', title: 'Нөхцөл', summary: 'if, else if, else — шийдвэр гаргах' },
  { key: 'basics-loops', order: 60, icon: '🔁', title: 'Давталт', summary: 'for, while — үйлдлийг олон дахин хийх' },
  { key: 'basics-arrays', order: 70, icon: '🧮', title: 'Массив', summary: 'Олон утгыг нэг дор хадгалах, vector' },
  { key: 'basics-functions', order: 80, icon: '🧩', title: 'Функц', summary: 'Кодыг хэсэгчлэн, дахин ашиглах' },
  { key: 'basics-strings', order: 90, icon: '🔤', title: 'Тэмдэгт мөр', summary: 'string, тэмдэгт бүрээр ажиллах' },
  { key: 'basics-recursion', order: 100, icon: '🪆', title: 'Рекурс', summary: 'Өөрийгөө дууддаг функц, суурь тохиолдол' },
  { key: 'basics-search', order: 110, icon: '🔍', title: 'Хайлт', summary: 'Шугаман хайлт ба хоёртын хайлт' },
  { key: 'basics-sorting', order: 120, icon: '📊', title: 'Эрэмбэлэлт', summary: 'Bubble sort, sort() функц' },
  { key: 'basics-advanced', order: 130, icon: '🚀', title: 'Ахисан алгоритм бодлого', summary: 'Бүх мэдлэгээ нэгтгэх: хоёр заагч, энгийн DP' },
];

/** Сурагчийн ангид дор хаяж нэг хичээл нээгдсэн эсэх (багш, админ — үргэлж) */
async function basicsAccess(user) {
  if (!user) return false;
  if (user.codingStaff) return true;
  if (user.role !== 'student' || !user.classId) return false;
  return !!(await CpTopic.exists({ ...BASICS_TRACK, published: true, classIds: user.classId }));
}

/** Хичээл тухайн сурагчид нээлттэй эсэх */
const lessonOpenFor = (user, lesson) => !!user.codingStaff || (lesson.published && !!user.classId && (lesson.classIds || []).some((id) => String(id) === String(user.classId)));

const seedBasics = () => seedTopics({ defs: BASICS_LESSONS, dir: 'basics-content', settingKey: 'basicsDefaultKeys', track: 'basics', label: 'Програмчлалын суурь' });

module.exports = { BASICS_TRACK, BASICS_LESSONS, basicsAccess, lessonOpenFor, seedBasics };
