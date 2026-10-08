// Өрсөлдөөнт Coding — багш, админ: бодлого, тест, зөв бодолт, илгээлт
const express = require('express');
const multer = require('multer');
const JSZip = require('jszip');
const { Class, User, Problem, ProblemTest, CodeSubmission, CpTopic } = require('../models');
const { requireRole, flash } = require('../middleware/auth');
const { clean, isId, toArray, parseInputDate } = require('../helpers');
const { problemOwnerFilter, canUseAI, requireAI } = require('../access');
const judge = require('../judge');
const tests = require('../coding-tests');
const { buildTestsPrompt, parseAiTests, sameTokens } = require('../coding-prompt');
const { ensureNumber } = require('../problem-number');
const { DIFFICULTIES, DEFAULT_DIFFICULTY } = require('../coding-ranks');
const md = require('../markdown');
const files = require('../files');

const router = express.Router();
router.use(requireRole('admin', 'teacher'));
// Бодлого оруулах: зөвхөн админ ба мэдээлэл зүйн багш (бусад багшид хуудас байхгүй мэт)
router.use((req, res, next) => (req.user.codingStaff ? next() : notFound(res, 'Хуудас')));

const notFound = (res, what = 'Бодлого') => res.status(404).render('error', { title: 'Олдсонгүй', message: `${what} олдсонгүй.` });
const base = (p) => '/coding/manage/' + p._id;
const LANG_KEYS = Object.keys(judge.LANGUAGES);

// zip эсвэл олон txt файл
const testUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 64 * 1024 * 1024, files: 400 },
  fileFilter: (req, file, cb) => {
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, true);
  },
}).array('files', 400);

function handleUpload(req, res, next) {
  testUpload(req, res, (err) => {
    if (err) req.uploadError = err.code === 'LIMIT_FILE_SIZE' ? 'Файл хэт том (64MB хүртэл).' : 'Файл уншихад алдаа гарлаа.';
    req.files ??= [];
    next();
  });
}

async function loadProblem(req, res, next) {
  if (!isId(req.params.id)) return notFound(res);
  const problem = await Problem.findOne({ _id: req.params.id, ...problemOwnerFilter(req.user) });
  if (!problem) return notFound(res);
  req.problem = problem;
  next();
}

// ---------------- Үүсгэх / засах ----------------
async function parseForm(req) {
  const errors = [];
  const title = clean(req.body.title, 200);
  const timeLimitMs = Math.round(Number(req.body.timeLimitMs));
  const memoryLimitMb = Math.round(Number(req.body.memoryLimitMb));
  const languages = toArray(req.body.languages).filter((l) => LANG_KEYS.includes(l));
  const startAt = parseInputDate(req.body.startAt);
  const endAt = parseInputDate(req.body.endAt);
  if (!title) errors.push('Бодлогын нэрийг оруулна уу.');
  if (!(timeLimitMs >= 100 && timeLimitMs <= 10000)) errors.push('Хугацааны хязгаар 100–10000 мс байна.');
  if (!(memoryLimitMb >= 16 && memoryLimitMb <= 1024)) errors.push('Санах ойн хязгаар 16–1024 MB байна.');
  if (!languages.length) errors.push('Дор хаяж нэг програмчлалын хэл сонгоно уу.');
  if (startAt && endAt && endAt <= startAt) errors.push('Дуусах хугацаа эхлэхээс хойш байх ёстой.');
  // Гүнзгий бэлтгэлийн сэдэв (хоосон = үндсэн тэмцээн)
  const topic = isId(req.body.topic) ? (await CpTopic.findById(req.body.topic).select('_id').lean())?._id || null : null;
  return {
    errors,
    data: {
      // Хичээлийн төрөл, анги хэрэглэхгүй — бүх сурагчид нээлттэй
      title, subject: null, classIds: [], timeLimitMs, memoryLimitMb, languages, startAt, endAt, topic,
      statement: String(req.body.statement ?? '').slice(0, 200000),
      showStandings: req.body.showStandings === 'on',
      difficulty: Object.hasOwn(DIFFICULTIES, req.body.difficulty) ? req.body.difficulty : DEFAULT_DIFFICULTY,
    },
  };
}

