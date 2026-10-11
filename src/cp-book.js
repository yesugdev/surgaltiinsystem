// 📕 Гүнзгий бэлтгэлийн ном: Competitive Programmer's Handbook (A. Laaksonen) — Монгол орчуулга,
// Creative Commons BY-NC-SA 4.0. PDF-ийг админ/мэдээлэл зүйн багш системд оруулна (Setting `cpBook`).
// Хуудасны дугаар нь орчуулгын хэвлэлийн дугаар; PDF-ийн хуудас = дугаар + PAGE_OFFSET.

const PAGE_OFFSET = 10;

const PARTS = [
  { title: 'I. Үндсэн аргууд', from: 1 },
  { title: 'II. Графын алгоритмууд', from: 11 },
  { title: 'III. Ахисан түвшний сэдвүүд', from: 21 },
];

const CHAPTERS = [
  { n: 1, title: 'Оршил', page: 3 },
  { n: 2, title: 'Time complexity', page: 17 },
  { n: 3, title: 'Sorting', page: 25 },
  { n: 4, title: 'Data structures', page: 37 },
  { n: 5, title: 'Complete search', page: 49 },
  { n: 6, title: 'Greedy algorithms', page: 59 },
  { n: 7, title: 'Dynamic programming', page: 67 },
  { n: 8, title: 'Amortized analysis', page: 79 },
  { n: 9, title: 'Range queries', page: 85 },
  { n: 10, title: 'Bit manipulation', page: 97 },
  { n: 11, title: 'Graph-ын үндэс', page: 111 },
  { n: 12, title: 'Graph traversal', page: 119 },
  { n: 13, title: 'Shortest paths', page: 125 },
  { n: 14, title: 'Tree algorithms', page: 135 },
  { n: 15, title: 'Spanning trees', page: 143 },
  { n: 16, title: 'Directed graphs', page: 151 },
  { n: 17, title: 'Strong connectivity', page: 159 },
  { n: 18, title: 'Tree queries', page: 165 },
  { n: 19, title: 'Path ба circuit', page: 177 },
  { n: 20, title: 'Flow ба cut', page: 185 },
  { n: 21, title: 'Number theory', page: 201 },
  { n: 22, title: 'Combinatorics', page: 211 },
  { n: 23, title: 'Matrices', page: 221 },
  { n: 24, title: 'Probability', page: 229 },
  { n: 25, title: 'Game theory', page: 239 },
  { n: 26, title: 'String algorithms', page: 247 },
  { n: 27, title: 'Square root algorithms', page: 255 },
  { n: 28, title: 'Segment tree дахин', page: 261 },
  { n: 29, title: 'Geometry', page: 269 },
  { n: 30, title: 'Sweep line algorithms', page: 279 },
];

// Анхдагч сэдэв (CpTopic.key) → номын холбогдох бүлгүүд
const TOPIC_CHAPTERS = {
  complexity: [1, 2],
  bits: [10],
  'sorting-search': [3],
  'prefix-two-pointers': [8, 9],
  greedy: [6],
  'complete-search': [5],
  dp: [7],
  'number-theory': [21],
  combinatorics: [22],
  'data-structures': [4],
  'graph-traversal': [11, 12],
  'shortest-paths': [13],
  'directed-graphs': [16],
  'trees-dsu': [14, 15],
  'tree-queries': [18],
  'range-queries': [9, 28],
  strings: [26],
};

const chapter = (n) => CHAPTERS.find((c) => c.n === Number(n)) || null;
const pdfPage = (page) => page + PAGE_OFFSET;
const chaptersFor = (key) => (TOPIC_CHAPTERS[key] || []).map(chapter).filter(Boolean);

module.exports = { PAGE_OFFSET, PARTS, CHAPTERS, TOPIC_CHAPTERS, chapter, pdfPage, chaptersFor };
