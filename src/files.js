// Файлыг MongoDB GridFS-д хадгална (тусдаа хавтас, серверийн диск шаардлагагүй)
const path = require('node:path');
const { Readable } = require('node:stream');
const mongoose = require('mongoose');
const multer = require('multer');

const MAX_FILE_MB = Number(process.env.MAX_FILE_MB) || 25;

// Өргөтгөлөөр төрлийг тодорхойлно (хөтчийн илгээсэн төрөлд итгэхгүй)
const TYPES = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text',
  txt: 'text/plain',
  csv: 'text/csv',
  odp: 'application/vnd.oasis.opendocument.presentation',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jfif: 'image/jpeg', // Windows-оос хадгалсан зураг
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  zip: 'application/zip',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  py: 'text/plain',
  js: 'text/plain',
  java: 'text/plain',
  c: 'text/plain',
  cpp: 'text/plain',
  html: 'text/plain', // HTML-ийг текст болгож харуулна (XSS-ээс хамгаална)
  css: 'text/plain',
  sb3: 'application/octet-stream',
};

// Хөтөч дээр шууд нээж болох аюулгүй төрлүүд
const INLINE = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'text/plain', 'text/csv', 'audio/mpeg', 'video/mp4']);
const DOCX = TYPES.docx;
const PPTX = TYPES.pptx;

function extOf(name) {
  return path.extname(String(name || '')).slice(1).toLowerCase();
}

function typeFor(name) {
  return TYPES[extOf(name)] || null;
}

function viewKind(contentType) {
  if (contentType === 'application/pdf') return 'pdf';
  if (contentType?.startsWith('image/')) return 'image';
  if (contentType?.startsWith('video/')) return 'video';
  if (contentType?.startsWith('audio/')) return 'audio';
  if (contentType === 'text/plain' || contentType === 'text/csv') return 'text';
  if (contentType === DOCX) return 'docx';
  if (contentType === PPTX) return 'pptx';
  if (contentType === TYPES.ppt) return 'ppt';
  return 'download';
}

/** Олон файл хүлээн авах middleware. Алдааг req.uploadError-т тавьж, маршрут өөрөө мэдэгдэнэ. */
function uploader(field, maxCount = 5) {
  const mw = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_MB * 1024 * 1024, files: maxCount },
    fileFilter: (req, file, cb) => {
      // multer файлын нэрийг latin1 гэж уншдаг тул кирилл нэрийг UTF-8 болгоно
      file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
      if (['heic', 'heif'].includes(extOf(file.originalname))) {
        req.uploadError = `«${file.originalname}» — iPhone-ийн HEIC зургийг хөтөч харуулж чаддаггүй. Утасныхаа Тохиргоо → Камер → Формат → «Most Compatible» (JPG) болгох эсвэл зургаа JPG болгож илгээнэ үү.`;
        return cb(null, false);
      }
      if (!typeFor(file.originalname)) {
        req.uploadError = `«${file.originalname}» — энэ төрлийн файл хүлээн авахгүй. Зөвшөөрөгдсөн: ${Object.keys(TYPES).join(', ')}`;
        return cb(null, false);
      }
      cb(null, true);
    },
  }).array(field, maxCount);

  return (req, res, next) =>
    mw(req, res, (err) => {
      if (err) {
        req.uploadError =
          err.code === 'LIMIT_FILE_SIZE'
            ? `Файлын хэмжээ ${MAX_FILE_MB}MB-аас хэтэрсэн байна.`
            : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE'
              ? `Нэг удаад хамгийн ихдээ ${maxCount} файл илгээнэ.`
              : 'Файл хүлээн авахад алдаа гарлаа.';
      }
      req.body ??= {};
      req.files ??= [];
      next();
    });
}

function bucket() {
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'files' });
}

/** Буфер файлыг хадгалж, хичээл/илгээлтэд хадгалах лавлагааг буцаана */
function saveFile(file, metadata) {
  const contentType = typeFor(file.originalname) || 'application/octet-stream';
  const name = file.originalname.slice(0, 255);
  return new Promise((resolve, reject) => {
    const up = bucket().openUploadStream(name, { metadata: { ...metadata, contentType } });
    Readable.from(file.buffer)
      .pipe(up)
      .on('error', reject)
      .on('finish', () => resolve({ fileId: up.id, name, size: file.size, contentType }));
  });
}

async function saveFiles(files, metadata) {
  const out = [];
  for (const f of files) out.push(await saveFile(f, metadata));
  return out;
}

async function findFile(id) {
  const [doc] = await bucket().find({ _id: new mongoose.Types.ObjectId(String(id)) }).limit(1).toArray();
  return doc || null;
}

async function readBuffer(id) {
  const chunks = [];
  for await (const c of bucket().openDownloadStream(new mongoose.Types.ObjectId(String(id)))) chunks.push(c);
  return Buffer.concat(chunks);
}

async function deleteFiles(ids) {
  for (const id of ids) {
    try {
      await bucket().delete(new mongoose.Types.ObjectId(String(id)));
    } catch {
      // аль хэдийн устсан бол алгасна
    }
  }
}

/** Файлыг хариу болгон дамжуулна. Аюултай төрлийг заавал татаж авахуулна. */
function streamFile(res, doc, { download = false } = {}) {
  const type = doc.metadata?.contentType || 'application/octet-stream';
  const inline = !download && INLINE.has(type);
  res.setHeader('Content-Type', type + (type.startsWith('text/') ? '; charset=utf-8' : ''));
  res.setHeader('Content-Length', doc.length);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Текстэн файлыг скриптгүй орчинд харуулна (PDF-д sandbox тавибал Chrome харуулахгүй)
  if (type.startsWith('text/')) res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'");
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.setHeader(
    'Content-Disposition',
    `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(doc.filename)}`
  );
  bucket().openDownloadStream(doc._id).on('error', () => res.destroy()).pipe(res);
}

function fmtSize(bytes) {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

module.exports = {
  MAX_FILE_MB,
  ACCEPT: Object.keys(TYPES).map((e) => '.' + e).join(','),
  typeFor,
  viewKind,
  uploader,
  saveFiles,
  findFile,
  readBuffer,
  deleteFiles,
  streamFile,
  fmtSize,
};