async function renderForm(req, res, { problem, errors = [], status = 200 }) {
  res.status(status).render('coding/form', {
    title: problem._id ? 'Бодлого засах' : 'Шинэ бодлого',
    problem,
    errors,
    statementHtml: md.render(problem.statement || ''),
    LANGUAGES: judge.LANGUAGES,
    DIFFICULTIES,
    topics: await CpTopic.find().select('title icon section order').sort({ order: 1, createdAt: 1 }).lean(),
  });
}

router.get('/new', async (req, res) => {
  await renderForm(req, res, {
    problem: {
      classIds: [], languages: LANG_KEYS, timeLimitMs: 1000, memoryLimitMb: 256, showStandings: true,
      difficulty: DEFAULT_DIFFICULTY, statement: STATEMENT_TEMPLATE,
      topic: isId(req.query.topic) ? req.query.topic : null, // Гүнзгий бэлтгэлийн сэдвээс «+ Бодлого»
    },
  });
});

const STATEMENT_TEMPLATE = [
  'Бодлогын өгүүлбэрийг энд бичнэ үү.',
  '',
  '## Оролт',
  'Эхний мөрөнд нэг бүхэл тоо n (1 ≤ n ≤ 100 000) өгөгдөнө.',
  '',
  '## Гаралт',
  'Нэг бүхэл тоо хэвлэнэ.',
].join('\n');

router.post('/', async (req, res) => {
  const { errors, data } = await parseForm(req);
  if (errors.length) return renderForm(req, res, { problem: data, errors, status: 400 });
  const problem = await Problem.create({ ...data, createdBy: req.user._id });
  flash(req, 'success', 'Бодлого үүслээ. Одоо тестүүдээ оруулна уу.');
  res.redirect(base(problem));
});

router.get('/:id/edit', loadProblem, (req, res) => renderForm(req, res, { problem: req.problem }));

router.post('/:id', loadProblem, async (req, res) => {
  const { errors, data } = await parseForm(req);
  if (errors.length) return renderForm(req, res, { problem: { ...data, _id: req.problem._id }, errors, status: 400 });
  Object.assign(req.problem, data);
  await req.problem.save();
  flash(req, 'success', 'Бодлого хадгалагдлаа.');
  res.redirect(base(req.problem));
});

router.post('/:id/publish', loadProblem, async (req, res) => {
  const p = req.problem;
  if (!p.published) {
    const missing = !p.testCount ? 'тест оруулна уу' : !p.statement.trim() ? 'өгүүлбэр бичнэ үү' : null;
    if (missing) {
      flash(req, 'error', `Нийтлэхийн өмнө ${missing}.`);
      return res.redirect(base(p));
    }
  }
  p.published = !p.published;
  if (p.published && !p.topic) await ensureNumber(p); // анх нийтлэхэд дараагийн дугаар (зөвхөн үндсэн тэмцээн)
  await p.save();
  flash(req, 'success', p.published ? (p.topic ? 'Бодлого нийтлэгдлээ. Гүнзгий бэлтгэлийн сурагчдад харагдана.' : 'Бодлого нийтлэгдлээ. Бүх сурагч бодож, хоорондоо өрсөлдөнө.') : 'Бодлогыг нийтлэлээс буцаалаа.');
  res.redirect(base(p));
});

router.post('/:id/delete', loadProblem, async (req, res) => {
  await Promise.all([
    ProblemTest.deleteMany({ problem: req.problem._id }),
    CodeSubmission.deleteMany({ problem: req.problem._id }),
    files.deleteFiles(req.problem.attachments.map((a) => a.fileId)),
  ]);
  await Problem.deleteOne({ _id: req.problem._id });
  flash(req, 'success', `"${req.problem.title}" бодлого устгагдлаа.`);
  res.redirect(req.problem.topic ? '/cp/topics/' + req.problem.topic : '/coding');
});

// Өгүүлбэрт зураг оруулах (засварлагчийн «Зураг» товч)
router.post('/:id/attachments', loadProblem, files.uploader('files', 5), async (req, res) => {
  const err = req.uploadError || (!req.files.length ? 'Зураг сонгоно уу.' : null)
    || (req.files.some((f) => !files.typeFor(f.originalname)?.startsWith('image/')) ? 'Зөвхөн зураг (JPG, PNG, GIF, WEBP) оруулна.' : null)
    || (req.problem.attachments.length + req.files.length > 30 ? 'Нэг бодлогод хамгийн ихдээ 30 зураг.' : null);
  if (err) return res.status(400).json({ error: err });
  const saved = await files.saveFiles(req.files, { kind: 'problem', problemId: req.problem._id, uploadedBy: req.user._id });
  req.problem.attachments.push(...saved);
  await req.problem.save();
  res.json({ files: saved.map((f) => ({ url: '/files/' + f.fileId, name: f.name })) });
});

