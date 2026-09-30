// Шалгах горим: нэг даалгаврын бүх сурагчийн ажлыг хуудас ачаалахгүйгээр дараалан дүгнэнэ
(function () {
  var root = document.getElementById('grader');
  if (!root) return;

  var BASE = root.dataset.base;
  var MAX = Number(root.dataset.max);
  var rows = JSON.parse(document.getElementById('grader-data').textContent);

  var listEl = document.getElementById('grader-students');
  var workEl = document.getElementById('grader-work');
  var nameEl = document.getElementById('grader-name');
  var form = document.getElementById('grader-form');
  var scoreEl = document.getElementById('grader-score');
  var feedbackEl = document.getElementById('grader-feedback');
  var saveBtn = document.getElementById('grader-save');
  var statusEl = document.getElementById('grader-status');
  var progressEl = document.getElementById('grade-progress');

  var filter = 'all';
  var current = -1;
  var dirty = false;
  var saving = false;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function fmt(n) { return String(Math.round(n * 100) / 100); }

  function statusOf(r) {
    if (!r.sub) return 'none';
    return r.sub.score == null ? 'pending' : 'graded';
  }
  function visible(r) {
    if (filter === 'all') return true;
    return statusOf(r) === filter;
  }

  function renderProgress() {
    var submitted = rows.filter(function (r) { return r.sub; }).length;
    var graded = rows.filter(function (r) { return statusOf(r) === 'graded'; }).length;
    progressEl.textContent = 'Дүгнэсэн ' + graded + ' / илгээсэн ' + submitted + ' · нийт ' + rows.length + ' сурагч';
  }

  function renderList() {
    listEl.innerHTML = '';
    rows.forEach(function (r, i) {
      if (!visible(r)) return;
      var st = statusOf(r);
      var li = el('li');
      var btn = el('button', 'grader-student st-' + st + (i === current ? ' active' : ''));
      btn.type = 'button';
      btn.dataset.index = i;
      var mark = el('span', 'grader-mark', st === 'graded' ? '✓' : st === 'pending' ? '●' : '○');
      var name = el('span', 'grader-sname', r.name);
      var right = el('span', 'grader-sscore', st === 'graded' ? fmt(r.sub.score) : st === 'pending' ? 'шалгах' : '—');
      btn.append(mark, name, right);
      if (r.sub && r.sub.late) btn.title = 'Хоцорч илгээсэн';
      btn.addEventListener('click', function () { go(i); });
      li.appendChild(btn);
      listEl.appendChild(li);
    });
    if (!listEl.children.length) listEl.appendChild(el('li', 'muted small grader-empty', 'Энэ шүүлтүүрт сурагч алга.'));
    renderProgress();
  }

  function filePreview(f) {
    var src = '/files/' + f.fileId;
    var box = el('div', 'file-block');
    var head = el('div', 'file-block-head');
    head.appendChild(el('strong', 'file-block-name', f.name));
    head.appendChild(el('span', 'muted small', f.size));
    head.appendChild(el('span', 'spacer'));
    var open = el('a', 'btn btn-sm btn-ghost', 'Шинэ цонхонд');
    open.href = src + '/view';
    open.target = '_blank';
    var dl = el('a', 'btn btn-sm btn-ghost', 'Татах');
    dl.href = src + '?download=1';
    head.append(open, dl);
    box.appendChild(head);

    var body;
    if (f.kind === 'image') {
      body = el('a', 'preview-img-link');
      body.href = src;
      body.target = '_blank';
      var img = el('img', 'preview-img');
      img.src = src;
      img.alt = f.name;
      body.appendChild(img);
    } else if (f.kind === 'pdf') {
      body = el('iframe', 'preview-frame');
      body.src = src + '#view=FitH';
      body.title = f.name;
    } else if (f.kind === 'docx' || f.kind === 'text') {
      body = el('iframe', 'preview-frame');
      body.src = src + '/view?embed=1';
      body.title = f.name;
    } else if (f.kind === 'pptx') {
      body = el('div', 'pptx-viewer');
      body.dataset.src = src;
    } else if (f.kind === 'video' || f.kind === 'audio') {
      body = el(f.kind, f.kind === 'video' ? 'viewer-media' : '');
      body.src = src;
      body.controls = true;
      body.preload = 'metadata';
    } else {
      body = el('div', 'flash flash-info small', f.kind === 'ppt'
        ? 'Хуучин .ppt форматыг хөтөч дээр харуулах боломжгүй. «Татах» товчоор татаж нээнэ үү.'
        : 'Энэ төрлийн файлыг хөтөч дээр харуулах боломжгүй. «Татах» товчоор татаж нээнэ үү.');
    }
    box.appendChild(body);
    return box;
  }

  function renderWork(r) {
    workEl.innerHTML = '';
    var head = el('div', 'grader-work-head');
    var h = el('h2', null, r.name);
    head.appendChild(h);
    var meta = el('div', 'muted small', r.className + ' · ' + r.username);
    head.appendChild(meta);
    workEl.appendChild(head);

    if (!r.sub) {
      workEl.appendChild(el('div', 'empty muted', 'Энэ сурагч даалгавраа илгээгээгүй байна.'));
      return;
    }
    var info = el('p', 'small muted', 'Илгээсэн: ' + r.sub.submittedAt + (r.sub.attemptCount > 1 ? ' · ' + r.sub.attemptCount + ' дахь илгээлт' : ''));
    if (r.sub.late) info.appendChild(el('span', 'badge badge-red', 'Хоцорсон'));
    workEl.appendChild(info);

    if (r.sub.text) {
      workEl.appendChild(el('h3', null, 'Сурагчийн бичсэн хариулт'));
      workEl.appendChild(el('div', 'text-answer prewrap', r.sub.text));
    }
    if (!r.sub.files.length && !r.sub.text) workEl.appendChild(el('p', 'muted', 'Файл хавсаргаагүй.'));
    r.sub.files.forEach(function (f) { workEl.appendChild(filePreview(f)); });
    workEl.querySelectorAll('.pptx-viewer').forEach(function (v) { if (window.initPptxViewer) window.initPptxViewer(v); });
  }

  function fillForm(r) {
    nameEl.textContent = r.name;
    var enabled = !!r.sub;
    scoreEl.disabled = feedbackEl.disabled = saveBtn.disabled = !enabled;
    scoreEl.value = enabled && r.sub.score != null ? r.sub.score : '';
    feedbackEl.value = enabled ? r.sub.feedback : '';
    statusEl.textContent = enabled && r.sub.score != null ? 'Өмнө нь дүгнэсэн: ' + fmt(r.sub.score) + ' / ' + fmt(MAX) : '';
    statusEl.className = 'grader-status small';
    dirty = false;
  }

  function go(i) {
    if (i < 0 || i >= rows.length || i === current) return;
    if (dirty && !window.confirm('Хадгалаагүй өөрчлөлт байна. Хадгалахгүйгээр шилжих үү?')) return;
    current = i;
    var r = rows[i];
    renderList();
    renderWork(r);
    fillForm(r);
    // Зөвхөн жагсаалтын дотор гүйлгэнэ (scrollIntoView бүтэн хуудсыг гүйлгэдэг)
    var active = listEl.querySelector('.grader-student.active');
    if (active) {
      var top = active.offsetTop - listEl.offsetTop;
      if (top < listEl.scrollTop) listEl.scrollTop = top;
      else if (top + active.offsetHeight > listEl.scrollTop + listEl.clientHeight) listEl.scrollTop = top + active.offsetHeight - listEl.clientHeight;
    }
    if (r.sub) scoreEl.focus({ preventScroll: true });
    try { history.replaceState(null, '', location.pathname + (r.sub ? '?s=' + r.sub.id : '')); } catch (e) { /* зүгээр */ }
  }

  // Жагсаалтад харагдаж буй дараагийн/өмнөх сурагч
  function step(dir) {
    for (var i = current + dir; i >= 0 && i < rows.length; i += dir) {
      if (visible(rows[i])) return go(i);
    }
  }

  // Хадгалсны дараа: доош нь дүгнээгүй сурагч, байхгүй бол эхнээс нь
  function nextPending() {
    var n = rows.length;
    for (var k = 1; k <= n; k++) {
      var i = (current + k) % n;
      if (statusOf(rows[i]) === 'pending') return i;
    }
    return -1;
  }

  function save() {
    var r = rows[current];
    if (!r || !r.sub || saving) return;
    var val = scoreEl.value.trim();
    var num = Number(val);
    if (val === '' || !(num >= 0 && num <= MAX)) {
      statusEl.textContent = 'Оноо 0–' + fmt(MAX) + ' хооронд байна.';
      statusEl.className = 'grader-status small text-error';
      scoreEl.focus();
      return;
    }
    saving = true;
    saveBtn.disabled = true;
    statusEl.textContent = 'Хадгалж байна…';
    statusEl.className = 'grader-status small muted';
    fetch(BASE + '/submissions/' + r.sub.id + '/grade', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new URLSearchParams({ score: val, feedback: feedbackEl.value }),
      credentials: 'same-origin',
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (d) { return { ok: res.ok, d: d }; });
      })
      .then(function (x) {
        if (!x.ok) throw new Error(x.d.error || 'Хадгалж чадсангүй.');
        r.sub.score = x.d.score;
        r.sub.feedback = x.d.feedback;
        dirty = false;
        var next = nextPending();
        if (next === -1) {
          renderList();
          statusEl.textContent = '✓ Хадгалагдлаа. Илгээсэн бүх ажлыг дүгнэж дууслаа!';
          statusEl.className = 'grader-status small text-success';
        } else {
          go(next);
          statusEl.textContent = '✓ ' + r.name + ': ' + fmt(r.sub.score) + ' оноо хадгалагдлаа';
          statusEl.className = 'grader-status small text-success';
        }
      })
      .catch(function (err) {
        statusEl.textContent = err.message === 'Failed to fetch' ? 'Сүлжээний алдаа. Дахин оролдоно уу.' : err.message;
        statusEl.className = 'grader-status small text-error';
      })
      .finally(function () {
        saving = false;
        saveBtn.disabled = !(rows[current] && rows[current].sub);
      });
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); save(); });
  scoreEl.addEventListener('input', function () { dirty = true; });
  feedbackEl.addEventListener('input', function () { dirty = true; });
  feedbackEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); }
  });
  document.getElementById('grader-prev').addEventListener('click', function () { step(-1); });
  document.getElementById('grader-next').addEventListener('click', function () { step(1); });

  document.addEventListener('keydown', function (e) {
    var t = e.target;
    // Бичиж байх үед, эсвэл слайд харагч идэвхтэй үед сумыг хөндөхгүй
    if (t.closest && (t.closest('input, textarea, select, .pptx-viewer') || t.isContentEditable)) return;
    if (document.querySelector('dialog[open]') || document.querySelector('.pptx-viewer.presenting')) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
  });

  root.querySelectorAll('.grader-filters button').forEach(function (b) {
    b.addEventListener('click', function () {
      root.querySelectorAll('.grader-filters button').forEach(function (x) { x.classList.toggle('active', x === b); });
      filter = b.dataset.filter;
      renderList();
    });
  });

  window.addEventListener('beforeunload', function (e) {
    if (dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  // Эхлэх сурагч: холбоосоор ирсэн эсвэл эхний дүгнээгүй, эсвэл эхний илгээсэн
  var start = -1;
  if (root.dataset.initial) start = rows.findIndex(function (r) { return r.sub && r.sub.id === root.dataset.initial; });
  if (start < 0) start = rows.findIndex(function (r) { return statusOf(r) === 'pending'; });
  if (start < 0) start = rows.findIndex(function (r) { return r.sub; });
  renderList();
  if (start >= 0) go(start);
  else workEl.innerHTML = '<div class="empty muted">Одоогоор хэн ч даалгавар илгээгээгүй байна.</div>';
})();
