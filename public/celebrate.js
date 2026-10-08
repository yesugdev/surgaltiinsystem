// Өрсөлдөөнт Coding: баярын хөдөлгөөн — бүтэн бодоход конфетти, зэрэглэл ахихад цонх
(function () {
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var COLORS = ['#2f5bea', '#7a3fe0', '#c8203f', '#1c8b52', '#f2b705', '#0e8a9a', '#e0531f'];

  /** Дэлгэцийн дээрээс конфетти бууна (canvas, ~3 сек) */
  function confetti(amount) {
    if (reduceMotion) return;
    var canvas = document.createElement('canvas');
    canvas.className = 'confetti-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    function size() {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    window.addEventListener('resize', size);
    var W = window.innerWidth;
    var parts = [];
    for (var i = 0; i < (amount || 160); i++) {
      parts.push({
        x: Math.random() * W,
        y: -20 - Math.random() * window.innerHeight * 0.5,
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 8,
        vx: -2 + Math.random() * 4,
        vy: 2 + Math.random() * 3,
        rot: Math.random() * Math.PI,
        vr: -0.2 + Math.random() * 0.4,
        color: COLORS[i % COLORS.length],
      });
    }
    var start = performance.now();
    function frame(t) {
      var elapsed = t - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      parts.forEach(function (p) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - Math.max(0, elapsed - 2200) / 800);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (elapsed < 3000) requestAnimationFrame(frame);
      else {
        window.removeEventListener('resize', size);
        canvas.remove();
      }
    }
    requestAnimationFrame(frame);
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /** «🎉 Та Эрэлч боллоо!» цонх + шинээр нээгдсэн аватар, өнгө */
  function rankUp(info) {
    if (!info) return;
    confetti(220);
    var overlay = el('div', 'rankup-overlay');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'rankup-title');
    var box = el('div', 'rankup-box tier-' + info.key);
    box.appendChild(el('div', 'rankup-icon', info.icon));
    box.appendChild(el('p', 'rankup-kicker', 'Шинэ зэрэглэл!'));
    var title = el('h2', 'rankup-title', '🎉 Та ' + info.name + ' боллоо!');
    title.id = 'rankup-title';
    box.appendChild(title);
    if ((info.avatars && info.avatars.length) || (info.colors && info.colors.length)) {
      box.appendChild(el('p', 'rankup-sub', 'Шинээр нээгдлээ:'));
      var list = el('div', 'rankup-unlocks');
      (info.avatars || []).forEach(function (a) { list.appendChild(el('span', 'rankup-unlock', a)); });
      (info.colors || []).forEach(function (c) { list.appendChild(el('span', 'rankup-unlock rankup-color', '🎨 ' + c)); });
      box.appendChild(list);
    }
    if (info.cp) {
      // Програмист болоход Гүнзгий бэлтгэл нээгдэнэ
      var cp = el('a', 'rankup-cp', '🎯 Гүнзгий бэлтгэл нээгдлээ! Олимпиадын сэдвүүдийг онолтой нь судлаарай →');
      cp.href = '/cp';
      box.appendChild(cp);
    }
    var actions = el('div', 'rankup-actions');
    var go = el('a', 'btn btn-primary', '🎨 Аватар сонгох');
    go.href = '/coding/profile';
    var close = el('button', 'btn', 'Үргэлжлүүлэх');
    close.type = 'button';
    actions.appendChild(go);
    actions.appendChild(close);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    function done() {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') done(); }
    close.addEventListener('click', done);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) done(); });
    document.addEventListener('keydown', onKey);
    close.focus();
  }

  window.Celebrate = { confetti: confetti, rankUp: rankUp };

  // Хуудас ачаалахад серверээс ирсэн зэрэглэл ахисан мэдээлэл
  var data = document.getElementById('rank-up-data');
  if (data) {
    try { rankUp(JSON.parse(data.getAttribute('data-json'))); } catch (e) { /* алдаатай өгөгдөл */ }
  }
})();