// ---------------- Удирдах хуудас: тестүүд, зөв бодолт ----------------
router.get('/:id', loadProblem, async (req, res) => {
  const p = req.problem;
  const [list, participants, subCount, health] = await Promise.all([
    ProblemTest.find({ problem: p._id }).sort({ order: 1 }).lean(),
    CodeSubmission.distinct('user', { problem: p._id, isStaff: false }),
    CodeSubmission.countDocuments({ problem: p._id, isStaff: false }),
    judge.health(),
  ]);
  const preview = (s) => (s.length > 300 ? s.slice(0, 300) + '…' : s);
  res.render('coding/manage', {
    title: p.title,
    problem: p,
    tests: list.map((t) => ({
      _id: t._id, order: t.order, name: t.name, sample: t.sample,
      inputSize: Buffer.byteLength(t.input), outputSize: Buffer.byteLength(t.output),
      inputPreview: preview(t.input), outputPreview: preview(t.output),
    })),
    participantCount: participants.length,
    subCount,
    judgeOk: !!health,
    LANGUAGES: judge.LANGUAGES,
    canAI: canUseAI(req.user),
  });
});

router.get('/:id/tests/:tid/:kind', loadProblem, async (req, res) => {
  if (!isId(req.params.tid) || !['input', 'output'].includes(req.params.kind)) return notFound(res, 'Тест');
  const t = await ProblemTest.findOne({ _id: req.params.tid, problem: req.problem._id }).lean();
  if (!t) return notFound(res, 'Тест');
  const num = String(t.order).padStart(2, '0');
  res.type('text/plain; charset=utf-8');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Content-Disposition', `${req.query.download ? 'attachment' : 'inline'}; filename="${req.params.kind}${num}.txt"`);
  res.send(t[req.params.kind]);
});

// Бүх тестийг zip болгож татах (input01.txt, output01.txt …)
router.get('/:id/tests.zip', loadProblem, async (req, res) => {
  const list = await ProblemTest.find({ problem: req.problem._id }).sort({ order: 1 }).lean();
  const zip = new JSZip();
  const width = Math.max(2, String(list.length).length);
  list.forEach((t, i) => {
    const n = String(i + 1).padStart(width, '0');
    zip.file(`input${n}.txt`, t.input);
    zip.file(`output${n}.txt`, t.output);
  });
  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  res.type('application/zip');
  res.set('Content-Disposition', `attachment; filename="tests-${req.problem._id}.zip"`);
  res.send(buf);
});

/** Гаралтгүй тестүүдийн гаралтыг зөв бодолтоор бөглөнө */
async function fillOutputs(problem, list) {
  const need = list.filter((t) => t.output == null);
  if (!need.length) return { ok: true };
  if (!problem.refCode.trim()) {
    return { ok: false, error: `${need.length} тестэд гаралтын файл алга. Гаралтыг автоматаар үүсгэхийн тулд эхлээд «Зөв бодолт» хэсэгт кодоо оруулна уу.` };
  }
  return runReference(problem, need);
}

