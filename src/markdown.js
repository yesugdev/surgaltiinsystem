// Онол, даалгаврын заавар (markdown) → аюулгүй HTML
const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');

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
function render(md) {
  const html = sanitizeHtml(marked.parse(String(md || '')), SANITIZE);
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

module.exports = { render, toc, sanitizeDocHtml };
