// Гүнзгий бэлтгэл (competitive programming): эрх, хэсгүүд, анхдагч сэдвүүд (эхлэлийн онол)
const { User, CpTopic } = require('./models');

// Програмист (4-р түвшин) зэрэглэлд хүрсэн сурагчид автоматаар нээгдэнэ
const CP_UNLOCK_LEVEL = 4;

const SECTIONS = [
  { key: 'basics', name: 'Үндэс', icon: '🧱' },
  { key: 'algo', name: 'Алгоритм', icon: '⚙️' },
  { key: 'ds', name: 'Өгөгдлийн бүтэц', icon: '🗂️' },
  { key: 'graph', name: 'Граф ба мод', icon: '🕸️' },
  { key: 'math', name: 'Математик', icon: '🔢' },
  { key: 'adv', name: 'Ахисан түвшин', icon: '🚀' },
];
const sectionOf = (key) => SECTIONS.find((s) => s.key === key) || SECTIONS[0];

/** Гүнзгий бэлтгэлд нэвтрэх эрх: админ, мэдээлэл зүйн багш, сонгогдсон эсвэл зэрэглэлээр нээгдсэн сурагч */
const cpAccess = (user) => !!user && (!!user.codingStaff || (user.role === 'student' && (user.cpSelected || user.cpRankUnlocked)));

/** Програмист зэрэглэлд хүрвэл нэг удаа нээнэ (зэрэглэл буурсан ч хаахгүй). Шинээр нээгдсэн бол true */
async function syncCpUnlock(user, tier) {
  if (user.role !== 'student' || user.cpRankUnlocked || !tier || tier.level < CP_UNLOCK_LEVEL) return false;
  await User.updateOne({ _id: user._id }, { $set: { cpRankUnlocked: true } });
  user.cpRankUnlocked = true;
  return true;
}

// ---------------- Анхдагч сэдвүүд ----------------
// Онол нь src/cp-content/<key>.md файлд (засварлахад хялбар). Эх сурвалж: Competitive Programmer's
// Handbook (A. Laaksonen), USACO Guide, cp-algorithms.com, CSES Problem Set — өөрийн үгээр, монголоор.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Setting } = require('./models');

// legacyTitle: өмнөх хувилбарын (key-гүй) анхдагч сэдвийг таних нэр
const DEFAULT_TOPICS = [
  { key: 'complexity', order: 10, section: 'basics', icon: '⏱️', title: 'Нарийн төвөгшил ба хурдан оролт/гаралт', legacyTitle: 'Нарийн төвөгшил ба хурдан оролт/гаралт', summary: 'Big-O, хязгаараас алгоритмыг таах, хурдан I/O' },
  { key: 'bits', order: 15, section: 'basics', icon: '🔢', title: 'Бит үйлдэл ба bitmask', summary: 'AND/OR/XOR, бүх дэд олонлогийг давтах' },
  { key: 'sorting-search', order: 20, section: 'algo', icon: '🔍', title: 'Эрэмбэлэлт ба хоёртын хайлт', legacyTitle: 'Эрэмбэлэлт ба хоёртын хайлт', summary: 'sort, lower_bound, хариуг хоёртын хайлтаар олох' },
  { key: 'prefix-two-pointers', order: 30, section: 'algo', icon: '➕', title: 'Prefix sum ба хоёр заагч', legacyTitle: 'Prefix sum ба хоёр заагч', summary: 'Хэрчмийн нийлбэр O(1)-д, 2D prefix sum, хоёр заагч' },
  { key: 'greedy', order: 40, section: 'algo', icon: '🪙', title: 'Шуналт алгоритм (Greedy)', legacyTitle: 'Шуналт алгоритм (Greedy)', summary: 'Хэзээ зөв, хэзээ буруу; солих аргумент' },
  { key: 'complete-search', order: 50, section: 'algo', icon: '🌀', title: 'Рекурс ба бүрэн хайлт', legacyTitle: 'Рекурс ба бүрэн хайлт', summary: 'Рекурс, дэд олонлог, сэлгэмэл, backtracking' },
  { key: 'dp', order: 60, section: 'algo', icon: '🧩', title: 'Динамик программчлал (DP)', legacyTitle: 'Динамик программчлал (DP)', summary: 'Төлөв → шилжилт → суурь; зоос, үүргэвч, засварын зай' },
  { key: 'number-theory', order: 70, section: 'math', icon: '🧮', title: 'Тоон онол', legacyTitle: 'Тоон онол', summary: 'Анхны тоо, шигшүүр, ХИЕХ, модулийн арифметик, хурдан зэрэг' },
  { key: 'data-structures', order: 80, section: 'ds', icon: '🗂️', title: 'Stack, queue, set, map', legacyTitle: 'Stack, queue, set, map', summary: 'Стандарт бүтцийг зөв сонгох, монотон stack' },
  { key: 'graph-traversal', order: 90, section: 'graph', icon: '🕸️', title: 'Граф: BFS ба DFS', legacyTitle: 'Граф: BFS ба DFS', summary: 'Хадгалах, нэвтрэх, бүрэлдэхүүн, торон дээрх бодлого' },
  { key: 'shortest-paths', order: 100, section: 'graph', icon: '🗺️', title: 'Хамгийн богино зам (Dijkstra)', legacyTitle: 'Хамгийн богино зам (Dijkstra)', summary: 'Dijkstra, Floyd–Warshall, аль алгоритмыг хэзээ' },
  { key: 'trees-dsu', order: 110, section: 'graph', icon: '🌳', title: 'Мод ба DSU', legacyTitle: 'Мод ба DSU', summary: 'Дэд модны хэмжээ, диаметр, Union-Find, Kruskal' },
  { key: 'range-queries', order: 120, section: 'adv', icon: '🌲', title: 'Segment tree ба Fenwick tree', legacyTitle: 'Segment tree ба Fenwick tree', summary: 'Өөрчлөгддөг массив дээрх хэрчмийн асуулга O(log n)' },
  { key: 'strings', order: 130, section: 'adv', icon: '🔤', title: 'Тэмдэгт мөр: KMP ба hash', summary: 'Хэв маяг хайх O(n + m), полиномын hash' },
];

