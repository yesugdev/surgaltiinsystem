/**
 * LaTeX баримт → хичээлийн импортын текст (Markdown + $томьёо$, «=== ОНОЛ / ТЕСТ / ДААЛГАВАР ===»).
 * AI-аар бэлтгэсэн .tex агуулгыг шууд буулгахад ашиглана. Хөтөч, сервер хоёулаа ашигладаг.
 *
 * Дэмжих зүйлс: \section/\subsection/\subsubsection, itemize/enumerate (давхар), tabular (booktabs),
 * \textbf/\textit/\texttt/\emph/\underline/\text, $…$, \[…\], equation/align, тестийн сонголт
 * (flalign/align доторх «A) …», «*B) …»), mdframed/center/table (агуулгыг үлдээнэ), HTML-ээр эвдэрсэн &amp; &gt;.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LatexConvert = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var ESC = { '{': '{', '}': '}', '_': '_', '%': '%', '&': '&', '#': '#', '$': '\\$', ' ': ' ', ',': ' ', ';': ' ', '!': '', '-': '' };
  var DROP = ['bfseries', 'itshape', 'mdseries', 'rmfamily', 'sffamily', 'ttfamily', 'normalfont', 'tiny', 'scriptsize', 'footnotesize', 'small', 'normalsize',
    'large', 'Large', 'LARGE', 'huge', 'Huge', 'centering', 'raggedright', 'raggedleft', 'noindent', 'medskip', 'bigskip', 'smallskip', 'newpage', 'clearpage',
    'maketitle', 'tableofcontents', 'hline', 'toprule', 'midrule', 'bottomrule', 'hfill', 'vfill', 'indent', 'par'];
  var DROP_ARG = { vspace: 1, hspace: 1, color: 1, label: 1, pagestyle: 1, thispagestyle: 1, setlength: 2, addtolength: 2, cline: 1, cmidrule: 1, phantom: 1 };
  var SYMBOLS = { ldots: '…', dots: '…', textbackslash: '\\', LaTeX: 'LaTeX', TeX: 'TeX', today: '', quad: ' ', qquad: '  ', rightarrow: '→', leftarrow: '←',
    Rightarrow: '⇒', textendash: '–', textemdash: '—', textbullet: '•', newline: '\n', linebreak: '\n', copyright: '©', textdegree: '°' };

  /** LaTeX мэт харагдах эсэх (импорт автоматаар хөрвүүлэх) */
  function looksLikeLatex(text) {
    return /\\documentclass|\\begin\{document\}|\\(?:sub)*section\*?\s*\{|\\begin\{(?:itemize|enumerate)\}/.test(String(text || ''));
  }

  function decodeEntities(s) {
    return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
  }

  /** s[i] === '{' үед тохирох '}' хүртэлх бүлэг */
  function readGroup(s, i) {
    var depth = 0;
    for (var j = i; j < s.length; j++) {
      var c = s[j];
      if (c === '\\') { j++; continue; }
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) return { inner: s.slice(i + 1, j), end: j + 1 }; }
    }
    return { inner: s.slice(i + 1), end: s.length };
  }

  function convert(text) {
    var src = decodeEntities(String(text || '').replace(/\r\n?/g, '\n'));
    var b = src.indexOf('\\begin{document}');
    var e = src.lastIndexOf('\\end{document}');
    if (b >= 0) src = src.slice(b + '\\begin{document}'.length, e > b ? e : undefined);
    // Тайлбар (%) — \% биш
    src = src.replace(/(^|[^\\])%.*$/gm, '$1');

    var store = [];
    var put = function (v) { return '@@L' + (store.push(v) - 1) + '@@'; };

    // Мөр таслах \\[0.5em] → \\ ; AI-ийн давхар налуу зураас \\[ … \\] → \[ … \]
    src = src.replace(/\\\\\s*\[\s*-?[\d.]+\s*(?:em|ex|pt|cm|mm|in)\s*\]/g, '\\\\');
    src = src.replace(/\\\\\[/g, '\\[').replace(/\\\\\]/g, '\\]');

    // Тестийн сонголттой flalign/align → «A) …» мөрүүд; бусад нь томьёо
    src = src.replace(/\\begin\{(flalign|align|alignat|eqnarray|gather)(\*?)\}(\{[^}]*\})?([\s\S]*?)\\end\{\1\2\}/g, function (m, env, star, arg, body) {
      var opts = optionsFrom(body);
      if (opts) return '\n' + put(opts.join('\n')) + '\n';
      return '\n' + put('$$\\begin{aligned}' + body.replace(/&&/g, '&').trim() + '\\end{aligned}$$') + '\n';
    });
    src = src.replace(/\\begin\{(equation|displaymath)\*?\}([\s\S]*?)\\end\{\1\*?\}/g, function (m, env, body) {
      return '\n' + put('$$' + body.trim().replace(/\s*\n\s*/g, ' ') + '$$') + '\n';
    });
    // Тусдаа мөрийн томьёо \[ … \], $$ … $$
    src = src.replace(/\\\[([\s\S]*?)\\\]/g, function (m, body) { return '\n' + put('$$' + body.trim().replace(/\s*\n\s*/g, ' ') + '$$') + '\n'; });
    src = src.replace(/\$\$([\s\S]*?)\$\$/g, function (m, body) { return '\n' + put('$$' + body.trim().replace(/\s*\n\s*/g, ' ') + '$$') + '\n'; });
    // Мөр доторх томьёо \( … \), $ … $ (\$ биш)
    src = src.replace(/\\\(([\s\S]*?)\\\)/g, function (m, body) { return put('$' + body.trim() + '$'); });
    src = src.replace(/(^|[^\\])\$([^$]+?)\$/g, function (m, pre, body) { return pre + put('$' + body.trim().replace(/\s*\n\s*/g, ' ') + '$'); });

    // Хүснэгт
    src = src.replace(/\\begin\{(tabular|tabularx|longtable)\*?\}(\{[^}]*\})?(\{[^}]*\})?([\s\S]*?)\\end\{\1\*?\}/g, function (m, env, a1, a2, body) {
      return '\n\n' + put(table(env === 'tabularx' ? body : body)) + '\n\n';
    });

    // Мөрийн эхний хоосон зайг хасаж (markdown-д 4 зай = код), нэг мөр шилжилтийг зай болгоно (LaTeX дүрэм)
    src = src.split('\n').map(function (l) { return l.trim(); }).join('\n');
    src = src.replace(/([^\n])\n(?!\n)/g, '$1 ');

    // Жагсаалтууд
    var out = lists(src);

    // Хадгалсан хэсгүүдийг сэргээнэ (хүснэгт доторх томьёо гэх мэт давхар байж болно)
    for (var guard = 0; /@@L\d+@@/.test(out) && guard < 5; guard++) out = out.replace(/@@L(\d+)@@/g, function (m, i) { return store[i]; });
    // Даалгаврын «Оноо: 10» (тод болгосон) → задлагчид танигдах энгийн мөр
    out = out.replace(/^\s*\*\*\s*(Оноо|Points?)\s*:\s*([\d.,]+)\s*\*\*\s*$/gim, '$1: $2');
    return out.split('\n').map(function (l) { return l.replace(/\s+$/, ''); }).join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';

    // ---- туслах функцүүд ----
    function optionsFrom(body) {
      var cells = body.split(/\\\\/).join('&').split('&').map(function (c) { return c.trim(); }).filter(Boolean);
      var opts = [];
      cells.forEach(function (c) { var o = cellToOption(c); if (o) opts.push(o); });
      return opts.length >= 2 ? opts : null;
    }

    function cellToOption(cell) {
      var m = /(\*?)\s*([A-HА-Е])\s*\)\s*/.exec(cell);
      if (!m) return null;
      var before = cell.slice(0, m.index);
      var after = cell.slice(m.index + m[0].length);
      var open = (before.match(/\{/g) || []).length - (before.match(/\}/g) || []).length;
      // Сонголтын өмнө нээгдсэн \text{ \textbf{ -ийн хаалтуудыг хасна
      var depth = open, res = '';
      for (var i = 0; i < after.length; i++) {
        var c = after[i];
        if (c === '\\' && i + 1 < after.length) { res += c + after[i + 1]; i++; continue; }
        if (c === '{') { depth++; res += c; continue; }
        if (c === '}') { if (depth <= open && depth > 0) { depth--; open--; continue; } depth--; res += c; continue; }
        res += c;
      }
      var star = m[1] || (/\*\s*$/.test(res) ? '*' : '');
      res = res.replace(/\*\s*$/, '').trim();
      var mathy = /\\(?!text\b)[a-zA-Z]+|[\^_]/.test(res.replace(/\\text\{[^}]*\}/g, ''));
      var content = mathy ? '$' + res + '$' : inline(res);
      return star + m[2] + ') ' + content.trim();
    }

    function table(body) {
      var rows = body.replace(/\\(toprule|midrule|bottomrule|hline)\b/g, '').replace(/\\cline\{[^}]*\}|\\cmidrule(\([^)]*\))?\{[^}]*\}/g, '')
        .split(/\\\\/).map(function (r) { return r.trim(); }).filter(Boolean)
        .map(function (r) { return r.split(/(?<!\\)&/).map(function (c) { return inline(c.trim()).replace(/\n+/g, ' ').replace(/\|/g, '\\|').trim(); }); });
      if (!rows.length) return '';
      var n = Math.max.apply(null, rows.map(function (r) { return r.length; }));
      var line = function (r) { var cells = r.slice(); while (cells.length < n) cells.push(''); return '| ' + cells.join(' | ') + ' |'; };
      var md = [line(rows[0]), '|' + new Array(n + 1).join('---|')];
      rows.slice(1).forEach(function (r) { md.push(line(r)); });
      return md.join('\n');
    }

    function inline(s) {
      var o = '';
      for (var i = 0; i < s.length;) {
        var c = s[i];
        if (c === '\\') {
          var m = /^\\([a-zA-Z]+)\*?/.exec(s.slice(i));
          if (!m) {
            var ch = s[i + 1];
            if (ch === '\\') { o += '\n'; i += 2; continue; }
            o += ch in ESC ? ESC[ch] : (ch || '');
            i += 2;
            continue;
          }
          var name = m[1];
          i += m[0].length;
          var opt = /^\s*\[[^\]]*\]/.exec(s.slice(i));
          var args = [];
          var want = { textbf: 1, textit: 1, emph: 1, texttt: 1, underline: 1, text: 1, textrm: 1, textsf: 1, textnormal: 1, mbox: 1, textsc: 1, textup: 1,
            section: 1, subsection: 1, subsubsection: 1, paragraph: 1, subparagraph: 1, title: 1, textcolor: 2, colorbox: 2, href: 2, url: 1, footnote: 1, caption: 1 }[name]
            || DROP_ARG[name] || 0;
          if (want && opt && name !== 'textcolor') i += opt[0].length;
          for (var k = 0; k < want; k++) {
            var ws = /^\s*/.exec(s.slice(i))[0].length;
            if (s[i + ws] !== '{') break;
            var g = readGroup(s, i + ws);
            args.push(g.inner);
            i = g.end;
          }
          var a = args[0] || '';
          switch (name) {
            case 'textbf': o += '**' + inline(a).trim() + '**'; break;
            case 'textit': case 'emph': o += '*' + inline(a).trim() + '*'; break;
            case 'texttt': o += '`' + inline(a).replace(/`/g, "'").trim() + '`'; break;
            case 'section': case 'subsection': case 'subsubsection': case 'paragraph': case 'subparagraph': case 'title': {
              var t = inline(a).replace(/\s+/g, ' ').trim();
              if (/={3,}/.test(t)) o += '\n\n' + t + '\n\n';
              else o += '\n\n' + ({ section: '## ', title: '# ', subsection: '## ', subsubsection: '### ' }[name] || '**') + t + (/paragraph/.test(name) ? '**' : '') + '\n\n';
              break;
            }
            case 'textcolor': case 'colorbox': o += inline(args[1] || ''); break;
            case 'href': o += '[' + inline(args[1] || '') + '](' + a + ')'; break;
            case 'url': o += a; break;
            case 'footnote': o += ' (' + inline(a) + ')'; break;
            case 'caption': o += '\n*' + inline(a) + '*\n'; break;
            default:
              if (DROP_ARG[name] || DROP.indexOf(name) >= 0) break;
              if (name in SYMBOLS) { o += SYMBOLS[name]; break; }
              if (/^(begin|end)$/.test(name)) { // үлдсэн орчин (mdframed, center, table, quote …)
                var env = /^\s*\{[^}]*\}(\[[^\]]*\])?(\{[^}]*\})?/.exec(s.slice(i));
                if (env) i += env[0].length;
                o += '\n';
                break;
              }
              if (want) o += inline(a);
          }
          continue;
        }
        if (c === '{') { var gg = readGroup(s, i); o += inline(gg.inner); i = gg.end; continue; }
        if (c === '}') { i++; continue; }
        if (c === '~') { o += ' '; i++; continue; }
        if (s.startsWith('---', i)) { o += '—'; i += 3; continue; }
        if (s.startsWith('--', i)) { o += '–'; i += 2; continue; }
        if (s.startsWith('``', i) || s.startsWith("''", i)) { o += '"'; i += 2; continue; }
        o += c;
        i++;
      }
      return o;
    }

    function lists(s) {
      var re = /\\begin\{(itemize|enumerate|description)\}(\s*\[[^\]]*\])?|\\end\{(itemize|enumerate|description)\}|\\item\b(\s*\[[^\]]*\])?/g;
      var stack = [];
      var res = '';
      var last = 0;
      var m;
      function emit(text) {
        var conv = inline(text);
        if (!stack.length) { res += conv.replace(/\n[ \t]+/g, '\n'); return; }
        var ind = new Array(stack[stack.length - 1].content + 1).join(' ');
        res += conv.split('\n').map(function (l, i) {
          if (!l.trim()) return '';
          // Эхний хэсэг нь жагсаалтын тэмдгийн шууд ард (зайг шахна); бусад нь тухайн зүйлийн доголтой
          if (i === 0) return /\n$/.test(res) || !res ? ind + l.trim() : l.replace(/^\s+/, '');
          return ind + l.trim();
        }).join('\n');
      }
      while ((m = re.exec(s))) {
        emit(s.slice(last, m.index));
        last = re.lastIndex;
        if (m[1]) {
          var parent = stack[stack.length - 1];
          stack.push({ type: m[1], n: 0, indent: parent ? parent.content : 0, content: parent ? parent.content : 0 });
          res += '\n';
        } else if (m[3]) {
          stack.pop();
          res += '\n\n';
        } else if (stack.length) {
          var top = stack[stack.length - 1];
          var label = m[4] ? inline(m[4].trim().slice(1, -1)) : '';
          var marker = top.type === 'enumerate' ? ++top.n + '. ' : '- ';
          top.content = top.indent + marker.length;
          res += '\n' + new Array(top.indent + 1).join(' ') + marker + (label ? '**' + label + '** ' : '');
        }
      }
      emit(s.slice(last));
      return res;
    }
  }

  return { looksLikeLatex: looksLikeLatex, convert: convert };
});
