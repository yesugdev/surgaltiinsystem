// AI эрхтэй хэрэглэгч: тестийн асуултыг «Карт» ба «Текст формат» хооронд сольж засна
(function () {
  var ta = document.getElementById('questions-text');
  var out = document.getElementById('questions-preview');
  var textMode = document.getElementById('quiz-text-mode');
  var builder = document.getElementById('quiz-builder');
  var modeInput = document.querySelector('input[name=questionsMode]');
  if (!ta || !out || !window.QuestionParser || !window.Preview) return;
  var P = window.Preview;

  function renderPreview() {
    out.innerHTML = '';
    if (!ta.value.trim()) {
      out.appendChild(P.el('p', 'muted', 'Асуултуудаа бичих эсвэл буулгахад энд харагдана.'));
      return;
    }
    var r = QuestionParser.parse(ta.value);
    var byQ = {};
    r.errors.forEach(function (e) { if (e.question != null) (byQ[e.question] = byQ[e.question] || []).push(e.message); });
    var general = r.errors.filter(function (e) { return e.question == null; }).map(function (e) { return e.message; });
    if (general.length) out.appendChild(P.errorBox('Алдаа:', general));
    P.renderQuestions(out, r.questions, byQ);
  }
  ta.addEventListener('input', P.debounce(renderPreview, 200));

  function setMode(mode) {
    document.querySelectorAll('.seg-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.mode === mode); });
    modeInput.value = mode;
    textMode.hidden = mode !== 'text';
    builder.hidden = mode === 'text';
  }

  document.querySelectorAll('.seg-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.dataset.mode === modeInput.value) return;
      if (b.dataset.mode === 'text') {
        ta.value = QuestionParser.stringify((window.QuizBuilder && window.QuizBuilder.get()) || []);
        renderPreview();
        setMode('text');
      } else {
        var r = QuestionParser.parse(ta.value);
        if (ta.value.trim() && r.errors.length) {
          window.alert('Текстэд алдаа байна. Засаад дахин оролдоно уу:\n\n' + r.errors.slice(0, 8).map(function (e) { return (e.question ? e.question + '-р асуулт: ' : '') + e.message; }).join('\n'));
          return;
        }
        window.QuizBuilder.set(r.questions.map(function (q) {
          return { type: q.type, text: q.text, points: q.points, options: q.options, acceptedAnswers: q.acceptedAnswers.length ? q.acceptedAnswers : (q.type === 'text' ? [''] : []) };
        }));
        setMode('visual');
      }
    });
  });

  if (modeInput.value === 'text') renderPreview();
})();
