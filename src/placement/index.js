// 🎯 Түвшин тогтоох contest-ийг (18 бодлого, тесттэй) сервер асахад НЭГ удаа ноорог байдлаар үүсгэнэ.
// Админ оролцох ангиа сонгоод «Одоо эхлүүлэх» дарна. Устгасан ч дахин үүсгэхгүй (Setting).
const { Contest, Problem, Setting, User } = require('../models');
const tests = require('../coding-tests');
const { buildTests } = require('../cp-problems');
const { PROBLEMS } = require('./problems');

const KEY = 'placementContestV1';

async function seedPlacementContest() {
  if (await Setting.exists({ key: KEY })) return;
  const admin = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 }).select('_id').lean();
  if (!admin) return;
  const contest = await Contest.create({
    title: 'Түвшин тогтоох contest',
    kind: 'placement',
    durationMin: 180,
    classIds: [],
    description: '18 бодлого, нийт 100 оноо. 5 түвшин тус бүр 20 оноо: '
      + '1–5 оролт/гаралт, нөхцөл, давталт · 6–9 while, давхар давталт, массив · 10–12 тэмдэгт мөр, функц · '
      + '13–15 2D массив, эрэмбэлэлт, хоёртын хайлт · 16–18 рекурс, префикс нийлбэр, DP. '
      + 'Хугацаа 1 сек, санах ой 256 MB. Утас, интернэт, ChatGPT ашиглахыг хориглоно.',
    createdBy: admin._id,
  });
  const base = Date.now();
  for (const [i, def] of PROBLEMS.entries()) {
    const list = buildTests(def);
    const invalid = tests.validateTests(list);
    if (invalid) throw new Error(`${def.key}: ${invalid}`);
    const at = new Date(base + i * 1000); // contest-д A, B, C … дарааллаар
    const p = new Problem({
      title: def.title,
      difficulty: def.difficulty,
      points: def.points,
      checker: def.checker || 'tokens',
      contest: contest._id,
      topic: null,
      published: false,
      statement: def.statement,
      timeLimitMs: 1000,
      memoryLimitMb: 256,
      refLanguage: 'cpp17',
      refCode: def.ref,
      createdBy: admin._id,
      createdAt: at,
      updatedAt: at,
    });
    await p.save({ timestamps: false });
    await tests.saveTests(p._id, list, { replace: true, sampleFirst: def.samples.length });
    await new Promise((r) => setImmediate(r));
  }
  await Setting.updateOne({ key: KEY }, { $set: { value: String(contest._id) } }, { upsert: true });
  console.log(`Түвшин тогтоох contest: ${PROBLEMS.length} бодлого тесттэй нь үүслээ (ноорог).`);
}

module.exports = { seedPlacementContest };
