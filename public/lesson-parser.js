/**
 * Хичээлийн агуулгыг (онол + даалгаврууд) нэг текстээс задлагч.
 * Хөтөч (урьдчилан харах) болон сервер (хадгалах) хоёулаа ашиглана.
 *
 *   === ОНОЛ ===
 *   Markdown агуулга (## гарчиг, жагсаалт, хүснэгт ...)
 *
 *   === ТЕСТ: Гарчиг ===
 *   (заавал биш заавар)
 *   1. Асуулт           ← шалгалтын асуултын форматтай ижил
 *   A) ...
 *   *B) ...
 *
 *   === ДААЛГАВАР: Гарчиг ===
 *   Оноо: 10            ← заавал биш (анхдагч 10)
 *   Даалгаврын заавар (markdown)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./question-parser'));
  else root.LessonParser = factory(root.QuestionParser);
})(typeof self !== 'undefined' ? self : this, function (QuestionParser) {
  var MAX_TASKS = 50;

  // === ОНОЛ ===, === ТЕСТ: нэр ===, === ДААЛГАВАР: нэр === (** тод, # гарчиг тэмдэглэгээг тэвчинэ)
  var MARKER_RE = /^[\s#*]*={3,}\s*(ОНОЛ|ТЕСТ|ДААЛГАВАР|THEORY|QUIZ|TEST|ASSIGNMENT)\s*(?:[:：\-–—]\s*(.*?))?\s*={3,}[\s*]*$/i;
  var FIRST_Q_RE = /^[\s*]*\d{1,3}\s*[.)]/;
  var PTS_RE = /^\s*(?:оноо|points?)\s*[:：]\s*(.*)$/i;
  var KIND = { 'ОНОЛ': 'theory', THEORY: 'theory', 'ТЕСТ': 'quiz', QUIZ: 'quiz', TEST: 'quiz', 'ДААЛГАВАР': 'assignment', ASSIGNMENT: 'assignment' };

  function trimBlock(lines) {
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    return lines;
  }

  function parse(text) {
    var lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    // AI бүх гаралтыг ``` дотор хийсэн бол гадна талын блокыг авна (онол доторх кодыг хөндөхгүй)
    var t = trimBlock(lines.slice());
    if (t.length > 1 && /^\s*```/.test(t[0]) && /^\s*```\s*$/.test(t[t.length - 1]) && t.some(function (l) { return MARKER_RE.test(l); })) {
      lines = t.slice(1, -1);
    }

    var sections = [];
    var cur = null;
    var preamble = [];
    lines.forEach(function (line, i) {
      var m = line.match(MARKER_RE);
      if (m) {
        cur = { kind: KIND[m[1].toUpperCase()], title: (m[2] || '').replace(/\*+/g, '').trim(), line: i + 1, body: [] };
        sections.push(cur);
      } else if (cur) {
        cur.body.push(line);
      } else if (line.trim()) {
        preamble.push(line);
      }
    });

    var errors = [];
    var warnings = [];
    var theory = [];
    var tasks = [];

    if (!sections.length) {
      errors.push({ line: null, section: null, message: 'Хэсгийн тэмдэглэгээ олдсонгүй. Агуулгыг «=== ОНОЛ ===», «=== ТЕСТ: нэр ===», «=== ДААЛГАВАР: нэр ===» мөрүүдээр хуваана уу.' });
      return { theory: '', tasks: [], errors: errors, warnings: warnings };
    }
    if (preamble.length) warnings.push({ message: 'Эхний хэсгээс өмнөх ' + preamble.length + ' мөрийг алгаслаа.' });

    var quizN = 0;
    var asgN = 0;
    sections.forEach(function (s) {
      var body = trimBlock(s.body.slice());
      // Хаагдаагүй үлдсэн төгсгөлийн ``` (AI-ийн гадна блокийн үлдэгдэл) бол хасна
      var fences = body.filter(function (l) { return /^\s*```/.test(l); }).length;
      if (fences % 2 === 1 && body.length && /^\s*```\s*$/.test(body[body.length - 1])) body = trimBlock(body.slice(0, -1));
      var label;
      function e(msg, line) { errors.push({ line: line || s.line, section: label, message: msg }); }

      if (s.kind === 'theory') {
        label = 'Онол';
        if (!body.join('').trim()) warnings.push({ message: s.line + '-р мөрийн «ОНОЛ» хэсэг хоосон байна.' });
        else theory.push(body.join('\n'));
        return;
      }

      if (tasks.length >= MAX_TASKS) {
        e('Нэг хичээлд хамгийн ихдээ ' + MAX_TASKS + ' даалгавар байна.');
        return;
      }

      if (s.kind === 'quiz') {
        quizN++;
        var title = s.title || 'Тест ' + quizN;
        label = 'Тест «' + title + '»';
        var idx = body.findIndex(function (l) { return FIRST_Q_RE.test(l); });
        if (idx < 0) {
          e('Асуулт олдсонгүй. Асуулт бүр дугаараар эхэлнэ (1. ...).');
          return;
        }
        var instructions = trimBlock(body.slice(0, idx)).join('\n');
        var qStartLine = s.line + 1 + s.body.indexOf(body[idx]);
        var r = QuestionParser.parse(body.slice(idx).join('\n'));
        r.errors.forEach(function (qe) {
          e((qe.question ? qe.question + '-р асуулт: ' : '') + qe.message, qe.line ? qStartLine + qe.line - 1 : null);
        });
        tasks.push({ type: 'quiz', title: title.slice(0, 200), instructions: instructions, questions: r.questions, line: s.line });
        return;
      }

      // Заавартай даалгавар
      asgN++;
      var atitle = s.title || 'Даалгавар ' + asgN;
      label = 'Даалгавар «' + atitle + '»';
      var maxPoints = 10;
      var rest = [];
      body.forEach(function (l) {
        var pm = !rest.length && l.match(PTS_RE); // «Оноо:» мөр зааврын өмнө байна
        if (pm) {
          maxPoints = Number(String(pm[1]).replace(',', '.'));
          if (!(maxPoints >= 0.5 && maxPoints <= 1000)) e('Оноо 0.5–1000 хооронд тоо байна.');
        } else if (rest.length || l.trim()) {
          rest.push(l);
        }
      });
      var instr = trimBlock(rest).join('\n');
      if (!instr) e('Даалгаврын заавар хоосон байна.');
      tasks.push({ type: 'assignment', title: atitle.slice(0, 200), instructions: instr, maxPoints: maxPoints, line: s.line });
    });

    errors.sort(function (a, b) { return (a.line || 0) - (b.line || 0); });
    return { theory: theory.join('\n\n'), tasks: tasks, errors: errors, warnings: warnings };
  }

  var EXAMPLE = [
    '=== ОНОЛ ===',
    '## Квадрат тэгшитгэл',
    '',
    '**ax² + bx + c = 0** (a ≠ 0) хэлбэрийн тэгшитгэлийг квадрат тэгшитгэл гэнэ.',
    '',
    '### Дискриминант',
    '',
    'D = b² − 4ac',
    '',
    '| D-ийн утга | Шийдийн тоо |',
    '|---|---|',
    '| D > 0 | 2 шийдтэй |',
    '| D = 0 | 1 шийдтэй |',
    '| D < 0 | Бодит шийдгүй |',
    '',
    '**Жишээ:** x² − 5x + 6 = 0 → D = 25 − 24 = 1 → x₁ = 2, x₂ = 3',
    '',
    '=== ТЕСТ: Бататгах тест ===',
    'Онолоо уншсаны дараа бөглөнө үү.',
    '',
    '1. x² − 4 = 0 тэгшитгэлийн шийдүүд аль нь вэ?',
    'A) 4 ба −4',
    '*B) 2 ба −2',
    'C) Зөвхөн 2',
    'D) Шийдгүй',
    '',
    '2. Дискриминантын томьёог сонгоно уу.',
    '*A) D = b² − 4ac',
    'B) D = b² + 4ac',
    'C) D = 4ac − b²',
    '',
    '3. x² + 1 = 0 тэгшитгэл хэдэн бодит шийдтэй вэ? (тоогоор)',
    'Хариулт: 0 | тэг',
    '',
    '=== ДААЛГАВАР: Бие даалт ===',
    'Оноо: 10',
    '',
    'Дараах тэгшитгэлүүдийг дэвтэртээ бодоод, **зургийг нь авч** эсвэл Word файлаар илгээнэ үү:',
    '',
    '1. x² − 7x + 12 = 0',
    '2. 2x² + 3x − 2 = 0',
    '3. x² + 4x + 5 = 0',
    '',
    'Бодолт бүрт дискриминантыг заавал бичнэ.',
  ].join('\n');

  return { parse: parse, EXAMPLE: EXAMPLE, MAX_TASKS: MAX_TASKS };
});
