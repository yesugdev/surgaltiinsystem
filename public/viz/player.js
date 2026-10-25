// Алгоритмын визуализацийн тоглуулагч: кадруудыг XP загварын цонхнуудад зурна (▶ ⏸ ◀ ▶|, хурд, өгөгдөл)
(function () {
  'use strict';
  var root = document.getElementById('viz');
  if (!root || !window.VizAlgos) return;
  var algo = VizAlgos.ALGOS[root.getAttribute('data-key')];
  if (!algo) return;

  var $ = function (id) { return document.getElementById(id); };
  var stage = $('viz-stage'), codeEl = $('viz-code'), msgEl = $('viz-msg'), statusEl = $('viz-status');
  var balloon = $('viz-balloon'), clock = $('viz-clock'), progress = $('viz-progress'), frameNo = $('viz-frame');
  var playBtn = $('viz-play'), form = $('viz-form'), errEl = $('viz-error'), infoEl = $('viz-info');

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // ---------- C++ кодын өнгө ----------
  var KW = /\b(int|bool|void|char|return|while|for|if|else|break|true|false|vector|queue|auto|const)\b/g;
  function highlight(line) {
    var out = '', rest = line, ci = line.indexOf('//');
    var comment = '';
    if (ci >= 0) { comment = line.slice(ci); rest = line.slice(0, ci); }
    // мөр доторх тэмдэгт мөрүүд
    var parts = rest.split(/("(?:[^"\\]|\\.)*")/);
    parts.forEach(function (p, i) {
      if (i % 2) { out += '<span class="tk-str">' + esc(p) + '</span>'; return; }
      out += esc(p).replace(KW, '<span class="tk-kw">$1</span>').replace(/\b(\d+)\b/g, '<span class="tk-num">$1</span>')
        .replace(/\b(swap|max|push_back|push|pop|front|empty|cout|merge|mergeSort|quickSort|partition|binarySearch|linearSearch|bubbleSort|selectionSort|insertionSort|pairSum|sum|maxWindow|bfs|dfs|hanoi|fib)\b(?=\s*\()/g, '<span class="tk-fn">$1</span>');
    });
    if (comment) out += '<span class="tk-com">' + esc(comment) + '</span>';
    return out || '&nbsp;';
  }
  algo.code.forEach(function (line, i) {
    var li = el('div', 'code-line');
    li.innerHTML = '<span class="code-no">' + (i + 1) + '</span><span class="code-src">' + highlight(line) + '</span>';
    codeEl.appendChild(li);
  });
  var codeLines = codeEl.children;

  // ---------- өгөгдөл ----------
  function readParams(useDefaults) {
    var p = {};
    for (var i = 0; i < algo.inputs.length; i++) {
      var inp = algo.inputs[i];
      var field = form.elements[inp.key];
      var raw = useDefaults || !field ? inp.def : field.value;
      if (inp.type === 'list') {
        var arr = Array.isArray(raw) ? raw.slice() : String(raw).split(/[\s,;]+/).filter(Boolean).map(Number);
        if (arr.some(function (x) { return !Number.isInteger(x); })) return { error: inp.label + ': зөвхөн бүхэл тоо, таслалаар тусгаарлана.' };
        if (arr.length < 2 || arr.length > 12) return { error: inp.label + ': 2–12 элемент оруулна.' };
        if (arr.some(function (x) { return Math.abs(x) > 999; })) return { error: inp.label + ': тоо −999…999 хооронд.' };
        if (inp.sort) arr.sort(function (a, b) { return a - b; });
        p[inp.key] = arr;
      } else if (inp.type === 'int') {
        var v = Number(raw);
        if (!Number.isInteger(v)) return { error: inp.label + ': бүхэл тоо оруулна.' };
        p[inp.key] = v;
      } else p[inp.key] = String(raw);
    }
    var err = algo.validate && algo.validate(p);
    return err ? { error: err } : { params: p };
  }
  function writeParams(p) {
    algo.inputs.forEach(function (inp) {
      var field = form.elements[inp.key];
      if (field) field.value = Array.isArray(p[inp.key]) ? p[inp.key].join(', ') : p[inp.key];
    });
  }

  // ---------- төлөв ----------
  var frames = [], idx = 0, timer = null, speed = 1, elapsed = 0, clockTimer = null, params = null;
  var BASE_MS = 1100;

  function load(p) {
    params = p;
    frames = algo.run(p);
    idx = 0;
    elapsed = 0;
    progress.max = frames.length - 1;
    // Мэдээллийн самбарт тухайн өгөгдлийн утга (Target, k …)
    infoEl.querySelectorAll('.info-dyn').forEach(function (n) { n.remove(); });
    (algo.info ? algo.info(p) : []).forEach(function (kv) {
      var cell = el('div', 'viz-info-cell info-dyn');
      cell.appendChild(el('span', 'viz-info-k', kv[0]));
      cell.appendChild(el('span', 'viz-info-v', kv[1]));
      infoEl.insertBefore(cell, infoEl.lastElementChild);
    });
    render();
  }

  // ---------- зурах ----------
  function renderRow(r) {
    var wrap = el('div', 'vz-row' + (r.bars ? ' has-bars' : ''));
    wrap.appendChild(el('span', 'vz-row-label', r.label || ''));
    var cells = el('div', 'vz-cells');
    // t[0] нь a[start]-ын доор байрлана
    for (var s0 = 0; s0 < r.start && r.values.length; s0++) cells.appendChild(el('div', 'vz-col vz-spacer'));
    if (!r.values.length) cells.appendChild(el('span', 'vz-empty', r.empty || '—'));
    var max = 1;
    if (r.bars) r.values.forEach(function (v) { max = Math.max(max, Math.abs(v)); });
    var textual = r.values.some(function (v) { return typeof v === 'string'; });
    r.values.forEach(function (v, i) {
      var c = el('div', 'vz-col');
      var tops = Object.keys(r.top).filter(function (k) { return r.top[k] === i; });
      var bots = Object.keys(r.bottom).filter(function (k) { return r.bottom[k] === i; });
      c.appendChild(el('div', 'vz-ptr-top', tops.join(' ')));
      if (r.bars) {
        var bar = el('div', 'vz-bar-wrap');
        var b = el('div', 'vz-bar ' + (r.cls[i] || ''));
        b.style.height = Math.max(6, Math.round(Math.abs(v) / max * 100)) + '%';
        bar.appendChild(b);
        c.appendChild(bar);
      }
      c.appendChild(el('div', 'vz-cell ' + (textual ? 'is-text ' : '') + (r.cls[i] || ''), v));
      if (!textual) c.appendChild(el('div', 'vz-idx', r.start + i));
      var bp = el('div', 'vz-ptr-bot');
      if (bots.length) bp.innerHTML = '<span class="vz-caret">▲</span>' + esc(bots.join(' '));
      c.appendChild(bp);
      cells.appendChild(c);
    });
    wrap.appendChild(cells);
    return wrap;
  }

  var SVGNS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, text) {
    var e = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text != null) e.textContent = text;
    return e;
  }
  function renderGraph(g) {
    var s = svg('svg', { viewBox: '0 0 410 220', class: 'vz-graph', role: 'img', 'aria-label': 'Граф' });
    g.edges.forEach(function (e) {
      var k = Math.min(e[0], e[1]) + '-' + Math.max(e[0], e[1]);
      var a = g.nodes[e[0]], b = g.nodes[e[1]];
      s.appendChild(svg('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'vz-edge ' + (g.edgeCls[k] || '') }));
    });
    g.nodes.forEach(function (n, i) {
      var gr = svg('g', { class: 'vz-node ' + (g.nodeCls[i] || '') });
      gr.appendChild(svg('circle', { cx: n[0], cy: n[1], r: 17 }));
      gr.appendChild(svg('text', { x: n[0], y: n[1] + 5, 'text-anchor': 'middle' }, i));
      if (g.labels && g.labels[i] != null) gr.appendChild(svg('text', { x: n[0] + 15, y: n[1] - 15, class: 'vz-node-dist', 'text-anchor': 'middle' }, g.labels[i]));
      s.appendChild(gr);
    });
    return s;
  }
  function renderHanoi(h) {
    var wrap = el('div', 'vz-hanoi');
    ['A', 'B', 'C'].forEach(function (name) {
      var peg = el('div', 'vz-peg' + (h.from === name ? ' is-from' : '') + (h.to === name ? ' is-to' : ''));
      peg.appendChild(el('div', 'vz-peg-rod'));
      var stack = el('div', 'vz-peg-disks');
      h.pegs[name].forEach(function (d) {
        var disk = el('div', 'vz-disk d' + d + (h.moving === d && h.to === name ? ' is-moving' : ''), d);
        disk.style.width = (30 + d / h.n * 70) + '%';
        stack.appendChild(disk);
      });
      peg.appendChild(stack);
      peg.appendChild(el('div', 'vz-peg-name', name));
      wrap.appendChild(peg);
    });
    return wrap;
  }
  function renderTree(t) {
    var W = 410, H = 40 + t.depth * 46 + 30;
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'vz-tree', role: 'img', 'aria-label': 'Рекурсийн мод' });
    var pos = function (n) { return [20 + (t.leaves > 1 ? n.x / (t.leaves - 1) : 0.5) * (W - 40), 22 + n.depth * 46]; };
    var visible = function (n) { return t.state[n.id] != null; };
    t.nodes.forEach(function (n) {
      if (n.parent == null || !visible(n)) return;
      var a = pos(t.nodes[n.parent]), b = pos(n);
      s.appendChild(svg('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'vz-edge tree' }));
    });
    t.nodes.forEach(function (n) {
      if (!visible(n)) return;
      var p = pos(n);
      var st = t.state[n.id];
      var g = svg('g', { class: 'vz-tnode ' + st + (t.cur === n.id ? ' cur' : '') });
      g.appendChild(svg('rect', { x: p[0] - 22, y: p[1] - 12, width: 44, height: 24, rx: 6 }));
      g.appendChild(svg('text', { x: p[0], y: p[1] + 4, 'text-anchor': 'middle' }, n.label.replace('fib', 'f')));
      if (t.vals[n.id] != null) g.appendChild(svg('text', { x: p[0], y: p[1] + 23, 'text-anchor': 'middle', class: 'vz-tval' }, '=' + t.vals[n.id]));
      s.appendChild(g);
    });
    return s;
  }

  function render() {
    var f = frames[idx];
    if (!f) return;
    stage.innerHTML = '';
    if (f.graph) stage.appendChild(renderGraph(f.graph));
    if (f.hanoi) stage.appendChild(renderHanoi(f.hanoi));
    if (f.tree) stage.appendChild(renderTree(f.tree));
    var rowsBox = el('div', 'vz-rows');
    var allRows = (f.rows || []).concat(f.stack && f.stack.length ? [{ label: 'дуудлага' }] : []);
    if (!allRows.some(function (r) { return r.label; })) rowsBox.classList.add('no-labels');
    stage.appendChild(rowsBox);
    (f.rows || []).forEach(function (r) { rowsBox.appendChild(renderRow(r)); });
    if (f.stack && f.stack.length) rowsBox.appendChild(renderRow({ label: 'дуудлага', values: f.stack.slice(-4), cls: (function () { var c = {}; c[Math.min(f.stack.length, 4) - 1] = 'mid'; return c; })(), top: {}, bottom: {}, start: 0 }));

    for (var i = 0; i < codeLines.length; i++) codeLines[i].classList.toggle('is-cur', i === f.line - 1);
    var cur = codeLines[f.line - 1];
    if (cur) {
      var box = codeEl;
      if (cur.offsetTop < box.scrollTop || cur.offsetTop + cur.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = cur.offsetTop - box.clientHeight / 3;
    }
    msgEl.className = 'viz-msg tone-' + f.tone;
    msgEl.querySelector('.viz-msg-text').textContent = f.msg;

    statusEl.innerHTML = '';
    (f.stats || []).forEach(function (s) { statusEl.appendChild(el('span', 'viz-status-cell', s[0] + ' ' + s[1])); });
    statusEl.appendChild(el('span', 'viz-status-cell viz-status-hint', algo.hint || ''));

    if (f.balloon) {
      balloon.querySelector('.viz-balloon-title').textContent = f.balloon.title;
      balloon.querySelector('.viz-balloon-text').textContent = f.balloon.text;
      balloon.hidden = false;
    } else balloon.hidden = true;

    progress.value = idx;
    frameNo.textContent = idx + ' / ' + (frames.length - 1);
    playBtn.textContent = timer ? '⏸' : (idx >= frames.length - 1 ? '↻' : '▶');
    playBtn.title = timer ? 'Зогсоох (Space)' : 'Тоглуулах (Space)';
  }

  // ---------- удирдлага ----------
  function tick() {
    if (idx >= frames.length - 1) { pause(); return; }
    idx++;
    render();
  }
  function play() {
    if (idx >= frames.length - 1) { idx = 0; elapsed = 0; }
    pause();
    timer = setInterval(tick, BASE_MS / speed);
    clockTimer = setInterval(function () { elapsed++; showClock(); }, 1000);
    render();
  }
  function pause() {
    clearInterval(timer); clearInterval(clockTimer);
    timer = null; clockTimer = null;
    render();
  }
  function showClock() { clock.textContent = Math.floor(elapsed / 60) + ':' + String(elapsed % 60).padStart(2, '0'); }
  function go(i) { idx = Math.max(0, Math.min(frames.length - 1, i)); render(); }

  playBtn.addEventListener('click', function () { if (timer) pause(); else play(); });
  $('viz-prev').addEventListener('click', function () { pause(); go(idx - 1); });
  $('viz-next').addEventListener('click', function () { pause(); go(idx + 1); });
  $('viz-reset').addEventListener('click', function () { pause(); elapsed = 0; showClock(); go(0); });
  $('viz-end').addEventListener('click', function () { pause(); go(frames.length - 1); });
  progress.addEventListener('input', function () { pause(); go(Number(progress.value)); });
  $('viz-speed').addEventListener('change', function (e) {
    speed = Number(e.target.value) || 1;
    if (timer) play();
  });
  balloon.querySelector('.viz-balloon-close').addEventListener('click', function () { balloon.hidden = true; });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var r = readParams(false);
    errEl.textContent = r.error || '';
    if (r.error) return;
    pause(); elapsed = 0; showClock();
    writeParams(r.params);
    load(r.params);
    play();
  });
  $('viz-random').addEventListener('click', function () {
    var p;
    for (var tries = 0; tries < 20; tries++) {
      p = algo.random();
      algo.inputs.forEach(function (inp) { if (inp.sort) p[inp.key].sort(function (a, b) { return a - b; }); });
      if (!algo.validate || !algo.validate(p)) break;
    }
    errEl.textContent = '';
    pause(); elapsed = 0; showClock();
    writeParams(p);
    load(p);
  });

  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (e.key === ' ') { e.preventDefault(); if (timer) pause(); else play(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); pause(); go(idx + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); pause(); go(idx - 1); }
    else if (e.key === 'Home') { pause(); go(0); }
    else if (e.key === 'End') { pause(); go(frames.length - 1); }
  });

  var start = readParams(true);
  writeParams(start.params);
  load(start.params);
  showClock();
})();
