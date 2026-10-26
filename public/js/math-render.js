// Хөтөч дээр $…$ / $$…$$ томьёог KaTeX-ээр зурна (src/markdown.js-ийн дүрэмтэй ижил: «$5 ба $10» томьёо биш).
// Хэрэглээ: window.renderMath(element) — текст зангилаануудыг солино (code, pre, textarea, input-д хүрэхгүй).
(function () {
  'use strict';
  var SKIP = { CODE: 1, PRE: 1, TEXTAREA: 1, INPUT: 1, SCRIPT: 1, STYLE: 1 };
  var RE = /\$\$([\s\S]+?)\$\$|(^|[^\\$])\$(?!\s)((?:\\.|[^$\\\n])+?)\$(?!\d)/g;

  function tex(src, display) {
    try { return window.katex.renderToString(src.trim(), { throwOnError: false, displayMode: display, output: 'html' }); } catch (e) { return null; }
  }

  function renderText(node) {
    var s = node.nodeValue;
    if (s.indexOf('$') < 0) return;
    var frag = document.createDocumentFragment(), last = 0, any = false, m;
    RE.lastIndex = 0;
    while ((m = RE.exec(s))) {
      var display = m[1] != null;
      var body = display ? m[1] : m[3];
      var pre = display ? '' : m[2];
      if (!display && /\s$/.test(body)) continue;
      var html = tex(body, display);
      if (html == null) continue;
      frag.appendChild(document.createTextNode(s.slice(last, m.index) + pre));
      var span = document.createElement('span');
      span.className = display ? 'math-display' : 'math-inline';
      span.innerHTML = html;
      frag.appendChild(span);
      last = m.index + m[0].length;
      any = true;
    }
    if (!any) return;
    frag.appendChild(document.createTextNode(s.slice(last).replace(/\\\$/g, '$')));
    node.parentNode.replaceChild(frag, node);
  }

  window.renderMath = function (root) {
    if (!root || !window.katex) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        for (var p = n.parentNode; p && p !== root; p = p.parentNode) if (SKIP[p.nodeName] || (p.classList && p.classList.contains('katex'))) return NodeFilter.FILTER_REJECT;
        return n.nodeValue.indexOf('$') >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    var list = [];
    while (walker.nextNode()) list.push(walker.currentNode);
    list.forEach(renderText);
  };
})();
