/**
 * Шалгалтын дүн шинжилгээг сургуулийн Excel загвараар («анализ-хөндлөн») гаргана.
 *
 * Загварын байрлал (хуудас 1):
 *   мөр 1–6   толгой; C–J = 8 даалгаврын багана (мөр 5 = дугаар, мөр 6 = авах оноо); K–N = Авах/Авсан оноо, Хувь, Түвшин
 *   мөр 7–30  сурагчид (B = нэр, C–J = оноо, K = авах оноо; L, M, N = томьёо)
 *   мөр 33–44 дүн шинжилгээ (нийлбэр, хувь, дундаж, бүрэн/огт хийгээгүй, түвшний тоо, амжилт, чанар)
 *   мөр 46–47 гарын үсэг
 *
 * Томьёоны бүтцийг загвараас яг хэвээр нь бичнэ. Загварт гараар бичигдсэн тоонуудыг
 * (сурагчийн тоо 23, нийт оноо "13", даалгаврын дээд оноо "1"/"2") тухайн шалгалтын утгаар сольж,
 * даалгавар 8-аас, сурагч загварын мөрөөс олон бол багана, мөрийг ижил хэв маягаар нэмнэ.
 */
const ExcelJS = require('exceljs');

const T_TASK_FIRST = 3; // C
const T_TASK_LAST = 10; // J
const T_TASKS = 8;
const T_STUDENT_ROW = 7;
const T_SUM_FIRST = 33;
const T_LAST_ROW = 47;
const LEVELS = ['VIII', 'VII', 'VI', 'V', 'IV', 'III', 'II', 'I'];

