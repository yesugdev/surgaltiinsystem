// Өрсөлдөөнт Coding: зэрэглэл ахих тусам нээгддэг аватар ба өнгө
// level = TIERS-ийн дугаар (1 Шинэ тоглогч … 8 Домог)
const { TIERS } = require('./coding-ranks');

// anim = CSS хөдөлгөөн (public/style.css «Хөдөлгөөнт аватар»); дээд зэрэглэлийнх илүү гоё
const AVATARS = [
  { key: 'cat', icon: '🐱', level: 1, anim: 'wiggle' },
  { key: 'dog', icon: '🐶', level: 1, anim: 'bounce' },
  { key: 'frog', icon: '🐸', level: 1, anim: 'hop' },
  { key: 'fox', icon: '🦊', level: 2, anim: 'tilt' },
  { key: 'panda', icon: '🐼', level: 2, anim: 'sway' },
  { key: 'owl', icon: '🦉', level: 3, anim: 'blink' },
  { key: 'robot', icon: '🤖', level: 3, anim: 'bob' },
  { key: 'alien', icon: '👽', level: 4, anim: 'float' },
  { key: 'ninja', icon: '🥷', level: 4, anim: 'dash' },
  { key: 'wizard', icon: '🧙', level: 5, anim: 'sparkle' },
  { key: 'rocket', icon: '🚀', level: 5, anim: 'launch' },
  { key: 'unicorn', icon: '🦄', level: 6, anim: 'gallop' },
  { key: 'crown', icon: '👑', level: 6, anim: 'shine' },
  { key: 'phoenix', icon: '🔥', level: 7, anim: 'flicker' },
  { key: 'dragon', icon: '🐉', level: 8, anim: 'breathe' },
];

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

/** Хэрэглэгчийн сонгосон (нээгдсэн бол) аватар, өнгө — зэрэглэл буурвал анхдагч руу */
function cosmeticsFor(user, tier) {
  const a = findAvatar(user.codingAvatar);
  const c = findColor(user.codingColor);
  const ok = a && a.level <= tier.level;
  return {
    avatar: ok ? a.icon : null,
    anim: ok ? a.anim : null,
    color: c && c.level <= tier.level && c.key !== 'tier' ? c.key : null,
  };
}

/** fromLevel-ээс toLevel хүртэл шинээр нээгдсэн зүйлс */
function unlockedBetween(fromLevel, toLevel) {
  const inRange = (x) => x.level > fromLevel && x.level <= toLevel;
  return { avatars: AVATARS.filter(inRange), colors: COLORS.filter(inRange) };
}

module.exports = { AVATARS, COLORS, tierName, findAvatar, findColor, cosmeticsFor, unlockedBetween };
