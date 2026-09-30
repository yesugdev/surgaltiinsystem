/**
 * Word шиг засварлагч: багш Markdown мэдэх шаардлагагүй.
 * <textarea data-rich data-html-source="#id" data-upload="/lessons/ID/attachments" data-markdown-toggle="1">
 *   - Анхны агуулгыг серверт цэвэрлэсэн HTML-ээс (data-html-source) ачаална
 *   - Хадгалахад Markdown болгож textarea-д бичнэ (одоогийн өгөгдөл, AI импорттой нийцтэй)
 * Эх файл: client/rich-editor.js → `npm run build:client` → public/js/rich-editor.js
 */
import TurndownService from 'turndown/lib/turndown.browser.es.js';
import { gfm } from 'turndown-plugin-gfm/lib/turndown-plugin-gfm.browser.es.js';
import { highlight } from '../src/highlight.js';

const turndown = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  strongDelimiter: '**',
});
turndown.use(gfm);
turndown.keep(['sub', 'sup', 'mark']);
// Markdown-д доогуур зураас байхгүй тул <u>-г энгийн текст болгоно
turndown.addRule('underline', { filter: ['u'], replacement: (c) => c });
// Үсгийн хэмжээ: <span class="fs-lg">…</span> хэлбэрээр хадгална (Markdown-д хэмжээ байхгүй)
const FONT_SIZES = [
  { cls: 'fs-sm', label: 'Жижиг' },
  { cls: '', label: 'Энгийн' },
  { cls: 'fs-lg', label: 'Том' },
  { cls: 'fs-xl', label: 'Их том' },
  { cls: 'fs-2xl', label: 'Маш том' },
];
// fs-md: том хэмжээтэй текст доторх «Энгийн» хэсэг (гадуур нь хэмжээгүй бол хэрэглэхгүй)
const FS_CLASSES = FONT_SIZES.map((s) => s.cls).filter(Boolean).concat('fs-md');
const fsClassOf = (el) => FS_CLASSES.find((c) => el.classList && el.classList.contains(c));
turndown.addRule('fontSize', {
  filter: (node) => node.nodeName === 'SPAN' && !!fsClassOf(node),
  replacement: (content, node) => (content.trim() ? `<span class="${fsClassOf(node)}">${content}</span>` : content),
});
// Хэмжээ/байрлал тохируулсан зургийг HTML хэлбэрээр хадгална (Markdown-д width байхгүй)
const IMG_CLASSES = ['img-left', 'img-center', 'img-right'];
const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
turndown.addRule('sizedImage', {
  filter: (node) => node.nodeName === 'IMG' && (node.getAttribute('width') || IMG_CLASSES.some((c) => node.classList.contains(c))),
  replacement: (c, node) => {
    const width = node.getAttribute('width');
    const cls = IMG_CLASSES.find((k) => node.classList.contains(k));
    return `<img src="${attr(node.getAttribute('src') || '')}" alt="${attr(node.getAttribute('alt') || '')}"` +
      (width ? ` width="${attr(width)}"` : '') + (cls ? ` class="${cls}"` : '') + '>';
  },
});

// Word, вэбээс хуулж буулгахад зөвхөн утга учиртай тэмдэглэгээг үлдээнэ
const ALLOWED = new Set(['H1', 'H2', 'H3', 'H4', 'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI', 'A', 'IMG', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'BLOCKQUOTE', 'PRE', 'CODE', 'HR', 'SUB', 'SUP']);
const RENAME = { B: 'STRONG', I: 'EM', H1: 'H2', H4: 'H3' };