// Өмнөх хувилбарын эхлэлийн онолуудын hash — багш засаагүй бол шинэчилнэ
const LEGACY_HASHES = new Set([
  'c8e8cc9dc90a20a7', '7c93876c44b2da53', 'c4bbb213d57dc4aa', 'cba93d150458901f', '9faa2266562c6a5e', 'e51d3d9dd7a308f5',
  'c655c088ee4173a6', 'd2e9c9a7d318e585', 'cab23e0cae8d58da', '990f6539c25974c4', 'd01422788dfaad9a', '89dfc7233ed19227',
]);

const hashOf = (text) => crypto.createHash('sha1').update(String(text || '').trim()).digest('hex').slice(0, 16);
const theoryOf = (key) => fs.readFileSync(path.join(__dirname, 'cp-content', key + '.md'), 'utf8').trim();

/**
 * Сервер асахад анхдагч сэдвүүдийг шалгана:
 *  - огт байхгүй бол үүсгэнэ (багш санаатай устгасныг дахин үүсгэхгүй — Setting-д тэмдэглэнэ);
 *  - багш засаагүй (hash таарсан) онолыг шинэ хувилбараар шинэчилнэ; засварласныг хөндөхгүй.
 */
async function seedDefaultTopics() {
  const setting = await Setting.findOne({ key: 'cpDefaultKeys' }).lean();
  const known = new Set(setting?.value || []);
  const firstRun = !(await CpTopic.exists({}));
  let created = 0;
  let updated = 0;
  for (const def of DEFAULT_TOPICS) {
    const theory = theoryOf(def.key);
    const newHash = hashOf(theory);
    let doc = await CpTopic.findOne({ key: def.key });
    if (!doc && def.legacyTitle) doc = await CpTopic.findOne({ key: null, title: def.legacyTitle });
    if (doc) {
      const cur = hashOf(doc.theory);
      const untouched = !doc.theory.trim() || cur === doc.seedHash || LEGACY_HASHES.has(cur);
      doc.key = def.key;
      if (untouched && cur !== newHash) {
        doc.theory = theory;
        doc.seedHash = newHash;
        if (doc.title === def.legacyTitle) doc.title = def.title;
        if (!doc.summary || DEFAULT_SUMMARIES_OLD.has(doc.summary)) doc.summary = def.summary;
        updated++;
      }
      await doc.save();
    } else if (firstRun || !known.has(def.key)) {
      await CpTopic.create({ key: def.key, title: def.title, section: def.section, icon: def.icon, summary: def.summary, theory, seedHash: newHash, order: def.order, published: true });
      created++;
    }
    known.add(def.key);
  }
  await Setting.updateOne({ key: 'cpDefaultKeys' }, { $set: { value: [...known] } }, { upsert: true });
  if (created || updated) console.log(`Гүнзгий бэлтгэл: ${created} сэдэв нэмж, ${updated} сэдвийн онолыг шинэчиллээ.`);
  return { created, updated };
}

// Өмнөх хувилбарын товч тайлбарууд (багш засаагүй бол шинээр солино)
const DEFAULT_SUMMARIES_OLD = new Set([
  'Big-O, хугацааны хязгаарт багтах эсэхийг урьдчилан тооцох', 'sort, lower_bound, хариуг хоёртын хайлтаар олох',
  'Хэрчмийн нийлбэрийг O(1)-д, хоёр заагчийн арга', 'Алхам бүрт хамгийн сайныг сонгох — хэзээ зөв бэ?',
  'Рекурс, backtracking, бүх хувилбарыг шалгах', 'Дэд бодлогын хариуг хадгалж дахин ашиглах',
  'ХИЕХ, анхны тоо, модулийн арифметик', 'Стандарт өгөгдлийн бүтцийг зөв сонгох',
  'Графыг хадгалах, нэвтрэх, холбоост бүрэлдэхүүн', 'Жинтэй графын хамгийн богино зам',
  'Модны шинж, нэгтгэх-олох (Disjoint Set Union)', 'Хэрчмийн асуулга, шинэчлэлийг O(log n)-д',
]);

module.exports = { CP_UNLOCK_LEVEL, SECTIONS, sectionOf, cpAccess, syncCpUnlock, seedDefaultTopics, DEFAULT_TOPICS };
