// Онол, даалгаврын заавар (markdown) → аюулгүй HTML
const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');
const { highlight } = require('./highlight');
const katex = require('katex');

marked.setOptions({ gfm: true, breaks: true });

const SANITIZE = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'blockquote', 'pre', 'code',
    'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'u', 's', 'del', 'sup', 'sub', 'mark',
    'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div', 'input',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    th: ['align'],
    td: ['align'],
    code: ['class'],
    input: ['type', 'checked', 'disabled'],
    h1: ['id'], h2: ['id'], h3: ['id'], h4: ['id'],
  },
  // Засварлагчаар тохируулсан зургийн байрлал (зүүн/төв/баруун)
  allowedClasses: { img: ['img-left', 'img-center', 'img-right'], span: ['fs-sm', 'fs-md', 'fs-lg', 'fs-xl', 'fs-2xl'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  transformTags: {
    a: (tag, attribs) => ({ tagName: 'a', attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' } }),
    input: (tag, attribs) => ({ tagName: 'input', attribs: { type: 'checkbox', disabled: 'disabled', ...(attribs.checked !== undefined ? { checked: 'checked' } : {}) } }),
  },
};

function slugify(text) {
  return String(text).toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'section';
}

/** Markdown-ийг HTML болгож, гарчгуудад id өгнө (агуулгын жагсаалтад). */
const decodeEntities = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#(?:39|x27);/gi, "'").replace(/&amp;/g, '&');

/** Цэвэрлэсэн HTML-ийн код блокуудыг өнгөтэй болгоно (hljs гаралт escape хийгдсэн тул аюулгүй) */
function highlightCode(html) {
  return html.replace(/<pre><code(?: class="language-([\w+#.-]+)")?>([\s\S]*?)<\/code><\/pre>/g, (m, lang, body) => {
    const code = decodeEntities(body).replace(/\n$/, '');
    const r = highlight(code, lang);
    return `<pre><code class="hljs${lang ? ' language-' + lang : ''}">${r.html}</code></pre>`;
  });
}

// ---------------- LaTeX томьёо (KaTeX) ----------------
// $x^2$ — мөр доторх, $$…$$ — тусдаа мөр. Код доторх $-д хүрэхгүй; \$ = энгийн $ тэмдэгт.
// Томьёог түр тэмдэгтээр солиод markdown → цэвэрлэгээ хийсний дараа KaTeX-ийн HTML-ээр орлуулна
// (trust: false үед \href г.м. идэвхгүй, KaTeX оролтоо escape хийдэг тул аюулгүй).
const KATEX_OPTS = { throwOnError: false, output: 'html', trust: false, strict: 'ignore', maxSize: 20, maxExpand: 1000 };
const MARK = String.fromCharCode(1); // кодыг түр нуух тэмдэгт

function extractMath(src) {
  const math = [];
  const code = [];
  const hide = (m) => MARK + (code.push(m) - 1) + MARK;
  let s = String(src || '')
    .replace(/(^|\n)(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\2[ \t]*(?=\n|$)/g, hide) // код блок
    .replace(/(`+)[^`\n][\s\S]*?\1(?!`)/g, hide); // мөр доторх код
  const put = (tex, display) => 'KTXM' + (math.push({ tex: tex.trim(), display }) - 1) + 'KTX';
  s = s
    .replace(/\$\$([\s\S]+?)\$\$/g, (m, tex) => put(tex, true))
    // $…$: нээх $-ийн дараа, хаах $-ийн өмнө хоосон зай байхгүй ($5 ба $10 гэх мэтийг томьёо гэж үзэхгүй)
    .replace(/(^|[^\\$])\$(?!\s)((?:\\.|[^$\\\n])+?)\$(?!\d)/g, (m, pre, tex) => (/\s$/.test(tex) ? m : pre + put(tex, false)));
  s = s.replace(new RegExp(MARK + '(\\d+)' + MARK, 'g'), (m, i) => code[i]);
  return { src: s, math };
}

function injectMath(html, math) {
  const tex = (i, display) => katex.renderToString(math[i].tex, { ...KATEX_OPTS, displayMode: display });
  return html
    .replace(/<p>KTXM(\d+)KTX<\/p>/g, (m, i) => (math[i] ? '<div class="math-display">' + tex(i, true) + '</div>' : m))
    .replace(/KTXM(\d+)KTX/g, (m, i) => (math[i] ? tex(i, math[i].display) : m));
}

/** Markdown → аюулгүй HTML. { math: true } үед LaTeX томьёо зурна (бодлогын өгүүлбэр). */
function render(md, { math = false } = {}) {
  const ex = math ? extractMath(md) : { src: String(md || ''), math: [] };
  let html = highlightCode(sanitizeHtml(marked.parse(ex.src), SANITIZE));
  if (ex.math.length) html = injectMath(html, ex.math);
  const used = new Map();
  return html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (m, level, inner) => {
    let id = slugify(inner.replace(/<[^>]+>/g, ''));
    const n = used.get(id) || 0;
    used.set(id, n + 1);
    if (n) id += '-' + n;
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
}

/** Онолын агуулгын жагсаалт (## ба ### гарчгууд) */
function toc(html) {
  const items = [];
  html.replace(/<h([23]) id="([^"]+)">([\s\S]*?)<\/h\1>/g, (m, level, id, inner) => {
    items.push({ level: Number(level), id, text: inner.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&') });
  });
  return items;
}

function sanitizeDocHtml(html) {
  return sanitizeHtml(html, { ...SANITIZE, allowedSchemesByTag: { img: ['data'] } });
}

/** Бодлогын өгүүлбэр: Markdown + LaTeX */
const renderStatement = (md) => render(md, { math: true });

/** Хичээлийн онол/заавар: Markdown + LaTeX хичээлд томьёо зурна, Word шиг хичээлд энгийн markdown */
const renderLesson = (text, lesson) => render(text, { math: lesson?.contentFormat === 'markdown' });

module.exports = { render, renderStatement, renderLesson, toc, sanitizeDocHtml };
