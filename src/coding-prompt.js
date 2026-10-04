// Өрсөлдөөнт Coding: AI-аар тест бэлтгэх prompt (зөвхөн AI эрхтэй хэрэглэгчид)
// Prompt-д багшийн зөв бодолтыг оруулж, AI-аас тестийн оролт, гаралтыг бэлэн текстээр авна.
// Хадгалахын өмнө гаралтыг зөв бодолтоор дахин шалгаж, зөрвөл засна.

const LANG_NAMES = { cpp17: 'C++17', py38: 'Python 3.8', py3: 'Python 3' };

function buildTestsPrompt(problem, samples = []) {
  const sampleText = samples.length
    ? samples.map((t, i) => `=== INPUT ${i + 1} ===\n${t.input.trimEnd()}\n=== OUTPUT ${i + 1} ===\n${t.output.trimEnd()}`).join('\n')
    : '(жишээ тест алга)';
  const hasRef = problem.refCode && problem.refCode.trim();
  const lang = LANG_NAMES[problem.refLanguage] || problem.refLanguage;
  const refBlock = hasRef
    ? `## Зөв бодолт (${lang})
Гаралтыг ЗӨВХӨН энэ кодын хэвлэх ёстой утгаар бич. Кодыг оролт бүр дээр толгойдоо алхам алхмаар ажиллуулж гаралтыг тооцоол.
\`\`\`${problem.refLanguage === 'cpp17' ? 'cpp' : 'python'}
${problem.refCode.trimEnd()}
\`\`\``
    : '## Зөв бодолт\n(оруулаагүй — гаралтыг бодлогын нөхцөлөөр нягт тооцоол)';

  return `Чи олимпиадын бодлогын тест бэлтгэгч. Доорх бодлогод зориулж тест (оролт ба гаралт) бэлтгэ.

## Бодлого: ${problem.title}
Хугацааны хязгаар: ${problem.timeLimitMs} мс, санах ой: ${problem.memoryLimitMb} MB

${(problem.statement || '').trim() || '(өгүүлбэр хоосон)'}

## Жишээ тестүүд
${sampleText}

${refBlock}

## Шаардлага
1. 12–20 тест бэлтгэ:
   - жижиг, гараар шалгахад хялбар тестүүд;
   - захын тохиолдлууд (хамгийн бага утга, тэг, сөрөг тоо, давхардсан утга, нэг элементтэй г.м. — нөхцөл зөвшөөрвөл);
   - дунд хэмжээний, санамсаргүй мэт тестүүд;
   - бодлогын хязгаарт ойр томоохон тестүүд (гэхдээ тест бүр 60 мөрөөс бага байхаар).
2. Тест бүр бодлогын нөхцөл, хязгаар, оролтын форматыг ЯГ хангана.
3. Гаралт нь дээрх зөв бодолтын яг хэвлэх утга байна. Эргэлзээтэй бол тухайн тестийг бүү оруул.
4. Хариултыг ЗӨВХӨН доорх форматаар өг — тайлбар, гарчиг, markdown, \`\`\` бүү нэм:

=== INPUT 1 ===
(1-р тестийн оролт)
=== OUTPUT 1 ===
(1-р тестийн гаралт)
=== INPUT 2 ===
(2-р тестийн оролт)
=== OUTPUT 2 ===
(2-р тестийн гаралт)`;
}

/**
 * AI-ийн хариултыг тест болгон задална.
 * "=== INPUT n ===" / "=== OUTPUT n ===" тэмдэглэгээ (том жижиг үсэг, дугаар заавал биш, "ОРОЛТ/ГАРАЛТ" ч болно).
 * @returns {{ tests: Array<{name, input, output}>, errors: string[] }}
 */
function parseAiTests(text) {
  let s = String(text || '').replace(/\r\n?/g, '\n');
  // AI заримдаа ``` блок дотор өгдөг
  s = s.replace(/^```[a-z]*[ \t]*$/gim, '');
  const re = /^[ \t]*={2,}[ \t]*(INPUT|OUTPUT|ОРОЛТ|ГАРАЛТ)[ \t]*#?(\d+)?[ \t]*={2,}[ \t]*$/gim;
  const marks = [];
  let m;
  while ((m = re.exec(s))) marks.push({ kind: /INPUT|ОРОЛТ/i.test(m[1]) ? 'in' : 'out', num: m[2] ? Number(m[2]) : null, start: m.index, end: re.lastIndex });
  const errors = [];
  if (!marks.length) return { tests: [], errors: ['«=== INPUT 1 ===», «=== OUTPUT 1 ===» тэмдэглэгээ олдсонгүй. AI-ийн хариултыг бүтнээр нь буулгана уу.'] };

  const body = (i) => {
    let b = s.slice(marks[i].end, i + 1 < marks.length ? marks[i + 1].start : s.length);
    b = b.replace(/^\n/, '').replace(/\n+$/, '');
    return b ? b + '\n' : '';
  };
  const tests = [];
  for (let i = 0; i < marks.length; i++) {
    if (marks[i].kind !== 'in') continue;
    const label = marks[i].num ?? tests.length + 1;
    const next = marks[i + 1];
    const input = body(i);
    if (!input.trim()) {
      errors.push(`${label}-р тестийн оролт хоосон байна.`);
      continue;
    }
    if (!next || next.kind !== 'out') {
      tests.push({ name: `ai${String(label).padStart(2, '0')}`, input, output: null });
      continue;
    }
    tests.push({ name: `ai${String(label).padStart(2, '0')}`, input, output: body(i + 1) });
  }
  if (!tests.length) errors.push('Нэг ч тест танигдсангүй.');
  return { tests, errors };
}

/** Хоосон зай, мөр шилжилтийг үл тооцож харьцуулна (шүүгчтэй ижил) */
const sameTokens = (a, b) => String(a).split(/\s+/).filter(Boolean).join(' ') === String(b).split(/\s+/).filter(Boolean).join(' ');

module.exports = { buildTestsPrompt, parseAiTests, sameTokens };
