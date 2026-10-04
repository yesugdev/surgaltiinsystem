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
