// Кодын өнгө (syntax highlight). Сервер (markdown.js) ба засварлагч (client/rich-editor.js) хоёулаа ашиглана.
// Хичээлд түгээмэл хэлнүүдийг л бүртгэнэ: багц жижиг, автомат таних нь илүү оновчтой.
const hljs = require('highlight.js/lib/core');

const LANGS = {
  python: require('highlight.js/lib/languages/python'),
  javascript: require('highlight.js/lib/languages/javascript'),
  typescript: require('highlight.js/lib/languages/typescript'),
  java: require('highlight.js/lib/languages/java'),
  c: require('highlight.js/lib/languages/c'),
  cpp: require('highlight.js/lib/languages/cpp'),
  csharp: require('highlight.js/lib/languages/csharp'),
  php: require('highlight.js/lib/languages/php'),
  xml: require('highlight.js/lib/languages/xml'), // html
  css: require('highlight.js/lib/languages/css'),
  sql: require('highlight.js/lib/languages/sql'),
  bash: require('highlight.js/lib/languages/bash'),
  json: require('highlight.js/lib/languages/json'),
  pascal: require('highlight.js/lib/languages/delphi'),
};
Object.entries(LANGS).forEach(([name, lang]) => hljs.registerLanguage(name, lang));
hljs.registerAliases(['pas'], { languageName: 'pascal' });
const AUTO = Object.keys(LANGS);

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Кодыг өнгөтэй HTML болгоно (hljs гаралт нь текстийг escape хийдэг тул аюулгүй).
 * lang өгөөгүй бол хэлийг автоматаар танина; итгэл бага бол өнгөгүй үлдээнэ.
 */
function highlight(code, lang) {
  const text = String(code);
  if (lang && hljs.getLanguage(lang)) {
    return { html: hljs.highlight(text, { language: lang, ignoreIllegals: true }).value, language: lang };
  }
  if (!text.trim()) return { html: escapeHtml(text), language: null };
  const r = hljs.highlightAuto(text, AUTO);
  if (!r.language || r.relevance < 3) return { html: escapeHtml(text), language: null };
  return { html: r.value, language: r.language };
}

module.exports = { highlight };
