// Өрсөлдөөнт Coding: хүндийн зэрэг, оноо, сурагчийн зэрэглэл (rank)
// Бодлогыг БҮТЭН (100/100) бодвол хүндийн зэргийн оноо: хялбар 25, дунд 50, хүнд 100 → rank оноо.
// Самбарын «Нийт оноо» нь мөн эдгээр оноогоор, хэсэгчилсэн нь хувиар (хүнд бодлогын 60% → 60).
const DIFFICULTIES = {
  easy: { key: 'easy', label: 'Хялбар', icon: '🟢', points: 25 },
  medium: { key: 'medium', label: 'Дунд', icon: '🟡', points: 50 },
  hard: { key: 'hard', label: 'Хүнд', icon: '🔴', points: 100 },
};
const DEFAULT_DIFFICULTY = 'easy';
// Хамгийн бага оноо (хялбар) — «дахиад N бодлого» тооцоонд
const POINTS_PER_SOLVE = DIFFICULTIES.easy.points;

/** Бодлогын хүндийн зэрэг (тодорхойгүй бол хялбар) */
const difficultyOf = (d) => (Object.hasOwn(DIFFICULTIES, d) ? DIFFICULTIES[d] : DIFFICULTIES[DEFAULT_DIFFICULTY]);

/** Бүтэн бодвол авах оноо */
const solvePoints = (d) => difficultyOf(d).points;

// Босго нь дээд зэрэглэл рүү огцом өсдөг (хялбар бодлогоор тоолбол: 3, 10, 40, 100, 200, 350, 500).
// Хүнд бодлого 4 дахин их оноо өгөх тул дээд зэрэглэлд хүнд бодлого бодох нь хамгийн хурдан зам.
const TIERS = [
  { key: 'newbie', name: 'Шинэ тоглогч', icon: '🌱', min: 0 },
  { key: 'beginner', name: 'Анхлан суралцагч', icon: '🐣', min: 75 },
  { key: 'explorer', name: 'Эрэлч', icon: '🔍', min: 250 },
  { key: 'coder', name: 'Програмист', icon: '💻', min: 1000 },
  { key: 'expert', name: 'Мэргэжилтэн', icon: '🧠', min: 2500 },
  { key: 'master', name: 'Мастер', icon: '👑', min: 5000 },
  { key: 'grandmaster', name: 'Их мастер', icon: '🔥', min: 8750 },
  { key: 'legend', name: 'Домог', icon: '🐉', min: 12500 },
];

/** Шүүгчийн 0–100 хувийг тухайн бодлогын оноо руу (хялбарын 60% → 15; аравтын нэг орон) */
const toPoints = (score100, difficulty) => Math.round((Number(score100) || 0) * solvePoints(difficulty) / 10) / 10;

/** Rank оноонд тохирох зэрэглэл + дараагийн зэрэглэл хүртэлх явц */
function tierFor(points) {
  let i = 0;
  while (i + 1 < TIERS.length && points >= TIERS[i + 1].min) i++;
  const tier = TIERS[i];
  const next = TIERS[i + 1] || null;
  const toNext = next ? next.min - points : 0;
  const progress = next ? Math.round(((points - tier.min) / (next.min - tier.min)) * 100) : 100;
  return {
    ...tier, level: i + 1, points, next, toNext, progress,
    // Дараагийн зэрэглэл хүртэл: хялбар бодлогоор хэд, хүнд бодлогоор хэд
    solvesToNext: Math.ceil(toNext / DIFFICULTIES.easy.points),
    hardToNext: Math.ceil(toNext / DIFFICULTIES.hard.points),
  };
}

module.exports = { DIFFICULTIES, DEFAULT_DIFFICULTY, difficultyOf, solvePoints, TIERS, tierFor, toPoints, POINTS_PER_SOLVE };
