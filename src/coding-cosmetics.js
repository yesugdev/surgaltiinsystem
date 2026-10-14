// Өрсөлдөөнт Coding: дэлгүүрээс зоосоор худалдаж авдаг аватар ба өнгө
// level = үнийн шат (1 үнэгүй … 8 хамгийн үнэтэй); хуучин системд зэрэглэлийн дугаар байсан
const { TIERS } = require('./coding-ranks');

// Хөдөлгөөнт зураг: Google Noto Animated Emoji (CC BY 4.0) → public/img/avatars/<key>.webp (160px).
// icon = зураг ачаалагдаагүй / «хөдөлгөөн багасгах» үед харуулах emoji, anim = түүний CSS хөдөлгөөн.
// Үнэтэй нь илүү гайхалтай.
const AVATARS = [
  { key: 'hatch', icon: '🐣', level: 1, anim: 'hop' },
  { key: 'cat', icon: '🐱', level: 1, anim: 'wiggle' },
  { key: 'frog', icon: '🐸', level: 1, anim: 'hop' },
  { key: 'fox', icon: '🦊', level: 2, anim: 'tilt' },
  { key: 'penguin', icon: '🐧', level: 2, anim: 'sway' },
  { key: 'monkey', icon: '🙈', level: 2, anim: 'wiggle' },
  { key: 'owl', icon: '🦉', level: 3, anim: 'blink' },
  { key: 'octopus', icon: '🐙', level: 3, anim: 'float' },
  { key: 'butterfly', icon: '🦋', level: 3, anim: 'float' },
  { key: 'robot', icon: '🤖', level: 4, anim: 'bob' },
  { key: 'invader', icon: '👾', level: 4, anim: 'bob' },
  { key: 'ghost', icon: '👻', level: 4, anim: 'float' },
  { key: 'rocket', icon: '🚀', level: 5, anim: 'launch' },
  { key: 'shark', icon: '🦈', level: 5, anim: 'sway' },
  { key: 'mindblown', icon: '🤯', level: 5, anim: 'shine' },
  { key: 'unicorn', icon: '🦄', level: 6, anim: 'gallop' },
  { key: 'lion', icon: '🦁', level: 6, anim: 'shine' },
  { key: 'crown', icon: '👑', level: 6, anim: 'shine' },
  { key: 'trex', icon: '🦖', level: 7, anim: 'gallop' },
  { key: 'comet', icon: '☄️', level: 7, anim: 'launch' },
  { key: 'phoenix', icon: '🐦‍🔥', level: 7, anim: 'flicker' },
  { key: 'dragon', icon: '🐉', level: 8, anim: 'breathe' },
  { key: 'volcano', icon: '🌋', level: 8, anim: 'flicker' },
  { key: 'planet', icon: '🪐', level: 8, anim: 'float' },
];
const avatarImg = (key) => `/img/avatars/${key}.webp`;

// Аватарын дэвсгэр, нэрийн өнгө. 'tier' = зэрэглэлийн өөрийн өнгө (анхдагч)
const COLORS = [
  { key: 'tier', name: 'Зэрэглэлийн өнгө', level: 1 },
  { key: 'ocean', name: 'Далай', level: 2 },
  { key: 'forest', name: 'Ой', level: 2 },
  { key: 'sunset', name: 'Нар жаргах', level: 3 },
  { key: 'grape', name: 'Усан үзэм', level: 4 },
  { key: 'rose', name: 'Сарнай', level: 5 },
  { key: 'gold', name: 'Алт', level: 6 },
  { key: 'rainbow', name: 'Солонго', level: 7 },
  { key: 'galaxy', name: 'Галактик', level: 8 },
];

const tierName = (level) => TIERS[level - 1]?.name || '';
const findAvatar = (key) => AVATARS.find((a) => a.key === key) || null;
const findColor = (key) => COLORS.find((c) => c.key === key) || null;

// ---------------- 🛒 Дэлгүүр ----------------
// Аватар, өнгийг 🪙 зоосоор (бодлого бодож авсан оноо) худалдаж авна. 1-р түвшний нь үнэгүй.
// Худалдаж авсныг User.codingOwned-д 'a:<key>' / 'c:<key>' хэлбэрээр хадгална.
const PRICES = { 1: 0, 2: 100, 3: 250, 4: 500, 5: 800, 6: 1200, 7: 1800, 8: 2500 };

