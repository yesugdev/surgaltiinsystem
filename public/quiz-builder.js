/**
 * Тестийн асуултыг карт хэлбэрээр засварлагч (Markdown, текст формат мэдэх шаардлагагүй).
 * <div id="quiz-builder"> + <script type="application/json" id="quiz-data">[...]</script>
 * Хадгалахад асуултуудыг JSON болгож <input name="questionsJson">-д бичнэ.
 */
(function () {
  var root = document.getElementById('quiz-builder');
  if (!root) return;
  var form = root.closest('form');
  var jsonInput = form.querySelector('input[name=questionsJson]');
  var locked = root.dataset.locked === '1';
  var LETTERS = 'ABCDEFGHIJKLMNOPQRST';
  var TYPES = [
    ['single', 'Нэг зөв хариулттай'],
    ['multiple', 'Олон зөв хариулттай'],
    ['text', 'Бичгээр хариулах'],
  ];

  var questions;
  try { questions = JSON.parse(document.getElementById('quiz-data').textContent) || []; } catch (e) { questions = []; }

  function blank(type) {
    return type === 'text'
      ? { type: 'text', text: '', points: 1, options: [], acceptedAnswers: [''] }
      : { type: type || 'single', text: '', points: 1, options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }], acceptedAnswers: [] };
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function btn(cls, text, title, onClick) {
    var b = el('button', cls, text);
    b.type = 'button';
    if (title) { b.title = title; b.setAttribute('aria-label', title); }
    b.disabled = locked;
    b.addEventListener('click', onClick);
    return b;
  }

  function sync() {
    jsonInput.value = JSON.stringify(questions);
    var total = questions.reduce(function (s, q) { return s + (Number(q.points) > 0 ? Number(q.points) : 0); }, 0);
    var sum = document.getElementById('quiz-summary');
    if (sum) sum.textContent = questions.length + ' асуулт · ' + (Math.round(total * 100) / 100) + ' оноо';
  }

  // Асуулт бүрийн алдааг шалгана (сервер ч мөн шалгадаг)
  function problems(q) {
    var p = [];
    if (!String(q.text || '').trim()) p.push('Асуултаа бичнэ үү');
    if (!(Number(q.points) > 0)) p.push('Оноо 0-ээс их байна');
    if (q.type !== 'text') {
      var filled = q.options.filter(function (o) { return String(o.text || '').trim(); });
      var correct = filled.filter(function (o) { return o.isCorrect; }).length;
      if (filled.length < 2) p.push('Дор хаяж 2 сонголт бичнэ үү');
      if (q.type === 'single' && correct !== 1) p.push('Зөв хариултыг сонгоно уу');
      if (q.type === 'multiple' && correct < 1) p.push('Зөв хариултуудыг сонгоно уу');
    }
    return p;
  }

  function render(focusIndex) {
    root.innerHTML = '';
    if (!questions.length) {
      var empty = el('div', 'qb-empty');
      empty.appendChild(el('p', 'muted', 'Асуулт алга. Доорх товчоор эхний асуултаа нэмнэ үү.'));
      root.appendChild(empty);
    }
    questions.forEach(function (q, i) { root.appendChild(renderQuestion(q, i)); });

    if (!locked) {
      var add = el('div', 'qb-add');
      add.appendChild(btn('btn', '+ Сонголттой асуулт', null, function () { addQuestion('single'); }));
      add.appendChild(btn('btn', '+ Бичгээр хариулах асуулт', null, function () { addQuestion('text'); }));
      root.appendChild(add);
    }
    sync();
    if (focusIndex != null) {
      var t = root.querySelectorAll('.qb-card')[focusIndex];
      if (t) { t.scrollIntoView({ block: 'center', behavior: 'smooth' }); var ta = t.querySelector('textarea'); if (ta) ta.focus({ preventScroll: true }); }
    }
  }

  function addQuestion(type) {
    var prev = questions[questions.length - 1];
    var q = blank(type);
    if (prev) q.points = prev.points; // өмнөх асуултын оноог санал болгоно
    questions.push(q);
    render(questions.length - 1);
  }

  function renderQuestion(q, i) {
    var card = el('article', 'qb-card');
    card.dataset.index = i;

    // Толгой: дугаар, төрөл, оноо, үйлдэл
    var head = el('div', 'qb-head');
    head.appendChild(el('span', 'qnum', String(i + 1)));
    var typeSel = el('select', 'qb-type');
    typeSel.disabled = locked;
    typeSel.setAttribute('aria-label', 'Асуултын төрөл');
    TYPES.forEach(function (t) {
      var o = el('option', null, t[1]);
      o.value = t[0];
      if (q.type === t[0]) o.selected = true;
      typeSel.appendChild(o);
    });
    typeSel.addEventListener('change', function () {
      var nt = typeSel.value;
      if (nt === 'text' && q.type !== 'text') { q.acceptedAnswers = q.acceptedAnswers && q.acceptedAnswers.length ? q.acceptedAnswers : ['']; }
      if (nt !== 'text' && q.type === 'text' && (!q.options || q.options.length < 2)) q.options = blank('single').options;
      if (nt === 'single') {
        // Нэг зөв хариулттай болгоход зөвхөн эхний зөвийг үлдээнэ
        var seen = false;
        q.options.forEach(function (o) { if (o.isCorrect) { if (seen) o.isCorrect = false; seen = true; } });
      }
      q.type = nt;
      render();
    });
    head.appendChild(typeSel);

    var pts = el('label', 'qb-points');
    var ptsIn = el('input');
    ptsIn.type = 'number'; ptsIn.min = '0.5'; ptsIn.max = '1000'; ptsIn.step = '0.5';
    ptsIn.value = q.points; ptsIn.disabled = locked;
    ptsIn.addEventListener('input', function () { q.points = Number(ptsIn.value); sync(); });
    pts.appendChild(ptsIn);
    pts.appendChild(document.createTextNode(' оноо'));
    head.appendChild(pts);

    head.appendChild(el('span', 'spacer'));
    head.appendChild(btn('btn btn-sm btn-ghost', '↑', 'Дээш зөөх', function () { if (i > 0) { questions.splice(i - 1, 0, questions.splice(i, 1)[0]); render(i - 1); } }));
    head.appendChild(btn('btn btn-sm btn-ghost', '↓', 'Доош зөөх', function () { if (i < questions.length - 1) { questions.splice(i + 1, 0, questions.splice(i, 1)[0]); render(i + 1); } }));
    head.appendChild(btn('btn btn-sm btn-ghost', '⧉', 'Хуулбарлах', function () { questions.splice(i + 1, 0, JSON.parse(JSON.stringify(q))); render(i + 1); }));
    head.appendChild(btn('btn btn-sm btn-danger-ghost', 'Устгах', 'Асуултыг устгах', function () {
      if ((q.text || '').trim() && !window.confirm((i + 1) + '-р асуултыг устгах уу?')) return;
      questions.splice(i, 1);
      render();
    }));
    card.appendChild(head);

    // Асуултын текст
    var text = el('textarea', 'qb-text');
    text.rows = 2;
    text.placeholder = 'Асуултаа бичнэ үү. Жишээ: 7 × 8 = ?';
    text.value = q.text || '';
    text.disabled = locked;
    text.addEventListener('input', function () { q.text = text.value; autosize(text); sync(); });
    card.appendChild(text);
    setTimeout(function () { autosize(text); }, 0);

    if (q.type === 'text') {
      card.appendChild(renderAnswers(q));
    } else {
      card.appendChild(renderOptions(q, i));
    }

    var p = problems(q);
    var warn = el('div', 'qb-problems small');
    warn.hidden = !card.dataset.touched;
    warn.textContent = p.join(' · ');
    card.appendChild(warn);
    return card;
  }

  function renderOptions(q, qi) {
    var wrap = el('div', 'qb-options');
    var hint = el('div', 'qb-hint small muted', q.type === 'single' ? 'Зөв хариултын өмнөх тойргийг сонгоно уу' : 'Бүх зөв хариултыг чагтална уу');
    wrap.appendChild(hint);
    q.options.forEach(function (o, j) {
      var row = el('div', 'qb-option' + (o.isCorrect ? ' correct' : ''));
      var mark = el('input');
      mark.type = q.type === 'single' ? 'radio' : 'checkbox';
      mark.name = 'qb-correct-' + qi;
      mark.checked = !!o.isCorrect;
      mark.disabled = locked;
      mark.title = 'Зөв хариулт';
      mark.setAttribute('aria-label', LETTERS[j] + ' — зөв хариулт');
      mark.addEventListener('change', function () {
        if (q.type === 'single') q.options.forEach(function (x) { x.isCorrect = false; });
        o.isCorrect = mark.checked;
        render();
      });
      row.appendChild(mark);
      row.appendChild(el('span', 'qb-letter', LETTERS[j]));
      var input = el('input', 'qb-option-text');
      input.value = o.text || '';
      input.placeholder = 'Сонголт ' + LETTERS[j];
      input.disabled = locked;
      input.addEventListener('input', function () { o.text = input.value; sync(); });
      input.addEventListener('keydown', function (e) {
        // Сүүлийн сонголт дээр Enter дарвал шинэ сонголт нэмнэ
        if (e.key === 'Enter') {
          e.preventDefault();
          if (j === q.options.length - 1 && q.options.length < 20) { q.options.push({ text: '', isCorrect: false }); render(); focusOption(qi, j + 1); }
          else focusOption(qi, j + 1);
        }
      });
      row.appendChild(input);
      row.appendChild(btn('btn btn-sm btn-ghost', '✕', 'Сонголтыг хасах', function () {
        if (q.options.length <= 2) return;
        q.options.splice(j, 1);
        render();
      }));
      wrap.appendChild(row);
    });
    if (q.options.length < 20) wrap.appendChild(btn('btn btn-sm qb-add-option', '+ Сонголт нэмэх', null, function () { q.options.push({ text: '', isCorrect: false }); render(); focusOption(qi, q.options.length - 1); }));
    return wrap;
  }

  function focusOption(qi, j) {
    var card = root.querySelectorAll('.qb-card')[qi];
    var inp = card && card.querySelectorAll('.qb-option-text')[j];
    if (inp) inp.focus();
  }

  function renderAnswers(q) {
    var wrap = el('div', 'qb-answers');
    wrap.appendChild(el('div', 'qb-hint small muted', 'Зөв хариулт (заавал биш). Бичвэл систем автоматаар шалгана — том жижиг үсэг ялгахгүй. Хоосон бол та гараар дүгнэнэ.'));
    if (!q.acceptedAnswers.length) q.acceptedAnswers.push('');
    q.acceptedAnswers.forEach(function (a, j) {
      var row = el('div', 'qb-option');
      var input = el('input', 'qb-option-text');
      input.value = a;
      input.placeholder = j === 0 ? 'Жишээ: Улаанбаатар' : 'Өөр зөв хувилбар';
      input.disabled = locked;
      input.addEventListener('input', function () { q.acceptedAnswers[j] = input.value; sync(); });
      row.appendChild(input);
      if (q.acceptedAnswers.length > 1) row.appendChild(btn('btn btn-sm btn-ghost', '✕', 'Хасах', function () { q.acceptedAnswers.splice(j, 1); render(); }));
      wrap.appendChild(row);
    });
    wrap.appendChild(btn('btn btn-sm qb-add-option', '+ Өөр зөв хувилбар', null, function () { q.acceptedAnswers.push(''); render(); }));
    return wrap;
  }

  function autosize(ta) {
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight + 2, 400) + 'px';
  }

  // Хадгалахаас өмнө: алдаатай асуултыг тодруулж, илгээхгүй
  form.addEventListener('submit', function (e) {
    if (locked) return;
    var modeInput = form.querySelector('input[name=questionsMode]');
    if (modeInput && modeInput.value === 'text') return; // текст горимд сервер шалгана
    sync();
    var firstBad = -1;
    root.querySelectorAll('.qb-card').forEach(function (card, i) {
      var p = problems(questions[i]);
      card.dataset.touched = '1';
      card.classList.toggle('has-error', p.length > 0);
      var w = card.querySelector('.qb-problems');
      w.hidden = !p.length;
      w.textContent = p.join(' · ');
      if (p.length && firstBad < 0) firstBad = i;
    });
    if (!questions.length) {
      e.preventDefault();
      window.alert('Дор хаяж нэг асуулт нэмнэ үү.');
      return;
    }
    if (firstBad >= 0) {
      e.preventDefault();
      var card = root.querySelectorAll('.qb-card')[firstBad];
      card.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  });

  if (!questions.length && !locked) questions.push(blank('single'));
  render();
  window.QuizBuilder = { get: function () { return questions; }, set: function (q) { questions = q || []; render(); } };
})();
