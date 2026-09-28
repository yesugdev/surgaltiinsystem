// Хичээлийн засварлагчдын нийтлэг туслах: markdown урьдчилан харах, асуултын урьдчилсан харагдац
(function () {
  var TYPE_LABELS = { single: 'Нэг сонголттой', multiple: 'Олон сонголттой', text: 'Нээлттэй' };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // Сервер дээр markdown-ийг аюулгүй HTML болгоно (жинхэнэ харагдацтай яг ижил)
  function markdown(text) {
    return fetch('/lessons/preview-md', {
      method: 'POST',
      body: new URLSearchParams({ text: text }),
      credentials: 'same-origin',
    })
      .then(function (r) { return r.ok ? r.json() : { html: '' }; })
      .then(function (d) { return d.html; })
      .catch(function () { return ''; });
  }

  function renderQuestions(container, questions, errorMessagesByQuestion) {
    questions.forEach(function (q, i) {
      var errs = errorMessagesByQuestion && errorMessagesByQuestion[q.number];
      var card = el('article', 'preview-q' + (errs ? ' has-error' : ''));
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
        var ul = el('ul', 'options');
        q.options.forEach(function (o) {
          var li = el('li', o.isCorrect ? 'correct' : '');
          li.appendChild(el('span', 'opt-mark', o.isCorrect ? '✓' : ''));
          li.appendChild(document.createTextNode(o.text));
          ul.appendChild(li);
        });
        card.appendChild(ul);
      }
      (errs || []).forEach(function (m) { card.appendChild(el('div', 'preview-q-error small', m)); });
      container.appendChild(card);
    });
  }

  function errorBox(title, messages) {
    var box = el('div', 'flash flash-error');
    box.appendChild(el('strong', null, title));
    var ul = el('ul');
    messages.forEach(function (m) { ul.appendChild(el('li', null, m)); });
    box.appendChild(ul);
    return box;
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  // <textarea data-md-preview="#id"> → тухайн элементэд шууд урьдчилан харуулна
  document.querySelectorAll('textarea[data-md-preview]').forEach(function (ta) {
    var target = document.querySelector(ta.getAttribute('data-md-preview'));
    if (!target) return;
    var seq = 0;
    var update = function () {
      var my = ++seq;
      if (!ta.value.trim()) {
        target.innerHTML = '<p class="muted">Урьдчилан харах хэсэг энд гарна.</p>';
        return;
      }
      markdown(ta.value).then(function (html) {
        if (my === seq) target.innerHTML = html; // сервер цэвэрлэсэн HTML
      });
    };
    ta.addEventListener('input', debounce(update, 400));
    update();
  });

  // Хуулах товч: <button data-copy="#textareaId">
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var src = document.querySelector(btn.getAttribute('data-copy'));
      var text = src.value != null ? src.value : src.textContent;
      var label = btn.textContent;
      function done() { btn.textContent = '✓ Хуулагдлаа'; setTimeout(function () { btn.textContent = label; }, 1800); }
      function fallback() {
        var tmp = document.createElement('textarea');
        tmp.value = text;
        document.body.appendChild(tmp);
        tmp.select();
        try { document.execCommand('copy'); done(); } catch (e) { /* хуулах боломжгүй */ }
        tmp.remove();
      }
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
      else fallback();
    });
  });

  // <dialog> нээх/хаах: <button data-open-dialog="#id">, dialog доторх [data-close]
  document.querySelectorAll('[data-open-dialog]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var d = document.querySelector(btn.getAttribute('data-open-dialog'));
      if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    });
  });
  document.querySelectorAll('dialog').forEach(function (d) {
    d.addEventListener('click', function (e) { if (e.target.hasAttribute('data-close')) d.close(); });
  });

  window.Preview = { el: el, markdown: markdown, renderQuestions: renderQuestions, errorBox: errorBox, debounce: debounce };
})();
