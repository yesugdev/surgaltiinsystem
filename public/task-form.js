// Тест даалгаврын асуултыг текстээр засахад шууд урьдчилан харуулна
(function () {
  var ta = document.getElementById('questions-text');
  var out = document.getElementById('questions-preview');
  var summary = document.getElementById('questions-summary');
  if (!ta || !out || !window.QuestionParser || !window.Preview) return;
  var P = window.Preview;

  function render() {
    out.innerHTML = '';
    if (!ta.value.trim()) {
      out.appendChild(P.el('p', 'muted', 'Асуултуудаа бичих эсвэл буулгахад энд харагдана.'));
      summary.textContent = '';
      return;
    }
    var r = QuestionParser.parse(ta.value);
    var byQ = {};
    r.errors.forEach(function (e) { if (e.question != null) (byQ[e.question] = byQ[e.question] || []).push(e.message); });
    var general = r.errors.filter(function (e) { return e.question == null; }).map(function (e) { return e.message; });
    if (general.length) out.appendChild(P.errorBox('Алдаа:', general));
    P.renderQuestions(out, r.questions, byQ);
    var pts = r.questions.reduce(function (s, q) { return s + (q.points > 0 ? q.points : 0); }, 0);
    summary.textContent = r.questions.length + ' асуулт · ' + pts + ' оноо' + (r.errors.length ? ' · ' + r.errors.length + ' алдаа' : '');
    summary.className = 'small ' + (r.errors.length ? 'text-error' : 'muted');
  }
  ta.addEventListener('input', P.debounce(render, 200));
  render();
})();
