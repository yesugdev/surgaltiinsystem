// 🏁 Contest: самбар, ranking оноо олгох, 🪙 зоос, хуучин системээс шилжүүлэх
const { Contest, ContestResult, Problem, CodeSubmission, User, Setting } = require('./models');
const { toPoints, solvePoints, contestGain, placementTier } = require('./coding-ranks');
const { cosmeticsFor, ownedUpToLevel } = require('./coding-cosmetics');

/** draft → scheduled → running → ended → finalized */
function contestState(c, now = new Date()) {
  if (c.finalizedAt) return 'finalized';
  if (!c.startAt) return 'draft';
  if (now < c.startAt) return 'scheduled';
  if (!c.endAt || now < c.endAt) return 'running';
  return 'ended';
}
const STATES = {
  draft: { label: 'Ноорог', badge: 'badge-amber' },
  scheduled: { label: 'Удахгүй эхэлнэ', badge: 'badge-blue' },
  running: { label: 'Явагдаж байна', badge: 'badge-green' },
  ended: { label: 'Дууссан · дүн хүлээгдэж байна', badge: 'badge-amber' },
  finalized: { label: 'Дүн гарсан', badge: '' },
};

/** Сурагчийн анги contest-д сонгогдсон эсэх */
const inContest = (user, c) => !!user.classId && (c.classIds || []).some((id) => String(id) === String(user.classId));

/** Contest-ийн бодлогууд (A, B, C … дарааллаар) */
async function contestProblems(contestId, select = 'title difficulty testCount statement createdAt') {
  const list = await Problem.find({ contest: contestId }).select(select).sort({ createdAt: 1 }).lean();
  return list.map((p, i) => ({ ...p, letter: String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : '') }));
}

const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/**
 * Contest-ийн самбар: зөвхөн [startAt, endAt] хугацаанд илгээсэн кодоор.
 * Эрэмбэ: оноо ↓, тэнцвэл сүүлийн оноогоо эрт авсан нь дээр. Байр — хасагдаагүй, оноотой сурагчдад.
 */
async function contestStandings(contest, problems) {
  const ids = problems.map((p) => p._id);
  const students = await User.find({ role: 'student', classId: { $in: contest.classIds }, active: { $ne: false } })
    .select('fullName username classId codingAvatar codingColor codingOwned ratingPoints placementDone').lean();
  const createdAt = { $gte: contest.startAt || new Date(8.64e15) };
  if (contest.endAt) createdAt.$lte = contest.endAt;
  const best = ids.length && students.length
    ? await CodeSubmission.aggregate([
      { $match: { problem: { $in: ids }, user: { $in: students.map((s) => s._id) }, isStaff: false, status: 'done', createdAt } },
      { $sort: { score: -1, createdAt: 1 } },
      { $group: { _id: { p: '$problem', u: '$user' }, best: { $first: '$score' }, at: { $first: '$createdAt' }, attempts: { $sum: 1 } } },
    ])
    : [];
  const map = new Map(best.map((b) => [`${b._id.p}:${b._id.u}`, b]));
  const excluded = new Set((contest.excluded || []).map(String));
  const maxScore = problems.reduce((s, p) => s + solvePoints(p.difficulty), 0);
  const rows = students.map((s) => {
    const cells = problems.map((p) => {
      const c = map.get(`${p._id}:${s._id}`);
      return c ? { ...c, points: toPoints(c.best, p.difficulty) } : null;
    });
    const score = Math.round(cells.reduce((sum, c) => sum + (c ? c.points : 0), 0) * 10) / 10;
    const last = cells.reduce((m, c) => (c && c.best > 0 && c.at > m ? c.at : m), new Date(0));
    return {
      student: { ...s, initials: initials(s.fullName) },
      look: cosmeticsFor(s),
      cells,
      score,
      last,
      participated: cells.some(Boolean),
      excluded: excluded.has(String(s._id)),
    };
  });
  rows.sort((a, b) => b.score - a.score || a.last - b.last || a.student.fullName.localeCompare(b.student.fullName, 'mn'));
  let place = 0;
  let prev = null;
  let n = 0;
  for (const r of rows) {
    if (r.excluded || !(r.score > 0)) { r.place = null; continue; }
    n++;
    if (!prev || r.score !== prev.score || +r.last !== +prev.last) place = n;
    r.place = place;
    prev = r;
  }
  return { rows, maxScore };
}

