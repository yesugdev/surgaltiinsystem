/**
 * PowerPoint (.pptx) харагч: <div class="pptx-viewer" data-src="/files/ID"></div>
 * Слайдуудыг хөтөч дотор зурж (pptx-preview), нэг удаад нэг слайдыг хуудаслалттай харуулна
 * (‹ 1 2 … 19 ›, ← → товч, утсан дээр шудрах). «Үзүүлэх» — бүтэн дэлгэцээр.
 */
(function () {
  var RENDER_WIDTH = 1280; // зурах нарийвчлал; харуулахдаа CSS-ээр жижигрүүлнэ
  var queue = Promise.resolve();

  /**
   * AI/онлайн хэрэгслээр үүсгэсэн зарим PPTX-ийн [Content_Types].xml-д zip дотор байхгүй хэсэг
   * (жишээ нь slideMaster2..19) бүртгэгдсэн байдаг. PowerPoint тэвчдэг ч харагч 0 слайд гаргадаг тул
   * байхгүй хэсгийн бүртгэлийг хасаж засна.
   */
  function repair(buf) {
    if (!window.JSZip) return buf;
    return window.JSZip.loadAsync(buf)
      .then(function (zip) {
        var ct = zip.file('[Content_Types].xml');
        if (!ct) return buf;
        return ct.async('string').then(function (xml) {
          var removed = 0;
          var fixed = xml.replace(/<Override\s[^>]*PartName="\/?([^"]+)"[^>]*\/>/g, function (tag, part) {
            if (zip.file(part)) return tag;
            removed++;
            return '';
          });
          if (!removed) return buf;
          zip.file('[Content_Types].xml', fixed);
          return zip.generateAsync({ type: 'arraybuffer' });
        });
      })
      .catch(function () { return buf; });
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // Олон слайдтай үед товчилно: 1 … 4 5 6 … 19
  function pageList(n, c) {
    var i;
    if (n <= 9) {
      var all = [];
      for (i = 0; i < n; i++) all.push(i);
      return all;
    }
    var set = [0, n - 1, c - 1, c, c + 1];
    if (c < 4) set.push(1, 2, 3, 4);
    if (c > n - 5) set.push(n - 2, n - 3, n - 4, n - 5);
    var list = set
      .filter(function (x, k) { return x >= 0 && x < n && set.indexOf(x) === k; })
      .sort(function (a, b) { return a - b; });
    var out = [];
    list.forEach(function (x, k) {
      if (k && x - list[k - 1] > 1) out.push(null);
      out.push(x);
    });
    return out;
  }

  function initViewer(root) {
    if (root.dataset.ready) return;
    root.dataset.ready = '1';

    // ‹ Өмнөх  1 2 3 … 19  Дараах ›   3 / 19          ▶ Үзүүлэх
    var toolbar = el('div', 'pptx-toolbar');
    var pager = el('div', 'pptx-pager');
    var pPrev = el('button', 'btn btn-sm', '‹ Өмнөх');
    var pages = el('div', 'pptx-pages');
    var pNext = el('button', 'btn btn-sm', 'Дараах ›');
    var counter = el('span', 'muted small pptx-counter', 'Ачаалж байна…');
    var playBtn = el('button', 'btn btn-primary btn-sm', '▶ Үзүүлэх');
    [pPrev, pNext, playBtn].forEach(function (b) { b.type = 'button'; b.disabled = true; });
    pager.append(pPrev, pages, pNext);
    toolbar.append(pager, counter, el('span', 'spacer'), playBtn);

    var stage = el('div', 'pptx-stage');
    var nav = el('div', 'pptx-present-nav');
    var prevBtn = el('button', 'pptx-nav-btn', '‹');
    var nextBtn = el('button', 'pptx-nav-btn', '›');
    var navCount = el('span', 'pptx-nav-count');
    var exitBtn = el('button', 'pptx-nav-btn pptx-exit', '✕');
    [prevBtn, nextBtn, exitBtn].forEach(function (b) { b.type = 'button'; });
    nav.append(prevBtn, navCount, nextBtn, exitBtn);
    root.append(toolbar, stage, nav);
    root.tabIndex = 0; // харагч дээр байхад ← → товч ажиллана

    var frames = [];
    var current = 0;
    var presenting = false;

    function scaleCurrent() {
      var f = frames[current];
      if (!f) return;
      var w = Number(f.dataset.w);
      var h = Number(f.dataset.h);
      f.style.width = presenting ? Math.min(window.innerWidth, window.innerHeight * (w / h)) + 'px' : '';
      f.firstChild.style.transform = 'scale(' + (f.clientWidth / w || 1) + ')';
    }

    function renderPages() {
      pages.innerHTML = '';
      pageList(frames.length, current).forEach(function (i) {
        if (i === null) {
          pages.appendChild(el('span', 'pptx-gap', '…'));
          return;
        }
        var b = el('button', 'pptx-page' + (i === current ? ' active' : ''), String(i + 1));
        b.type = 'button';
        b.addEventListener('click', function () { show(i); });
        pages.appendChild(b);
      });
    }

    function show(i) {
      if (!frames.length) return;
      current = Math.max(0, Math.min(frames.length - 1, i));
      frames.forEach(function (f, j) { f.classList.toggle('current', j === current); });
      var label = current + 1 + ' / ' + frames.length;
      navCount.textContent = label;
      counter.textContent = label;
      prevBtn.disabled = pPrev.disabled = current === 0;
      nextBtn.disabled = pNext.disabled = current === frames.length - 1;
      renderPages();
      scaleCurrent();
    }

    function enter() {
      presenting = true;
      root.classList.add('presenting');
      document.body.classList.add('pptx-lock');
      if (root.requestFullscreen) root.requestFullscreen().catch(function () {});
      show(current);
    }

    function exit() {
      if (!presenting) return;
      presenting = false;
      root.classList.remove('presenting');
      document.body.classList.remove('pptx-lock');
      if (document.fullscreenElement === root && document.exitFullscreen) document.exitFullscreen().catch(function () {});
      show(current);
    }

    function onKey(e) {
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].indexOf(e.key) >= 0 || (presenting && e.key === 'Enter')) {
        e.preventDefault();
        show(current + 1);
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].indexOf(e.key) >= 0 || (presenting && e.key === 'Backspace')) {
        e.preventDefault();
        show(current - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        show(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        show(frames.length - 1);
      } else if (e.key === 'Escape') {
        exit();
      }
    }

    playBtn.addEventListener('click', enter);
    pPrev.addEventListener('click', function () { show(current - 1); });
    pNext.addEventListener('click', function () { show(current + 1); });
    prevBtn.addEventListener('click', function (e) { e.stopPropagation(); show(current - 1); });
    nextBtn.addEventListener('click', function (e) { e.stopPropagation(); show(current + 1); });
    exitBtn.addEventListener('click', function (e) { e.stopPropagation(); exit(); });
    // Слайдын зүүн гуравны нэг дээр дарвал өмнөх, бусад хэсэгт дарвал дараах
    stage.addEventListener('click', function (e) {
      var f = frames[current];
      if (!f || !f.contains(e.target)) return;
      var r = f.getBoundingClientRect();
      show(e.clientX - r.left < r.width / 3 ? current - 1 : current + 1);
    });
    // Утсан дээр хуруугаар шудрах
    var touchX = null;
    stage.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) > 40) show(dx < 0 ? current + 1 : current - 1);
    });
    root.addEventListener('keydown', function (e) { if (!presenting && e.target === root) onKey(e); });
    root.addEventListener('mouseenter', function () {
      if (!presenting && document.activeElement === document.body) root.focus({ preventScroll: true });
    });
    document.addEventListener('keydown', function (e) { if (presenting) onKey(e); });
    document.addEventListener('fullscreenchange', function () {
      if (!document.fullscreenElement && presenting) exit();
      else scaleCurrent();
    });
    window.addEventListener('resize', scaleCurrent);
    if (window.ResizeObserver) new ResizeObserver(scaleCurrent).observe(stage);

    function fail(msg) {
      counter.textContent = '';
      stage.innerHTML = '';
      var box = el('div', 'flash flash-warn', msg + ' ');
      var a = el('a', null, 'Татаж аваад нээх');
      a.href = root.dataset.src + '?download=1';
      box.appendChild(a);
      stage.appendChild(box);
    }

    if (!window.pptxPreview) return fail('Слайд харагч ачаалагдсангүй.');

    // Сан глобал төлөвтэй тул нэг хуудсан дээрх олон файлыг ээлжлэн зурна
    queue = queue.then(function () { return load(); }, function () { return load(); });

    function load() {
      return fetch(root.dataset.src, { credentials: 'same-origin' })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.arrayBuffer();
        })
        .then(repair)
        .then(function (buf) {
          // Бүрэн зурсны дараа слайд бүрийг өөрийн хүрээнд шилжүүлнэ
          var holder = el('div', 'pptx-holder');
          document.body.appendChild(holder);
          var previewer = window.pptxPreview.init(holder, { width: RENDER_WIDTH, mode: 'list' });
          return previewer.preview(buf).then(function () { return holder; });
        })
        .then(function (holder) {
          var slides = holder.querySelectorAll('.pptx-preview-slide-wrapper');
          slides.forEach(function (s) {
            var w = parseFloat(s.style.width) || RENDER_WIDTH;
            var h = parseFloat(s.style.height) || RENDER_WIDTH * 9 / 16;
            var frame = el('div', 'slide-frame');
            frame.dataset.w = w;
            frame.dataset.h = h;
            frame.style.aspectRatio = w + ' / ' + h;
            s.style.position = 'absolute';
            s.style.left = '0';
            s.style.top = '0';
            s.style.margin = '0';
            s.style.transformOrigin = '0 0';
            frame.appendChild(s);
            stage.appendChild(frame);
            frames.push(frame);
          });
          holder.remove();
          if (!frames.length) return fail('Слайд олдсонгүй.');
          playBtn.disabled = false;
          show(0);
        })
        .catch(function () {
          document.querySelectorAll('.pptx-holder').forEach(function (h) { h.remove(); });
          fail('Энэ файлыг слайд болгон харуулж чадсангүй.');
        });
    }
  }

  document.querySelectorAll('.pptx-viewer[data-src]').forEach(initViewer);
  window.initPptxViewer = initViewer;
})();
