// Гүнзгий бэлтгэлийн анхдагч бодлогууд (Competitive Programmer's Handbook-ийн бүлгүүдийн дагуу зохиосон).
// Сервер асахад сэдэв бүрт нэг удаа нэмнэ; тестийг генератор + JS шийдлээр үүсгэнэ.
// Багш устгасан бодлогыг дахин үүсгэхгүй (Setting `cpProblemKeys`).
const { Problem, CpTopic, Setting, User } = require('../models');
const tests = require('../coding-tests');
const { rng } = require('./util');

const PROBLEMS = [
  ...require('./basics'),
  ...require('./algo'),
  ...require('./math'),
  ...require('./ds'),
  ...require('./graph'),
  ...require('./adv'),
];

const seedOf = (key) => [...key].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

/** Бодлогын бүх тест: эхлээд жишээнүүд, дараа нь генераторын тестүүд */
function buildTests(def) {
  const inputs = [...def.samples, ...def.gen(rng(seedOf(def.key)))];
  return inputs.map((input, i) => ({ name: String(i + 1), input, output: def.solve(input) }));
}

async function seedDefaultProblems() {
  const setting = await Setting.findOne({ key: 'cpProblemKeys' }).lean();
  const known = new Set(setting?.value || []);
  const todo = PROBLEMS.filter((p) => !known.has(p.key));
  if (!todo.length) return { created: 0 };
  const admin = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 }).select('_id').lean();
  if (!admin) return { created: 0 };

  const topics = new Map((await CpTopic.find({ key: { $in: todo.map((p) => p.topic) } }).select('key').lean()).map((t) => [t.key, t._id]));
  const base = Date.now();
  let created = 0;
  for (const [i, def] of todo.entries()) {
    const topic = topics.get(def.topic);
    if (!topic) continue; // сэдвийг багш устгасан
    const list = buildTests(def);
    const invalid = tests.validateTests(list);
    if (invalid) { console.error(`Бодлого ${def.key}: ${invalid}`); continue; }
    const at = new Date(base + i * 1000); // сэдвийн хуудсанд дарааллаараа гарна
    const problem = new Problem({
      title: def.title,
      difficulty: def.difficulty,
      topic,
      createdBy: admin._id,
      published: true,
      statement: def.statement,
      timeLimitMs: def.timeLimitMs || 1000,
      memoryLimitMb: 256,
      refLanguage: 'cpp17',
      refCode: def.ref,
      createdAt: at,
      updatedAt: at,
    });
    await problem.save({ timestamps: false });
    await tests.saveTests(problem._id, list, { replace: true, sampleFirst: def.samples.length });
    known.add(def.key);
    await Setting.updateOne({ key: 'cpProblemKeys' }, { $set: { value: [...known] } }, { upsert: true });
    created++;
    await new Promise((r) => setImmediate(r)); // хүсэлтүүдийг хаахгүй
  }
  if (created) console.log(`Гүнзгий бэлтгэл: ${created} бодлого нэмлээ.`);
  return { created };
}

module.exports = { PROBLEMS, buildTests, seedDefaultProblems };