/** Дүн баталгаажуулахад олгох ranking оноо (урьдчилан харах ба бодит олголтод) */
function ratingChanges(contest, rows, maxScore) {
  return rows.filter((r) => r.participated && !r.excluded).map((r) => {
    const before = r.student.ratingPoints || 0;
    const placement = contest.kind === 'placement' && !r.student.placementDone;
    let after;
    let tier = null;
    if (placement) {
      tier = placementTier(r.score, maxScore);
      after = Math.max(before, tier.min);
    } else {
      after = before + contestGain(r.score, maxScore, r.place);
    }
    return { row: r, before, after, delta: after - before, placement, placementTier: tier };
  });
}

/** Дүнг баталгаажуулж ranking оноо олгоно (нэг л удаа) */
async function finalizeContest(contestId) {
  const now = new Date();
  // Давхар олгохоос сэргийлж атомараар «баталгаажсан» гэж тэмдэглэнэ
  const contest = await Contest.findOneAndUpdate({ _id: contestId, finalizedAt: null, endAt: { $ne: null, $lte: now } }, { $set: { finalizedAt: now } }, { new: true }).lean();
  if (!contest) return null;
  const problems = await contestProblems(contest._id);
  const { rows, maxScore } = await contestStandings(contest, problems);
  const changes = ratingChanges(contest, rows, maxScore);
  for (const ch of changes) {
    const uid = ch.row.student._id;
    await ContestResult.updateOne(
      { contest: contest._id, user: uid },
      { $set: { score: ch.row.score, maxScore, place: ch.row.place, placement: ch.placement, ratingBefore: ch.before, ratingAfter: ch.after } },
      { upsert: true }
    );
    const update = ch.placement ? { $max: { ratingPoints: ch.after }, $set: { placementDone: true } } : { $inc: { ratingPoints: ch.delta } };
    await User.updateOne({ _id: uid }, update);
  }
  return { contest, changes };
}

// ---------------- 🪙 Зоос ----------------
/** Бүтэн (100/100) бодсон бүх бодлогын хүндийн зэргийн оноо — багшийн туршилтыг тооцохгүй */
async function coinsEarned(userId) {
  const ids = await CodeSubmission.distinct('problem', { user: userId, isStaff: false, status: 'done', score: 100 });
  if (!ids.length) return 0;
  const problems = await Problem.find({ _id: { $in: ids } }).select('difficulty').lean();
  return problems.reduce((s, p) => s + solvePoints(p.difficulty), 0);
}

async function wallet(user) {
  const earned = await coinsEarned(user._id);
  const spent = user.coinsSpent || 0;
  return { earned, spent, balance: Math.max(0, earned - spent) };
}

// ---------------- Хуучин системээс шилжүүлэх (нэг удаа) ----------------
// Хуучин rank босго (бодлогын оноогоор) — тухайн үед нээгдсэн аватар, өнгийг үнэгүй үлдээнэ.
const OLD_TIER_MIN = [0, 75, 250, 1000, 2500, 5000, 8750, 12500];

async function migrateRankSystem() {
  if (await Setting.exists({ key: 'rankSystemV2' })) return;
  // Үндсэн жагсаалтын бодлогуудын бүтэн бодолтоор хуучин зэрэглэлийг тооцно
  const main = await Problem.find({ topic: null }).select('difficulty').lean();
  const diff = new Map(main.map((p) => [String(p._id), p.difficulty]));
  const solved = await CodeSubmission.aggregate([
    { $match: { problem: { $in: main.map((p) => p._id) }, isStaff: false, status: 'done', score: 100 } },
    { $group: { _id: { u: '$user', p: '$problem' } } },
  ]);
  const pts = new Map();
  for (const s of solved) pts.set(String(s._id.u), (pts.get(String(s._id.u)) || 0) + solvePoints(diff.get(String(s._id.p))));
  let migrated = 0;
  for (const [uid, p] of pts) {
    let level = 1;
    while (level < OLD_TIER_MIN.length && p >= OLD_TIER_MIN[level]) level++;
    const keys = ownedUpToLevel(level);
    if (keys.length) {
      await User.updateOne({ _id: uid, role: 'student' }, { $addToSet: { codingOwned: { $each: keys } } });
      migrated++;
    }
  }
  // Зэрэглэл бүгд Шинэ тоглогчоос эхэлнэ — дахин баярлуулах боломжтой болгоно
  await User.updateMany({ role: 'student' }, { $set: { codingTierSeen: 'newbie' } });
  await Setting.updateOne({ key: 'rankSystemV2' }, { $set: { value: new Date() } }, { upsert: true });
  console.log(`Ranking систем: contest-д шилжлээ. ${migrated} сурагчийн нээсэн аватар/өнгө хадгалагдлаа.`);
}

module.exports = {
  contestState, STATES, inContest, contestProblems, contestStandings, ratingChanges, finalizeContest,
  coinsEarned, wallet, migrateRankSystem, OLD_TIER_MIN,
};
