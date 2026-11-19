// 📊 Сурагчийн профайл: ECharts интерактив графикууд, хичээл/төлөвөөр шүүх, хүснэгт эрэмбэлэх
(function () {
  'use strict';

  // ---------- Хүснэгтийг баганаар эрэмбэлэх (Сурагчдын явц) ----------
  document.querySelectorAll('table th[data-sort]').forEach(function (th) {
    th.classList.add('pf-sortable');
    th.addEventListener('click', function () {
      var table = th.closest('table');
      var idx = Array.prototype.indexOf.call(th.parentNode.children, th);
      var dir = th.dataset.dir === 'desc' ? 'asc' : 'desc';
      table.querySelectorAll('th[data-sort]').forEach(function (h) { delete h.dataset.dir; });
      th.dataset.dir = dir;
      var num = th.dataset.sort === 'num';
      var rows = Array.prototype.slice.call(table.tBodies[0].rows);
      rows.sort(function (a, b) {
        var x = a.cells[idx].dataset.v, y = b.cells[idx].dataset.v;
        var r = num ? Number(x) - Number(y) : String(x).localeCompare(String(y), 'mn');
        return dir === 'asc' ? r : -r;
      });
      rows.forEach(function (r) { table.tBodies[0].appendChild(r); });
    });
  });

  var dataEl = document.getElementById('profile-data');
  if (!dataEl || !window.echarts) return;
  var D = JSON.parse(dataEl.textContent);

  var C = { primary: '#2f5bea', green: '#1c8b52', amber: '#e19a1c', red: '#d14343', gray: '#b9bfcc', soft: '#9db3f5', text: '#1c2230', muted: '#6b7384', grid: '#eef0f4' };
  // ECharts текстийн өргөнийг бодит фонтоор хэмжих ёстой ('inherit' бол буруу хэмжиж, тайлбар тасарна)
  var font = { fontFamily: getComputedStyle(document.body).fontFamily, color: C.muted };
  var charts = [];
  var pad2 = function (n) { return String(n).padStart(2, '0'); };
  var fmtD = function (d) { d = new Date(d); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var r0 = function (x) { return x == null ? '—' : Math.round(x) + '%'; };
  var num = function (x) { return x == null ? '—' : String(Math.round(x * 100) / 100); };

  function make(id, hasData, option) {
    var el = document.getElementById(id);
    if (!el) return null;
    if (!hasData) {
      el.classList.add('pf-empty');
      el.textContent = el.dataset.empty || 'Мэдээлэл алга.';
      return null;
    }
    var ch = echarts.init(el, null, { renderer: 'svg' });
    ch.setOption(Object.assign({ textStyle: font, animationDuration: 600 }, option));
    charts.push(ch);
    if (window.ResizeObserver) new ResizeObserver(function () { ch.resize(); }).observe(el);
    return ch;
  }

  var tooltipBase = { backgroundColor: '#fff', borderColor: '#e3e6ec', textStyle: { color: C.text, fontSize: 13 }, extraCssText: 'box-shadow:0 6px 20px rgba(16,24,40,.12);border-radius:10px;' };

  // ---------- 1. Дүнгийн явц (цаг хугацаагаар) ----------
  var tl = D.timeline;
  var toPoint = function (e) { return { value: [e.date, e.pct], item: e }; };
  var tChart = make('ch-timeline', tl.length > 0, {
    color: [C.primary, C.green, C.gray],
    legend: { top: 0, left: 0, textStyle: font, itemWidth: 14, data: ['Даалгавар', 'Шалгалт', 'Дундаж'] },
    grid: { left: 44, right: 16, top: 36, bottom: tl.length > 8 ? 64 : 30 },
    tooltip: Object.assign({}, tooltipBase, {
      trigger: 'item',
      formatter: function (p) {
        var e = p.data.item;
        if (!e) return '';
        return '<div style="max-width:260px;white-space:normal"><b>' + esc(e.title) + '</b><br><span style="color:' + C.muted + '">' + (e.kind === 'exam' ? '📝 Шалгалт' : '📎 Даалгавар') + ' · ' + esc(e.sub) + ' · ' + fmtD(e.date) + '</span><br>' +
          'Оноо: <b>' + num(e.score) + ' / ' + num(e.max) + '</b> (' + r0(e.pct) + ')' + (e.classAvg != null ? '<br>Дундаж: ' + r0(e.classAvg) : '') + '</div>';
      },
    }),
    xAxis: { type: 'time', axisLine: { lineStyle: { color: C.grid } }, axisLabel: Object.assign({ hideOverlap: true }, font), splitLine: { show: false } },
    yAxis: { type: 'value', min: 0, max: 100, axisLabel: Object.assign({ formatter: '{value}%' }, font), splitLine: { lineStyle: { color: C.grid } } },
    dataZoom: tl.length > 8 ? [{ type: 'inside', zoomOnMouseWheel: false, moveOnMouseWheel: false }, { type: 'slider', height: 18, bottom: 8, borderColor: 'transparent', fillerColor: 'rgba(47,91,234,.12)', handleStyle: { color: C.primary } }] : [],
    series: [
      { name: 'Даалгавар', type: 'line', smooth: 0.3, smoothMonotone: 'x', symbolSize: 9, connectNulls: true, data: tl.filter(function (e) { return e.kind === 'task'; }).map(toPoint), areaStyle: { color: 'rgba(47,91,234,.08)' } },
      { name: 'Шалгалт', type: 'line', smooth: 0.3, smoothMonotone: 'x', symbol: 'diamond', symbolSize: 13, data: tl.filter(function (e) { return e.kind === 'exam'; }).map(toPoint), lineStyle: { width: 2 } },
      { name: 'Дундаж', type: 'line', smooth: 0.3, smoothMonotone: 'x', symbol: 'none', lineStyle: { type: 'dashed', width: 1.5 }, tooltip: { show: false }, data: tl.filter(function (e) { return e.classAvg != null; }).map(function (e) { return [e.date, e.classAvg]; }) },
    ],
  });
  if (tChart) tChart.on('click', function (p) { if (p.data && p.data.item && p.data.item.url) location.href = p.data.item.url; });

  // ---------- 2. Хичээлээр ----------
  var subj = D.bySubject;
  var subjEl = document.getElementById('ch-subjects');
  if (subjEl && subj.length > 3) subjEl.style.height = Math.min(520, 60 + subj.length * 52) + 'px';
  var sChart = make('ch-subjects', subj.length > 0, {
    color: [C.primary, C.green, C.soft],
    legend: { top: 0, right: 0, textStyle: font, itemWidth: 14 },
    grid: { left: 8, right: 36, top: 32, bottom: 8, containLabel: true },
    tooltip: Object.assign({}, tooltipBase, {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: function (ps) {
        var s = subj[ps[0].dataIndex];
        return '<b>' + esc(s.name) + '</b><br>Гүйцэтгэл: <b>' + (s.completion == null ? '—' : s.completion + '%') + '</b> (' + s.done + '/' + s.total + ')<br>Даалгаврын дундаж: <b>' + r0(s.taskAvg) + '</b><br>Шалгалтын дундаж: <b>' + r0(s.examAvg) + '</b>';
      },
    }),
    xAxis: { type: 'value', max: 100, axisLabel: Object.assign({ formatter: '{value}%' }, font), splitLine: { lineStyle: { color: C.grid } } },
    yAxis: { type: 'category', inverse: true, data: subj.map(function (s) { return s.name; }), axisLabel: Object.assign({ width: 110, overflow: 'truncate' }, font, { color: C.text }), axisLine: { show: false }, axisTick: { show: false } },
    series: [
      { name: 'Гүйцэтгэл', type: 'bar', barMaxWidth: 12, barGap: '20%', data: subj.map(function (s) { return s.completion; }), itemStyle: { borderRadius: [0, 6, 6, 0] }, cursor: 'pointer' },
      { name: 'Даалгавар', type: 'bar', barMaxWidth: 12, data: subj.map(function (s) { return s.taskAvg; }), itemStyle: { borderRadius: [0, 6, 6, 0] }, cursor: 'pointer' },
      { name: 'Шалгалт', type: 'bar', barMaxWidth: 12, data: subj.map(function (s) { return s.examAvg; }), itemStyle: { borderRadius: [0, 6, 6, 0] }, cursor: 'pointer' },
    ],
  });
  if (sChart) sChart.on('click', function (p) { setFilter('subject', subj[p.dataIndex].name); });

  // ---------- 3. Даалгаврын төлөв (donut) ----------
  var SC = D.statusCounts;
  var ST = [
    { key: 'graded', name: 'Дүгнэгдсэн', color: C.green },
    { key: 'pending', name: 'Шалгагдаж буй', color: C.amber },
    { key: 'todo', name: 'Хийгээгүй', color: C.gray },
    { key: 'overdue', name: 'Хугацаа хэтэрсэн', color: C.red },
  ];
  var totalTasks = D.summary.tasksTotal;
  var dChart = make('ch-status', totalTasks > 0, {
    tooltip: Object.assign({}, tooltipBase, { trigger: 'item', formatter: function (p) { return '<b>' + p.name + '</b>: ' + p.value + ' (' + Math.round(p.percent) + '%)'; } }),
    legend: { bottom: 0, left: 'center', textStyle: font, itemWidth: 12, itemHeight: 12, icon: 'circle' },
    graphic: [{ type: 'text', left: 'center', top: '35%', style: { text: (D.summary.completion || 0) + '%', fontSize: 26, fontWeight: 800, fill: C.text, align: 'center' } }, { type: 'text', left: 'center', top: '47%', style: { text: 'гүйцэтгэл', fontSize: 12, fill: C.muted, align: 'center' } }],
    series: [{
      type: 'pie', radius: ['52%', '74%'], center: ['50%', '45%'], avoidLabelOverlap: true, padAngle: 2,
      itemStyle: { borderRadius: 6 }, label: { show: false },
      emphasis: { scale: true, scaleSize: 6 },
      data: ST.filter(function (s) { return SC[s.key] > 0; }).map(function (s) { return { name: s.name, value: SC[s.key], key: s.key, itemStyle: { color: s.color } }; }),
    }],
  });
  if (dChart) dChart.on('click', function (p) { setFilter('state', p.data.key, p.name); });

  // ---------- 4. Шалгалт: дүн ба дундаж ----------
  var ex = D.exams.filter(function (e) { return e.pct != null; });
  var eChart = make('ch-exams', ex.length > 0, {
    color: [C.primary, C.gray],
    legend: { top: 0, right: 0, textStyle: font, itemWidth: 14 },
    grid: { left: 8, right: 8, top: 32, bottom: 8, containLabel: true },
    tooltip: Object.assign({}, tooltipBase, {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: function (ps) {
        var e = ex[ps[0].dataIndex];
        return '<div style="max-width:260px;white-space:normal"><b>' + esc(e.title) + '</b><br><span style="color:' + C.muted + '">' + esc(e.subject) + '</span><br>Оноо: <b>' + num(e.score) + ' / ' + num(e.max) + '</b> (' + r0(e.pct) + ')' + (e.classAvg != null ? '<br>Дундаж: ' + r0(e.classAvg) : '') + '</div>';
      },
    }),
    xAxis: { type: 'category', data: ex.map(function (e) { return e.title; }), axisLabel: Object.assign({ width: 90, overflow: 'truncate', interval: 0, rotate: ex.length > 4 ? 30 : 0 }, font), axisTick: { show: false }, axisLine: { lineStyle: { color: C.grid } } },
    yAxis: { type: 'value', min: 0, max: 100, axisLabel: Object.assign({ formatter: '{value}%' }, font), splitLine: { lineStyle: { color: C.grid } } },
    dataZoom: ex.length > 8 ? [{ type: 'inside', zoomOnMouseWheel: false, moveOnMouseWheel: false, startValue: ex.length - 8, endValue: ex.length - 1 }] : [],
    series: [
      {
        name: 'Миний дүн', type: 'bar', barMaxWidth: 28, cursor: 'pointer',
        data: ex.map(function (e) { return { value: e.pct, itemStyle: { color: e.pct >= 80 ? C.green : e.pct >= 50 ? C.primary : C.red, borderRadius: [6, 6, 0, 0] } }; }),
        label: { show: ex.length <= 8, position: 'top', formatter: function (p) { return Math.round(p.value) + '%'; }, color: C.text, fontWeight: 600, fontSize: 11 },
      },
      { name: 'Дундаж', type: 'bar', barMaxWidth: 28, data: ex.map(function (e) { return e.classAvg; }), itemStyle: { borderRadius: [6, 6, 0, 0], color: '#d8dce5' } },
    ],
  });
  if (eChart) eChart.on('click', function (p) { var e = ex[p.dataIndex]; if (e && e.url) location.href = e.url; });

  // ---------- 5. Долоо хоногийн идэвх ----------
  var W = D.weeks;
  make('ch-weeks', true, {
    color: [C.primary, C.green],
    legend: { top: 0, right: 0, textStyle: font, itemWidth: 14 },
    grid: { left: 8, right: 8, top: 32, bottom: 8, containLabel: true },
    tooltip: Object.assign({}, tooltipBase, {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: function (ps) {
        var w = W[ps[0].dataIndex];
        var end = new Date(w.week); end.setDate(end.getDate() + 6);
        return '<b>' + w.week.slice(5) + ' — ' + fmtD(end).slice(5) + '</b><br>Даалгавар: <b>' + w.tasks + '</b><br>Шалгалт: <b>' + w.exams + '</b>';
      },
    }),
    xAxis: { type: 'category', data: W.map(function (w) { return w.week.slice(5).replace('-', '/'); }), axisLabel: Object.assign({ hideOverlap: true }, font), axisTick: { show: false }, axisLine: { lineStyle: { color: C.grid } } },
    yAxis: { type: 'value', minInterval: 1, axisLabel: font, splitLine: { lineStyle: { color: C.grid } } },
    series: [
      { name: 'Даалгавар', type: 'bar', stack: 'a', barMaxWidth: 18, data: W.map(function (w) { return w.tasks; }) },
      { name: 'Шалгалт', type: 'bar', stack: 'a', barMaxWidth: 18, data: W.map(function (w) { return w.exams; }), itemStyle: { borderRadius: [4, 4, 0, 0] } },
    ],
  });

  // ---------- Шүүлтүүр: хичээл (subject) эсвэл даалгаврын төлөв ----------
  var filter = null;
  var bar = document.getElementById('pf-filterbar');
  var txt = document.getElementById('pf-filter-text');
  function setFilter(kind, value, label) {
    filter = filter && filter.kind === kind && filter.value === value ? null : { kind: kind, value: value, label: label || value };
    apply();
  }
  function apply() {
    document.querySelectorAll('.pf-lesson').forEach(function (l) {
      var rows = l.querySelectorAll('tbody tr');
      var any = false;
      rows.forEach(function (r) {
        var show = !filter || filter.kind !== 'state' || r.dataset.state === filter.value;
        r.hidden = !show;
        if (show) any = true;
      });
      var subjOk = !filter || filter.kind !== 'subject' || l.dataset.subject === filter.value;
      l.hidden = !subjOk || (filter && filter.kind === 'state' && !any);
      if (filter && !l.hidden) l.open = true;
    });
    document.querySelectorAll('.pf-section tr[data-subject]').forEach(function (r) {
      r.hidden = !!filter && filter.kind === 'subject' && r.dataset.subject !== filter.value;
    });
    if (bar) {
      bar.hidden = !filter;
      if (filter) txt.textContent = (filter.kind === 'subject' ? '📚 ' : '✅ ') + filter.label;
    }
    if (filter && bar) bar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  var clear = document.getElementById('pf-filter-clear');
  if (clear) clear.addEventListener('click', function () { filter = null; apply(); });

  // Хэмжээ өөрчлөгдөхөд графикуудыг дахин зурна
  var t;
  window.addEventListener('resize', function () {
    clearTimeout(t);
    t = setTimeout(function () { charts.forEach(function (c) { c.resize(); }); }, 120);
  });
})();
