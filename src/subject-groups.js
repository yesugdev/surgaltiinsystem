// Хичээлийн шүүлтүүр: «Газар зүй 10» гэх мэт нэрийг төрөл (Газар зүй) + анги (10) болгож хоёр түвшинд бүлэглэнэ.
const { isId } = require('./helpers');

function splitName(name) {
  const s = String(name || '').trim();
  const m = /^(.*\S)\s+(\d{1,2})(?:\s*-?\s*р\s*анги)?$/i.exec(s);
  return m ? { base: m[1], grade: Number(m[2]) } : { base: s, grade: null };
}

/** subjects → [{ name, count, items: [{ id, name, grade, count }] }]; counts: Map(subjectId → тоо) */
function groupSubjects(subjects, counts = new Map()) {
  const map = new Map();
  for (const s of subjects) {
    const { base, grade } = splitName(s.name);
    if (!map.has(base)) map.set(base, { name: base, count: 0, items: [] });
    const g = map.get(base);
    const n = counts.get(String(s._id)) || 0;
    g.items.push({ id: String(s._id), name: s.name, grade, count: n });
    g.count += n;
  }
  const groups = [...map.values()];
  for (const g of groups) g.items.sort((a, b) => (a.grade ?? 999) - (b.grade ?? 999) || a.name.localeCompare(b.name, 'mn'));
  return groups.sort((a, b) => a.name.localeCompare(b.name, 'mn'));
}

/** ?subject=<id> | ?group=<төрөл> → { subject, group, ids } (ids: шүүх хичээлүүд, null = бүгд) */
function selectFilter(groups, query) {
  const subject = isId(query.subject) ? String(query.subject) : '';
  if (subject) {
    const g = groups.find((x) => x.items.some((i) => i.id === subject));
    return { subject, group: g ? g.name : '', ids: [subject] };
  }
  const g = typeof query.group === 'string' ? groups.find((x) => x.name === query.group) : null;
  if (g) return { subject: '', group: g.name, ids: g.items.map((i) => i.id) };
  return { subject: '', group: '', ids: null };
}

/** Баримтуудыг хичээлээр нь тоолно */
function countBySubject(docs) {
  const m = new Map();
  for (const d of docs) if (d.subject) m.set(String(d.subject), (m.get(String(d.subject)) || 0) + 1);
  return m;
}

module.exports = { splitName, groupSubjects, selectFilter, countBySubject };
