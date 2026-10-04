// Бодлогын тестийг zip / txt файлаас уншиж, оролт–гаралтыг хослуулна
const path = require('node:path');
const JSZip = require('jszip');
const { Problem, ProblemTest } = require('./models');

const MAX_TESTS = 200;
const MAX_TOTAL_BYTES = 64 * 1024 * 1024; // бодлогын бүх тест
const MAX_TEST_BYTES = 15 * 1024 * 1024; // нэг тест (оролт + гаралт), MongoDB-ийн 16MB хязгаараас бага

/** CRLF → LF, BOM хасна */
function normalizeText(s) {
  return String(s).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
}

/**
 * Файлын нэрээс тестийн дугаар, төрлийг таних:
 *   input01.txt / output01.txt, in1.txt / out1.txt, input_1 / answer_1,
 *   01.in / 01.out, 1.in / 1.ans, test1.in / test1.out, sample.in / sample.out
 */
function classifyName(fullName) {
  const base = path.posix.basename(fullName.replace(/\\/g, '/')).toLowerCase();
  if (!base || base.startsWith('.') || base.startsWith('__macosx')) return null;
  let m = base.match(/^(?:input|in|inp)[\s_.-]*0*(\d+)(?:\.(?:txt|in|dat))?$/);
  if (m) return { key: String(Number(m[1])), kind: 'in', num: Number(m[1]) };
  m = base.match(/^(?:output|out|ans|answer|expected|result)[\s_.-]*0*(\d+)(?:\.(?:txt|out|ans|dat))?$/);
  if (m) return { key: String(Number(m[1])), kind: 'out', num: Number(m[1]) };
  m = base.match(/^(.+?)\.(in|inp|input|i)(?:\.txt)?$/);
  if (m) return keyFromStem(m[1], 'in');
  m = base.match(/^(.+?)\.(out|ans|a|answer|output|o|sol)(?:\.txt)?$/);
  if (m) return keyFromStem(m[1], 'out');
  return null;
}

function keyFromStem(stem, kind) {
  const digits = stem.match(/(\d+)$/);
  if (digits) return { key: stem.slice(0, -digits[1].length).replace(/[\s_.-]+$/, '') + '#' + Number(digits[1]), kind, num: Number(digits[1]) };
  return { key: stem, kind, num: Infinity };
}

/**
 * Upload хийсэн файлууд (zip эсвэл олон txt) → [{name, input, output|null}]
 * @param {Array<{originalname: string, buffer: Buffer}>} files
 */
async function parseUploads(files) {
  const entries = []; // {name, text}
  let total = 0;
  const add = (name, buf) => {
    total += buf.length;
    if (total > MAX_TOTAL_BYTES) throw new Error(`Тестүүдийн нийт хэмжээ ${MAX_TOTAL_BYTES / 1024 / 1024}MB-аас хэтэрлээ.`);
    entries.push({ name, text: normalizeText(buf.toString('utf8')) });
  };

  for (const f of files) {
    const name = f.originalname;
    if (/\.zip$/i.test(name)) {
      let zip;
      try {
        zip = await JSZip.loadAsync(f.buffer);
      } catch {
        throw new Error(`«${name}» zip файлыг уншиж чадсангүй.`);
      }
      const items = Object.values(zip.files).filter((z) => !z.dir);
      if (items.length > MAX_TESTS * 2 + 20) throw new Error('Zip дотор хэт олон файл байна.');
      for (const z of items) {
        if (!classifyName(z.name)) continue;
        // Zip bomb-оос сэргийлж задлахаас өмнө хэмжээг шалгана
        const size = z._data && z._data.uncompressedSize;
        if (size && total + size > MAX_TOTAL_BYTES) throw new Error(`Тестүүдийн нийт хэмжээ ${MAX_TOTAL_BYTES / 1024 / 1024}MB-аас хэтэрлээ.`);
        add(z.name, await z.async('nodebuffer'));
      }
    } else {
      add(name, f.buffer);
    }
  }

  const groups = new Map();
  const unknown = [];
  for (const e of entries) {
    const c = classifyName(e.name);
    if (!c) {
      unknown.push(path.posix.basename(e.name));
      continue;
    }
    if (!groups.has(c.key)) groups.set(c.key, { key: c.key, num: c.num, name: '', input: null, output: null });
    const g = groups.get(c.key);
    if (c.kind === 'in') {
      g.input = e.text;
      g.name = path.posix.basename(e.name);
    } else g.output = e.text;
  }

  const tests = [];
  const orphanOutputs = [];
  for (const g of [...groups.values()].sort((a, b) => a.num - b.num || a.key.localeCompare(b.key, 'en', { numeric: true }))) {
    if (g.input == null) {
      orphanOutputs.push(g.key);
      continue;
    }
    tests.push({ name: g.name, input: g.input, output: g.output });
  }
  if (tests.length > MAX_TESTS) throw new Error(`Нэг бодлогод ${MAX_TESTS}-аас олон тест оруулах боломжгүй.`);
  return { tests, unknown, orphanOutputs };
}

/** Тестийн тоо, хэмжээг бодлого дээр шинэчилнэ */
async function refreshCounts(problemId) {
  const tests = await ProblemTest.find({ problem: problemId }).select('sample input output').lean();
  await Problem.updateOne(
    { _id: problemId },
    {
      testCount: tests.length,
      sampleCount: tests.filter((t) => t.sample).length,
      testsSize: tests.reduce((s, t) => s + Buffer.byteLength(t.input) + Buffer.byteLength(t.output), 0),
    }
  );
}

/** Шалгалт: хэмжээ, тоо */
function validateTests(tests, existing = { count: 0, size: 0 }) {
  if (existing.count + tests.length > MAX_TESTS) return `Нэг бодлогод ${MAX_TESTS}-аас олон тест оруулах боломжгүй.`;
  let size = existing.size;
  for (const [i, t] of tests.entries()) {
    const b = Buffer.byteLength(t.input) + Buffer.byteLength(t.output || '');
    if (b > MAX_TEST_BYTES) return `${t.name || i + 1}-р тест хэт том (${(b / 1024 / 1024).toFixed(1)}MB > 15MB).`;
    size += b;
  }
  if (size > MAX_TOTAL_BYTES) return `Тестүүдийн нийт хэмжээ ${MAX_TOTAL_BYTES / 1024 / 1024}MB-аас хэтэрнэ.`;
  return null;
}

/** Тестүүдийг хадгална (replace = хуучныг устгана) */
async function saveTests(problemId, tests, { replace = false, sampleFirst = 0 } = {}) {
  if (replace) await ProblemTest.deleteMany({ problem: problemId });
  const last = replace ? null : await ProblemTest.findOne({ problem: problemId }).sort({ order: -1 }).select('order').lean();
  let order = last ? last.order + 1 : 1;
  const docs = tests.map((t, i) => ({
    problem: problemId,
    order: order++,
    name: t.name || '',
    input: t.input,
    output: t.output || '',
    sample: replace && i < sampleFirst,
  }));
  // Том тестүүдийг нэг дор биш хэсэгчлэн бичнэ
  for (let i = 0; i < docs.length; i += 20) await ProblemTest.insertMany(docs.slice(i, i + 20));
  await refreshCounts(problemId);
  return docs.length;
}

module.exports = { parseUploads, saveTests, refreshCounts, validateTests, normalizeText, classifyName, MAX_TESTS };
