/**
 * Word шиг засварлагч: багш Markdown мэдэх шаардлагагүй.
 * <textarea data-rich data-html-source="#id" data-upload="/lessons/ID/attachments" data-markdown-toggle="1">
 *   - Анхны агуулгыг серверт цэвэрлэсэн HTML-ээс (data-html-source) ачаална
 *   - Хадгалахад Markdown болгож textarea-д бичнэ (одоогийн өгөгдөл, AI импорттой нийцтэй)
 * Эх файл: client/rich-editor.js → `npm run build:client` → public/js/rich-editor.js
 */
import TurndownService from 'turndown/lib/turndown.browser.es.js';
import { gfm } from 'turndown-plugin-gfm/lib/turndown-plugin-gfm.browser.es.js';

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

const BUTTONS = [
  { cmd: 'block', arg: 'P', label: 'Текст', title: 'Энгийн текст' },
  { cmd: 'block', arg: 'H2', label: 'Гарчиг', title: 'Том гарчиг' },
  { cmd: 'block', arg: 'H3', label: 'Дэд гарчиг', title: 'Дэд гарчиг' },
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
    const html = editor.innerHTML.replace(/<p><br><\/p>/g, '').trim();
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

  const buttons = [];
  BUTTONS.forEach((b) => {
    if (b === 'sep') {
      bar.appendChild(Object.assign(document.createElement('span'), { className: 'rt-sep' }));
      return;
    }
    if (b.needsUpload && !uploadUrl) return;
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

  try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch { /* зарим хөтөч дэмжихгүй */ }
  textarea.form && textarea.form.addEventListener('submit', syncToTextarea);
  syncToTextarea();
}

document.querySelectorAll('textarea[data-rich]').forEach(enhance);
