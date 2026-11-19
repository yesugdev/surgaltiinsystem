// 📊 Сурагчийн профайл: сурагч өөрийнхийг, багш/админ сурагчдынхаа явцыг харна.
const express = require('express');
const { User, Class } = require('../models');
const { requireRole } = require('../middleware/auth');
const { isId } = require('../helpers');
const { buildProfile, classOverview, canView, staffClassIds } = require('../profile');

const router = express.Router();
router.use(requireRole());

const notFound = (res) => res.status(404).render('error', { title: 'Олдсонгүй', message: 'Сурагч олдсонгүй.' });

async function renderProfile(req, res, student) {
  const data = await buildProfile(student, req.user);
  res.render('profile/show', {
    title: req.user.role === 'student' ? 'Миний профайл' : student.fullName,
    student,
    own: String(req.user._id) === String(student._id),
    isStaff: req.user.role !== 'student',
    ...data,
  });
}

// Сурагч — өөрийн профайл; багш/админ — ангиар сурагчдын жагсаалт
router.get('/', async (req, res) => {
  if (req.user.role === 'student') return renderProfile(req, res, req.user);

  const allowed = await staffClassIds(req.user);
  const classes = await Class.find(allowed ? { _id: { $in: allowed } } : {})
    .select('name schoolYear')
    .collation({ locale: 'mn', numericOrdering: true })
    .sort({ name: 1 })
    .lean();
  const classId = isId(req.query.class) && classes.some((c) => String(c._id) === req.query.class) ? req.query.class : classes[0] ? String(classes[0]._id) : null;
  const overview = classId ? await classOverview(classId, req.user) : null;
  res.render('profile/index', { title: 'Сурагчдын явц', classes, classId, overview });
});

router.get('/:id', async (req, res) => {
  if (!isId(req.params.id)) return notFound(res);
  if (req.user.role === 'student' && req.params.id === String(req.user._id)) return res.redirect('/profile');
  const student = await User.findById(req.params.id).select('fullName username role classId active createdAt ratingPoints').lean();
  if (!(await canView(req.user, student))) return notFound(res);
  return renderProfile(req, res, student);
});

module.exports = router;
