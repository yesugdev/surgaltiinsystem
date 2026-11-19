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

/** Сурагчийн харьяалагдах ангиудын id (string) */
function classIdsOf(u) {
  return ((u && u.classIds) || []).map(String);
}
/** Сурагч өгөгдсөн ангиудын аль нэгэнд байгаа эсэх */
function inAnyClass(u, ids) {
  const mine = new Set(classIdsOf(u));
  return (ids || []).some((id) => mine.has(String(id)));
}

/** Ангиудын жагсаалтыг нэг "анги" мэт харуулах: { name: '10а, Олимпиад бүлэг', ids } эсвэл null */
function classesLabel(classes) {
  if (!classes || !classes.length) return null;
  return { name: classes.map((c) => c.name).join(', '), ids: classes.map((c) => c._id), list: classes };
}

/** Сурагчийн ангиудын нэрийг "10а, Олимпиад" гэж нэгтгэнэ (classMap: id → нэр) */
function classNamesOf(u, classMap) {
  return ((u && u.classIds) || []).map((id) => classMap.get(String(id))).filter(Boolean).join(', ');
}

/** Сурагчийн ангиудаас scope (хичээл/шалгалтын ангиуд)-д хамаарахыг нь сонгоно; нэг ч байхгүй бол бүгд */
function relevantClassIds(u, scope) {
  const mine = classIdsOf(u);
  const set = new Set((scope || []).map(String));
  const hit = mine.filter((id) => set.has(id));
  return hit.length ? hit : mine;
}

/** Сурагчийн ангиудыг нэг объект болгож ачаална ({ name: '10а, Олимпиад' } эсвэл null) */
async function loadClassesLabel(u) {
  const ids = classIdsOf(u);
  if (!ids.length) return null;
  const { Class } = require('./models');
  return classesLabel(await Class.find({ _id: { $in: ids } }).collation({ locale: 'mn' }).sort({ name: 1 }).lean());
}

module.exports = {
  classIdsOf,
  relevantClassIds,
  loadClassesLabel,
  classNamesOf,
  classesLabel,
  inAnyClass,
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
