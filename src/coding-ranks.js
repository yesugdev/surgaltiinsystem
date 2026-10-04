// Өрсөлдөөнт Coding: сурагчийн зэрэглэл (rank) — бүх бодлогын хамгийн сайн онооны нийлбэрээр
// Бодлого бүр 100 оноо тул 1 бүтэн бодлого = 100.
const TIERS = [
  { key: 'newbie', name: 'Шинэ тоглогч', icon: '🌱', min: 0 },
  { key: 'beginner', name: 'Анхлан суралцагч', icon: '🐣', min: 100 },
  { key: 'explorer', name: 'Эрэлч', icon: '🔍', min: 300 },
  { key: 'coder', name: 'Програмист', icon: '💻', min: 600 },
  { key: 'expert', name: 'Мэргэжилтэн', icon: '🧠', min: 1000 },
  { key: 'master', name: 'Мастер', icon: '👑', min: 1600 },
  { key: 'grandmaster', name: 'Их мастер', icon: '🔥', min: 2500 },
  { key: 'legend', name: 'Домог', icon: '🐉', min: 4000 },
];

/** Оноонд тохирох зэрэглэл + дараагийн зэрэглэл хүртэлх явц */
function tierFor(points) {
  let i = 0;
  while (i + 1 < TIERS.length && points >= TIERS[i + 1].min) i++;
  const tier = TIERS[i];
  const next = TIERS[i + 1] || null;
  const progress = next ? Math.round(((points - tier.min) / (next.min - tier.min)) * 100) : 100;
  return { ...tier, level: i + 1, next, toNext: next ? next.min - points : 0, progress };
}

module.exports = { TIERS, tierFor };