function cleanNode(node, doc) {
  const out = doc.createDocumentFragment();
  node.childNodes.forEach((child) => {
    if (child.nodeType === 3) {
      out.appendChild(doc.createTextNode(child.textContent));
      return;
    }
    if (child.nodeType !== 1) return;
    const tag = child.tagName;
    if (['SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'XML'].includes(tag) || /^O:/.test(tag)) return;
    const inner = cleanNode(child, doc);
    if (tag === 'SPAN' && fsClassOf(child)) {
      // Засварлагч дотор хуулж буулгахад үсгийн хэмжээ хадгалагдана
      const span = doc.createElement('span');
      span.className = fsClassOf(child);
      span.appendChild(inner);
      out.appendChild(span);
      return;
    }
    if (!ALLOWED.has(tag)) {
      // DIV, SPAN, FONT гэх мэт: агуулгыг нь үлдээнэ; блок элементийг догол мөр болгоно
      if (['DIV', 'SECTION', 'ARTICLE'].includes(tag) && child.textContent.trim()) {
        const p = doc.createElement('p');
        p.appendChild(inner);
        out.appendChild(p);
      } else out.appendChild(inner);
      return;
    }
    const el = doc.createElement(RENAME[tag] || tag);
    if (tag === 'A') {
      const href = child.getAttribute('href') || '';
      if (/^(https?:|mailto:|\/)/i.test(href)) el.setAttribute('href', href);
    }
    if (tag === 'IMG') {
      const src = child.getAttribute('src') || '';
      if (!/^(https?:|\/)/i.test(src)) return; // Word-ийн локал зураг (file://) хуулагдахгүй
      el.setAttribute('src', src);
      el.setAttribute('alt', child.getAttribute('alt') || '');
      // Засварлагч дотор хуулж буулгахад хэмжээ, байрлал хадгалагдана
      const width = child.getAttribute('width') || '';
      if (/^\d{1,3}%$/.test(width)) el.setAttribute('width', width);
      const cls = IMG_CLASSES.find((c) => child.classList.contains(c));
      if (cls) el.className = cls;
    }
    el.appendChild(inner);
    out.appendChild(el);
  });
  return out;
}

function sanitizePaste(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const container = document.createElement('div');
  container.appendChild(cleanNode(doc.body, document));
  return container.innerHTML;
}

/** Код блокийн текст: <br> ба мөр болгон (div/p) хуваагдсаныг \n болгоно */
function codeText(el) {
  let out = '';
  const walk = (node) => {
    node.childNodes.forEach((n) => {
      if (n.nodeType === 3) out += n.data;
      else if (n.nodeName === 'BR') out += '\n';
      else if (n.nodeType === 1) {
        const block = /^(DIV|P)$/.test(n.nodeName);
        if (block && out && !out.endsWith('\n')) out += '\n';
        walk(n);
        if (block && !out.endsWith('\n')) out += '\n';
      }
    });
  };
  walk(el);
  return out.replace(/ /g, ' ').replace(/\n$/, '');
}

const BUTTONS = [
  { cmd: 'block', arg: 'P', label: 'Текст', title: 'Энгийн текст' },
  { cmd: 'block', arg: 'H2', label: 'Гарчиг', title: 'Том гарчиг' },
  { cmd: 'block', arg: 'H3', label: 'Дэд гарчиг', title: 'Дэд гарчиг' },
  { cmd: 'fontSize', label: 'Aa Хэмжээ', title: 'Үсгийн хэмжээ', menu: true },
  'sep',
  { cmd: 'bold', label: 'Т', title: 'Тод (Ctrl+B)', cls: 'rt-b' },
  { cmd: 'italic', label: 'Н', title: 'Налуу (Ctrl+I)', cls: 'rt-i' },
  'sep',
  { cmd: 'insertUnorderedList', label: '• Жагсаалт', title: 'Цэгтэй жагсаалт' },
  { cmd: 'insertOrderedList', label: '1. Жагсаалт', title: 'Дугаартай жагсаалт' },
  { cmd: 'block', arg: 'BLOCKQUOTE', label: '❝ Санамж', title: 'Санамж, ишлэл' },
  { cmd: 'code', label: '</> Код', title: 'Код (програмчлалын хичээлд)' },
  'sep',
  { cmd: 'link', label: '🔗 Холбоос', title: 'Холбоос оруулах' },
  { cmd: 'table', label: '⊞ Хүснэгт', title: 'Хүснэгт оруулах' },
  { cmd: 'image', label: '🖼 Зураг', title: 'Зураг оруулах', needsUpload: true },
  { cmd: 'insertHorizontalRule', label: '―', title: 'Хэвтээ зураас' },
  'sep',
  { cmd: 'undo', label: '↶', title: 'Буцаах (Ctrl+Z)' },
  { cmd: 'redo', label: '↷', title: 'Дахин хийх (Ctrl+Y)' },
];

function enhance(textarea) {
  const uploadUrl = textarea.dataset.upload || '';
  const allowMarkdown = textarea.dataset.markdownToggle === '1';
  const source = textarea.dataset.htmlSource && document.querySelector(textarea.dataset.htmlSource);

  const wrap = document.createElement('div');
  wrap.className = 'rt';
  const bar = document.createElement('div');
  bar.className = 'rt-toolbar';
  bar.setAttribute('role', 'toolbar');
  const editor = document.createElement('div');
  editor.className = 'rt-content markdown';
  editor.contentEditable = 'true';
  editor.setAttribute('role', 'textbox');
  editor.setAttribute('aria-multiline', 'true');
  editor.dataset.placeholder = textarea.placeholder || 'Энд бичнэ үү…';
  editor.innerHTML = source ? source.innerHTML.trim() : '';
  if (textarea.rows) editor.style.minHeight = Math.max(textarea.rows * 1.7, 8) + 'em';

  textarea.parentNode.insertBefore(wrap, textarea);
  wrap.appendChild(bar);
  wrap.appendChild(editor);
  wrap.appendChild(textarea);
  textarea.classList.add('rt-source');
  textarea.hidden = true;

  let markdownMode = false;
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.hidden = true;
  wrap.appendChild(fileInput);

  const status = document.createElement('span');
  status.className = 'rt-status small muted';

  function syncToTextarea() {
    if (markdownMode) return;
    // Код блокийн мөр шилжилт (<br>, <div>) алдагдахгүйн тулд хуулбар дээр цэвэр текст болгоно
    const clone = editor.cloneNode(true);
    clone.querySelectorAll('pre').forEach((pre) => {
      const code = pre.querySelector('code');
      const lang = code && (code.className.match(/language-[\w+#.-]+/) || [])[0];
      const text = codeText(pre);
      pre.textContent = '';
      const c = document.createElement('code');
      if (lang) c.className = lang;
      c.textContent = text;
      pre.appendChild(c);
    });
    const html = clone.innerHTML.replace(/<p><br><\/p>/g, '').replace(/\s*\brt-img-(?:selected|dragging)\b/g, '').replace(/ class=""/g, '').trim();
    textarea.value = html ? turndown.turndown(html).trim() : '';
  }

  function exec(cmd, arg) {
    editor.focus();
    document.execCommand(cmd, false, arg);
    syncToTextarea();
    updateState();
  }

  function insertHtml(html) {
    editor.focus();
    document.execCommand('insertHTML', false, html);
    syncToTextarea();
  }

  const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const actions = {
    block: (arg) => {
      const cur = currentBlock();
      // Дахин дарвал энгийн текст болгоно
      exec('formatBlock', cur === arg && arg !== 'P' ? '<P>' : `<${arg}>`);
    },
    code: () => {
      const sel = window.getSelection();
      const text = sel && sel.toString();
      if (text && !text.includes('\n')) insertHtml(`<code>${escapeHtml(text)}</code>&nbsp;`);
      else insertHtml(`<pre><code>${escapeHtml(text || 'код энд')}</code></pre><p><br></p>`);
    },
    link: () => {
      const sel = window.getSelection();
      const range = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
      const url = window.prompt('Холбоосын хаяг (https://...):', 'https://');
      if (!url || !/^https?:\/\/.+/i.test(url)) return;
      editor.focus();
      if (range) { sel.removeAllRanges(); sel.addRange(range); }
      if (sel.toString()) exec('createLink', url);
      else insertHtml(`<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>&nbsp;`);
    },
    table: () => {
      const cols = Math.min(Math.max(parseInt(window.prompt('Хэдэн багана?', '3'), 10) || 0, 1), 8);
      const rows = Math.min(Math.max(parseInt(window.prompt('Хэдэн мөр (толгойгоос гадна)?', '3'), 10) || 0, 1), 30);
      if (!cols || !rows) return;
      const th = Array.from({ length: cols }, (_, i) => `<th>Гарчиг ${i + 1}</th>`).join('');
      const tr = Array.from({ length: rows }, () => `<tr>${Array.from({ length: cols }, () => '<td>&nbsp;</td>').join('')}</tr>`).join('');
      insertHtml(`<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table><p><br></p>`);
    },
    image: () => fileInput.click(),
  };

  // Сонгосон зургийг хичээлийн хавсралт болгон хадгалж, засварлагчид оруулна
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files[0];
    fileInput.value = '';
    if (!f) return;
    const range = saveRange();
    status.textContent = 'Зураг хуулж байна…';
    try {
      const fd = new FormData();
      fd.append('files', f, f.name);
      const r = await fetch(uploadUrl, { method: 'POST', body: fd, headers: { Accept: 'application/json' }, credentials: 'same-origin' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Зураг хуулж чадсангүй.');
      restoreRange(range);
      insertHtml(d.files.map((x) => `<img src="${escapeHtml(x.url)}" alt="${escapeHtml(x.name.replace(/\.[^.]+$/, ''))}">`).join('') + '<p><br></p>');
      status.textContent = '✓ Зураг нэмэгдлээ';
    } catch (e) {
      status.textContent = e.message;
    }
    setTimeout(() => { status.textContent = ''; }, 4000);
  });

  function saveRange() {
    const sel = window.getSelection();
    return sel.rangeCount && editor.contains(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : null;
  }
  function restoreRange(range) {
    editor.focus();
    if (!range) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function currentBlock() {
    const sel = window.getSelection();
    let n = sel && sel.anchorNode;
    while (n && n !== editor) {
      if (n.nodeType === 1 && /^(H2|H3|P|BLOCKQUOTE|PRE|LI)$/.test(n.tagName)) return n.tagName;
      n = n.parentNode;
    }
    return 'P';
  }

  // --- Үсгийн хэмжээ ---
  // Хөтчийн fontSize команд (<font size>) давхар хэмжээг зөв задалдаг тул манай span-уудыг
  // түр <font>-руу хувиргаж командыг ажиллуулаад буцааж span болгоно.
  const FONT_TAG_SIZE = { 'fs-sm': '2', '': '3', 'fs-md': '3', 'fs-lg': '5', 'fs-xl': '6', 'fs-2xl': '7' };
  const CLASS_BY_FONT_SIZE = { 2: 'fs-sm', 3: 'fs-md', 5: 'fs-lg', 6: 'fs-xl', 7: 'fs-2xl' };
  const hasSizedAncestor = (el) => {
    for (let n = el.parentNode; n && n !== editor; n = n.parentNode) {
      if (n.nodeType === 1 && (n.tagName === 'FONT' || fsClassOf(n))) return true;
    }
    return false;
  };
  const unwrap = (el) => { el.replaceWith(...el.childNodes); };
  let fsLabel = null;

  function applyFontSize(cls, range) {
    restoreRange(range);
    const sel = window.getSelection();
    if (!sel.rangeCount || !editor.contains(sel.anchorNode)) return;
    if (sel.isCollapsed) {
      // Юу ч сонгоогүй бол курсор байгаа мөрийг бүхэлд нь өөрчилнө
      let n = sel.anchorNode;
      while (n && n !== editor && !(n.nodeType === 1 && /^(P|H2|H3|LI|BLOCKQUOTE|TD|TH|PRE)$/.test(n.tagName))) n = n.parentNode;
      if (!n || n === editor) return;
      const r = document.createRange();
      r.selectNodeContents(n);
      sel.removeAllRanges();
      sel.addRange(r);
    }
    // span ↔ font солиход текстийн зангилаа зөөгдөж сонголт алдагдах тул эхлээд тэмдэглэнэ
    let marks = markSelection(sel);
    editor.querySelectorAll('span').forEach((s) => {
      const c = fsClassOf(s);
      if (!c) return;
      const font = document.createElement('font');
      font.setAttribute('size', FONT_TAG_SIZE[c]);
      s.replaceWith(font);
      font.append(...s.childNodes);
    });
    restoreMarks(sel, marks);
    try { document.execCommand('styleWithCSS', false, false); } catch { /* зарим хөтөч дэмжихгүй */ }
    document.execCommand('fontSize', false, FONT_TAG_SIZE[cls]);
    marks = markSelection(sel);
    editor.querySelectorAll('font').forEach((font) => {
      const c = CLASS_BY_FONT_SIZE[font.getAttribute('size')];
      if (!c || !font.textContent || (c === 'fs-md' && !hasSizedAncestor(font))) { unwrap(font); return; }
      const span = document.createElement('span');
      span.className = c;
      font.replaceWith(span);
      span.append(...font.childNodes);
    });
    // Хөтөч заримдаа style="font-size" үүсгэдэг: үлдээхгүй
    editor.querySelectorAll('[style]').forEach((el) => {
      el.style.removeProperty('font-size');
      if (!el.getAttribute('style')) el.removeAttribute('style');
    });
    restoreMarks(sel, marks);
    syncToTextarea();
    updateState();
  }

  function markSelection(sel) {
    if (!sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    const start = document.createComment('s');
    const end = document.createComment('e');
    const endR = range.cloneRange();
    endR.collapse(false);
    endR.insertNode(end);
    const startR = range.cloneRange();
    startR.collapse(true);
    startR.insertNode(start);
    return { start, end };
  }
  function restoreMarks(sel, marks) {
    if (!marks) return;
    const { start, end } = marks;
    if (start.parentNode && end.parentNode) {
      const r = document.createRange();
      r.setStartAfter(start);
      r.setEndBefore(end);
      sel.removeAllRanges();
      sel.addRange(r);
    }
    start.remove();
    end.remove();
    // Тэмдэг устгасны дараа хуваагдсан текстийг нийлүүлэхэд сонголт хадгалагдана (DOM normalize)
    editor.normalize();
  }

  function currentFontSize() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return '';
    const range = sel.getRangeAt(0);
    let n = range.startContainer;
    // Сонголт элементийн хилээр эхэлсэн бол доторх эхний текстийг харна
    if (!range.collapsed && n.nodeType === 1) {
      const tw = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT);
      for (let t = tw.nextNode(); t; t = tw.nextNode()) {
        if (t.data.trim() && range.intersectsNode(t)) { n = t; break; }
      }
    }
    while (n && n !== editor) {
      if (n.nodeType === 1 && fsClassOf(n)) return fsClassOf(n) === 'fs-md' ? '' : fsClassOf(n);
      n = n.parentNode;
    }
    return '';
  }

  function buildFontSizeMenu(b) {
    const box = document.createElement('span');
    box.className = 'rt-menu-wrap';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rt-btn rt-fs-btn';
    btn.title = b.title;
    btn.setAttribute('aria-label', b.title);
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    fsLabel = document.createElement('span');
    fsLabel.textContent = 'Энгийн';
    btn.append('Aa ', fsLabel, ' ▾');
    const menu = document.createElement('div');
    menu.className = 'rt-menu';
    menu.hidden = true;
    menu.setAttribute('role', 'menu');
    let range = null;
    const close = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    FONT_SIZES.forEach((s) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'rt-menu-item';
      item.setAttribute('role', 'menuitem');
      item.dataset.cls = s.cls;
      const sample = document.createElement('span');
      if (s.cls) sample.className = s.cls;
      sample.textContent = s.label;
      item.appendChild(sample);
      item.addEventListener('mousedown', (e) => e.preventDefault());
      item.addEventListener('click', () => { close(); applyFontSize(s.cls, range); });
      menu.appendChild(item);
    });
    btn.addEventListener('mousedown', (e) => { e.preventDefault(); range = saveRange(); });
    btn.addEventListener('click', () => {
      if (!menu.hidden) { close(); return; }
      const cur = currentFontSize();
      menu.querySelectorAll('.rt-menu-item').forEach((it) => it.classList.toggle('active', it.dataset.cls === cur));
      menu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
    });
    document.addEventListener('mousedown', (e) => { if (!box.contains(e.target)) close(); });
    box.addEventListener('keydown', (e) => { if (e.key === 'Escape') { close(); editor.focus(); } });
    box.append(btn, menu);
    buttons.push({ el: btn, b }); // Markdown горимд идэвхгүй болгоход
    return box;
  }

  const buttons = [];
  BUTTONS.forEach((b) => {
    if (b === 'sep') {
      bar.appendChild(Object.assign(document.createElement('span'), { className: 'rt-sep' }));
      return;
    }
    if (b.needsUpload && !uploadUrl) return;
    if (b.menu) { bar.appendChild(buildFontSizeMenu(b)); return; }
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'rt-btn ' + (b.cls || '');
    el.textContent = b.label;
    el.title = b.title;
    el.setAttribute('aria-label', b.title);
    el.addEventListener('mousedown', (e) => e.preventDefault()); // сонголтыг алдахгүй
    el.addEventListener('click', () => (actions[b.cmd] ? actions[b.cmd](b.arg) : exec(b.cmd, b.arg)));
    buttons.push({ el, b });
    bar.appendChild(el);
  });

  if (allowMarkdown) {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'rt-btn rt-mode';
    toggle.textContent = 'Markdown';
    toggle.title = 'Markdown кодоор засах';
    toggle.addEventListener('click', async () => {
      if (!markdownMode) {
        syncToTextarea();
        markdownMode = true;
        editor.hidden = true;
        textarea.hidden = false;
        textarea.classList.add('rt-markdown');
        toggle.textContent = 'Засварлагч';
        buttons.forEach(({ el }) => { el.disabled = true; });
        textarea.focus();
      } else {
        // Markdown → HTML (серверт цэвэрлэж хөрвүүлнэ)
        const r = await fetch('/lessons/preview-md', { method: 'POST', body: new URLSearchParams({ text: textarea.value }), credentials: 'same-origin' });
        const d = await r.json().catch(() => ({ html: '' }));
        editor.innerHTML = d.html || '';
        markdownMode = false;
        editor.hidden = false;
        textarea.hidden = true;
        toggle.textContent = 'Markdown';
        buttons.forEach(({ el }) => { el.disabled = false; });
        syncToTextarea();
      }
    });
    bar.appendChild(toggle);
  }
  bar.appendChild(status);

  function updateState() {
    const block = currentBlock();
    if (fsLabel) {
      const cur = currentFontSize();
      fsLabel.textContent = (FONT_SIZES.find((s) => s.cls === cur) || FONT_SIZES[1]).label;
    }
    buttons.forEach(({ el, b }) => {
      let on = false;
      if (b.cmd === 'block') on = block === b.arg;
      else if (['bold', 'italic', 'insertUnorderedList', 'insertOrderedList'].includes(b.cmd)) {
        try { on = document.queryCommandState(b.cmd); } catch { on = false; }
      }
      el.classList.toggle('active', on);
    });
  }

  editor.addEventListener('input', () => { syncToTextarea(); });
  editor.addEventListener('keyup', updateState);
  editor.addEventListener('mouseup', updateState);
  editor.addEventListener('paste', (e) => {
    const html = e.clipboardData && e.clipboardData.getData('text/html');
    const text = e.clipboardData && e.clipboardData.getData('text/plain');
    e.preventDefault();
    if (currentBlock() === 'PRE') { // код блок руу зөвхөн цэвэр текст
      if (text) { document.execCommand('insertText', false, text.replace(/\r\n?/g, '\n')); syncToTextarea(); }
      return;
    }
    if (html) insertHtml(sanitizePaste(html));
    else if (text) insertHtml(escapeHtml(text).replace(/\r?\n\r?\n/g, '</p><p>').replace(/\r?\n/g, '<br>'));
  });
  // Tab-аар жагсаалтын түвшин
  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && currentBlock() === 'LI') {
      e.preventDefault();
      exec(e.shiftKey ? 'outdent' : 'indent');
    }
  });

  setupImageTools(wrap, editor, syncToTextarea);

  // --- Кодын өнгө: курсор блокоос гарсны дараа өнгөлнө (бичиж байхад курсор үсрэхгүй) ---
  const highlighted = new WeakMap(); // code элемент → өнгөлсөн текст
  function highlightBlocks() {
    if (markdownMode) return;
    const sel = window.getSelection();
    const anchor = sel && sel.rangeCount ? sel.anchorNode : null;
    editor.querySelectorAll('pre').forEach((pre) => {
      if (anchor && pre.contains(anchor)) return;
      let code = pre.querySelector('code');
      const text = codeText(pre);
      if (code && highlighted.get(code) === text) return;
      const lang = code && (code.className.match(/language-([\w+#.-]+)/) || [])[1];
      if (!code || code.parentNode !== pre || pre.childNodes.length > 1) {
        pre.textContent = '';
        code = document.createElement('code');
        pre.appendChild(code);
      }
      code.innerHTML = highlight(text, lang).html;
      code.className = 'hljs' + (lang ? ' language-' + lang : '');
      highlighted.set(code, text);
    });
  }
  let hlTimer = null;
  document.addEventListener('selectionchange', () => {
    clearTimeout(hlTimer);
    hlTimer = setTimeout(highlightBlocks, 250);
  });
  editor.addEventListener('blur', highlightBlocks);
  highlightBlocks();

  // Код блок дотор: Tab = 4 зай, Enter = блок доторх шинэ мөр
  editor.addEventListener('keydown', (e) => {
    if (currentBlock() !== 'PRE') return;
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      document.execCommand('insertText', false, '    ');
    } else if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault();
      document.execCommand('insertLineBreak');
    }
  }, true);

  try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch { /* зарим хөтөч дэмжихгүй */ }
  textarea.form && textarea.form.addEventListener('submit', syncToTextarea);
  syncToTextarea();
}

/**
 * Зураг: дарж сонгоод булангаас чирж хэмжээг өөрчлөх, хэмжээ ба байрлалын товч,
 * зургийг чирж өөр газар зөөх. Хэмжээг засварлагчийн өргөний хувиар хадгална (утсан дээр ч зөв харагдана).
 */
function setupImageTools(wrap, editor, sync) {
  let selected = null;
  const box = document.createElement('div');
  box.className = 'rt-imgbox';
  box.hidden = true;
  ['nw', 'ne', 'sw', 'se'].forEach((pos) => {
    const h = document.createElement('span');
    h.className = 'rt-handle rt-handle-' + pos;
    h.dataset.pos = pos;
    box.appendChild(h);
  });
  const badge = document.createElement('span');
  badge.className = 'rt-size-badge';
  box.appendChild(badge);

  const tools = document.createElement('div');
  tools.className = 'rt-imgtools';
  const TOOLS = [
    { label: 'Жижиг', title: 'Өргөний 25%', width: 25 },
    { label: 'Дунд', title: 'Өргөний 50%', width: 50 },
    { label: 'Том', title: 'Өргөний 75%', width: 75 },
    { label: 'Бүтэн', title: 'Бүтэн өргөн', width: 100 },
    'sep',
    { label: '⇤', title: 'Зүүн талд (текст баруун талаар нь урсана)', align: 'img-left' },
    { label: '↔', title: 'Голлуулах', align: 'img-center' },
    { label: '⇥', title: 'Баруун талд (текст зүүн талаар нь урсана)', align: 'img-right' },
    { label: '▭', title: 'Текстийн мөрөнд', align: '' },
    'sep',
    { label: '🗑', title: 'Зураг устгах', remove: true },
  ];
  const toolButtons = [];
  TOOLS.forEach((t) => {
    if (t === 'sep') { tools.appendChild(Object.assign(document.createElement('span'), { className: 'rt-sep' })); return; }
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'rt-btn';
    b.textContent = t.label;
    b.title = t.title;
    b.setAttribute('aria-label', t.title);
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', () => {
      if (!selected) return;
      if (t.remove) { const img = selected; select(null); removeImage(img); sync(); return; }
      if (t.width) setWidth(selected, t.width);
      if (t.align !== undefined) {
        IMG_CLASSES.forEach((c) => selected.classList.remove(c));
        if (t.align) selected.classList.add(t.align);
      }
      sync();
      place();
    });
    toolButtons.push({ b, t });
    tools.appendChild(b);
  });
  box.appendChild(tools);

  const caret = document.createElement('div');
  caret.className = 'rt-drop-caret';
  caret.hidden = true;
  wrap.classList.add('rt-has-imgtools');
  wrap.appendChild(box);
  wrap.appendChild(caret);

  const contentWidth = () => {
    const cs = getComputedStyle(editor);
    return editor.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  };
  function setWidth(img, pct) {
    img.setAttribute('width', Math.round(Math.min(100, Math.max(10, pct))) + '%');
    img.removeAttribute('height');
  }
  const isEmptyBlock = (el) => el && el !== editor && /^(P|DIV)$/.test(el.tagName) && !el.textContent.trim() && !el.querySelector('img');
  function removeImage(img) {
    const parent = img.parentNode;
    img.remove();
    if (isEmptyBlock(parent)) parent.remove();
  }

  function place() {
    if (!selected || !editor.contains(selected)) { select(null); return; }
    const w = wrap.getBoundingClientRect();
    const r = selected.getBoundingClientRect();
    Object.assign(box.style, { left: r.left - w.left + 'px', top: r.top - w.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    box.classList.toggle('rt-imgbox-low', r.top - w.top < 110); // дээр зай бага бол товчнуудыг доор гаргана
    // Баруун талд байрласан зурагт товчнууд засварлагчаас гарахгүй байхаар зүүн тийш шилжинэ
    tools.style.left = Math.min(0, w.width - (r.left - w.left) - tools.offsetWidth - 6) + 'px';
    const width = selected.getAttribute('width');
    badge.textContent = width && width.endsWith('%') ? width : Math.round((r.width / contentWidth()) * 100) + '%';
    toolButtons.forEach(({ b, t }) => {
      let on = false;
      if (t.width) on = width === t.width + '%';
      else if (t.align) on = selected.classList.contains(t.align);
      else if (t.align === '') on = !IMG_CLASSES.some((c) => selected.classList.contains(c));
      b.classList.toggle('active', on);
    });
  }
  function select(img) {
    if (selected) selected.classList.remove('rt-img-selected');
    selected = img;
    box.hidden = !img;
    if (img) { img.classList.add('rt-img-selected'); place(); }
  }

  // Хөтчийн өөрийн зураг чирэх/томруулах боломжийг унтраана
  editor.addEventListener('dragstart', (e) => { if (e.target.tagName === 'IMG') e.preventDefault(); });
  try { document.execCommand('enableObjectResizing', false, 'false'); } catch { /* зарим хөтөч дэмжихгүй */ }

  // click биш pointerdown: зураг чирэхэд pointer capture хийдэг тул click засварлагч дээр ирдэг
  editor.addEventListener('pointerdown', (e) => { if (e.target.tagName !== 'IMG' && selected) select(null); });
  document.addEventListener('mousedown', (e) => { if (selected && !wrap.contains(e.target)) select(null); });
  editor.addEventListener('keydown', (e) => {
    if (!selected) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      const img = selected;
      select(null);
      removeImage(img);
      sync();
    } else select(null);
  });
  editor.addEventListener('input', () => { if (selected) place(); });
  window.addEventListener('resize', () => { if (selected) place(); });
  editor.addEventListener('load', () => { if (selected) place(); }, true); // зураг ачаалагдаж хэмжээ нь өөрчлөгдөхөд

  // --- Булангаас чирж хэмжээ өөрчлөх ---
  box.addEventListener('pointerdown', (e) => {
    const handle = e.target;
    const pos = handle.dataset && handle.dataset.pos;
    if (!pos || !selected) return;
    e.preventDefault();
    const img = selected;
    const startX = e.clientX;
    const startW = img.getBoundingClientRect().width;
    const full = contentWidth();
    const sign = pos.includes('w') ? -1 : 1;
    handle.setPointerCapture(e.pointerId);
    wrap.classList.add('rt-resizing');
    const move = (ev) => {
      setWidth(img, ((startW + sign * (ev.clientX - startX)) / full) * 100);
      place();
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      wrap.classList.remove('rt-resizing');
      sync();
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  });

  // --- Зургийг чирж зөөх ---
  function rangeFromPoint(x, y) {
    if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y);
    if (document.caretPositionFromPoint) {
      const p = document.caretPositionFromPoint(x, y);
      if (!p) return null;
      const r = document.createRange();
      r.setStart(p.offsetNode, p.offset);
      r.collapse(true);
      return r;
    }
    return null;
  }
  editor.addEventListener('pointerdown', (e) => {
    if (e.target.tagName !== 'IMG' || e.button !== 0) return;
    const img = e.target;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    let dragging = false;
    let target = null;
    editor.setPointerCapture(e.pointerId);
    const move = (ev) => {
      if (!dragging) {
        if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) < 6) return;
        dragging = true;
        select(null);
        img.classList.add('rt-img-dragging');
        wrap.classList.add('rt-moving');
      }
      const r = rangeFromPoint(ev.clientX, ev.clientY);
      target = r && editor.contains(r.startContainer) && r.startContainer !== img ? r : null;
      if (!target) { caret.hidden = true; return; }
      let rect = target.getBoundingClientRect();
      if (!rect.height) {
        // Хоосон мөр: тухайн элементийн байрлалыг авна
        const el = target.startContainer.nodeType === 1 ? target.startContainer : target.startContainer.parentNode;
        rect = el.getBoundingClientRect();
      }
      const w = wrap.getBoundingClientRect();
      Object.assign(caret.style, { left: rect.left - w.left + 'px', top: rect.top - w.top + 'px', height: Math.max(rect.height, 18) + 'px' });
      caret.hidden = false;
    };
    const up = () => {
      editor.removeEventListener('pointermove', move);
      editor.removeEventListener('pointerup', up);
      editor.removeEventListener('pointercancel', up);
      caret.hidden = true;
      wrap.classList.remove('rt-moving');
      img.classList.remove('rt-img-dragging');
      if (dragging && target) {
        const oldParent = img.parentNode;
        let ref = target.startContainer === editor ? editor.childNodes[target.startOffset] || null : null;
        if (ref === img) ref = img.nextSibling;
        img.remove();
        if (target.startContainer === editor) {
          // Мөрүүдийн хооронд буувал шинэ мөр үүсгэнэ
          const p = document.createElement('p');
          p.appendChild(img);
          editor.insertBefore(p, ref);
        } else {
          target.insertNode(img);
        }
        if (oldParent !== img.parentNode && isEmptyBlock(oldParent)) oldParent.remove();
        sync();
      }
      select(img);
    };
    editor.addEventListener('pointermove', move);
    editor.addEventListener('pointerup', up);
    editor.addEventListener('pointercancel', up);
  });
}

document.querySelectorAll('textarea[data-rich]').forEach(enhance);