// 🖼 Аватарын хүрээ (CSS). season = худалдаж авах боломжтой сарууд (авсан бол үүрд үлдэнэ)
const FRAMES = [
  { key: 'neon-blue', name: 'Неон цэнхэр', icon: '💠', price: 150 },
  { key: 'neon-pink', name: 'Неон ягаан', icon: '💗', price: 250 },
  { key: 'circuit', name: 'Хэлхээ', icon: '🔌', price: 350 },
  { key: 'binary', name: 'Хоёртын код', icon: '🔢', price: 450 },
  { key: 'algorithm', name: 'Алгоритм', icon: '🧬', price: 600 },
  { key: 'fire', name: 'Гал', icon: '🔥', price: 750 },
  { key: 'gold', name: 'Алтан', icon: '🏆', price: 1000 },
  { key: 'winter', name: 'Өвөл', icon: '❄️', price: 1000, season: [12, 1, 2], seasonName: 'Өвлийн' },
  { key: 'spring', name: 'Хавар', icon: '🌸', price: 1000, season: [3, 4, 5], seasonName: 'Хаврын' },
  { key: 'summer', name: 'Зун', icon: '☀️', price: 1000, season: [6, 7, 8], seasonName: 'Зуны' },
  { key: 'autumn', name: 'Намар', icon: '🍂', price: 1000, season: [9, 10, 11], seasonName: 'Намрын' },
];

// 🏷 Профайл дээр нэрийн хажууд харагдах цол
const TITLES = [
  { key: 'hello', name: 'Hello World', icon: '👋', price: 100 },
  { key: 'bug-hunter', name: 'Bug Hunter', icon: '🐛', price: 250 },
  { key: 'loop-master', name: 'Loop Master', icon: '🔁', price: 400 },
  { key: 'code-ninja', name: 'Code Ninja', icon: '🥷', price: 600 },
  { key: 'debug-wizard', name: 'Debug Wizard', icon: '🧙', price: 800 },
  { key: 'speed-coder', name: 'Speed Coder', icon: '⚡', price: 1000 },
  { key: 'algo-master', name: 'Algorithm Master', icon: '🧠', price: 1200 },
  { key: 'legend', name: 'Legendary Coder', icon: '🐉', price: 1500 },
];
const findFrame = (key) => FRAMES.find((x) => x.key === key) || null;
const findTitle = (key) => TITLES.find((x) => x.key === key) || null;

const KINDS = {
  avatar: { prefix: 'a:', find: findAvatar, list: AVATARS, field: 'codingAvatar' },
  color: { prefix: 'c:', find: findColor, list: COLORS, field: 'codingColor' },
  frame: { prefix: 'f:', find: findFrame, list: FRAMES, field: 'codingFrame' },
  title: { prefix: 't:', find: findTitle, list: TITLES, field: 'codingTitle' },
};
const priceOf = (item) => (item.price != null ? item.price : PRICES[item.level] ?? 0);
const itemKey = (kind, key) => (KINDS[kind] || KINDS.avatar).prefix + key;
const owns = (user, kind, item) => !!item && (priceOf(item) === 0 || (user.codingOwned || []).includes(itemKey(kind, item.key)));
/** Улирлын хүрээг одоо худалдаж авч болох уу */
const inSeason = (item, now = new Date()) => !item.season || item.season.includes(now.getMonth() + 1);

/** Хэрэглэгчийн сонгосон (эзэмшдэг бол) аватар, өнгө, хүрээ, цол */
function cosmeticsFor(user) {
  const a = findAvatar(user.codingAvatar);
  const c = findColor(user.codingColor);
  const f = findFrame(user.codingFrame);
  const t = findTitle(user.codingTitle);
  const okA = owns(user, 'avatar', a);
  return {
    avatar: okA ? a.icon : null,
    img: okA ? avatarImg(a.key) : null,
    anim: okA ? a.anim : null,
    color: owns(user, 'color', c) && c.key !== 'tier' ? c.key : null,
    frame: owns(user, 'frame', f) ? f.key : null,
    title: owns(user, 'title', t) ? { name: t.name, icon: t.icon } : null,
  };
}

/** Хуучин (бодлогын оноогоор нээгддэг байсан) системд нээгдсэн бүх зүйлийн түлхүүр — шилжүүлэхэд */
function ownedUpToLevel(level) {
  return [
    ...AVATARS.filter((a) => a.level > 1 && a.level <= level).map((a) => itemKey('avatar', a.key)),
    ...COLORS.filter((c) => c.level > 1 && c.level <= level).map((c) => itemKey('color', c.key)),
  ];
}

module.exports = {
  AVATARS, COLORS, FRAMES, TITLES, KINDS, avatarImg, tierName, findAvatar, findColor, findFrame, findTitle,
  PRICES, priceOf, itemKey, owns, inSeason, cosmeticsFor, ownedUpToLevel,
};
