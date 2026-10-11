// Гүнзгий бэлтгэлийн бодлогын тест үүсгэх туслах функцүүд
const MOD = 1000000007;
const MODn = BigInt(MOD);

/** Давтагдах санамсаргүй тоо (seed-тэй) — тест бүр үргэлж ижил гарна */
function rng(seed) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
  return {
    next,
    int,
    pick: (arr) => arr[int(0, arr.length - 1)],
    arr: (n, lo, hi) => Array.from({ length: n }, () => int(lo, hi)),
    shuffle(a) {
      for (let i = a.length - 1; i > 0; i--) { const j = int(0, i); [a[i], a[j]] = [a[j], a[i]]; }
      return a;
    },
    str: (n, alphabet) => Array.from({ length: n }, () => alphabet[int(0, alphabet.length - 1)]).join(''),
    /** 1..n оройтой санамсаргүй мод: [эцэг, хүү] ирмэгүүд (deep = гинж маягийн гүн мод) */
    tree(n, deep = false) {
      const perm = this.shuffle(Array.from({ length: n }, (_, i) => i + 1));
      const edges = [];
      for (let i = 1; i < n; i++) {
        const j = deep ? int(Math.max(0, i - 3), i - 1) : int(0, i - 1);
        edges.push([perm[j], perm[i]]);
      }
      return this.shuffle(edges);
    },
  };
}

// a, b < MOD үед (a·b) mod MOD — BigInt-гүй, 2⁵³-аас хэтрэхгүйгээр хоёр хэсэгт задална
const mul = (a, b) => (((a * (b >>> 16)) % MOD) * 65536 + a * (b & 65535)) % MOD;
function powmod(a, b) {
  let r = 1n, x = BigInt(a) % MODn, e = BigInt(b);
  for (; e > 0n; e >>= 1n, x = (x * x) % MODn) if (e & 1n) r = (r * x) % MODn;
  return Number(r);
}

/** Оролтыг whitespace-ээр задлах */
const tokens = (input) => input.split(/\s+/).filter(Boolean);
/** Тоон уншигч: next() дараагийн тоог буцаана */
function reader(input) {
  const t = tokens(input);
  let i = 0;
  return { num: () => Number(t[i++]), str: () => t[i++], big: () => BigInt(t[i++]), rest: () => t.slice(i) };
}

/** Мөрүүдийг текст болгох: массив мөр → хоосон зайгаар. Том тестэд text(rows) ашигла (spread-ийн stack хязгаар) */
const text = (rows) => rows.map((r) => (Array.isArray(r) ? r.join(' ') : String(r))).join('\n') + '\n';
const lines = (...rows) => text(rows);

module.exports = { MOD, rng, mul, powmod, tokens, reader, lines, text };
