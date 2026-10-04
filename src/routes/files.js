// Хичээлийн хавсралт болон сурагчийн илгээсэн файлыг эрх шалгаж харуулна
const express = require('express');
const mammoth = require('mammoth');
const { Lesson, Problem } = require('../models');
const { requireRole } = require('../middleware/auth');
const { isId } = require('../helpers');
const files = require('../files');
const md = require('../markdown');

const router = express.Router();
router.use(requireRole());

function canManage(user, lesson) {
  if (user.role === 'admin') return true;
  if (user.role !== 'teacher' || String(lesson.createdBy) !== String(user._id)) return false;
  return !lesson.subject || (user.subjectIds || []).some((id) => String(id) === String(lesson.subject));
}

async function loadFile(req, res, next) {
  const deny = () => res.status(404).render('error', { title: 'Олдсонгүй', message: 'Файл олдсонгүй эсвэл танд үзэх эрх байхгүй.' });
  if (!isId(req.params.id)) return deny();
  const doc = await files.findFile(req.params.id);
  const meta = doc?.metadata;
  const u = req.user;
  let ok = false;
  if (meta?.kind === 'problem' && meta.problemId) {
    // Өрсөлдөөнт Coding бодлогын өгүүлбэр доторх зураг
    // Нийтлэгдсэн бодлого бүх сурагчид нээлттэй; удирдах: админ эсвэл үүсгэсэн мэдээлэл зүйн багш
    const problem = await Problem.findById(meta.problemId).select('createdBy published').lean();
    if (!problem) return deny();
    ok = u.role === 'admin' || (u.codingStaff && String(problem.createdBy) === String(u._id)) || (u.role === 'student' && problem.published);
  } else {
    if (!meta?.lessonId) return deny();
    const lesson = await Lesson.findById(meta.lessonId).select('createdBy subject classIds published title').lean();
    if (!lesson) return deny();
    ok = canManage(u, lesson);
    if (!ok && u.role === 'student') {
      if (meta.kind === 'lesson') ok = lesson.published && lesson.classIds.some((id) => String(id) === String(u.classId));
      if (meta.kind === 'submission') ok = String(meta.studentId) === String(u._id);
    }
  }
  if (!ok) return deny();
  req.fileDoc = doc;
  next();
}

router.get('/:id', loadFile, (req, res) => {
  files.streamFile(res, req.fileDoc, { download: req.query.download === '1' });
});

// Хөтөч дээр харах хуудас (PDF, зураг, видео, текст, Word)
router.get('/:id/view', loadFile, async (req, res) => {
  const doc = req.fileDoc;
  const kind = files.viewKind(doc.metadata.contentType);
  let docxHtml = null;
  if (kind === 'docx') {
    try {
      const { value } = await mammoth.convertToHtml({ buffer: await files.readBuffer(doc._id) });
      docxHtml = md.sanitizeDocHtml(value);
    } catch {
      docxHtml = null;
    }
  }
  res.render('files/view', {
    title: doc.filename,
    file: doc,
    kind,
    docxHtml,
    size: files.fmtSize(doc.length),
    embed: req.query.embed === '1',
    back: typeof req.query.back === 'string' && req.query.back.startsWith('/') && !req.query.back.startsWith('//') ? req.query.back : null,
  });
});

module.exports = router;
