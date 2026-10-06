// Өрсөлдөөнт Coding: бодлогын дугаар (№1, №2 …) — анх нийтлэгдэх үед олгоно, устгасан ч дахин ашиглахгүй
const { Problem, Setting } = require('./models');

const KEY = 'problemCounter';

/** Тоолуурыг одоо байгаа хамгийн их дугаараас багагүй болгоно */
async function syncCounter() {
  const top = await Problem.findOne({ number: { $ne: null } }).sort({ number: -1 }).select('number').lean();
  const max = top?.number || 0;
  await Setting.updateOne({ key: KEY }, { $max: { value: max } }, { upsert: true });
}

/** Дараагийн дугаар (атомар) */
async function nextNumber() {
  await syncCounter();
  const s = await Setting.findOneAndUpdate({ key: KEY }, { $inc: { value: 1 } }, { new: true, upsert: true });
  return s.value;
}

/** Бодлогод дугаар байхгүй бол олгоно (нийтлэх үед) */
async function ensureNumber(problem) {
  if (problem.number) return problem.number;
  problem.number = await nextNumber();
  return problem.number;
}

/** Сервер асахад: нийтлэгдсэн боловч дугааргүй (хуучин) бодлогуудад үүссэн дарааллаар дугаар олгоно */
async function backfillNumbers() {
  const missing = await Problem.find({ published: true, number: null }).sort({ createdAt: 1 }).select('_id').lean();
  for (const p of missing) await Problem.updateOne({ _id: p._id, number: null }, { $set: { number: await nextNumber() } });
}

module.exports = { ensureNumber, backfillNumbers };
