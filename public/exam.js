(function () {
  var form = document.getElementById('exam-form');
  if (!form) return;

  var deadline = Number(form.dataset.deadline);
  // Сурагчийн компьютерын цаг буруу байсан ч серверийн цагаар тоолно
  var offset = Number(form.dataset.serverNow) - Date.now();
  var timerEl = document.getElementById('timer');
  var statusEl = document.getElementById('save-status');
  var countEl = document.getElementById('answered-count');
  var navLinks = document.querySelectorAll('#qnav a');
  var questions = form.querySelectorAll('.question[data-qid]');

  var dirty = false;
  var saving = false;
  var submitting = false;
  var debounce = null;

  function pad(n) { return String(n).padStart(2, '0'); }
  function nowServer() { return Date.now() + offset; }

  function tick() {
    var ms = deadline - nowServer();
    if (ms <= 0) {
      timerEl.textContent = '00:00';
      autoSubmit();
      return;
    }
    var s = Math.floor(ms / 1000);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    timerEl.textContent = (h ? h + ':' : '') + pad(m) + ':' + pad(s % 60);
    timerEl.classList.toggle('warn', ms < 5 * 60 * 1000);
    timerEl.classList.toggle('danger', ms < 60 * 1000);
  }

  function isAnswered(q) {
    var inputs = q.querySelectorAll('input, textarea');
    for (var i = 0; i < inputs.length; i++) {
      var el = inputs[i];
      if (el.tagName === 'TEXTAREA' ? el.value.trim() : el.checked) return true;
    }
    return false;
  }

  function updateProgress() {
    var n = 0;
    questions.forEach(function (q) {
      var done = isAnswered(q);
      if (done) n++;
      var link = document.querySelector('#qnav a[data-qid="' + q.dataset.qid + '"]');
      if (link) link.classList.toggle('done', done);
    });
    countEl.textContent = n;
    return n;
  }

  function save() {
    if (saving || !dirty || submitting) return Promise.resolve();
    saving = true;
    dirty = false;
    statusEl.textContent = 'Хадгалж байна…';
    return fetch(form.dataset.saveUrl, {
      method: 'POST',
      body: new URLSearchParams(new FormData(form)),
      credentials: 'same-origin',
    })
      .then(function (r) {
        if (r.status === 409 || r.redirected) {
          // Хугацаа дууссан, илгээгдсэн эсвэл сесс дууссан (нэвтрэх хуудас руу чиглүүлсэн)
          submitting = true;
          location.reload();
        } else if (r.ok) {
          var d = new Date();
          statusEl.textContent = 'Хадгалсан ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
          statusEl.classList.remove('error');
        } else {
          throw new Error('HTTP ' + r.status);
        }
      })
      .catch(function () {
        dirty = true;
        statusEl.textContent = 'Хадгалж чадсангүй — дахин оролдож байна…';
        statusEl.classList.add('error');
      })
      .finally(function () { saving = false; });
  }

  function onChange() {
    dirty = true;
    updateProgress();
    clearTimeout(debounce);
    debounce = setTimeout(save, 1500);
  }

  function autoSubmit() {
    if (submitting) return;
    submitting = true;
    statusEl.textContent = 'Хугацаа дууслаа. Илгээж байна…';
    form.submit(); // submit event үүсгэхгүй тул баталгаажуулах цонх гарахгүй
  }

  form.addEventListener('input', onChange);
  form.addEventListener('change', onChange);

  form.addEventListener('submit', function (e) {
    var total = questions.length;
    var answered = updateProgress();
    var msg = answered < total
      ? (total - answered) + ' асуултад хариулаагүй байна. Илгээх үү? Илгээсний дараа засах боломжгүй.'
      : 'Шалгалтаа илгээх үү? Илгээсний дараа засах боломжгүй.';
    if (!window.confirm(msg)) {
      e.preventDefault();
      return;
    }
    submitting = true;
    document.getElementById('submit-btn').disabled = true;
  });

  window.addEventListener('beforeunload', function (e) {
    if (!submitting && dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  setInterval(save, 10000);
  setInterval(tick, 1000);
  tick();
  updateProgress();
})();
