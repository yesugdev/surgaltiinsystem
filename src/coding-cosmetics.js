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
const priceOf = (item) => PRICES[item.level] ?? 0;
const itemKey = (kind, key) => (kind === 'color' ? 'c:' : 'a:') + key;
const owns = (user, kind, item) => !!item && (priceOf(item) === 0 || (user.codingOwned || []).includes(itemKey(kind, item.key)));

/** Хэрэглэгчийн сонгосон (эзэмшдэг бол) аватар, өнгө */
function cosmeticsFor(user) {
  const a = findAvatar(user.codingAvatar);
  const c = findColor(user.codingColor);
  const okA = owns(user, 'avatar', a);
  return {
    avatar: okA ? a.icon : null,
    img: okA ? avatarImg(a.key) : null,
    anim: okA ? a.anim : null,
    color: owns(user, 'color', c) && c.key !== 'tier' ? c.key : null,
  };
}

/** Хуучин (бодлогын оноогоор нээгддэг байсан) системд нээгдсэн бүх зүйлийн түлхүүр — шилжүүлэхэд */
function ownedUpToLevel(level) {
  return [
    ...AVATARS.filter((a) => a.level > 1 && a.level <= level).map((a) => itemKey('avatar', a.key)),
    ...COLORS.filter((c) => c.level > 1 && c.level <= level).map((c) => itemKey('color', c.key)),
  ];
}

module.exports = { AVATARS, COLORS, avatarImg, tierName, findAvatar, findColor, PRICES, priceOf, itemKey, owns, cosmeticsFor, ownedUpToLevel };
