// Хичээлийн хавсралт болон сурагчийн илгээсэн файлыг эрх шалгаж харуулна
const express = require('express');
const mammoth = require('mammoth');
const { Lesson, Problem, CpTopic } = require('../models');
const { cpAccess } = require('../cp');
const { lessonOpenFor } = require('../basics');
const { requireRole } = require('../middleware/auth');
const { isId } = require('../helpers');
const files = require('../files');
const pdf = require('../pdf-convert');
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
  if (meta?.kind === 'cptopic' && meta.topicId) {
    // Гүнзгий бэлтгэлийн сэдэв / Програмчлалын суурийн хичээлийн онол доторх зураг
    const topic = await CpTopic.findById(meta.topicId).select('published track classIds').lean();
    if (!topic) return deny();
    ok = topic.track === 'basics' ? lessonOpenFor(u, topic) : !!u.codingStaff || (cpAccess(u) && topic.published);
  } else if (meta?.kind === 'problem' && meta.problemId) {
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

// Word, Excel, PowerPoint файлыг PDF болгож харуулна (эх файлыг ?download=1-ээр татна)
router.get('/:id/pdf', loadFile, async (req, res) => {
  const doc = req.fileDoc;
  const type = doc.metadata?.contentType;
  if (type === 'application/pdf') return files.streamFile(res, doc);
  if (!pdf.canConvert(type)) return res.redirect('/files/' + doc._id + '/view');
  try {
    files.streamFile(res, await pdf.toPdf(doc));
  } catch (err) {
    console.error('PDF хөрвүүлэлт амжилтгүй:', doc.filename, err.message);
    res.status(500).render('error', { title: 'PDF болгож чадсангүй', message: '«' + doc.filename + '» файлыг PDF болгож чадсангүй. «Татах» товчоор эх файлыг татаж нээнэ үү.' });
  }
});

// Хөтөч дээр харах хуудас (PDF, зураг, видео, текст, Word)
router.get('/:id/view', loadFile, async (req, res) => {
  const doc = req.fileDoc;
  const kind = pdf.previewKind(doc.metadata.contentType);
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
