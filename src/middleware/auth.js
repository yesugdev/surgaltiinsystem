const { User, Class } = require('../models');
const { isCodingStaff } = require('../access');

/** Сессээс хэрэглэгчийг ачаалж, идэвхгүй болсон бол гаргана */
async function loadUser(req, res, next) {
  res.locals.user = null;
  res.locals.currentPath = req.path;
  res.locals.flash = req.session?.flash || null;
  if (req.session) delete req.session.flash;

  const id = req.session?.userId;
  if (id) {
    const user = await User.findById(id).select('-passwordHash').lean();
    if (user && user.active) {
      req.user = user;
      res.locals.user = user;
      res.locals.canUseAI = user.role === 'admin' || (user.role === 'teacher' && user.aiEnabled === true);
      // Өрсөлдөөнт Coding: админ ба мэдээлэл зүйн багш удирдана; сурагч — админ ангид нь нээсэн бол оролцоно
      user.codingStaff = await isCodingStaff(user);
      user.codingPlayer = user.role === 'student' && !!user.classId && !!(await Class.exists({ _id: user.classId, codingEnabled: true }));
      res.locals.canCoding = user.codingPlayer || user.codingStaff;
    } else {
      delete req.session.userId;
    }
  }
  next();
}

function flash(req, type, message) {
  req.session.flash = { type, message };
}

/** Нэвтэрсэн, заасан эрхтэй хэрэглэгч л нэвтрэх. Эрх заагаагүй бол зөвхөн нэвтэрсэн байхыг шаардана. */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.redirect('/login');
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).render('error', {
        title: 'Хандах эрхгүй',
        message: 'Танд энэ хуудсанд хандах эрх байхгүй.',
      });
    }
    next();
  };
}

function homeFor(role) {
  if (role === 'admin') return '/admin';
  if (role === 'teacher') return '/exams';
  return '/student';
}

module.exports = { loadUser, flash, requireRole, homeFor };
