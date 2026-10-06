// Өрсөлдөөнт Coding: сурагчийн зэрэглэл (rank)
// Бодлогыг БҮТЭН (100/100) бодох бүрт 25 rank оноо. Хэсэгчилсэн оноо rank-д тооцохгүй.
const POINTS_PER_SOLVE = 25;

const TIERS = [
  { key: 'newbie', name: 'Шинэ тоглогч', icon: '🌱', min: 0 },
  { key: 'beginner', name: 'Анхлан суралцагч', icon: '🐣', min: 25 }, // 1 бодлого
  { key: 'explorer', name: 'Эрэлч', icon: '🔍', min: 75 }, // 3
  { key: 'coder', name: 'Програмист', icon: '💻', min: 150 }, // 6
  { key: 'expert', name: 'Мэргэжилтэн', icon: '🧠', min: 250 }, // 10
  { key: 'master', name: 'Мастер', icon: '👑', min: 400 }, // 16
  { key: 'grandmaster', name: 'Их мастер', icon: '🔥', min: 625 }, // 25
  { key: 'legend', name: 'Домог', icon: '🐉', min: 1000 }, // 40
];

/** Бүтэн бодсон бодлогын тооноос rank оноо */
const rankPoints = (solved) => solved * POINTS_PER_SOLVE;

/** Шүүгчийн 0–100 хувийг 25 онооны хэмжүүр рүү (60% → 15; аравтын нэг орон) */
const toPoints = (score100) => Math.round((Number(score100) || 0) * POINTS_PER_SOLVE / 10) / 10;

/** Rank оноонд тохирох зэрэглэл + дараагийн зэрэглэл хүртэлх явц */
function tierFor(points) {
  let i = 0;
  while (i + 1 < TIERS.length && points >= TIERS[i + 1].min) i++;
  const tier = TIERS[i];
  const next = TIERS[i + 1] || null;
  const toNext = next ? next.min - points : 0;
  const progress = next ? Math.round(((points - tier.min) / (next.min - tier.min)) * 100) : 100;
  return { ...tier, level: i + 1, points, next, toNext, solvesToNext: Math.ceil(toNext / POINTS_PER_SOLVE), progress };
}

module.exports = { TIERS, tierFor, rankPoints, toPoints, POINTS_PER_SOLVE };
