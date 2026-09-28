const crypto = require('node:crypto');
const mongoose = require('mongoose');

const pad = (n) => String(n).padStart(2, '0');

/** Огноог "YYYY-MM-DD HH:mm" хэлбэрээр харуулна */
function fmtDate(d) {
  if (!d) return '—';
  d = new Date(d);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** <input type="datetime-local"> талбарт тохирох утга */
function toInputDate(d) {
  if (!d) return '';
  d = new Date(d);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local утгыг серверийн орон нутгийн цагаар Date болгоно */
function parseInputDate(s) {
  if (!s) return null;
  const d = new Date(String(s));
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtScore(n) {
  if (n == null) return '—';
  return String(Math.round(n * 100) / 100);
}

function clean(v, max = 1000) {
  if (Array.isArray(v)) v = v[0];
  return String(v ?? '').trim().slice(0, max);
}

function normalizeText(s) {
  return String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

const PASSWORD_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';
function genPassword(len = 6) {
  let out = '';
  for (let i = 0; i < len; i++) out += PASSWORD_CHARS[crypto.randomInt(PASSWORD_CHARS.length)];
  return out;
}

const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;

function isId(v) {
  return typeof v === 'string' && mongoose.isValidObjectId(v) && /^[a-f0-9]{24}$/i.test(v);
}

function toArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ROLE_LABELS = { admin: 'Админ', teacher: 'Багш', student: 'Сурагч' };
const SHOW_ANSWERS_LABELS = {
  never: 'Харуулахгүй',
  after_close: 'Шалгалт хаагдсаны дараа',
  after_submit: 'Илгээсний дараа шууд',
};
const QUESTION_TYPE_LABELS ={ single: 'Нэг сонголттой', multiple: 'Олон сонголттой', text: 'Нээлттэй хариулт' };

module.exports = {
  fmtDate,
  toInputDate,
  parseInputDate,
  fmtScore,
  clean,
  normalizeText,
  genPassword,
  USERNAME_RE,
  isId,
  toArray,
  escapeRegex,
  shuffle,
  ROLE_LABELS,
  SHOW_ANSWERS_LABELS,
  QUESTION_TYPE_LABELS,
};
