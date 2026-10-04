// Өрсөлдөөнт Coding: код илгээх, үр дүнг хүлээж харуулах, хуулах товч
(function () {
  function copyText(text, btn) {
    var done = function () {
      var old = btn.textContent;
      btn.textContent = '✓ Хуулсан';
      setTimeout(function () { btn.textContent = old; }, 1500);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
    else {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      done();
    }
  }
  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var el = document.querySelector(btn.dataset.copy);
      if (el) copyText(el.textContent, btn);
    });
  });

  /** Илгээлтийн төлөвийг үе үе асууж #result-ийг шинэчилнэ */
  function poll(url, target, onDone) {
    var delay = 700;
    var tries = 0;
    function tick() {
      fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d.html) target.innerHTML = d.html;
          if (d.status === 'queued' || d.status === 'running') {
            tries++;
            if (tries < 400) setTimeout(tick, Math.min(delay + tries * 100, 2500));
          } else if (onDone) onDone(d);
        })
        .catch(function () { setTimeout(tick, 3000); });
    }
    tick();
  }

  // Илгээлтийн дэлгэрэнгүй хуудас: шалгагдаж байвал хүлээнэ
  var resultBox = document.getElementById('result');
  if (resultBox && resultBox.dataset.poll) poll(resultBox.dataset.poll, resultBox);

  // Бодлогын хуудас
  var form = document.getElementById('submit-form');
  if (!form) return;
  var btn = document.getElementById('submit-btn');
  var msg = document.getElementById('submit-msg');
  var codeTa = document.getElementById('code');
  var lang = document.getElementById('language');
  var editor = function () { return (window.CodeEditors && window.CodeEditors.code) || null; };
  var getCode = function () { return editor() ? editor().get() : codeTa.value; };

  var fileInput = document.getElementById('code-file');
  if (fileInput) {
    fileInput.addEventListener('change', function () {
      var f = fileInput.files[0];
      fileInput.value = '';
      if (!f) return;
      if (f.size > 65536) { msg.textContent = 'Файл хэт том (64KB хүртэл).'; return; }
      var reader = new FileReader();
      reader.onload = function () {
        if (/\.(cpp|cc|cxx|h)$/i.test(f.name)) {
          var cppOpt = Array.prototype.find.call(lang.options, function (o) { return /^cpp/.test(o.value); });
          if (cppOpt && !/^cpp/.test(lang.value)) { lang.value = cppOpt.value; lang.dispatchEvent(new Event('change')); }
        } else if (/\.py$/i.test(f.name) && /^cpp/.test(lang.value)) {
          var pyOpt = Array.prototype.find.call(lang.options, function (o) { return /^py/.test(o.value); });
          if (pyOpt) { lang.value = pyOpt.value; lang.dispatchEvent(new Event('change')); }
        }
        if (editor()) editor().set(reader.result); else codeTa.value = reader.result;
        msg.textContent = '«' + f.name + '» ачааллаа.';
      };
      reader.readAsText(f);
    });
  }

  var tbody = document.querySelector('#my-subs tbody');
  function addRow(id) {
    var table = document.getElementById('my-subs');
    var none = document.getElementById('no-subs');
    if (none) none.remove();
    table.hidden = false;
    var tr = document.createElement('tr');
    tr.dataset.id = id;
    var now = new Date();
    var pad = function (n) { return String(n).padStart(2, '0'); };
    var cells = [
      '<a href="/coding/submissions/' + id + '">' + now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + '</a>',
      lang.options[lang.selectedIndex].text,
      '<span class="verdict v-wait"><span class="spinner"></span>Шалгаж байна</span>',
      '—',
    ];
    tr.innerHTML = cells.map(function (c, i) { return '<td class="' + (i === 3 ? 'num' : i === 2 ? '' : 'small') + '">' + c + '</td>'; }).join('');
    tbody.insertBefore(tr, tbody.firstChild);
    return tr;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (btn.disabled) return;
    var code = getCode();
    if (!code.trim()) { msg.textContent = 'Кодоо бичнэ үү.'; return; }
    btn.disabled = true;
    msg.textContent = 'Илгээж байна…';
    var body = new URLSearchParams({ language: lang.value, code: code });
    fetch(form.dataset.url, { method: 'POST', body: body, credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.d.error || 'Илгээж чадсангүй.');
        msg.textContent = '';
        var row = addRow(res.d.id);
        resultBox.innerHTML = '<div class="result-card result-wait"><span class="verdict v-wait"><span class="spinner"></span>Шалгаж байна</span></div>';
        resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        poll('/coding/submissions/' + res.d.id + '/status?compact=1', resultBox, function (d) {
          btn.disabled = false;
          var v = resultBox.querySelector('.result-head .verdict');
          if (v) row.children[2].innerHTML = v.outerHTML;
          row.children[3].textContent = d.status === 'done' ? d.score : '—';
        });
      })
      .catch(function (err) {
        msg.textContent = err.message;
        btn.disabled = false;
      });
  });
})();
