// Өрсөлдөөнт Coding: зэрэглэл ахих тусам нээгддэг аватар ба өнгө
// level = TIERS-ийн дугаар (1 Шинэ тоглогч … 8 Домог)
const { TIERS } = require('./coding-ranks');

const AVATARS = [
  { key: 'cat', icon: '🐱', level: 1 },
  { key: 'dog', icon: '🐶', level: 1 },
  { key: 'frog', icon: '🐸', level: 1 },
  { key: 'fox', icon: '🦊', level: 2 },
  { key: 'panda', icon: '🐼', level: 2 },
  { key: 'owl', icon: '🦉', level: 3 },
  { key: 'robot', icon: '🤖', level: 3 },
  { key: 'alien', icon: '👽', level: 4 },
  { key: 'ninja', icon: '🥷', level: 4 },
  { key: 'wizard', icon: '🧙', level: 5 },
  { key: 'rocket', icon: '🚀', level: 5 },
  { key: 'unicorn', icon: '🦄', level: 6 },
  { key: 'crown', icon: '👑', level: 6 },
  { key: 'phoenix', icon: '🔥', level: 7 },
  { key: 'dragon', icon: '🐉', level: 8 },
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
  return {
    avatar: a && a.level <= tier.level ? a.icon : null,
    color: c && c.level <= tier.level && c.key !== 'tier' ? c.key : null,
  };
}

/** fromLevel-ээс toLevel хүртэл шинээр нээгдсэн зүйлс */
function unlockedBetween(fromLevel, toLevel) {
  const inRange = (x) => x.level > fromLevel && x.level <= toLevel;
  return { avatars: AVATARS.filter(inRange), colors: COLORS.filter(inRange) };
}

module.exports = { AVATARS, COLORS, tierName, findAvatar, findColor, cosmeticsFor, unlockedBetween };
