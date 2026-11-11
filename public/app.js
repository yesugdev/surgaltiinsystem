// data-confirm атрибуттай форм илгээхээс өмнө баталгаажуулна
document.addEventListener('submit', function (e) {
  var form = e.target;
  var msg = form.getAttribute && form.getAttribute('data-confirm');
  if (msg && !window.confirm(msg)) e.preventDefault();
});

// Цэсний «Удирдлага» жагсаалтыг гадна дарах эсвэл Esc-ээр хаана
document.addEventListener('click', function (e) {
  document.querySelectorAll('details.nav-menu[open]').forEach(function (d) {
    if (!d.contains(e.target)) d.removeAttribute('open');
  });
});
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  document.querySelectorAll('details.nav-menu[open]').forEach(function (d) { d.removeAttribute('open'); });
});

// Sticky элементүүдэд дээд цэсний бодит өндрийг (--topbar-h) өгнө; sticky гарчиг наалдсан үед .is-stuck
(function () {
  var bar = document.querySelector('.topbar');
  function setH() { document.documentElement.style.setProperty('--topbar-h', (bar ? bar.offsetHeight : 0) + 'px'); }
  setH();
  window.addEventListener('resize', setH);
  if (bar && window.ResizeObserver) new ResizeObserver(setH).observe(bar);
  var row = document.querySelector('.task-title-row.is-sticky');
  if (!row) return;
  function check() { row.classList.toggle('is-stuck', row.getBoundingClientRect().top <= (bar ? bar.offsetHeight : 0) + 1 && window.scrollY > 0); }
  window.addEventListener('scroll', check, { passive: true });
  check();
})();
