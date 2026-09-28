// data-confirm атрибуттай форм илгээхээс өмнө баталгаажуулна
document.addEventListener('submit', function (e) {
  var form = e.target;
  var msg = form.getAttribute && form.getAttribute('data-confirm');
  if (msg && !window.confirm(msg)) e.preventDefault();
});
