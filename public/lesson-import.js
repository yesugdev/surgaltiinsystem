// Хичээлийн онол + даалгаврыг нэг дор оруулах хуудасны шууд урьдчилсан харагдац
(function () {
  var form = document.getElementById('lesson-import-form');
  if (!form || !window.LessonParser || !window.Preview) return;
  var P = window.Preview;
  var el = P.el;

  var textarea = document.getElementById('import-text');
  var out = document.getElementById('preview-out');
  var summary = document.getElementById('preview-summary');
  var submit = document.getElementById('import-submit');
  var seq = 0;

  function render() {
    var my = ++seq;
    var value = textarea.value;
    out.innerHTML = '';
    if (!value.trim()) {
      out.appendChild(el('p', 'muted', 'Агуулгаа зүүн талд буулгахад энд харагдана.'));
      summary.textContent = '';
      submit.disabled = true;
      submit.textContent = 'Оруулах';
      return;
    }

    var r = LessonParser.parse(value);
    if (r.errors.length) {
      out.appendChild(P.errorBox(r.errors.length + ' алдаа засах шаардлагатай:', r.errors.map(function (e) {
        return (e.section ? e.section + ': ' : '') + (e.line ? '(' + e.line + '-р мөр) ' : '') + e.message;
      })));
    }
    if (r.warnings.length) out.appendChild(el('div', 'flash flash-info small', r.warnings.map(function (w) { return w.message; }).join(' ')));

    // Онол
    if (r.theory) {
      var sec = el('section', 'preview-section');
      sec.appendChild(el('h3', 'preview-section-title', '📖 Онол'));
      var body = el('div', 'markdown preview-theory');
      body.appendChild(el('p', 'muted small', 'Ачаалж байна…'));
      sec.appendChild(body);
      out.appendChild(sec);
      P.markdown(r.theory).then(function (html) { if (my === seq) body.innerHTML = html; });
    }

    // Даалгаврууд
    r.tasks.forEach(function (t, i) {
      var sec = el('section', 'preview-section');
      var head = el('h3', 'preview-section-title', (t.type === 'quiz' ? '📝 Тест: ' : '📎 Даалгавар: ') + t.title);
      sec.appendChild(head);
      if (t.type === 'quiz') {
        var pts = t.questions.reduce(function (s, q) { return s + (q.points > 0 ? q.points : 0); }, 0);
        sec.appendChild(el('div', 'muted small', t.questions.length + ' асуулт · ' + pts + ' оноо' + (t.instructions ? ' · ' + t.instructions : '')));
        var list = el('div', 'preview-list');
        P.renderQuestions(list, t.questions);
        sec.appendChild(list);
      } else {
        sec.appendChild(el('div', 'muted small', t.maxPoints + ' оноо · файл илгээх даалгавар'));
        var ib = el('div', 'markdown preview-instr');
        sec.appendChild(ib);
        P.markdown(t.instructions).then(function (html) { if (my === seq) ib.innerHTML = html; });
      }
      out.appendChild(sec);
    });

    var nq = r.tasks.filter(function (t) { return t.type === 'quiz'; }).length;
    var na = r.tasks.length - nq;
    var parts = [];
    if (r.theory) parts.push('онол');
    if (nq) parts.push(nq + ' тест');
    if (na) parts.push(na + ' даалгавар');
    summary.textContent = parts.join(' · ');
    var ok = parts.length > 0 && !r.errors.length;
    submit.disabled = !ok;
    submit.textContent = ok ? 'Оруулах (' + parts.join(', ') + ')' : 'Алдааг засна уу';
  }

  textarea.addEventListener('input', P.debounce(render, 350));

  document.getElementById('fill-example').addEventListener('click', function () {
    if (textarea.value.trim() && !confirm('Одоогийн текстийг жишээгээр солих уу?')) return;
    textarea.value = JSON.parse(document.getElementById('import-example').textContent);
    render();
  });
  document.getElementById('clear-text').addEventListener('click', function () {
    if (textarea.value.trim() && !confirm('Талбарыг цэвэрлэх үү?')) return;
    textarea.value = '';
    render();
  });

  form.addEventListener('submit', function (e) {
    var replace = form.querySelector('input[name=mode][value=replace]');
    if (replace && replace.checked && !confirm('Одоогийн онол болон даалгаврууд шинэ агуулгаар солигдоно. Үргэлжлүүлэх үү?')) {
      e.preventDefault();
      return;
    }
    submit.disabled = true;
    submit.textContent = 'Оруулж байна…';
  });

  render();
})();
