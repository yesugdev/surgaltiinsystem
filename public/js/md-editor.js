// Markdown + LaTeX засварлагч: <textarea data-md-editor data-preview="/url" data-upload="/url">
// Зүүн талд бичнэ, баруун талд серверийн рендерээр (KaTeX томьёотой) шууд урьдчилан харна.
(function () {
  'use strict';

  var TOOLS = [
    { label: 'B', title: 'Тод (Ctrl+B)', wrap: ['**', '**'], ph: 'тод' },
    { label: 'I', title: 'Налуу (Ctrl+I)', wrap: ['*', '*'], ph: 'налуу' },
    { label: 'H', title: 'Гарчиг', line: '## ', ph: 'Гарчиг' },
    { label: '• Жагсаалт', title: 'Жагсаалт', line: '- ', ph: 'зүйл' },
    { label: '</> Код', title: 'Мөр доторх код', wrap: ['`', '`'], ph: 'код' },
    { label: '∑ Томьёо', title: 'Мөр доторх томьёо: $x^2$', wrap: ['$', '$'], ph: 'x^2' },
    { label: '∑∑ Блок', title: 'Тусдаа мөрийн томьёо: $$ … $$', wrap: ['\n$$\n', '\n$$\n'], ph: '\\sum_{i=1}^{n} a_i' },
    { label: '⊞ Хүснэгт', title: 'Хүснэгт', insert: '\n| Оролт | Гаралт |\n|---|---|\n| 1 2 | 3 |\n' },
    { label: '🖼 Зураг', title: 'Зураг оруулах', upload: true },
  ];

  var HELP = [
    ['**тод**', 'тод'], ['*налуу*', 'налуу'], ['## Оролт', 'гарчиг'], ['- зүйл', 'жагсаалт'], ['`код`', 'код'],
    ['$1 \\le n \\le 10^5$', 'томьёо'], ['$$\\frac{a}{b}$$', 'блок томьёо'], ['\\$', '$ тэмдэгт'],
  ];

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function enhance(ta) {
    var previewUrl = ta.dataset.preview;
    var uploadUrl = ta.dataset.upload || '';

    var wrap = el('div', 'mde');
    var bar = el('div', 'mde-toolbar');
    var panes = el('div', 'mde-panes');
    var preview = el('div', 'mde-preview markdown');
    var status = el('span', 'mde-status muted small');
    ta.parentNode.insertBefore(wrap, ta);
    wrap.appendChild(bar);
    wrap.appendChild(panes);
    panes.appendChild(ta);
    panes.appendChild(preview);
    ta.classList.add('mde-input');
    ta.spellcheck = false;

    var file = el('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.hidden = true;
    wrap.appendChild(file);

    function replaceSel(before, after, ph) {
      var s = ta.selectionStart, e = ta.selectionEnd;
      var sel = ta.value.slice(s, e) || ph || '';
      ta.setRangeText(before + sel + after, s, e, 'end');
      ta.selectionStart = s + before.length;
      ta.selectionEnd = s + before.length + sel.length;
      ta.focus();
      schedule();
    }
    function prefixLine(prefix, ph) {
      var s = ta.selectionStart;
      var lineStart = ta.value.lastIndexOf('\n', s - 1) + 1;
      if (ta.selectionStart === ta.selectionEnd && ta.value.slice(lineStart, s).trim() === '' && ta.value.slice(s).split('\n')[0].trim() === '') {
        ta.setRangeText(prefix + ph, lineStart, s, 'end');
        ta.selectionStart = lineStart + prefix.length;
      } else {
        ta.setRangeText(prefix, lineStart, lineStart, 'end');
      }
      ta.focus();
      schedule();
    }

    TOOLS.forEach(function (t) {
      var b = el('button', 'btn btn-sm btn-ghost', t.label);
      b.type = 'button';
      b.title = t.title;
      if (t.upload && !uploadUrl) { b.disabled = true; b.title = 'Зураг оруулах боломж бодлого үүссэний дараа нээгдэнэ'; }
      b.addEventListener('click', function () {
        if (t.wrap) replaceSel(t.wrap[0], t.wrap[1], t.ph);
        else if (t.line) prefixLine(t.line, t.ph);
        else if (t.insert) replaceSel(t.insert, '', '');
        else if (t.upload) file.click();
      });
      bar.appendChild(b);
    });
    var helpBtn = el('button', 'btn btn-sm btn-ghost mde-help-btn', '? Тусламж');
    helpBtn.type = 'button';
    bar.appendChild(helpBtn);
    bar.appendChild(status);

    var help = el('div', 'mde-help small');
    help.hidden = true;
    HELP.forEach(function (h) {
      var row = el('span', 'mde-help-row');
      row.appendChild(el('code', '', h[0]));
      row.appendChild(document.createTextNode(' → ' + h[1]));
      help.appendChild(row);
    });
    wrap.insertBefore(help, panes);
    helpBtn.addEventListener('click', function () { help.hidden = !help.hidden; });

    ta.addEventListener('keydown', function (e) {
      if (!(e.ctrlKey || e.metaKey)) return;
      var k = e.key.toLowerCase();
      if (k === 'b') { e.preventDefault(); replaceSel('**', '**', 'тод'); }
      if (k === 'i') { e.preventDefault(); replaceSel('*', '*', 'налуу'); }
    });
    ta.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      ta.setRangeText('    ', ta.selectionStart, ta.selectionEnd, 'end');
      schedule();
    });

    // ---- урьдчилан харах (серверийн рендер: markdown + KaTeX, аюулгүй цэвэрлэгээтэй)
    var timer = null, seq = 0;
    function schedule() { clearTimeout(timer); timer = setTimeout(refresh, 350); }
    function refresh() {
      var my = ++seq;
      status.textContent = '…';
      fetch(previewUrl, { method: 'POST', body: new URLSearchParams({ text: ta.value }), credentials: 'same-origin', headers: { Accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function (d) {
          if (my !== seq) return;
          preview.innerHTML = d.html || '<p class="muted">Урьдчилан харах энд гарна.</p>';
          status.textContent = '';
        })
        .catch(function () { if (my === seq) status.textContent = 'Урьдчилан харах ажилласангүй'; });
    }
    ta.addEventListener('input', schedule);
    refresh();

    // ---- зураг оруулах
    function uploadFiles(files) {
      if (!uploadUrl || !files.length) return;
      var fd = new FormData();
      Array.prototype.forEach.call(files, function (f) { fd.append('files', f); });
      status.textContent = 'Зураг илгээж байна…';
      fetch(uploadUrl, { method: 'POST', body: fd, credentials: 'same-origin', headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json().then(function (d) { return r.ok ? d : Promise.reject(d.error); }); })
        .then(function (d) {
          status.textContent = '';
          replaceSel(d.files.map(function (f) { return '\n![' + f.name.replace(/[\[\]]/g, '') + '](' + f.url + ')\n'; }).join(''), '', '');
        })
        .catch(function (err) { status.textContent = typeof err === 'string' ? err : 'Зураг оруулж чадсангүй'; });
    }
    file.addEventListener('change', function () { uploadFiles(file.files); file.value = ''; });
    ta.addEventListener('paste', function (e) {
      var imgs = Array.prototype.filter.call((e.clipboardData && e.clipboardData.files) || [], function (f) { return /^image\//.test(f.type); });
      if (imgs.length && uploadUrl) { e.preventDefault(); uploadFiles(imgs); }
    });
    ta.addEventListener('dragover', function (e) { if (uploadUrl) e.preventDefault(); });
    ta.addEventListener('drop', function (e) {
      var imgs = Array.prototype.filter.call(e.dataTransfer.files || [], function (f) { return /^image\//.test(f.type); });
      if (imgs.length && uploadUrl) { e.preventDefault(); uploadFiles(imgs); }
    });
  }

  document.querySelectorAll('textarea[data-md-editor]').forEach(enhance);
})();
