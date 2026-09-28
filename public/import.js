(function () {
  var form = document.getElementById('import-form');
  if (!form || !window.QuestionParser) return;

  var textarea = document.getElementById('import-text');
  var list = document.getElementById('preview-list');
  var errorsBox = document.getElementById('preview-errors');
  var summary = document.getElementById('preview-summary');
  var submit = document.getElementById('import-submit');
  var TYPE_LABELS = { single: 'Нэг сонголттой', multiple: 'Олон сонголттой', text: 'Нээлттэй' };
  var timer = null;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function render() {
    var value = textarea.value;
    list.innerHTML = '';
    errorsBox.innerHTML = '';

    if (!value.trim()) {
      list.appendChild(el('p', 'muted', 'Асуултуудаа зүүн талд буулгахад энд харагдана.'));
      summary.textContent = '';
      submit.disabled = true;
      submit.textContent = 'Оруулах';
      return;
    }

    var result = QuestionParser.parse(value);
    var errorsByQ = {};
    result.errors.forEach(function (e) {
      if (e.question != null) (errorsByQ[e.question + ':' + e.line] = errorsByQ[e.question + ':' + e.line] || []).push(e.message);
    });

    if (result.errors.length) {
      var box = el('div', 'flash flash-error');
      box.appendChild(el('strong', null, result.errors.length + ' алдаа засах шаардлагатай:'));
      var ul = el('ul');
      result.errors.forEach(function (e) {
        var prefix = e.question != null ? e.question + '-р асуулт: ' : e.line ? e.line + '-р мөр: ' : '';
        ul.appendChild(el('li', null, prefix + e.message));
      });
      box.appendChild(ul);
      errorsBox.appendChild(box);
    }
    if (result.warnings.length) {
      var w = el('div', 'flash flash-info small');
      w.textContent = result.warnings.map(function (x) { return x.message; }).join(' ');
      errorsBox.appendChild(w);
    }

    var totalPoints = 0;
    var counts = { single: 0, multiple: 0, text: 0 };
    result.questions.forEach(function (q, i) {
      totalPoints += q.points > 0 ? q.points : 0;
      counts[q.type]++;
      var qErrors = errorsByQ[q.number + ':' + q.line];
      var card = el('article', 'preview-q' + (qErrors ? ' has-error' : ''));
      var head = el('div', 'question-head');
      head.appendChild(el('span', 'qnum', String(i + 1)));
      head.appendChild(el('span', 'badge', TYPE_LABELS[q.type]));
      head.appendChild(el('span', 'muted small', (q.points > 0 ? q.points : '?') + ' оноо'));
      card.appendChild(head);
      card.appendChild(el('div', 'question-text prewrap', q.text || '(текст алга)'));

      if (q.type === 'text') {
        card.appendChild(el('div', 'small ' + (q.acceptedAnswers.length ? '' : 'muted'),
          q.acceptedAnswers.length ? 'Зөв хариулт: ' + q.acceptedAnswers.join(' / ') : 'Багш гараар дүгнэнэ'));
      } else {
        var opts = el('ul', 'options');
        q.options.forEach(function (o) {
          var li = el('li', o.isCorrect ? 'correct' : '');
          li.appendChild(el('span', 'opt-mark', o.isCorrect ? '✓' : ''));
          li.appendChild(document.createTextNode(o.text));
          opts.appendChild(li);
        });
        card.appendChild(opts);
      }
      if (qErrors) qErrors.forEach(function (m) { card.appendChild(el('div', 'preview-q-error small', m)); });
      list.appendChild(card);
    });

    var n = result.questions.length;
    summary.textContent = n
      ? n + ' асуулт · ' + totalPoints + ' оноо · ' +
        [counts.single && counts.single + ' нэг сонголттой', counts.multiple && counts.multiple + ' олон сонголттой', counts.text && counts.text + ' нээлттэй']
          .filter(Boolean).join(', ')
      : '';
    var ok = n > 0 && !result.errors.length;
    submit.disabled = !ok;
    submit.textContent = ok ? n + ' асуулт оруулах' : 'Алдааг засна уу';
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(render, 150);
  }

  textarea.addEventListener('input', schedule);

  document.getElementById('fill-example').addEventListener('click', function () {
    if (textarea.value.trim() && !confirm('Одоогийн текстийг жишээгээр солих уу?')) return;
    textarea.value = JSON.parse(document.getElementById('import-example').textContent);
    render();
  });
  document.getElementById('clear-text').addEventListener('click', function () {
    if (textarea.value.trim() && !confirm('Талбарыг цэвэрлэх үү?')) return;
    textarea.value = '';
    render();
    textarea.focus();
  });

  form.addEventListener('submit', function (e) {
    var replace = form.querySelector('input[name=mode][value=replace]');
    if (replace && replace.checked && !confirm('Одоо байгаа бүх асуулт устаж, шинэ асуултаар солигдоно. Үргэлжлүүлэх үү?')) {
      e.preventDefault();
      return;
    }
    submit.disabled = true;
    submit.textContent = 'Оруулж байна…';
  });

  // ---- AI prompt цонх ----
  var dialog = document.getElementById('prompt-dialog');
  var promptText = document.getElementById('prompt-text');
  var copyStatus = document.getElementById('copy-status');

  document.getElementById('open-prompt').addEventListener('click', function () {
    copyStatus.textContent = '';
    if (dialog.showModal) dialog.showModal();
    else dialog.setAttribute('open', '');
  });
  dialog.addEventListener('click', function (e) {
    if (e.target.hasAttribute('data-close')) dialog.close();
  });

  document.getElementById('copy-prompt').addEventListener('click', function () {
    var text = promptText.value;
    function done() { copyStatus.textContent = '✓ Хуулагдлаа. Одоо AI-д буулгана уу.'; }
    function fallback() {
      promptText.removeAttribute('readonly');
      promptText.select();
      try { document.execCommand('copy'); done(); } catch (err) { copyStatus.textContent = 'Текстийг сонгоод Ctrl+C дарна уу.'; }
      promptText.setAttribute('readonly', '');
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  });

  render();
})();
