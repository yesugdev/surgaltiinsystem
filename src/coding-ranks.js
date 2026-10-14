// Өрсөлдөөнт Coding: хүндийн зэрэг, оноо, зоос, сурагчийн зэрэглэл (rank)
//  - Бодлогыг БҮТЭН (100/100) бодвол хүндийн зэргийн оноо = 🪙 зоос (хялбар 25, дунд 50, хүнд 100) → дэлгүүр.
//  - 🏅 Ranking оноо ЗӨВХӨН админы нээсэн contest-оор нэмэгдэнэ (гэрээсээ бодсон бодлого rank ахиулахгүй).
const DIFFICULTIES = {
  easy: { key: 'easy', label: 'Хялбар', icon: '🟢', points: 25 },
  medium: { key: 'medium', label: 'Дунд', icon: '🟡', points: 50 },
  hard: { key: 'hard', label: 'Хүнд', icon: '🔴', points: 100 },
};
const DEFAULT_DIFFICULTY = 'easy';
const POINTS_PER_SOLVE = DIFFICULTIES.easy.points;

/** Бодлогын хүндийн зэрэг (тодорхойгүй бол хялбар) */
const difficultyOf = (d) => (Object.hasOwn(DIFFICULTIES, d) ? DIFFICULTIES[d] : DIFFICULTIES[DEFAULT_DIFFICULTY]);

/** Бүтэн бодвол авах оноо (зоос) */
const solvePoints = (d) => difficultyOf(d).points;

/** Contest-ийн бодлогын бүтэн оноо: тусгай оноо (points) эсвэл хүндийн зэргээр */
const problemPoints = (p) => (p && p.points > 0 ? p.points : solvePoints(p && p.difficulty));
/** Шүүгчийн 0–100 хувийг тухайн бодлогын contest-ийн оноо руу */
const scoreFor = (score100, p) => Math.round((Number(score100) || 0) * problemPoints(p) / 10) / 10;

/** Шүүгчийн 0–100 хувийг тухайн бодлогын оноо руу (хялбарын 60% → 15; аравтын нэг орон) */
const toPoints = (score100, difficulty) => Math.round((Number(score100) || 0) * solvePoints(difficulty) / 10) / 10;

// Зэрэглэл — ranking оноогоор. Contest бүр дээд тал нь 100 + 30 бонус өгнө.
const TIERS = [
  { key: 'newbie', name: 'Шинэ тоглогч', icon: '🌱', min: 0 },
  { key: 'beginner', name: 'Анхлан суралцагч', icon: '🐣', min: 50 },
  { key: 'explorer', name: 'Эрэлч', icon: '🔍', min: 150 },
  { key: 'coder', name: 'Програмист', icon: '💻', min: 350 },
  { key: 'expert', name: 'Мэргэжилтэн', icon: '🧠', min: 700 },
  { key: 'master', name: 'Мастер', icon: '👑', min: 1200 },
  { key: 'grandmaster', name: 'Их мастер', icon: '🔥', min: 2000 },
  { key: 'legend', name: 'Домог', icon: '🐉', min: 3000 },
];
const tierByKey = (key) => TIERS.find((t) => t.key === key);

/** Ranking оноонд тохирох зэрэглэл + дараагийн зэрэглэл хүртэлх явц */
function tierFor(points) {
  points = Number(points) || 0;
  let i = 0;
  while (i + 1 < TIERS.length && points >= TIERS[i + 1].min) i++;
  const tier = TIERS[i];
  const next = TIERS[i + 1] || null;
  return {
    ...tier,
    level: i + 1,
    points,
    next,
    toNext: next ? next.min - points : 0,
    progress: next ? Math.round(((points - tier.min) / (next.min - tier.min)) * 100) : 100,
  };
}

// ---------------- Contest ----------------
const CONTEST_MAX_GAIN = 100; // гүйцэтгэлийн оноо: 100 · авсан / боломжит
const PLACE_BONUS = [30, 20, 10]; // 1, 2, 3-р байр

/** Энгийн contest-ийн ranking оноо */
function contestGain(score, maxScore, place) {
  if (!(score > 0) || !(maxScore > 0)) return 0;
  return Math.round((CONTEST_MAX_GAIN * score) / maxScore) + (place >= 1 && place <= 3 ? PLACE_BONUS[place - 1] : 0);
}

// Түвшин тогтоох contest: авсан хувиар эхлэх зэрэглэл (дээд тал нь Мастер)
const PLACEMENT = [
  { pct: 80, tier: 'master' },
  { pct: 60, tier: 'expert' },
  { pct: 40, tier: 'coder' },
  { pct: 20, tier: 'explorer' },
  { pct: 0, tier: 'newbie' },
];
function placementTier(score, maxScore) {
  const pct = maxScore > 0 ? (100 * score) / maxScore : 0;
  return tierByKey(PLACEMENT.find((p) => pct >= p.pct).tier);
}

module.exports = {
  DIFFICULTIES, DEFAULT_DIFFICULTY, difficultyOf, solvePoints, toPoints, POINTS_PER_SOLVE, problemPoints, scoreFor,
  TIERS, tierByKey, tierFor, CONTEST_MAX_GAIN, PLACE_BONUS, contestGain, PLACEMENT, placementTier,
};
