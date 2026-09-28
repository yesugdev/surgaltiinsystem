(function () {
  var form = document.getElementById('question-form');
  if (!form) return;
  var typeSel = document.getElementById('q-type');
  var list = document.getElementById('options');
  var optionsBlock = document.getElementById('options-block');
  var textBlock = document.getElementById('text-block');
  var hint = document.getElementById('options-hint');

  // "зөв" checkbox-ын утга нь optionText-ийн индекстэй таарах ёстой
  function reindex() {
    list.querySelectorAll('.option-row').forEach(function (row, i) {
      row.querySelector('input[type=checkbox]').value = String(i);
    });
  }

  function syncType() {
    var t = typeSel.value;
    optionsBlock.style.display = t === 'text' ? 'none' : '';
    textBlock.style.display = t === 'text' ? '' : 'none';
    hint.textContent = t === 'single' ? '— нэг зөв хариултыг тэмдэглэнэ' : '— бүх зөв хариултыг тэмдэглэнэ';
    if (t === 'single') {
      var checked = list.querySelectorAll('input[type=checkbox]:checked');
      for (var i = 1; i < checked.length; i++) checked[i].checked = false;
    }
  }

  document.getElementById('add-option').addEventListener('click', function () {
    var rows = list.querySelectorAll('.option-row');
    if (rows.length >= 20) return;
    var row = rows[0].cloneNode(true);
    row.querySelector('input[type=checkbox]').checked = false;
    row.querySelector('input[name=optionText]').value = '';
    list.appendChild(row);
    reindex();
    row.querySelector('input[name=optionText]').focus();
  });

  list.addEventListener('click', function (e) {
    var btn = e.target.closest('.remove-option');
    if (!btn) return;
    if (list.querySelectorAll('.option-row').length <= 2) return;
    btn.closest('.option-row').remove();
    reindex();
  });

  list.addEventListener('change', function (e) {
    if (e.target.type === 'checkbox' && e.target.checked && typeSel.value === 'single') {
      list.querySelectorAll('input[type=checkbox]').forEach(function (cb) {
        if (cb !== e.target) cb.checked = false;
      });
    }
  });

  typeSel.addEventListener('change', syncType);
  syncType();
})();