/** Зөв бодолтыг оролтууд дээр ажиллуулж t.output-д бичнэ */
async function runReference(problem, list) {
  let r;
  try {
    r = await judge.runOutputs({
      language: problem.refLanguage,
      code: problem.refCode,
      inputs: list.map((t) => t.input),
      timeLimitMs: Math.min(Math.max(problem.timeLimitMs * 3, 3000), 20000),
      memoryLimitMb: Math.max(problem.memoryLimitMb, 512),
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }
  if (r.compileError != null) return { ok: false, error: 'Зөв бодолт хөрвүүлэгдсэнгүй:\n' + r.compileError.slice(0, 1500) };
  const bad = [];
  r.results.forEach((res, i) => {
    if (res.verdict !== 'OK') bad.push(`${list[i].name || i + 1}: ${judge.VERDICTS[res.verdict]?.label || res.verdict}${res.stderr ? ' — ' + res.stderr.split('\n').slice(-2).join(' ').slice(0, 200) : ''}`);
    else list[i].output = res.output;
  });
  if (bad.length) return { ok: false, error: 'Зөв бодолт дараах тестүүд дээр амжилтгүй ажиллалаа: ' + bad.slice(0, 5).join('; ') };
  return { ok: true };
}

router.post('/:id/tests/upload', loadProblem, handleUpload, async (req, res) => {
  const back = base(req.problem) + '#tests';
  if (req.uploadError) {
    flash(req, 'error', req.uploadError);
    return res.redirect(back);
  }
  if (!req.files.length) {
    flash(req, 'error', 'Zip эсвэл txt файл сонгоно уу.');
    return res.redirect(back);
  }
  let parsed;
  try {
    parsed = await tests.parseUploads(req.files);
  } catch (e) {
    flash(req, 'error', e.message);
    return res.redirect(back);
  }
  if (!parsed.tests.length) {
    flash(req, 'error', 'Тест олдсонгүй. Файлын нэр input01.txt / output01.txt (эсвэл 01.in / 01.out) хэлбэртэй байх ёстой.'
      + (parsed.unknown.length ? ` Танигдаагүй файлууд: ${parsed.unknown.slice(0, 5).join(', ')}` : ''));
    return res.redirect(back);
  }
  const filled = await fillOutputs(req.problem, parsed.tests);
  if (!filled.ok) {
    flash(req, 'error', filled.error);
    return res.redirect(back);
  }
  const replace = req.body.mode !== 'append';
  const existing = replace ? { count: 0, size: 0 } : { count: req.problem.testCount, size: req.problem.testsSize };
  const invalid = tests.validateTests(parsed.tests, existing);
  if (invalid) {
    flash(req, 'error', invalid);
    return res.redirect(back);
  }
  const sampleFirst = Math.min(Math.max(parseInt(req.body.samples, 10) || 0, 0), 10);
  const n = await tests.saveTests(req.problem._id, parsed.tests, { replace, sampleFirst });
  const notes = [];
  if (parsed.orphanOutputs.length) notes.push(`оролтгүй ${parsed.orphanOutputs.length} гаралтын файл алгаслаа`);
  if (parsed.unknown.length) notes.push(`танигдаагүй ${parsed.unknown.length} файл алгаслаа`);
  flash(req, 'success', `${n} тест ${replace ? 'орууллаа (хуучныг сольсон)' : 'нэмлээ'}.${notes.length ? ' Анхаар: ' + notes.join(', ') + '.' : ''}`);
  res.redirect(back);
});

router.post('/:id/tests/add', loadProblem, async (req, res) => {
  const back = base(req.problem) + '#tests';
  const input = tests.normalizeText(String(req.body.input ?? ''));
  const outputRaw = tests.normalizeText(String(req.body.output ?? ''));
  if (!input.trim()) {
    flash(req, 'error', 'Оролтыг оруулна уу.');
    return res.redirect(back);
  }
  const t = { name: '', input: input.endsWith('\n') ? input : input + '\n', output: outputRaw.trim() ? outputRaw : null };
  const filled = await fillOutputs(req.problem, [t]);
  if (!filled.ok) {
    flash(req, 'error', filled.error);
    return res.redirect(back);
  }
  const invalid = tests.validateTests([t], { count: req.problem.testCount, size: req.problem.testsSize });
  if (invalid) {
    flash(req, 'error', invalid);
    return res.redirect(back);
  }
  await tests.saveTests(req.problem._id, [t]);
  if (req.body.sample === 'on') {
    const last = await ProblemTest.findOne({ problem: req.problem._id }).sort({ order: -1 });
    last.sample = true;
    await last.save();
    await tests.refreshCounts(req.problem._id);
  }
  flash(req, 'success', outputRaw.trim() ? 'Тест нэмэгдлээ.' : 'Тест нэмэгдлээ (гаралтыг зөв бодолтоор үүсгэсэн).');
  res.redirect(back);
});

router.post('/:id/tests/:tid/sample', loadProblem, async (req, res) => {
  const t = isId(req.params.tid) ? await ProblemTest.findOne({ _id: req.params.tid, problem: req.problem._id }) : null;
  if (t) {
    t.sample = !t.sample;
    await t.save();
    await tests.refreshCounts(req.problem._id);
  }
  res.redirect(base(req.problem) + '#tests');
});

router.post('/:id/tests/:tid/delete', loadProblem, async (req, res) => {
  if (isId(req.params.tid)) await ProblemTest.deleteOne({ _id: req.params.tid, problem: req.problem._id });
  await tests.refreshCounts(req.problem._id);
  flash(req, 'success', 'Тест устгагдлаа.');
  res.redirect(base(req.problem) + '#tests');
});

router.post('/:id/tests/clear', loadProblem, async (req, res) => {
  await ProblemTest.deleteMany({ problem: req.problem._id });
  await tests.refreshCounts(req.problem._id);
  const wasPublished = req.problem.published;
  if (wasPublished) {
    req.problem.published = false; // тестгүй бодлогыг сурагчид бодох боломжгүй
    await req.problem.save();
  }
  flash(req, 'success', 'Бүх тест устгагдлаа.' + (wasPublished ? ' Бодлогыг нийтлэлээс түр буцаалаа.' : ''));
  res.redirect(base(req.problem) + '#tests');
});

// ---------------- Зөв бодолт ----------------
router.post('/:id/reference', loadProblem, async (req, res) => {
  const language = LANG_KEYS.includes(req.body.refLanguage) ? req.body.refLanguage : '';
  const code = String(req.body.refCode ?? '').slice(0, 100000);
  req.problem.refLanguage = code.trim() ? language : '';
  req.problem.refCode = code;
  await req.problem.save();
  const back = base(req.problem) + '#reference';
  if (!code.trim()) {
    flash(req, 'success', 'Зөв бодолтыг устгалаа.');
    return res.redirect(back);
  }
  if (!language) {
    flash(req, 'error', 'Програмчлалын хэлээ сонгоно уу.');
    return res.redirect(back);
  }
  if (req.body.action === 'outputs') {
    // Бүх тестийн гаралтыг зөв бодолтоор шинээр тооцоолно
    const list = await ProblemTest.find({ problem: req.problem._id }).sort({ order: 1 });
    if (!list.length) {
      flash(req, 'error', 'Тест алга байна. Эхлээд оролтуудаа оруулна уу.');
      return res.redirect(back);
    }
    const plain = list.map((t) => ({ name: '#' + t.order, input: t.input, output: null }));
    const r = await runReference(req.problem, plain);
    if (!r.ok) {
      flash(req, 'error', r.error);
      return res.redirect(back);
    }
    let changed = 0;
    for (const [i, t] of list.entries()) {
      if (t.output !== plain[i].output) changed++;
      t.output = plain[i].output;
      await t.save();
    }
    await tests.refreshCounts(req.problem._id);
    flash(req, 'success', `Зөв бодолтоор ${list.length} тестийн гаралтыг тооцооллоо (${changed} нь өөрчлөгдсөн).`);
    return res.redirect(back);
  }
  if (req.body.action === 'check') {
    // Зөв бодолтыг энгийн илгээлт шиг шалгуулна (тестүүд зөв эсэхийг баталгаажуулах)
    const sub = await CodeSubmission.create({ problem: req.problem._id, user: req.user._id, isStaff: true, language, code });
    judge.kick();
    return res.redirect('/coding/submissions/' + sub._id);
  }
  flash(req, 'success', 'Зөв бодолт хадгалагдлаа.');
  res.redirect(back);
});

// ---------------- AI-аар тест үүсгэх (зөвхөн эрхтэй хэрэглэгч) ----------------
async function renderAi(req, res, { text = '', errors = [], status = 200, verify = true } = {}) {
  const samples = await ProblemTest.find({ problem: req.problem._id, sample: true }).sort({ order: 1 }).limit(5).lean();
  res.status(status).render('coding/ai', {
    title: 'AI-аар тест бэлтгэх',
    problem: req.problem,
    prompt: buildTestsPrompt(req.problem, samples),
    LANGUAGES: judge.LANGUAGES,
    errors,
    text,
    verify,
  });
}

router.get('/:id/tests/ai', requireAI, loadProblem, (req, res) => renderAi(req, res));

// AI-ийн өгсөн «=== INPUT n === / === OUTPUT n ===» текстийг тест болгон хадгална
router.post('/:id/tests/ai', requireAI, loadProblem, async (req, res) => {
  const p = req.problem;
  const text = String(req.body.text ?? '').slice(0, 20 * 1024 * 1024);
  const verify = req.body.verify === 'on';
  const fail = (msg) => renderAi(req, res, { text, errors: [msg], status: 400, verify });

  const parsed = parseAiTests(text);
  if (parsed.errors.length) return fail(parsed.errors.slice(0, 8).join('\n'));
  const list = parsed.tests;
  if (list.length > tests.MAX_TESTS) return fail(`${list.length} тест байна — дээд тал нь ${tests.MAX_TESTS}.`);
  const hasRef = !!(p.refCode.trim() && p.refLanguage);
  const missing = list.filter((t) => t.output == null).length;
  if (missing && !hasRef) return fail(`${missing} тестэд гаралт алга. AI-аас гаралтыг нь ч гаргуулах эсвэл «Зөв бодолт» оруулна уу.`);
  if (verify && !hasRef) return fail('Гаралтыг шалгах зөв бодолт алга. «Зөв бодолт» хэсэгт кодоо оруулах эсвэл «Зөв бодолтоор шалгах»-ыг унтраана уу.');

  let fixed = 0;
  if (verify || missing) {
    // AI-ийн гаралтыг зөв бодолтын гаралттай тулгаж, зөрвөл засна
    const checked = list.map((t) => ({ name: t.name, input: t.input, output: null }));
    const r = await runReference(p, checked);
    if (!r.ok) return fail(r.error);
    list.forEach((t, i) => {
      if (t.output != null && !sameTokens(t.output, checked[i].output)) fixed++;
      if (verify || t.output == null) t.output = checked[i].output;
    });
  }

  const replace = req.body.mode !== 'append';
  const invalid = tests.validateTests(list, replace ? { count: 0, size: 0 } : { count: p.testCount, size: p.testsSize });
  if (invalid) return fail(invalid);
  const sampleFirst = Math.min(Math.max(parseInt(req.body.samples, 10) || 0, 0), 10);
  const n = await tests.saveTests(p._id, list, { replace, sampleFirst });
  let msg = `${n} тест ${replace ? 'орууллаа (хуучныг сольсон)' : 'нэмлээ'}.`;
  if (verify) msg += fixed ? ` Зөв бодолтоор шалгахад ${fixed} тестийн AI гаралт буруу байсныг зассан.` : ' Бүх гаралт зөв бодолттой таарсан.';
  flash(req, 'success', msg);
  res.redirect(base(p) + '#tests');
});

// ---------------- Илгээлтүүд ----------------
router.get('/:id/submissions', loadProblem, async (req, res) => {
  const filter = { problem: req.problem._id };
  if (req.query.verdict && judge.VERDICTS[req.query.verdict]) filter.verdict = req.query.verdict;
  if (req.query.staff !== '1') filter.isStaff = false;
  const subs = await CodeSubmission.find(filter).select('-code -results -compileOutput').sort({ createdAt: -1 }).limit(500).lean();
  const users = await User.find({ _id: { $in: [...new Set(subs.map((s) => String(s.user)))] } }).select('fullName username classId').lean();
  const classes = await Class.find({ _id: { $in: users.map((u) => u.classId).filter(Boolean) } }).select('name').lean();
  const classMap = new Map(classes.map((c) => [String(c._id), c.name]));
  const userMap = new Map(users.map((u) => [String(u._id), { ...u, className: classMap.get(String(u.classId)) || '' }]));
  res.render('coding/submissions', {
    title: 'Илгээлтүүд',
    problem: req.problem,
    subs: subs.map((s) => ({ ...s, u: userMap.get(String(s.user)) })),
    query: req.query,
    LANGUAGES: judge.LANGUAGES,
    VERDICTS: judge.VERDICTS,
  });
});

router.post('/:id/rejudge', loadProblem, async (req, res) => {
  const r = await CodeSubmission.updateMany(
    { problem: req.problem._id, status: { $in: ['done', 'error'] } },
    { $set: { status: 'queued', verdict: '', results: [], error: '' } }
  );
  judge.kick();
  flash(req, 'success', `${r.modifiedCount} илгээлтийг дахин шалгуулахаар дараалалд орууллаа.`);
  res.redirect(base(req.problem) + '/submissions');
});

router.post('/submissions/:sid/rejudge', async (req, res) => {
  const sub = isId(req.params.sid) ? await CodeSubmission.findById(req.params.sid) : null;
  const problem = sub && (await Problem.findOne({ _id: sub.problem, ...problemOwnerFilter(req.user) }).select('_id').lean());
  if (!problem) return notFound(res, 'Илгээлт');
  sub.set({ status: 'queued', verdict: '', results: [], error: '', compileOutput: '' });
  await sub.save();
  judge.kick();
  res.redirect('/coding/submissions/' + sub._id);
});

module.exports = router;
