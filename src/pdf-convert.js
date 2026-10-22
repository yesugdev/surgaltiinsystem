// Сурагчийн Word, Excel, PowerPoint файлыг LibreOffice-оор PDF болгож (нэг удаа) GridFS-д хадгална.
// Эх файл хэвээр — «Татах» үргэлж сурагчийн илгээсэн файлыг өгнө.
const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const files = require('./files');

const CANDIDATES = process.env.SOFFICE_PATH
  ? [process.env.SOFFICE_PATH]
  : ['soffice', 'libreoffice', 'C:\\Program Files\\LibreOffice\\program\\soffice.exe'];
const TIMEOUT_MS = 120000;

// PDF болгож харуулах төрлүүд
const CONVERTIBLE = new Set(
  ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'odp'].map((e) => files.typeFor('x.' + e))
);

let soffice = null; // ажилладаг программын зам; олдоогүй бол null

function run(bin, args, timeout) {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { timeout, windowsHide: true }, (err, stdout, stderr) => (err ? reject(Object.assign(err, { stderr })) : resolve(stdout)));
  });
}

// Эхлэхэд LibreOffice байгаа эсэхийг шалгана (байхгүй бол хуучин харагдацаар үлдэнэ)
const ready = (async () => {
  for (const bin of CANDIDATES) {
    try {
      await run(bin, ['--version'], 30000);
      soffice = bin;
      return;
    } catch {
      // дараагийнхыг оролдоно
    }
  }
})();

const available = () => !!soffice;
const canConvert = (contentType) => CONVERTIBLE.has(contentType);

/** Шалгах хуудсанд харуулах төрөл: хөрвүүлж болох оффис файл → 'office' (PDF), бусад нь files.viewKind */
function previewKind(contentType) {
  return available() && canConvert(contentType) ? 'office' : files.viewKind(contentType);
}

// Нэг зэрэг нэг л хөрвүүлэлт (LibreOffice санах ой их хэрэглэдэг), ижил файлыг давхар хөрвүүлэхгүй
let queue = Promise.resolve();
const inflight = new Map();

async function convertNow(doc) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdfconv-'));
  try {
    const ext = path.extname(doc.filename).toLowerCase() || '.docx';
    const input = path.join(dir, 'in' + ext);
    await fs.writeFile(input, await files.readBuffer(doc._id));
    await run(
      soffice,
      ['--headless', '--norestore', '--nolockcheck', '-env:UserInstallation=' + pathToFileURL(path.join(dir, 'profile')).href,
        '--convert-to', 'pdf', '--outdir', dir, input],
      TIMEOUT_MS
    );
    const buffer = await fs.readFile(path.join(dir, 'in.pdf'));
    const name = doc.filename.replace(/\.[^.]+$/, '') + '.pdf';
    const [saved] = await files.saveFiles([{ originalname: name, buffer, size: buffer.length }], { ...doc.metadata, pdfOf: doc._id });
    return files.findFile(saved.fileId);
  } finally {
    fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/** Оффис файлын PDF хувилбар (өмнө нь хөрвүүлсэн бол түүнийг) буцаана */
async function toPdf(doc) {
  await ready;
  if (!soffice) throw new Error('LibreOffice суулгаагүй');
  const existing = await files.findDerived(doc._id);
  if (existing) return existing;
  const key = String(doc._id);
  if (!inflight.has(key)) {
    const job = queue.then(() => files.findDerived(doc._id)).then((d) => d || convertNow(doc));
    queue = job.catch(() => {});
    inflight.set(key, job);
    job.finally(() => inflight.delete(key)).catch(() => {});
  }
  return inflight.get(key);
}

/** Илгээсэн даруйд нь урьдчилан хөрвүүлнэ — багш нээхэд хүлээхгүй */
function warm(refs) {
  for (const f of refs || []) {
    if (!canConvert(f.contentType)) continue;
    files.findFile(f.fileId).then((doc) => doc && toPdf(doc)).catch(() => {});
  }
}

module.exports = { ready, available, canConvert, previewKind, toPdf, warm };