function colLetter(n) {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

const num = (v) => String(Math.round(v * 100) / 100); // COUNTIF-ийн шалгуурт ("13", "1.5")

function cloneStyle(style) {
  return style ? JSON.parse(JSON.stringify(style)) : {};
}

function safeSheetName(name, used) {
  let base = String(name || 'Анги').replace(/[\\/*?:[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 26) || 'Анги';
  let n = base;
  let i = 2;
  while (used.has(n.toLowerCase())) n = `${base} (${i++})`;
  used.add(n.toLowerCase());
  return n;
}

function formatDate(d) {
  if (!d) return null;
  d = new Date(d);
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()} оны ${p(d.getMonth() + 1)} сарын ${p(d.getDate())} өдөр`;
}

/**
 * @param {Buffer} templateBuffer  xlsx загвар
 * @param {object} data
 *   questions: [{ points }]                  — шалгалтын асуултууд (дарааллаар)
 *   groups:    [{ className, expectedCount, students: [{ name, scores: [number|null], max }],
 *                 questions?, date?, teacherName?, sheetName? }]
 *              — олон шалгалтыг нэг файлд: хуудас бүр өөрийн асуулт, огноо, багштай байж болно
 *   date, teacherName
 * @returns {Promise<Buffer>}
 */
async function buildExamAnalysis(templateBuffer, { questions = [], groups, date, teacherName }) {
  const tpl = new ExcelJS.Workbook();
  await tpl.xlsx.load(templateBuffer);
  const T = tpl.worksheets[0];

  const out = new ExcelJS.Workbook();
  out.creator = 'YeSuvd';
  out.calcProperties.fullCalcOnLoad = true; // Excel нээхэд бүх томьёог тооцно
  const c = colLetter;
  const taskCol = (j) => T_TASK_FIRST + j; // j = 0..TC-1

  const usedNames = new Set();
  for (const g of groups) {
    const S = g.students.length;
    if (!S) continue;
    const gQuestions = g.questions || questions;
    const gDate = g.date !== undefined ? g.date : date;
    const gTeacher = g.teacherName !== undefined ? g.teacherName : teacherName;

    const Q = gQuestions.length;
    const TC = Math.max(Q, T_TASKS); // даалгаврын баганын тоо (загвар шиг хамгийн багадаа 8)
    const shift = TC - T_TASKS;
    const K = T_TASK_FIRST + TC; // Авах оноо
    const L = K + 1; // Авсан оноо
    const M = K + 2; // Хувь
    const N = K + 3; // Түвшин
    const maxes = gQuestions.map((q) => Number(q.points) || 0);
    const total = maxes.reduce((s, x) => s + x, 0);
    // Гаралтын баганыг загварын аль баганаас хэлбэржүүлэх вэ
    const templateCol = (oc) => {
      if (oc < T_TASK_FIRST) return oc;
      if (oc < K) return oc === K - 1 ? T_TASK_LAST : T_TASK_FIRST; // сүүлийн даалгавар = J (баруун хүрээтэй)
      return oc - shift;
    };
    const isTaskCol = (oc) => oc >= T_TASK_FIRST && oc < K;

    const ws = out.addWorksheet(safeSheetName(g.sheetName || g.className, usedNames), {
      pageSetup: cloneStyle(T.pageSetup),
      properties: cloneStyle(T.properties),
    });

    const firstStudent = T_STUDENT_ROW;
    const lastStudent = T_STUDENT_ROW + S - 1;
    const sumStart = lastStudent + 3; // 2 хоосон мөр, дараа нь дүн шинжилгээ (загвар: 30 → 33)
    const rowOf = (tr) => (tr < T_SUM_FIRST ? tr : tr - T_SUM_FIRST + sumStart);
    const rangeEnd = sumStart - 1; // загварын «7:32» хүрээ
    const lastCol = N;

    // Баганын өргөн
    for (let oc = 1; oc <= lastCol; oc++) ws.getColumn(oc).width = T.getColumn(templateCol(oc)).width;

    // Загварын мөрийг гаралтын мөр рүү хуулна (хэлбэр + тогтмол текст)
    const copyRow = (tr, or) => {
      const tRow = T.getRow(tr);
      const oRow = ws.getRow(or);
      if (tRow.height) oRow.height = tRow.height;
      for (let oc = 1; oc <= lastCol; oc++) {
        const tc = templateCol(oc);
        const tCell = tRow.getCell(tc);
        const oCell = oRow.getCell(oc);
        oCell.style = cloneStyle(tCell.style);
        const v = tCell.value;
        const isFormula = v && typeof v === 'object' && ('formula' in v || 'sharedFormula' in v);
        // Даалгаврын баганын текстийг зөвхөн эхний баганад (нэгтгэсэн нүдний эх) хуулна
        if (v != null && !isFormula && (!isTaskCol(oc) || oc === T_TASK_FIRST)) oCell.value = v;
      }
    };
    for (let r = 1; r <= 6; r++) copyRow(r, r);
    for (let i = 0; i < S; i++) copyRow(T_STUDENT_ROW, firstStudent + i);
    copyRow(31, lastStudent + 1);
    copyRow(32, lastStudent + 2);
    for (let r = T_SUM_FIRST; r <= T_LAST_ROW; r++) copyRow(r, rowOf(r));

    const cell = (col, row) => ws.getCell(`${c(col)}${row}`);
    const setF = (col, row, formula) => { cell(col, row).value = { formula }; };

    // ---- Толгой ----
    const dateText = formatDate(gDate);
    if (dateText) cell(2, 3).value = dateText;
    cell(7, 3).value = g.className; // «Анги» шошгын дараах нүд
    // «Шалгагдвал зохих» / «Шалгагдсан»: загварт J:M шошго, N утга → баруун талын 4 багана + N
    cell(N - 4, 2).value = 'Шалгагдвал зохих ';
    cell(N - 4, 3).value = 'Шалгагдсан';
    cell(N, 2).value = g.expectedCount;
    cell(N, 3).value = S;
    cell(K, 4).value = 'Авах оноо';
    cell(L, 4).value = 'Авсан оноо';
    cell(M, 4).value = 'Хувь';
    cell(N, 4).value = 'Түвшин';

    // Даалгаврын дугаар (мөр 5), авах оноо (мөр 6)
    for (let j = 0; j < TC; j++) {
      cell(taskCol(j), 5).value = j < Q ? j + 1 : null;
      cell(taskCol(j), 6).value = j < Q ? maxes[j] : null;
    }
    setF(K, 6, `SUM(${c(T_TASK_FIRST)}6:${c(K - 1)}6)`);

    // ---- Сурагчид ----
    const usedTaskRefs = (r) => Array.from({ length: Q }, (_, j) => `${c(taskCol(j))}${r}`);
    g.students.forEach((st, i) => {
      const r = firstStudent + i;
      cell(1, r).value = i + 1;
      cell(2, r).value = st.name;
      for (let j = 0; j < TC; j++) {
        const v = j < Q ? st.scores[j] : null;
        cell(taskCol(j), r).value = v == null ? null : v;
      }
      cell(K, r).value = st.max;
      setF(L, r, usedTaskRefs(r).join('+') || '0');
      setF(M, r, `(100*${c(L)}${r})/${c(K)}${r}`);
      const m = `${c(M)}${r}`;
      setF(N, r, `IF(${m}>=90,"VIII",IF(${m}>=80,"VII",IF(${m}>=70,"VI",IF(${m}>=60,"V",IF(${m}>=50,"IV",IF(${m}>=40,"III",IF(${m}>=30,"II",IF(${m}<29,"I"))))))))`);
    });

    // ---- Дүн шинжилгээ ----
    const R = (tr) => rowOf(tr);
    const N3 = `${c(N)}3`;
    for (let j = 0; j < Q; j++) {
      const col = c(taskCol(j));
      setF(taskCol(j), R(33), `${N3}*${col}6`);
      setF(taskCol(j), R(34), `SUM(${col}${firstStudent}:${col}${rangeEnd})`);
      setF(taskCol(j), R(35), `(${col}${R(34)}*100)/${col}${R(33)}`);
      setF(taskCol(j), R(36), `${col}${R(34)}/${S}`);
      setF(taskCol(j), R(37), `COUNTIF(${col}$${firstStudent}:${col}$${lastStudent},"${num(maxes[j])}")`);
      setF(taskCol(j), R(38), `COUNTIF(${col}$${firstStudent}:${col}$${rangeEnd},"0")`);
    }
    // Ашиглагдаагүй даалгаврын багана (асуулт 8-аас цөөн): хоосон
    for (let j = Q; j < TC; j++) for (const tr of [33, 34, 35, 36, 37, 38]) cell(taskCol(j), R(tr)).value = null;

    setF(K, R(33), `SUM(${c(K)}${firstStudent}:${c(K)}${rangeEnd})`);
    setF(L, R(34), `SUM(${c(L)}${firstStudent}:${c(L)}${rangeEnd})`);
    setF(M, R(35), `(${c(L)}${R(34)}*100)/${c(K)}${R(33)}`);
    setF(K, R(36), `${c(L)}${R(34)}/${S}`);
    setF(K, R(37), `COUNTIF(${c(L)}${firstStudent}:${c(L)}${rangeEnd},"${num(total)}")`);
    setF(K, R(38), `COUNTIF(${c(K)}$${firstStudent}:${c(K)}$${rangeEnd},"0")`);

    // Түвшний хүснэгт (L = «ТҮВШИН», M = нэр, N = тоо)
    cell(L, R(37)).value = 'ТҮВШИН';
    LEVELS.forEach((lv, k) => {
      cell(M, R(37 + k)).value = lv;
      setF(N, R(37 + k), `COUNTIF(${c(N)}$${firstStudent}:${c(N)}$${rangeEnd},"${lv}")`);
    });

    // Амжилт (VIII–V), Чанар (VIII–VII)
    const lvl = (k) => `${c(N)}${R(37 + k)}`;
    cell(3, R(44)).value = 'Амжилт';
    setF(5, R(44), `((${lvl(0)}+${lvl(1)}+${lvl(2)}+${lvl(3)})*100)/${S}`);
    cell(7, R(44)).value = 'Чанар';
    setF(9, R(44), `((${lvl(1)}+${lvl(0)})*100)/${S}`);

    // Гарын үсэг
    if (gTeacher) cell(2, R(47)).value = `ХИЧЭЭЛ ЗААДАГ БАГШ                              /  ${gTeacher}  /`;

    // ---- Нэгтгэсэн нүд (загвар шиг) ----
    const merge = (c1, r1, c2, r2) => { if (c2 > c1 || r2 > r1) ws.mergeCells(r1, c1, r2, c2); };
    merge(1, 1, lastCol, 1); // гарчиг
    merge(N - 4, 2, N - 1, 2);
    merge(N - 4, 3, N - 1, 3);
    merge(5, 3, 6, 3); // «Анги»
    merge(1, 4, 1, 6);
    merge(2, 4, 2, 5);
    merge(T_TASK_FIRST, 4, K - 1, 4); // «Даалгавар»
    merge(K, 4, K, 5);
    merge(L, 4, L, 6);
    merge(M, 4, M, 6);
    merge(N, 4, N, 6);
    for (const tr of [33, 34, 35, 36, 37, 38]) merge(1, R(tr), 2, R(tr));
    merge(1, R(39), 1, R(44)); // «Дүгнэлт»
    merge(2, R(39), K, R(43)); // дүгнэлт бичих талбар
    merge(L, R(37), L, R(44)); // «ТҮВШИН»
    merge(3, R(44), 4, R(44)); // «Амжилт»
    merge(7, R(44), 8, R(44)); // «Чанар»
    merge(2, R(46), lastCol, R(46));
    merge(2, R(47), lastCol, R(47));

    if (T.pageSetup?.printArea) delete ws.pageSetup.printArea;
  }

  if (!out.worksheets.length) out.addWorksheet('Хоосон').getCell('A1').value = 'Шалгалт өгсөн сурагч алга байна.';
  return Buffer.from(await out.xlsx.writeBuffer());
}

// ---------------- Загвар хадгалах ----------------
// Repo-д нэрсийг цэвэрлэсэн анхдагч загвар бий. Админ сургуулийнхаа жинхэнэ загварыг вэбээс
// upload хийвэл өгөгдлийн санд (GridFS) хадгалагдаж, git-д орохгүй.
const fsp = require('node:fs/promises');
const path = require('node:path');
const DEFAULT_TEMPLATE = path.join(__dirname, '..', 'templates', 'exam-analysis.xlsx');
const SETTING_KEY = 'examAnalysisTemplate';

async function getTemplate() {
  const { Setting } = require('./models');
  const files = require('./files');
  const s = await Setting.findOne({ key: SETTING_KEY }).lean();
  if (s?.value?.fileId) {
    try {
      return { buffer: await files.readBuffer(s.value.fileId), custom: true, name: s.value.name, uploadedAt: s.updatedAt };
    } catch {
      // файл устсан бол анхдагч руу буцна
    }
  }
  return { buffer: await fsp.readFile(DEFAULT_TEMPLATE), custom: false, name: 'анализ-хөндлөн.xlsx (анхдагч)' };
}

/** Upload хийсэн файл энэ үүсгэгчийн хүлээдэг байрлалтай эсэхийг шалгана */
async function validateTemplate(buffer) {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer);
  } catch {
    return 'Excel (.xlsx) файл уншиж чадсангүй.';
  }
  const ws = wb.worksheets[0];
  if (!ws) return 'Файлд хуудас алга.';
  const text = (a) => String(ws.getCell(a).value ?? '').trim();
  const formula = (a) => ws.getCell(a).value?.formula || '';
  const problems = [];
  if (!text('C4').includes('Даалгавар')) problems.push('C4 нүдэнд «Даалгавар» байх ёстой');
  if (!text('K4').includes('Авах оноо')) problems.push('K4 нүдэнд «Авах оноо» байх ёстой');
  if (!text('N4').includes('Түвшин')) problems.push('N4 нүдэнд «Түвшин» байх ёстой');
  if (!/^IF\(M7>=/.test(formula('N7'))) problems.push('N7 нүдэнд түвшний IF томьёо байх ёстой');
  if (!text('A33').includes('Авах оноо')) problems.push('A33 нүдэнд «Авах оноо» (дүн шинжилгээний эхлэл) байх ёстой');
  return problems.length ? 'Загварын байрлал таарахгүй байна: ' + problems.join('; ') + '.' : null;
}

module.exports = { buildExamAnalysis, colLetter, getTemplate, validateTemplate, SETTING_KEY };
