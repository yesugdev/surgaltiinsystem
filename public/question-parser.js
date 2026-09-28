/**
 * Асуултыг текстээс олноор нь задлагч. Хөтөч (урьдчилан харах) болон сервер (хадгалах) хоёулаа
 * энэ нэг файлыг ашигладаг тул хоёулаа яг ижил үр дүн гаргана.
 *
 * Формат:
 *   1. Асуултын текст (олон мөр байж болно)
 *   A) Сонголт
 *   *B) Зөв сонголт            ← * = зөв хариулт; хэд хэдэн * бол олон сонголттой асуулт
 *   Оноо: 2                    ← заавал биш
 *
 *   2. Нээлттэй асуулт
 *   Хариулт: Улаанбаатар | УБ  ← хоосон бол багш гараар дүгнэнэ
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.QuestionParser = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var MAX_QUESTIONS = 300;
  var MAX_OPTIONS = 20;

  var Q_RE = /^(\d{1,3})\s*[.)]\s*(.*)$/;
  var OPT_RE = /^(\*)?\s*([A-Za-zА-ЯЁӨҮа-яёөү])\s*[).]\s*(.*?)\s*(\*)?$/;
  var ANS_RE = /^(?:зөв\s+хариулт|хариулт|answer)\s*[:：]\s*(.*)$/i;
  var PTS_RE = /^(?:оноо|points?)\s*[:：]\s*(.*)$/i;
  var NOTE_RE = /^(?:тайлбар|explanation)\s*[:：]/i;

  // Кирилл, латин ижил дүрстэй үсгийг нэг болгож харьцуулна (А=A, В=B, С=C ...)
  var LOOKALIKE = { 'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E', 'Н': 'H', 'К': 'K', 'М': 'M', 'О': 'O', 'Р': 'P', 'Т': 'T', 'Х': 'X' };
  function letterKey(ch) {
    var u = String(ch).toUpperCase();
    return LOOKALIKE[u] || u;
  }

  /** AI-ийн нэмдэг markdown тэмдэглэгээг цэвэрлэнэ */
  function cleanLine(line) {
    return line
      .replace(/\*\*/g, '')          // **тод**
      .replace(/^\s*[-•]\s+/, '')    // - жагсаалт
      .replace(/^\s*#+\s*/, '')      // # гарчиг
      .trim();
  }

  function parse(text, opts) {
    opts = opts || {};
    var defaultPoints = opts.defaultPoints > 0 ? opts.defaultPoints : 1;
    var lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    var questions = [];
    var errors = [];
    var warnings = [];
    var cur = null;

    function err(lineNo, msg) {
      errors.push({ line: lineNo, question: cur ? cur.number : null, message: msg });
    }

    function finish() {
      if (!cur) return;
      var q = cur;
      var e = function (msg) { errors.push({ line: q.line, question: q.number, message: msg }); };
      var text = q.textLines.join('\n').trim();
      if (!text) e('Асуултын текст хоосон байна.');
      if (text.length > 10000) e('Асуултын текст хэт урт байна.');

      var points = defaultPoints;
      if (q.pointsRaw != null) {
        points = Number(String(q.pointsRaw).replace(',', '.'));
        if (!(points > 0 && points <= 1000)) e('Оноо 0-ээс их, 1000-аас бага тоо байна.');
      }

      var out = { number: q.number, line: q.line, text: text, points: points, options: [], acceptedAnswers: [] };

      if (q.options.length) {
        // "Хариулт: B" эсвэл "Хариулт: A, C" гэж зөв хариултыг үсгээр заасан бол
        if (q.answerRaw != null && q.answerRaw.trim()) {
          var parts = q.answerRaw.split(/[\s,;|]+/).filter(Boolean);
          var allLetters = parts.every(function (p) { return /^[A-Za-zА-ЯЁӨҮа-яёөү][).]?$/.test(p); });
          if (!allLetters) {
            e('Сонголттой асуултын «Хариулт:» мөрөнд зөвхөн үсэг бичнэ (жишээ: Хариулт: B). Эсвэл зөв сонголтын өмнө * тавина уу.');
          } else {
            parts.forEach(function (p) {
              var key = letterKey(p[0]);
              var found = q.options.filter(function (o) { return o.key === key; });
              if (!found.length) e('«Хариулт: ' + p + '» — ийм үсэгтэй сонголт алга.');
              found.forEach(function (o) { o.isCorrect = true; });
            });
          }
        }
        q.options.forEach(function (o) {
          if (!o.text) e(o.letter + ') сонголтын текст хоосон байна.');
        });
        var nCorrect = q.options.filter(function (o) { return o.isCorrect; }).length;
        if (q.options.length < 2) e('Дор хаяж 2 сонголт байх ёстой.');
        if (q.options.length > MAX_OPTIONS) e('Хамгийн ихдээ ' + MAX_OPTIONS + ' сонголт байна.');
        if (!nCorrect) e('Зөв хариулт тэмдэглээгүй байна. Зөв сонголтын өмнө * тавина уу (жишээ: *B) ...).');
        if (nCorrect >= 3 && nCorrect === q.options.length) {
          e('Бүх сонголт зөв гэж тэмдэглэгдсэн байна. Зөвхөн зөв сонголтын өмнө * тавина уу.');
        }
        out.type = nCorrect > 1 ? 'multiple' : 'single';
        out.options = q.options.map(function (o) { return { text: o.text.slice(0, 2000), isCorrect: o.isCorrect }; });
      } else {
        out.type = 'text';
        if (q.answerRaw) {
          out.acceptedAnswers = q.answerRaw.split('|').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 50);
        }
      }
      questions.push(out);
      cur = null;
    }

    for (var i = 0; i < lines.length; i++) {
      var lineNo = i + 1;
      var raw = lines[i];
      if (/^\s*```/.test(raw)) continue; // ``` код блок
      var line = cleanLine(raw);
      if (!line) continue;

      var m = line.match(Q_RE);
      if (m) {
        finish();
        cur = { number: Number(m[1]), line: lineNo, textLines: [m[2]], options: [], answerRaw: null, pointsRaw: null, closed: false };
        if (questions.length >= MAX_QUESTIONS) {
          err(lineNo, 'Нэг удаад хамгийн ихдээ ' + MAX_QUESTIONS + ' асуулт оруулна.');
          break;
        }
        continue;
      }

      if (!cur) {
        // Эхний асуултаас өмнөх гарчиг, оршил текстийг алгасна
        warnings.push({ line: lineNo, message: '«' + line.slice(0, 50) + '» — асуулт биш тул алгаслаа.' });
        continue;
      }

      if (NOTE_RE.test(line)) continue; // тайлбарыг алгасна

      m = line.match(PTS_RE);
      if (m) { cur.pointsRaw = m[1].trim(); cur.closed = true; continue; }

      m = line.match(ANS_RE);
      if (m) { cur.answerRaw = m[1].trim(); cur.closed = true; continue; }

      m = line.match(OPT_RE);
      if (m && !cur.closed) {
        cur.options.push({
          letter: m[2],
          key: letterKey(m[2]),
          text: m[3].trim(),
          isCorrect: !!(m[1] || m[4]),
        });
        continue;
      }

      if (!cur.options.length && !cur.closed) {
        cur.textLines.push(line); // олон мөртэй асуулт
      } else {
        err(lineNo, '«' + line.slice(0, 40) + '» — танигдаагүй мөр. Сонголт нь A) B) хэлбэртэй, эсвэл «Хариулт:», «Оноо:» мөр байх ёстой.');
      }
    }
    finish();

    if (!questions.length && !errors.length) {
      errors.push({ line: null, question: null, message: 'Асуулт олдсонгүй. Асуулт бүр дугаараар эхэлнэ (жишээ: 1. Асуулт...).' });
    }
    errors.sort(function (a, b) { return (a.line || 0) - (b.line || 0); });
    return { questions: questions, errors: errors, warnings: warnings };
  }

  var EXAMPLE = [
    '1. 7 × 8 = ?',
    'A) 54',
    '*B) 56',
    'C) 63',
    'D) 48',
    '',
    '2. Дараахаас анхны тоонуудыг сонгоно уу.',
    '*A) 2',
    'B) 9',
    '*C) 11',
    'D) 15',
    'Оноо: 2',
    '',
    '3. Монгол улсын нийслэл хот аль вэ?',
    'Хариулт: Улаанбаатар | Улаанбаатар хот',
    '',
    '4. Пифагорын теоремыг өөрийн үгээр тайлбарлана уу.',
    'Хариулт:',
    'Оноо: 3',
  ].join('\n');

  /** Хадгалсан асуултуудыг буцааж текст формат болгоно (засахад) */
  function stringify(questions) {
    var letters = 'ABCDEFGHIJKLMNOPQRST';
    return (questions || []).map(function (q, i) {
      var out = [(i + 1) + '. ' + q.text];
      if (q.type === 'text') {
        out.push('Хариулт: ' + (q.acceptedAnswers || []).join(' | '));
      } else {
        (q.options || []).forEach(function (o, j) {
          out.push((o.isCorrect ? '*' : '') + letters[j] + ') ' + o.text);
        });
      }
      if (q.points !== 1) out.push('Оноо: ' + q.points);
      return out.join('\n');
    }).join('\n\n');
  }

  return { parse: parse, stringify: stringify, EXAMPLE: EXAMPLE, MAX_QUESTIONS: MAX_QUESTIONS };
});
