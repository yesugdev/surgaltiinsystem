// Алгоритмын визуализаци: алгоритм бүр өгөгдлөөс «кадр»-ын жагсаалт гаргана.
// Кадр: { line, msg, tone, rows: [...], graph, hanoi, tree, stats: [[нэр, утга]], balloon }
// Хөтөч (window.VizAlgos) ба сервер (require) хоёулаа ашиглана — сервер зөвхөн мэдээллийг нь (нэр, хурд) уншина.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.VizAlgos = factory();
})(this, function () {
  'use strict';

  var GROUPS = [
    { key: 'search', title: '🔍 Хайлт' },
    { key: 'sort', title: '📊 Эрэмбэлэлт' },
    { key: 'pointers', title: '👉 Two pointers · Prefix sum' },
    { key: 'graph', title: '🕸 Граф ба рекурс' },
  ];

  // ---------- туслах ----------
  var rint = function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
  var randArr = function (n, lo, hi) { var r = []; for (var i = 0; i < n; i++) r.push(rint(lo, hi)); return r; };
  function randSorted(n, lo, hi) {
    var s = {};
    while (Object.keys(s).length < n) s[rint(lo, hi)] = 1;
    return Object.keys(s).map(Number).sort(function (a, b) { return a - b; });
  }
  var pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };
  var range = function (n) { var r = []; for (var i = 0; i < n; i++) r.push(i); return r; };

  /** Массивын мөр: values, cls {i: анги}, top {нэр: i}, bottom {нэр: i} */
  function row(values, o) {
    o = o || {};
    return { label: o.label || '', values: values.slice(), cls: Object.assign({}, o.cls), top: Object.assign({}, o.top), bottom: Object.assign({}, o.bottom), bars: !!o.bars, start: o.start || 0, empty: o.empty || '' };
  }

  // =====================================================================
  // 🔍 ХАЙЛТ
  // =====================================================================
  var binary = {
    group: 'search', title: 'Binary Search', mn: 'Хоёртын хайлт', tagline: 'Хагаслаад, дахиад хагасла.',
    time: 'O(log n)', space: 'O(1)', counter: 'Шалгалт', hint: 'Эрэмбэлэгдсэн массив',
    inputs: [{ key: 'array', label: 'Массив', type: 'list', def: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91], sort: true }, { key: 'target', label: 'Target', type: 'int', def: 23 }],
    random: function () { var a = randSorted(rint(8, 12), 1, 99); return { array: a, target: Math.random() < 0.8 ? pick(a) : rint(1, 99) }; },
    info: function (p) { return [['Target', p.target]]; },
    code: [
      'int binarySearch(int a[], int n, int target) {',
      '    int lo = 0, hi = n - 1;',
      '',
      '    while (lo <= hi) {',
      '        int mid = lo + (hi - lo) / 2;',
      '',
      '        if (a[mid] == target)',
      '            return mid;',
      '',
      '        if (a[mid] < target)',
      '            lo = mid + 1;',
      '        else',
      '            hi = mid - 1;',
      '    }',
      '',
      '    return -1;',
      '}',
    ],
    run: function (p) {
      var a = p.array, t = p.target, n = a.length, fr = [];
      var lo = 0, hi = n - 1, mid = null, steps = 0, checks = 0, started = false;
      function f(line, msg, tone, o) {
        o = o || {};
        var cls = {};
        if (started) for (var i = 0; i < n; i++) if (i < lo || i > hi) cls[i] = 'dim';
        if (mid != null && o.mid) cls[mid] = o.mid;
        var top = {}, bottom = {};
        if (mid != null) top.mid = mid;
        if (started) { bottom.lo = lo; bottom.hi = hi; }
        fr.push({ line: line, msg: msg, tone: tone, rows: [row(a, { cls: cls, top: top, bottom: bottom })], stats: [['Алхам', steps], ['Шалгалт', checks]], balloon: o.balloon || null });
      }
      f(1, 'target = ' + t, 'info');
      started = true;
      f(2, 'lo = 0, hi = ' + (n - 1), 'step');
      for (;;) {
        if (lo > hi) { f(4, lo + ' > ' + hi + ' → давталт дуусна', 'step'); break; }
        f(4, lo + ' ≤ ' + hi + ' → үргэлжлүүлнэ', 'step');
        steps++;
        mid = lo + Math.floor((hi - lo) / 2);
        f(5, 'mid = ' + lo + ' + (' + hi + ' − ' + lo + ') / 2 = ' + mid, 'move', { mid: 'mid' });
        checks++;
        if (a[mid] === t) {
          f(7, 'a[' + mid + '] = ' + a[mid] + ' == ' + t + '? тийм', 'check', { mid: 'found' });
          f(8, 'return ' + mid, 'ok', { mid: 'found', balloon: { title: 'Олдлоо!', text: t + ' нь ' + mid + '-р индекст байна.' } });
          f(8, 'Binary: ' + checks + ' шалгалт · Linear: ' + (mid + 1), 'ok', { mid: 'found', balloon: { title: checks + ' алхамд оллоо!', text: 'Linear search ' + (mid + 1) + ' шалгалт хийнэ.' } });
          return fr;
        }
        f(7, 'a[' + mid + '] = ' + a[mid] + ' == ' + t + '? үгүй', 'check', { mid: 'mid' });
        if (a[mid] < t) {
          f(10, a[mid] + ' < ' + t + ' → баруун тийш', 'check', { mid: 'mid' });
          lo = mid + 1;
          f(11, 'lo = ' + lo, 'move');
        } else {
          f(10, a[mid] + ' > ' + t + ' → зүүн тийш', 'check', { mid: 'mid' });
          f(12, 'else', 'step', { mid: 'mid' });
          hi = mid - 1;
          f(13, 'hi = ' + hi, 'move');
        }
      }
      f(16, 'return -1', 'bad', { balloon: { title: 'Олдсонгүй', text: t + ' массивт байхгүй. ' + checks + ' шалгалт хийлээ.' } });
      return fr;
    },
  };

  var linear = {
    group: 'search', title: 'Linear Search', mn: 'Шугаман хайлт', tagline: 'Нэг нэгээр нь шалга.',
    time: 'O(n)', space: 'O(1)', hint: 'Дурын массив',
    inputs: [{ key: 'array', label: 'Массив', type: 'list', def: [7, 3, 19, 4, 12, 25, 8, 15] }, { key: 'target', label: 'Target', type: 'int', def: 12 }],
    random: function () { var a = randArr(rint(7, 11), 1, 50); return { array: a, target: Math.random() < 0.8 ? pick(a) : rint(1, 50) }; },
    info: function (p) { return [['Target', p.target]]; },
    code: [
      'int linearSearch(int a[], int n, int target) {',
      '    for (int i = 0; i < n; i++) {',
      '        if (a[i] == target)',
      '            return i;',
      '    }',
      '    return -1;',
      '}',
    ],
    run: function (p) {
      var a = p.array, t = p.target, n = a.length, fr = [], checks = 0;
      function f(line, msg, tone, i, c, balloon) {
        var cls = {};
        for (var k = 0; k < (i == null ? 0 : i); k++) cls[k] = 'dim';
        if (i != null && i < n && c) cls[i] = c;
        var bottom = {};
        if (i != null && i < n) bottom.i = i;
        fr.push({ line: line, msg: msg, tone: tone, rows: [row(a, { cls: cls, bottom: bottom })], stats: [['Шалгалт', checks]], balloon: balloon || null });
      }
      f(1, 'target = ' + t, 'info', null);
      for (var i = 0; i < n; i++) {
        f(2, 'i = ' + i + ' < ' + n, 'step', i, 'mid');
        checks++;
        if (a[i] === t) {
          f(3, 'a[' + i + '] = ' + a[i] + ' == ' + t + '? тийм', 'check', i, 'found');
          f(4, 'return ' + i, 'ok', i, 'found', { title: 'Олдлоо!', text: t + ' нь ' + i + '-р индекст. ' + checks + ' шалгалт.' });
          return fr;
        }
        f(3, 'a[' + i + '] = ' + a[i] + ' == ' + t + '? үгүй', 'check', i, 'cmp');
      }
      f(2, 'i = ' + n + ' → давталт дуусна', 'step', n);
      f(6, 'return -1', 'bad', n, null, { title: 'Олдсонгүй', text: 'Бүх ' + n + ' элементийг шалгалаа.' });
      return fr;
    },
  };

  // =====================================================================
  // 📊 ЭРЭМБЭЛЭЛТ
  // =====================================================================
  var SORT_INPUT = [{ key: 'array', label: 'Массив', type: 'list', def: [29, 10, 14, 37, 13, 5, 41, 22] }];
  var sortRandom = function () { return { array: randArr(rint(7, 10), 2, 60) }; };
  var sortedBalloon = function (n, sw, cmp) { return { title: 'Эрэмбэлэгдлээ!', text: n + ' элемент · ' + cmp + ' харьцуулалт · ' + sw + ' солилт.' }; };

  var bubble = {
    group: 'sort', title: 'Bubble Sort', mn: 'Хөөсөн эрэмбэлэлт', tagline: 'Том нь дээшээ хөөсөрнө.',
    time: 'O(n²)', space: 'O(1)', hint: 'Хөрш хоёрыг харьцуулна',
    inputs: SORT_INPUT, random: sortRandom,
    code: [
      'void bubbleSort(int a[], int n) {',
      '    for (int i = 0; i < n - 1; i++) {',
      '        bool swapped = false;',
      '        for (int j = 0; j < n - 1 - i; j++) {',
      '            if (a[j] > a[j + 1]) {',
      '                swap(a[j], a[j + 1]);',
      '                swapped = true;',
      '            }',
      '        }',
      '        if (!swapped) break;',
      '    }',
      '}',
    ],
    run: function (p) {
      var a = p.array.slice(), n = a.length, fr = [], cmp = 0, sw = 0, done = n;
      function f(line, msg, tone, j, c, balloon) {
        var cls = {};
        for (var k = done; k < n; k++) cls[k] = 'sorted';
        if (j != null) { cls[j] = c; cls[j + 1] = c; }
        fr.push({ line: line, msg: msg, tone: tone, rows: [row(a, { cls: cls, bars: true, top: j != null ? { j: j } : {} })], stats: [['Харьцуулалт', cmp], ['Солилт', sw]], balloon: balloon || null });
      }
      f(1, 'n = ' + n, 'info');
      for (var i = 0; i < n - 1; i++) {
        var swapped = false;
        f(3, i + '-р давталт · swapped = false', 'step');
        for (var j = 0; j < n - 1 - i; j++) {
          cmp++;
          if (a[j] > a[j + 1]) {
            f(5, a[j] + ' > ' + a[j + 1] + '? тийм → солино', 'check', j, 'cmp');
            var tmp = a[j]; a[j] = a[j + 1]; a[j + 1] = tmp; sw++; swapped = true;
            f(6, 'swap → ' + a[j] + ', ' + a[j + 1], 'move', j, 'swap');
          } else {
            f(5, a[j] + ' > ' + a[j + 1] + '? үгүй', 'check', j, 'cmp');
          }
        }
        done = n - 1 - i;
        f(9, a[done] + ' байрандаа орлоо', 'ok');
        if (!swapped) { f(10, 'Солилт гараагүй → break', 'ok'); break; }
      }
      done = 0;
      f(12, 'Дууслаа', 'ok', null, null, sortedBalloon(n, sw, cmp));
      return fr;
    },
  };

  var selection = {
    group: 'sort', title: 'Selection Sort', mn: 'Сонгон эрэмбэлэлт', tagline: 'Хамгийн багыг нь урд нь тавь.',
    time: 'O(n²)', space: 'O(1)', hint: 'Үлдсэнээс хамгийн багыг сонгоно',
    inputs: SORT_INPUT, random: sortRandom,
    code: [
      'void selectionSort(int a[], int n) {',
      '    for (int i = 0; i < n - 1; i++) {',
      '        int mn = i;',
      '        for (int j = i + 1; j < n; j++)',
      '            if (a[j] < a[mn])',
      '                mn = j;',
      '        swap(a[i], a[mn]);',
      '    }',
      '}',
    ],
    run: function (p) {
      var a = p.array.slice(), n = a.length, fr = [], cmp = 0, sw = 0, sorted = 0;
      function f(line, msg, tone, o) {
        o = o || {};
        var cls = {}, top = {}, bottom = {};
        for (var k = 0; k < sorted; k++) cls[k] = 'sorted';
        if (o.j != null) { cls[o.j] = 'cmp'; bottom.j = o.j; }
        if (o.mn != null) { cls[o.mn] = o.mnc || 'mid'; top.min = o.mn; }
        if (o.i != null) bottom.i = o.i;
        fr.push({ line: line, msg: msg, tone: tone, rows: [row(a, { cls: cls, top: top, bottom: bottom, bars: true })], stats: [['Харьцуулалт', cmp], ['Солилт', sw]], balloon: o.balloon || null });
      }
      f(1, 'n = ' + n, 'info');
      for (var i = 0; i < n - 1; i++) {
        var mn = i;
        f(3, 'i = ' + i + ', mn = ' + i, 'step', { i: i, mn: mn });
        for (var j = i + 1; j < n; j++) {
          cmp++;
          if (a[j] < a[mn]) {
            f(5, a[j] + ' < ' + a[mn] + '? тийм', 'check', { i: i, mn: mn, j: j });
            mn = j;
            f(6, 'mn = ' + j + ' (шинэ хамгийн бага: ' + a[mn] + ')', 'move', { i: i, mn: mn });
          } else f(5, a[j] + ' < ' + a[mn] + '? үгүй', 'check', { i: i, mn: mn, j: j });
        }
        var tmp = a[i]; a[i] = a[mn]; a[mn] = tmp;
        if (mn !== i) sw++;
        f(7, mn !== i ? 'swap(a[' + i + '], a[' + mn + ']) → ' + a[i] + ' урд орлоо' : a[i] + ' байрандаа байна', 'move', { i: i, mn: i, mnc: 'swap' });
        sorted = i + 1;
      }
      sorted = n;
      f(9, 'Дууслаа', 'ok', { balloon: sortedBalloon(n, sw, cmp) });
      return fr;
    },
  };

  var insertion = {
    group: 'sort', title: 'Insertion Sort', mn: 'Оруулан эрэмбэлэлт', tagline: 'Хөзөр шиг байрыг нь олж оруул.',
    time: 'O(n²)', space: 'O(1)', hint: 'Зүүн тал эрэмбэлэгдсэн',
    inputs: SORT_INPUT, random: sortRandom,
    code: [
      'void insertionSort(int a[], int n) {',
      '    for (int i = 1; i < n; i++) {',
      '        int key = a[i];',
      '        int j = i - 1;',
      '        while (j >= 0 && a[j] > key) {',
      '            a[j + 1] = a[j];',
      '            j--;',
      '        }',
      '        a[j + 1] = key;',
      '    }',
      '}',
    ],
    run: function (p) {
      var a = p.array.slice(), n = a.length, fr = [], cmp = 0, moves = 0, upto = 0, key = null;
      function f(line, msg, tone, o) {
        o = o || {};
        var cls = {}, bottom = {}, top = {};
        for (var k = 0; k <= upto && k < n; k++) cls[k] = 'sorted';
        if (o.j != null && o.j >= 0) { cls[o.j] = 'cmp'; bottom.j = o.j; }
        if (o.hole != null) { cls[o.hole] = o.holec || 'mid'; top.key = o.hole; }
        var rows = [row(a, { cls: cls, top: top, bottom: bottom, bars: true })];
        rows.push(row(key == null ? [] : [key], { label: 'key', cls: { 0: 'key' }, empty: '—' }));
        fr.push({ line: line, msg: msg, tone: tone, rows: rows, stats: [['Харьцуулалт', cmp], ['Шилжүүлэлт', moves]], balloon: o.balloon || null });
      }
      f(1, 'a[0] ганцаараа — эрэмбэлэгдсэн', 'info');
      for (var i = 1; i < n; i++) {
        key = a[i];
        f(3, 'key = a[' + i + '] = ' + key, 'move', { hole: i });
        var j = i - 1;
        f(4, 'j = ' + j, 'step', { hole: i, j: j });
        while (j >= 0) {
          cmp++;
          if (!(a[j] > key)) { f(5, a[j] + ' > ' + key + '? үгүй → зогсоно', 'check', { hole: j + 1, j: j }); break; }
          f(5, a[j] + ' > ' + key + '? тийм', 'check', { hole: j + 1, j: j });
          a[j + 1] = a[j]; moves++;
          f(6, a[j] + '-г баруун тийш шилжүүлнэ', 'move', { hole: j, j: j + 1 });
          j--;
          f(7, 'j = ' + j, 'step', { hole: j + 1, j: j });
        }
        if (j < 0) f(5, 'j < 0 → зогсоно', 'check', { hole: 0 });
        a[j + 1] = key;
        upto = i;
        f(9, 'a[' + (j + 1) + '] = ' + key, 'ok', { hole: j + 1, holec: 'found' });
        key = null;
      }
      f(11, 'Дууслаа', 'ok', { balloon: sortedBalloon(n, moves, cmp) });
      return fr;
    },
  };

  var merge = {
    group: 'sort', title: 'Merge Sort', mn: 'Нийлүүлэн эрэмбэлэлт', tagline: 'Хувааж, эрэмбэлээд, нийлүүл.',
    time: 'O(n log n)', space: 'O(n)', hint: 'Хуваах ба захирах',
    inputs: SORT_INPUT, random: sortRandom,
    code: [
      'void merge(int a[], int l, int m, int r) {',
      '    vector<int> t;',
      '    int i = l, j = m + 1;',
      '    while (i <= m && j <= r)',
      '        t.push_back(a[i] <= a[j] ? a[i++] : a[j++]);',
      '    while (i <= m) t.push_back(a[i++]);',
      '    while (j <= r) t.push_back(a[j++]);',
      '    for (int k = l; k <= r; k++) a[k] = t[k - l];',
      '}',
      '',
      'void mergeSort(int a[], int l, int r) {',
      '    if (l >= r) return;',
      '    int m = (l + r) / 2;',
      '    mergeSort(a, l, m);',
      '    mergeSort(a, m + 1, r);',
      '    merge(a, l, m, r);',
      '}',
    ],
    run: function (p) {
      var a = p.array.slice(), n = a.length, fr = [], cmp = 0, writes = 0, t = [], tStart = 0, stack = [];
      function f(line, msg, tone, o) {
        o = o || {};
        var cls = {}, top = {}, bottom = {};
        if (o.l != null) {
          for (var k = 0; k < n; k++) if (k < o.l || k > o.r) cls[k] = 'dim';
          bottom.l = o.l; bottom.r = o.r;
          if (o.m != null) top.m = o.m;
        }
        if (o.i != null && o.i <= o.m) cls[o.i] = 'cmp';
        if (o.j != null && o.j <= o.r) cls[o.j] = 'cmp';
        if (o.done) for (var d = 0; d < n; d++) cls[d] = 'sorted';
        if (o.k != null) cls[o.k] = 'swap';
        fr.push({
          line: line, msg: msg, tone: tone,
          rows: [row(a, { cls: cls, top: top, bottom: bottom, bars: true }), row(t, { label: 't', start: tStart, cls: o.tcls || {}, empty: '—' })],
          stack: stack.slice(),
          stats: [['Харьцуулалт', cmp], ['Бичилт', writes]], balloon: o.balloon || null,
        });
      }
      function ms(l, r) {
        stack.push('mergeSort(' + l + ', ' + r + ')');
        if (l >= r) { f(12, 'l = ' + l + ' ≥ r = ' + r + ' → нэг элемент, буцна', 'step', { l: l, r: r }); stack.pop(); return; }
        var m = Math.floor((l + r) / 2);
        f(13, 'm = (' + l + ' + ' + r + ') / 2 = ' + m, 'move', { l: l, r: r, m: m });
        f(14, 'Зүүн хагас [' + l + ', ' + m + ']', 'step', { l: l, r: m });
        ms(l, m);
        f(15, 'Баруун хагас [' + (m + 1) + ', ' + r + ']', 'step', { l: m + 1, r: r });
        ms(m + 1, r);
        f(16, 'Нийлүүлнэ [' + l + ', ' + m + '] + [' + (m + 1) + ', ' + r + ']', 'step', { l: l, r: r, m: m });
        mg(l, m, r);
        stack.pop();
      }
      function mg(l, m, r) {
        stack.push('merge(' + l + ', ' + m + ', ' + r + ')');
        t = []; tStart = l;
        var i = l, j = m + 1;
        f(3, 'i = ' + i + ', j = ' + j, 'step', { l: l, r: r, m: m, i: i, j: j });
        while (i <= m && j <= r) {
          cmp++;
          if (a[i] <= a[j]) { f(5, a[i] + ' ≤ ' + a[j] + ' → ' + a[i] + '-г авна', 'check', { l: l, r: r, m: m, i: i, j: j }); t.push(a[i++]); }
          else { f(5, a[i] + ' > ' + a[j] + ' → ' + a[j] + '-г авна', 'check', { l: l, r: r, m: m, i: i, j: j }); t.push(a[j++]); }
        }
        if (i <= m) { while (i <= m) t.push(a[i++]); f(6, 'Зүүн талын үлдэгдлийг нэмнэ', 'move', { l: l, r: r, m: m }); }
        if (j <= r) { while (j <= r) t.push(a[j++]); f(7, 'Баруун талын үлдэгдлийг нэмнэ', 'move', { l: l, r: r, m: m }); }
        for (var k = l; k <= r; k++) { a[k] = t[k - l]; writes++; }
        f(8, 'a[' + l + '..' + r + '] ← t', 'ok', { l: l, r: r });
        t = [];
        stack.pop();
      }
      f(11, 'mergeSort(a, 0, ' + (n - 1) + ')', 'info');
      ms(0, n - 1);
      f(17, 'Дууслаа', 'ok', { done: true, balloon: sortedBalloon(n, writes, cmp) });
      return fr;
    },
  };

  var quick = {
    group: 'sort', title: 'Quick Sort', mn: 'Хурдан эрэмбэлэлт', tagline: 'Pivot-оос бага нь зүүн, их нь баруун.',
    time: 'O(n log n)', space: 'O(log n)', hint: 'Lomuto хуваалт',
    inputs: SORT_INPUT, random: sortRandom,
    code: [
      'int partition(int a[], int lo, int hi) {',
      '    int pivot = a[hi];',
      '    int i = lo - 1;',
      '    for (int j = lo; j < hi; j++) {',
      '        if (a[j] < pivot) {',
      '            i++;',
      '            swap(a[i], a[j]);',
      '        }',
      '    }',
      '    swap(a[i + 1], a[hi]);',
      '    return i + 1;',
      '}',
      '',
      'void quickSort(int a[], int lo, int hi) {',
      '    if (lo >= hi) return;',
      '    int p = partition(a, lo, hi);',
      '    quickSort(a, lo, p - 1);',
      '    quickSort(a, p + 1, hi);',
      '}',
    ],
    run: function (p) {
      var a = p.array.slice(), n = a.length, fr = [], cmp = 0, sw = 0, fixed = {}, stack = [];
      function f(line, msg, tone, o) {
        o = o || {};
        var cls = {}, top = {}, bottom = {};
        if (o.lo != null) for (var k = 0; k < n; k++) if (k < o.lo || k > o.hi) cls[k] = 'dim';
        Object.keys(fixed).forEach(function (k) { cls[k] = 'sorted'; });
        if (o.lo != null && o.part) { for (var x = o.lo; x <= o.i; x++) cls[x] = 'win'; }
        if (o.hi != null && o.piv) { cls[o.hi] = 'mid'; top.pivot = o.hi; }
        if (o.j != null) { cls[o.j] = o.jc || 'cmp'; bottom.j = o.j; }
        if (o.i != null && o.i >= (o.lo || 0)) bottom.i = o.i;
        if (o.sw) o.sw.forEach(function (k) { cls[k] = 'swap'; });
        if (o.done) for (var d = 0; d < n; d++) cls[d] = 'sorted';
        fr.push({ line: line, msg: msg, tone: tone, rows: [row(a, { cls: cls, top: top, bottom: bottom, bars: true })], stack: stack.slice(), stats: [['Харьцуулалт', cmp], ['Солилт', sw]], balloon: o.balloon || null });
      }
      function qs(lo, hi) {
        stack.push('quickSort(' + lo + ', ' + hi + ')');
        if (lo >= hi) {
          if (lo === hi) fixed[lo] = 1;
          f(15, lo >= hi ? 'lo ≥ hi → буцна' : '', 'step', lo === hi ? { lo: lo, hi: hi } : {});
          stack.pop();
          return;
        }
        f(16, 'partition(' + lo + ', ' + hi + ')', 'step', { lo: lo, hi: hi });
        stack.push('partition(' + lo + ', ' + hi + ')');
        var pivot = a[hi];
        f(2, 'pivot = a[' + hi + '] = ' + pivot, 'move', { lo: lo, hi: hi, piv: true });
        var i = lo - 1;
        f(3, 'i = ' + i, 'step', { lo: lo, hi: hi, piv: true, i: i, part: true });
        for (var j = lo; j < hi; j++) {
          cmp++;
          if (a[j] < pivot) {
            f(5, a[j] + ' < ' + pivot + '? тийм', 'check', { lo: lo, hi: hi, piv: true, i: i, j: j, part: true });
            i++;
            var tmp = a[i]; a[i] = a[j]; a[j] = tmp; if (i !== j) sw++;
            f(7, 'i = ' + i + ', swap(a[' + i + '], a[' + j + '])', 'move', { lo: lo, hi: hi, piv: true, i: i, part: true, sw: [i, j] });
          } else f(5, a[j] + ' < ' + pivot + '? үгүй', 'check', { lo: lo, hi: hi, piv: true, i: i, j: j, part: true });
        }
        var t2 = a[i + 1]; a[i + 1] = a[hi]; a[hi] = t2; if (i + 1 !== hi) sw++;
        fixed[i + 1] = 1;
        f(10, 'pivot ' + pivot + ' → ' + (i + 1) + '-р байранд', 'ok', { lo: lo, hi: hi, i: i, part: true, sw: [i + 1] });
        stack.pop();
        var pp = i + 1;
        f(17, 'Зүүн тал [' + lo + ', ' + (pp - 1) + ']', 'step', { lo: lo, hi: pp - 1 });
        qs(lo, pp - 1);
        f(18, 'Баруун тал [' + (pp + 1) + ', ' + hi + ']', 'step', { lo: pp + 1, hi: hi });
        qs(pp + 1, hi);
        stack.pop();
      }
      f(14, 'quickSort(a, 0, ' + (n - 1) + ')', 'info');
      qs(0, n - 1);
      f(19, 'Дууслаа', 'ok', { done: true, balloon: sortedBalloon(n, sw, cmp) });
      return fr;
    },
  };

  // =====================================================================
  // 👉 TWO POINTERS · PREFIX SUM · SLIDING WINDOW
  // =====================================================================
  var twoPointers = {
    group: 'pointers', title: 'Two Pointers', mn: 'Хоёр заагч', tagline: 'Хоёр захаас нь шахаж ир.',
    time: 'O(n)', space: 'O(1)', hint: 'Эрэмбэлэгдсэн массив',
    inputs: [{ key: 'array', label: 'Массив', type: 'list', def: [1, 3, 4, 6, 8, 11, 14, 17], sort: true }, { key: 'target', label: 'Нийлбэр', type: 'int', def: 21 }],
    random: function () { var a = randSorted(rint(7, 10), 1, 30); return { array: a, target: Math.random() < 0.8 ? pick(a) + pick(a.slice(1)) : rint(5, 60) }; },
    info: function (p) { return [['Нийлбэр', p.target]]; },
    code: [
      'bool pairSum(int a[], int n, int target) {',
      '    int l = 0, r = n - 1;',
      '    while (l < r) {',
      '        int s = a[l] + a[r];',
      '        if (s == target) return true;',
      '        if (s < target) l++;',
      '        else r--;',
      '    }',
      '    return false;',
      '}',
    ],
    run: function (p) {
      var a = p.array, t = p.target, n = a.length, fr = [], l = 0, r = n - 1, checks = 0, started = false;
      function f(line, msg, tone, c, balloon) {
        var cls = {};
        if (started) for (var k = 0; k < n; k++) if (k < l || k > r) cls[k] = 'dim';
        if (c && started) { cls[l] = c; cls[r] = c; }
        fr.push({ line: line, msg: msg, tone: tone, rows: [row(a, { cls: cls, bottom: started ? { l: l, r: r } : {} })], stats: [['Шалгалт', checks]], balloon: balloon || null });
      }
      f(1, 'target = ' + t, 'info');
      started = true;
      f(2, 'l = 0, r = ' + (n - 1), 'step');
      while (l < r) {
        f(3, l + ' < ' + r + ' → үргэлжлүүлнэ', 'step');
        var s = a[l] + a[r]; checks++;
        f(4, 's = ' + a[l] + ' + ' + a[r] + ' = ' + s, 'move', 'mid');
        if (s === t) {
          f(5, s + ' == ' + t + ' → олдлоо!', 'ok', 'found', { title: 'Хос олдлоо!', text: a[l] + ' + ' + a[r] + ' = ' + t + ' · ' + checks + ' шалгалт.' });
          return fr;
        }
        if (s < t) { f(6, s + ' < ' + t + ' → l++ (их болгоно)', 'check', 'cmp'); l++; }
        else { f(7, s + ' > ' + t + ' → r-- (бага болгоно)', 'check', 'cmp'); r--; }
      }
      f(3, l + ' ≥ ' + r + ' → зогсоно', 'step');
      f(9, 'return false', 'bad', null, { title: 'Хос алга', text: 'Нийлбэр нь ' + t + ' болох хос байхгүй.' });
      return fr;
    },
  };

  var prefix = {
    group: 'pointers', title: 'Prefix Sum', mn: 'Префикс нийлбэр', tagline: 'Нэг удаа нэм — дараа нь O(1)-д асуу.',
    time: 'O(n) + O(1)', space: 'O(n)', hint: 'p[i] = эхний i элементийн нийлбэр',
    inputs: [{ key: 'array', label: 'Массив', type: 'list', def: [3, 1, 4, 1, 5, 9, 2, 6] }, { key: 'l', label: 'l', type: 'int', def: 2 }, { key: 'r', label: 'r', type: 'int', def: 5 }],
    random: function () { var n = rint(6, 10), l = rint(0, n - 2); return { array: randArr(n, 1, 9), l: l, r: rint(l, n - 1) }; },
    validate: function (p) { if (!(p.l >= 0 && p.r < p.array.length && p.l <= p.r)) return '0 ≤ l ≤ r < ' + p.array.length + ' байх ёстой.'; },
    info: function (p) { return [['Хэсэг', '[' + p.l + ', ' + p.r + ']']]; },
    code: [
      '// p[i] = a[0] + a[1] + ... + a[i - 1]',
      'p[0] = 0;',
      'for (int i = 0; i < n; i++)',
      '    p[i + 1] = p[i] + a[i];',
      '',
      '// [l, r] хэсгийн нийлбэр — O(1)',
      'int sum(int l, int r) {',
      '    return p[r + 1] - p[l];',
      '}',
    ],
    run: function (p) {
      var a = p.array, n = a.length, fr = [], pre = [], ops = 0;
      function f(line, msg, tone, o) {
        o = o || {};
        fr.push({
          line: line, msg: msg, tone: tone,
          rows: [row(a, { label: 'a', cls: o.acls || {}, bottom: o.ab || {} }), row(pre, { label: 'p', cls: o.pcls || {}, top: o.pt || {}, empty: '—' })],
          stats: [['Нэмэх үйлдэл', ops]], balloon: o.balloon || null,
        });
      }
      f(1, 'Префикс массив p-г байгуулна', 'info');
      pre.push(0);
      f(2, 'p[0] = 0', 'move', { pcls: { 0: 'found' } });
      for (var i = 0; i < n; i++) {
        pre.push(pre[i] + a[i]); ops++;
        var pc = {}; pc[i] = 'cmp'; pc[i + 1] = 'found';
        var ac = {}; ac[i] = 'cmp';
        f(4, 'p[' + (i + 1) + '] = p[' + i + '] + a[' + i + '] = ' + pre[i] + ' + ' + a[i] + ' = ' + pre[i + 1], 'move', { acls: ac, pcls: pc, ab: { i: i } });
      }
      var l = p.l, r = p.r, acls = {};
      for (var k = l; k <= r; k++) acls[k] = 'win';
      f(7, 'sum(' + l + ', ' + r + ')', 'step', { acls: acls, ab: { l: l, r: r } });
      var pc2 = {}; pc2[r + 1] = 'mid'; pc2[l] = 'swap';
      var res = pre[r + 1] - pre[l];
      f(8, 'p[' + (r + 1) + '] − p[' + l + '] = ' + pre[r + 1] + ' − ' + pre[l] + ' = ' + res, 'ok', {
        acls: acls, ab: { l: l, r: r }, pcls: pc2, pt: { 'r+1': r + 1, l: l },
        balloon: { title: 'Нийлбэр = ' + res, text: 'Хэсэг [' + l + ', ' + r + '] — давталтгүй, ганц хасалтаар!' },
      });
      return fr;
    },
  };

  var sliding = {
    group: 'pointers', title: 'Sliding Window', mn: 'Гулсах цонх', tagline: 'Нэгийг нэм, нэгийг хас.',
    time: 'O(n)', space: 'O(1)', hint: 'k урттай цонхны хамгийн их нийлбэр',
    inputs: [{ key: 'array', label: 'Массив', type: 'list', def: [2, 1, 5, 1, 3, 2, 7, 1] }, { key: 'k', label: 'k', type: 'int', def: 3 }],
    random: function () { var n = rint(7, 10); return { array: randArr(n, 1, 9), k: rint(2, Math.min(4, n - 1)) }; },
    validate: function (p) { if (!(p.k >= 1 && p.k <= p.array.length)) return '1 ≤ k ≤ ' + p.array.length + ' байх ёстой.'; },
    info: function (p) { return [['k', p.k]]; },
    code: [
      'int maxWindow(int a[], int n, int k) {',
      '    int s = 0;',
      '    for (int i = 0; i < k; i++) s += a[i];',
      '    int best = s;',
      '    for (int i = k; i < n; i++) {',
      '        s += a[i] - a[i - k];',
      '        best = max(best, s);',
      '    }',
      '    return best;',
      '}',
    ],
    run: function (p) {
      var a = p.array, n = a.length, k = p.k, fr = [], s = 0, best = null, bestL = 0;
      function f(line, msg, tone, lo, hi, o) {
        o = o || {};
        var cls = {};
        if (lo != null) for (var x = lo; x <= hi; x++) cls[x] = 'win';
        if (o.add != null) cls[o.add] = 'found';
        if (o.out != null) cls[o.out] = 'swap';
        if (o.best) for (var y = bestL; y < bestL + k; y++) cls[y] = 'found';
        fr.push({ line: line, msg: msg, tone: tone, rows: [row(a, { cls: cls, bottom: lo != null ? { L: lo, R: hi } : {} })], stats: [['s', s], ['best', best == null ? '—' : best]], balloon: o.balloon || null });
      }
      f(2, 's = 0, k = ' + k, 'info');
      for (var i = 0; i < k; i++) { s += a[i]; f(3, 's += a[' + i + '] → ' + s, 'move', 0, i, { add: i }); }
      best = s; bestL = 0;
      f(4, 'best = ' + s, 'ok', 0, k - 1);
      for (var j = k; j < n; j++) {
        s += a[j] - a[j - k];
        f(6, 's += ' + a[j] + ' − ' + a[j - k] + ' → ' + s, 'move', j - k + 1, j, { add: j, out: j - k });
        if (s > best) { best = s; bestL = j - k + 1; f(7, 'best = max → ' + best + ' (шинэ!)', 'ok', j - k + 1, j); }
        else f(7, 'best = ' + best + ' хэвээр', 'check', j - k + 1, j);
      }
      f(9, 'return ' + best, 'ok', null, null, { best: true, balloon: { title: 'Хамгийн их = ' + best, text: '[' + bestL + ', ' + (bestL + k - 1) + '] цонх · ' + n + ' алхам (brute force ' + (n - k + 1) * k + ').' } });
      return fr;
    },
  };

  // =====================================================================
  // 🕸 ГРАФ БА РЕКУРС
  // =====================================================================
  var GRAPHS = {
    g1: {
      name: 'Граф 1',
      nodes: [[40, 110], [120, 40], [120, 180], [210, 40], [210, 180], [290, 110], [360, 40], [360, 180]],
      edges: [[0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [3, 5], [4, 5], [5, 6], [5, 7], [6, 7]],
    },
    g2: {
      name: 'Мод',
      nodes: [[200, 25], [110, 85], [290, 85], [60, 150], [160, 150], [250, 150], [340, 150], [110, 205]],
      edges: [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6], [4, 7]],
    },
    g3: {
      name: 'Тор',
      nodes: [[40, 40], [150, 40], [260, 40], [370, 40], [40, 180], [150, 180], [260, 180], [370, 180]],
      edges: [[0, 1], [1, 2], [2, 3], [0, 4], [1, 5], [2, 6], [3, 7], [4, 5], [5, 6], [6, 7]],
    },
  };
  function adj(g) {
    var a = g.nodes.map(function () { return []; });
    g.edges.forEach(function (e) { a[e[0]].push(e[1]); a[e[1]].push(e[0]); });
    a.forEach(function (l) { l.sort(function (x, y) { return x - y; }); });
    return a;
  }
  var ek = function (u, v) { return Math.min(u, v) + '-' + Math.max(u, v); };
  var GRAPH_INPUTS = [
    { key: 'graph', label: 'Граф', type: 'select', def: 'g1', options: Object.keys(GRAPHS).map(function (k) { return [k, GRAPHS[k].name]; }) },
    { key: 'start', label: 'Эхлэх орой', type: 'int', def: 0 },
  ];
  var graphRandom = function () { var k = pick(Object.keys(GRAPHS)); return { graph: k, start: rint(0, GRAPHS[k].nodes.length - 1) }; };
  var graphValidate = function (p) { var g = GRAPHS[p.graph]; if (!g) return 'Граф сонгоно уу.'; if (!(p.start >= 0 && p.start < g.nodes.length)) return 'Эхлэх орой 0–' + (g.nodes.length - 1) + '.'; };

  var bfs = {
    group: 'graph', title: 'BFS', mn: 'Өргөнөөр хайх', tagline: 'Ойрхоноосоо эхлээд давхарга давхаргаар.',
    time: 'O(V + E)', space: 'O(V)', hint: 'Дараалал (queue)',
    inputs: GRAPH_INPUTS, random: graphRandom, validate: graphValidate,
    info: function (p) { return [['Эхлэх', p.start]]; },
    code: [
      'void bfs(int s) {',
      '    queue<int> q;',
      '    q.push(s); used[s] = true;',
      '    while (!q.empty()) {',
      '        int v = q.front(); q.pop();',
      '        for (int u : g[v]) {',
      '            if (!used[u]) {',
      '                used[u] = true;',
      '                q.push(u);',
      '            }',
      '        }',
      '    }',
      '}',
    ],
    run: function (p) {
      var G = GRAPHS[p.graph], A = adj(G), fr = [], q = [], used = {}, done = {}, order = [], tree = {}, dist = {};
      function f(line, msg, tone, o) {
        o = o || {};
        var nc = {};
        Object.keys(used).forEach(function (v) { nc[v] = 'queued'; });
        Object.keys(done).forEach(function (v) { nc[v] = 'done'; });
        if (o.cur != null) nc[o.cur] = 'cur';
        if (o.look != null) nc[o.look] = nc[o.look] === 'cur' ? 'cur' : (used[o.look] ? nc[o.look] : 'look');
        var ec = Object.assign({}, tree);
        if (o.edge) ec[o.edge] = 'scan';
        fr.push({
          line: line, msg: msg, tone: tone,
          graph: { nodes: G.nodes, edges: G.edges, nodeCls: nc, edgeCls: ec, labels: Object.assign({}, dist) },
          rows: [row(q, { label: 'queue', cls: { 0: q.length ? 'mid' : '' }, empty: 'хоосон' }), row(order, { label: 'дараалал', cls: {}, empty: '—' })],
          stats: [['Очсон', order.length], ['Queue', q.length]], balloon: o.balloon || null,
        });
      }
      var s = p.start;
      f(1, 'bfs(' + s + ')', 'info', { cur: s });
      q.push(s); used[s] = true; dist[s] = 0;
      f(3, 'q.push(' + s + '), used[' + s + '] = true', 'move');
      while (q.length) {
        f(4, 'queue хоосон биш', 'step');
        var v = q.shift(); order.push(v);
        f(5, 'v = ' + v + ' (зай ' + dist[v] + ')', 'move', { cur: v });
        for (var i = 0; i < A[v].length; i++) {
          var u = A[v][i];
          if (!used[u]) {
            f(7, u + ' очоогүй → нэмнэ', 'check', { cur: v, look: u, edge: ek(v, u) });
            used[u] = true; dist[u] = dist[v] + 1; q.push(u); tree[ek(v, u)] = 'tree';
            f(9, 'q.push(' + u + ')', 'move', { cur: v });
          } else f(7, u + ' аль хэдийн тэмдэглэгдсэн', 'check', { cur: v, look: u, edge: ek(v, u) });
        }
        done[v] = true;
      }
      f(13, 'Дууслаа', 'ok', { balloon: { title: 'Бүгдэд хүрлээ!', text: 'Дараалал: ' + order.join(' → ') + '. Тоо = эхлэлээс зай.' } });
      return fr;
    },
  };

  var dfs = {
    group: 'graph', title: 'DFS', mn: 'Гүнээр хайх', tagline: 'Чадах чинээгээрээ гүн, дараа нь буц.',
    time: 'O(V + E)', space: 'O(V)', hint: 'Рекурс (стек)',
    inputs: GRAPH_INPUTS, random: graphRandom, validate: graphValidate,
    info: function (p) { return [['Эхлэх', p.start]]; },
    code: [
      'void dfs(int v) {',
      '    used[v] = true;',
      '    for (int u : g[v]) {',
      '        if (!used[u])',
      '            dfs(u);',
      '    }',
      '}',
    ],
    run: function (p) {
      var G = GRAPHS[p.graph], A = adj(G), fr = [], used = {}, done = {}, order = [], stack = [], tree = {};
      function f(line, msg, tone, o) {
        o = o || {};
        var nc = {};
        Object.keys(used).forEach(function (v) { nc[v] = 'queued'; });
        Object.keys(done).forEach(function (v) { nc[v] = 'done'; });
        if (o.cur != null) nc[o.cur] = 'cur';
        if (o.look != null && !used[o.look]) nc[o.look] = 'look';
        var ec = Object.assign({}, tree);
        if (o.edge) ec[o.edge] = 'scan';
        fr.push({
          line: line, msg: msg, tone: tone,
          graph: { nodes: G.nodes, edges: G.edges, nodeCls: nc, edgeCls: ec },
          rows: [row(stack.map(function (v) { return 'dfs(' + v + ')'; }), { label: 'стек', cls: stack.length ? (function () { var c = {}; c[stack.length - 1] = 'mid'; return c; })() : {}, empty: 'хоосон' }), row(order, { label: 'дараалал', empty: '—' })],
          stats: [['Очсон', order.length], ['Гүн', stack.length]], balloon: o.balloon || null,
        });
      }
      function go(v) {
        stack.push(v);
        f(1, 'dfs(' + v + ')', 'step', { cur: v });
        used[v] = true; order.push(v);
        f(2, 'used[' + v + '] = true', 'move', { cur: v });
        for (var i = 0; i < A[v].length; i++) {
          var u = A[v][i];
          if (!used[u]) {
            f(4, u + ' очоогүй → гүн рүү', 'check', { cur: v, look: u, edge: ek(v, u) });
            tree[ek(v, u)] = 'tree';
            f(5, 'dfs(' + u + ')', 'move', { cur: v });
            go(u);
            f(3, v + ' рүү буцлаа', 'step', { cur: v });
          } else f(4, u + ' аль хэдийн очсон', 'check', { cur: v, look: u, edge: ek(v, u) });
        }
        done[v] = true;
        f(7, 'dfs(' + v + ') дууслаа', 'ok', { cur: v });
        stack.pop();
      }
      go(p.start);
      f(7, 'Дууслаа', 'ok', { balloon: { title: 'Бүгдэд хүрлээ!', text: 'Дараалал: ' + order.join(' → ') } });
      return fr;
    },
  };

  var hanoi = {
    group: 'graph', title: 'Tower of Hanoi', mn: 'Ханойн цамхаг', tagline: 'n−1-ийг зайлуул, томыг зөө, буцааж тавь.',
    time: 'O(2ⁿ)', space: 'O(n)', hint: 'Рекурс',
    inputs: [{ key: 'n', label: 'Диск', type: 'int', def: 3, min: 1, max: 5 }],
    random: function () { return { n: rint(2, 4) }; },
    validate: function (p) { if (!(p.n >= 1 && p.n <= 5)) return 'Дискийн тоо 1–5.'; },
    info: function (p) { return [['Диск', p.n]]; },
    code: [
      'void hanoi(int n, char from, char to, char via) {',
      '    if (n == 1) {',
      '        cout << from << " → " << to << "\\n";',
      '        return;',
      '    }',
      '    hanoi(n - 1, from, via, to);',
      '    cout << from << " → " << to << "\\n";',
      '    hanoi(n - 1, via, to, from);',
      '}',
    ],
    run: function (p) {
      var n = p.n, fr = [], pegs = { A: [], B: [], C: [] }, moves = 0, stack = [];
      for (var d = n; d >= 1; d--) pegs.A.push(d);
      function f(line, msg, tone, o) {
        o = o || {};
        fr.push({
          line: line, msg: msg, tone: tone,
          hanoi: { n: n, pegs: { A: pegs.A.slice(), B: pegs.B.slice(), C: pegs.C.slice() }, moving: o.moving || null, from: o.from || null, to: o.to || null },
          rows: [row(stack, { label: 'стек', cls: stack.length ? (function () { var c = {}; c[stack.length - 1] = 'mid'; return c; })() : {}, empty: 'хоосон' })],
          stats: [['Нүүдэл', moves + ' / ' + (Math.pow(2, n) - 1)], ['Гүн', stack.length]], balloon: o.balloon || null,
        });
      }
      function mv(from, to, line) {
        var disk = pegs[from].pop(); pegs[to].push(disk); moves++;
        f(line, from + ' → ' + to + ' (диск ' + disk + ')', 'move', { moving: disk, from: from, to: to });
      }
      function h(k, from, to, via) {
        stack.push('h(' + k + ',' + from + ',' + to + ')');
        f(1, 'hanoi(' + k + ', ' + from + ', ' + to + ', ' + via + ')', 'step');
        if (k === 1) { f(2, 'n == 1 → шууд зөөнө', 'check'); mv(from, to, 3); stack.pop(); return; }
        f(6, k - 1 + ' дискийг ' + from + ' → ' + via + ' (зайлуулна)', 'step');
        h(k - 1, from, via, to);
        f(7, 'Хамгийн том ' + k + '-р диск: ' + from + ' → ' + to, 'check');
        mv(from, to, 7);
        f(8, k - 1 + ' дискийг ' + via + ' → ' + to + ' (буцааж тавина)', 'step');
        h(k - 1, via, to, from);
        stack.pop();
      }
      f(1, n + ' диск A-аас C руу', 'info');
      h(n, 'A', 'C', 'B');
      f(9, 'Дууслаа', 'ok', { balloon: { title: moves + ' нүүдэлд дууслаа!', text: '2ⁿ − 1 = ' + (Math.pow(2, n) - 1) + ' — хамгийн цөөн нүүдэл.' } });
      return fr;
    },
  };

  var fib = {
    group: 'graph', title: 'Fibonacci Recursion', mn: 'Фибоначчийн рекурс', tagline: 'Нэг асуулт — хоёр жижиг асуулт.',
    time: 'O(2ⁿ)', space: 'O(n)', hint: 'Рекурсийн мод',
    inputs: [{ key: 'n', label: 'n', type: 'int', def: 5, min: 1, max: 6 }],
    random: function () { return { n: rint(3, 6) }; },
    validate: function (p) { if (!(p.n >= 1 && p.n <= 6)) return 'n нь 1–6.'; },
    info: function (p) { return [['n', p.n]]; },
    code: [
      'int fib(int n) {',
      '    if (n <= 1)',
      '        return n;',
      '    return fib(n - 1) + fib(n - 2);',
      '}',
    ],
    run: function (p) {
      // Бүтэн дуудлагын модыг урьдчилан байгуулж, байрлалыг тооцно
      var nodes = [], leaf = 0;
      function build(n, depth, parent) {
        var id = nodes.length;
        nodes.push({ id: id, n: n, depth: depth, parent: parent, kids: [] });
        if (n > 1) { nodes[id].kids.push(build(n - 1, depth + 1, id)); nodes[id].kids.push(build(n - 2, depth + 1, id)); nodes[id].x = (nodes[nodes[id].kids[0]].x + nodes[nodes[id].kids[1]].x) / 2; }
        else nodes[id].x = leaf++;
        return id;
      }
      build(p.n, 0, null);
      var maxDepth = Math.max.apply(null, nodes.map(function (x) { return x.depth; }));
      var fr = [], state = {}, vals = {}, calls = 0, stack = [];
      function f(line, msg, tone, cur, balloon) {
        fr.push({
          line: line, msg: msg, tone: tone,
          tree: { nodes: nodes.map(function (x) { return { id: x.id, label: 'fib(' + x.n + ')', x: x.x, depth: x.depth, parent: x.parent }; }), leaves: leaf, depth: maxDepth, state: Object.assign({}, state), vals: Object.assign({}, vals), cur: cur },
          rows: [row(stack.map(function (id) { return 'fib(' + nodes[id].n + ')'; }), { label: 'стек', cls: stack.length ? (function () { var c = {}; c[stack.length - 1] = 'mid'; return c; })() : {}, empty: 'хоосон' })],
          stats: [['Дуудлага', calls], ['Гүн', stack.length]], balloon: balloon || null,
        });
      }
      function go(id) {
        var x = nodes[id];
        calls++; stack.push(id); state[id] = 'active';
        f(1, 'fib(' + x.n + ') дуудагдлаа', 'step', id);
        if (x.n <= 1) {
          vals[id] = x.n; state[id] = 'done';
          f(3, 'n ≤ 1 → return ' + x.n, 'ok', id);
          stack.pop();
          return x.n;
        }
        f(4, 'fib(' + (x.n - 1) + ') + fib(' + (x.n - 2) + ')', 'move', id);
        state[id] = 'wait';
        var a = go(x.kids[0]);
        state[id] = 'active';
        f(4, 'fib(' + (x.n - 1) + ') = ' + a + ', одоо fib(' + (x.n - 2) + ')', 'step', id);
        state[id] = 'wait';
        var b = go(x.kids[1]);
        vals[id] = a + b; state[id] = 'done';
        f(4, 'return ' + a + ' + ' + b + ' = ' + (a + b), 'ok', id);
        stack.pop();
        return a + b;
      }
      f(1, 'fib(' + p.n + ')', 'info', null);
      var res = go(0);
      var dup = {};
      nodes.forEach(function (x) { dup[x.n] = (dup[x.n] || 0) + 1; });
      f(5, 'fib(' + p.n + ') = ' + res, 'ok', null, { title: 'fib(' + p.n + ') = ' + res, text: calls + ' дуудлага! fib(1)-г ' + (dup[1] || 0) + ' удаа бодлоо — memo хэрэгтэй.' });
      return fr;
    },
  };

  var ALGOS = {
    'binary-search': binary, 'linear-search': linear,
    'bubble-sort': bubble, 'selection-sort': selection, 'insertion-sort': insertion, 'merge-sort': merge, 'quick-sort': quick,
    'two-pointers': twoPointers, 'prefix-sum': prefix, 'sliding-window': sliding,
    bfs: bfs, dfs: dfs, hanoi: hanoi, fibonacci: fib,
  };

  return { GROUPS: GROUPS, ALGOS: ALGOS, GRAPHS: GRAPHS, range: range };
});
