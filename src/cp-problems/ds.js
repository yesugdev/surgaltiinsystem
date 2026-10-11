// Өгөгдлийн бүтэц: stack/queue, segment tree ба Fenwick tree
const { reader, lines, text } = require('./util');

/** Цэг шинэчлэх + хэрчмийн асуулгын тест */
function rangeTest(R, n, q, lo, hi) {
  const rows = [[n, q], R.arr(n, lo, hi)];
  for (let i = 0; i < q; i++) {
    if (i < q - 1 && R.next() < 0.5) rows.push([1, R.int(1, n), R.int(lo, hi)]);
    else { const a = R.int(1, n), b = R.int(1, n); rows.push([2, Math.min(a, b), Math.max(a, b)]); }
  }
  return text(rows);
}

module.exports = [
  {
    key: 'data-structures-1',
    topic: 'data-structures',
    title: 'Хаалтын шалгагч',
    difficulty: 'easy',
    statement: `Кодын засварлагчид хаалт шалгагч хийх гэж байна. Мөр бүр зөвхөн \`(\`, \`)\`, \`[\`, \`]\`, \`{\`, \`}\` тэмдэгтээс тогтоно. Хаалт бүр **ижил төрлийн** хаалтаар, зөв дарааллаар хаагдсан бол мөр зөв: \`{[()]}()\` зөв, \`([)]\` буруу, \`((\` буруу.

### Оролт
Эхний мөрөнд t. Дараагийн t мөрөнд нэг нэг мөр.

### Гаралт
Мөр бүрийн хувьд \`YES\` эсвэл \`NO\`.

### Хязгаар
- 1 ≤ t ≤ 10⁴
- мөр бүрийн урт 1-ээс 2·10⁵, бүх мөрийн нийт урт ≤ 2·10⁵

> 💡 **Stack**: нээх хаалтыг хийж, хаах хаалт ирэхэд оройн элемент тохирох эсэхийг шалга.`,
    samples: [lines(4, '{[()]}()', '([)]', '((', '[]{}')],
    gen(R) {
      const valid = (n) => { // n хос хаалттай зөв мөр
        let s = '';
        const st = [];
        let open = n;
        while (open || st.length) {
          if (open && (!st.length || R.next() < 0.5)) { const k = R.int(0, 2); s += '([{'[k]; st.push(k); open--; }
          else s += ')]}'[st.pop()];
        }
        return s;
      };
      const broken = (s) => { const i = R.int(0, s.length - 1); return s.slice(0, i) + R.pick(['(', ')', '[', ']', '{', '}']) + s.slice(i + 1); };
      const t = [];
      for (let k = 0; k < 4; k++) {
        const rows = [];
        for (let i = 0; i < 10; i++) rows.push(R.next() < 0.5 ? valid(R.int(1, 6)) : broken(valid(R.int(1, 6))));
        t.push(text([10, ...rows]));
      }
      t.push(lines(3, ')', '(', '}{'));
      t.push(lines(2, valid(50000), broken(valid(49999))));
      const many = [];
      for (let i = 0; i < 10000; i++) many.push(R.next() < 0.5 ? valid(10) : broken(valid(10)));
      t.push(text([10000, ...many]));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const t = r.num();
      const out = [];
      const match = { ')': '(', ']': '[', '}': '{' };
      for (let i = 0; i < t; i++) {
        const s = r.str();
        const st = [];
        let ok = true;
        for (const c of s) {
          if (c in match) { if (st.pop() !== match[c]) { ok = false; break; } }
          else st.push(c);
        }
        out.push(ok && !st.length ? 'YES' : 'NO');
      }
      return out.join('\n') + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int t; cin >> t;
    while (t--) {
        string s; cin >> s;
        stack<char> st;
        bool ok = true;
        for (char c : s) {
            if (c == '(' || c == '[' || c == '{') { st.push(c); continue; }
            char need = c == ')' ? '(' : c == ']' ? '[' : '{';
            if (st.empty() || st.top() != need) { ok = false; break; }
            st.pop();
        }
        cout << (ok && st.empty() ? "YES" : "NO") << "\n";
    }
}
`,
  },
  {
    key: 'data-structures-2',
    topic: 'data-structures',
    title: 'Зүүн талын намхан хөрш',
    difficulty: 'medium',
    statement: `n сурагч нэг эгнээнд зогсож байна, i-р сурагчийн өндөр hᵢ. Сурагч бүр зүүн тийшээ хараад **өөрөөсөө намхан** хамгийн ойрын сурагчийг олно.

Сурагч бүрийн хувьд тэр хүний байрлалыг (1-ээс эхэлсэн) гарга; байхгүй бол 0.

### Оролт
Эхний мөрөнд n. Хоёр дахь мөрөнд h₁, …, hₙ.

### Гаралт
n тоог нэг мөрөнд хоосон зайгаар.

### Хязгаар
- 1 ≤ n ≤ 2·10⁵
- 1 ≤ hᵢ ≤ 10⁹

> 💡 Номын 8.2 «Nearest smaller elements» (х. 79): **монотон stack** — өөрөөсөө өндөр буюу тэнцүүг гаргаад, үлдсэн орой нь хариу.`,
    samples: [lines(8, [2, 5, 1, 4, 8, 3, 2, 5])],
    gen(R) {
      const t = [];
      for (let i = 0; i < 7; i++) { const n = R.int(1, 15); t.push(lines(n, R.arr(n, 1, 8))); }
      t.push(lines(50000, R.arr(50000, 1, 1e9)));
      t.push(lines(50000, Array.from({ length: 50000 }, (_, i) => i + 1)));
      t.push(lines(50000, Array.from({ length: 50000 }, (_, i) => 50000 - i)));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const n = r.num();
      const h = Array.from({ length: n }, () => r.num());
      const st = [];
      const out = [];
      for (let i = 0; i < n; i++) {
        while (st.length && h[st[st.length - 1]] >= h[i]) st.pop();
        out.push(st.length ? st[st.length - 1] + 1 : 0);
        st.push(i);
      }
      return out.join(' ') + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    vector<int> h(n);
    for (auto& x : h) cin >> x;
    stack<int> st;                                   // индексүүд, өндөр нь өсөх дараалалтай
    for (int i = 0; i < n; i++) {
        while (!st.empty() && h[st.top()] >= h[i]) st.pop();
        cout << (st.empty() ? 0 : st.top() + 1) << (i + 1 < n ? ' ' : '\n');
        st.push(i);
    }
}
`,
  },
  {
    key: 'range-queries-1',
    topic: 'range-queries',
    title: 'Агуулахын тооллого',
    difficulty: 'medium',
    statement: `Агуулахад n тавиур бий, i-р тавиур дээр aᵢ хайрцаг байна. q үйлдэл ирнэ:
- \`1 k u\` — k-р тавиур дээрх хайрцгийн тоог **u болгох**;
- \`2 a b\` — a-аас b хүртэлх тавиурууд дээрх **нийт** хайрцгийн тоог хэлэх.

### Оролт
Эхний мөрөнд n ба q. Хоёр дахь мөрөнд a₁, …, aₙ. Дараагийн q мөрөнд үйлдлүүд.

### Гаралт
2-р төрлийн үйлдэл бүрийн хариуг тусдаа мөрөнд.

### Хязгаар
- 1 ≤ n, q ≤ 2·10⁵
- 1 ≤ aᵢ, u ≤ 10⁹, 1 ≤ k ≤ n, 1 ≤ a ≤ b ≤ n

> 💡 Prefix sum шинэчлэлт бүрт O(n) — удаан. **Fenwick tree** (номын 9.2, х. 86): шинэчлэлт ба нийлбэр хоёулаа O(log n). «u болгох» = «u − aₖ нэмэх».`,
    samples: [lines([5, 5], [3, 2, 4, 5, 1], [2, 1, 3], [1, 2, 7], [2, 1, 3], [2, 4, 5], [1, 5, 10])],
    gen(R) {
      const t = [];
      for (let i = 0; i < 6; i++) t.push(rangeTest(R, R.int(1, 10), R.int(1, 10), 1, 10));
      t.push(rangeTest(R, 50000, 50000, 1, 1e9), rangeTest(R, 50000, 50000, 1, 1e9));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const n = r.num(), q = r.num();
      const a = new Float64Array(n + 1), bit = new Float64Array(n + 1);
      const add = (i, v) => { for (; i <= n; i += i & -i) bit[i] += v; };
      const sum = (i) => { let s = 0; for (; i > 0; i -= i & -i) s += bit[i]; return s; };
      for (let i = 1; i <= n; i++) { a[i] = r.num(); add(i, a[i]); }
      const out = [];
      for (let i = 0; i < q; i++) {
        const type = r.num(), x = r.num(), y = r.num();
        if (type === 1) { add(x, y - a[x]); a[x] = y; } else out.push(sum(y) - sum(x - 1));
      }
      return out.length ? out.join('\n') + '\n' : '';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int n;
vector<long long> bit;
void add(int i, long long v) { for (; i <= n; i += i & -i) bit[i] += v; }
long long sum(int i) { long long s = 0; for (; i > 0; i -= i & -i) s += bit[i]; return s; }
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int q; cin >> n >> q;
    vector<long long> a(n + 1);
    bit.assign(n + 1, 0);
    for (int i = 1; i <= n; i++) { cin >> a[i]; add(i, a[i]); }
    while (q--) {
        int type; long long x, y; cin >> type >> x >> y;
        if (type == 1) { add(x, y - a[x]); a[x] = y; }
        else cout << sum(y) - sum(x - 1) << "\n";
    }
}
`,
  },
  {
    key: 'range-queries-2',
    topic: 'range-queries',
    title: 'Хамгийн хямд үнэ',
    difficulty: 'medium',
    statement: `Онлайн дэлгүүрт n бараа дараалан жагсаалттай, i-р барааны үнэ pᵢ. Үнэ байнга өөрчлөгдөнө. q үйлдэл ирнэ:
- \`1 k u\` — k-р барааны үнийг **u болгох**;
- \`2 a b\` — a-аас b хүртэлх бараануудын **хамгийн бага** үнийг хэлэх.

### Оролт
Эхний мөрөнд n ба q. Хоёр дахь мөрөнд p₁, …, pₙ. Дараагийн q мөрөнд үйлдлүүд.

### Гаралт
2-р төрлийн үйлдэл бүрийн хариуг тусдаа мөрөнд.

### Хязгаар
- 1 ≤ n, q ≤ 2·10⁵
- 1 ≤ pᵢ, u ≤ 10⁹, 1 ≤ k ≤ n, 1 ≤ a ≤ b ≤ n

> 💡 Минимумыг Fenwick-ээр «хасаж» болохгүй — **Segment tree** (номын 9.3, х. 89) хэрэгтэй.`,
    samples: [lines([5, 4], [8, 3, 6, 5, 9], [2, 1, 5], [2, 3, 5], [1, 4, 2], [2, 3, 5])],
    gen(R) {
      const t = [];
      for (let i = 0; i < 6; i++) t.push(rangeTest(R, R.int(1, 10), R.int(1, 10), 1, 20));
      t.push(rangeTest(R, 50000, 50000, 1, 1e9), rangeTest(R, 65536, 50000, 1, 1000));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const n = r.num(), q = r.num();
      let size = 1;
      while (size < n) size <<= 1;
      const tree = new Float64Array(2 * size).fill(Infinity);
      for (let i = 0; i < n; i++) tree[size + i] = r.num();
      for (let i = size - 1; i >= 1; i--) tree[i] = Math.min(tree[2 * i], tree[2 * i + 1]);
      const out = [];
      for (let i = 0; i < q; i++) {
        const type = r.num(), x = r.num(), y = r.num();
        if (type === 1) {
          let p = size + x - 1;
          tree[p] = y;
          for (p >>= 1; p >= 1; p >>= 1) tree[p] = Math.min(tree[2 * p], tree[2 * p + 1]);
        } else {
          let lo = size + x - 1, hi = size + y - 1, m = Infinity;
          while (lo <= hi) {
            if (lo & 1) m = Math.min(m, tree[lo++]);
            if (!(hi & 1)) m = Math.min(m, tree[hi--]);
            lo >>= 1; hi >>= 1;
          }
          out.push(m);
        }
      }
      return out.length ? out.join('\n') + '\n' : '';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int sz = 1;
vector<long long> tr;
void update(int k, long long v) {
    k += sz; tr[k] = v;
    for (k /= 2; k >= 1; k /= 2) tr[k] = min(tr[2 * k], tr[2 * k + 1]);
}
long long query(int a, int b) {                       // [a, b], 0-ээс эхэлсэн
    a += sz; b += sz;
    long long m = LLONG_MAX;
    while (a <= b) {
        if (a % 2 == 1) m = min(m, tr[a++]);
        if (b % 2 == 0) m = min(m, tr[b--]);
        a /= 2; b /= 2;
    }
    return m;
}
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, q; cin >> n >> q;
    while (sz < n) sz *= 2;
    tr.assign(2 * sz, LLONG_MAX);
    for (int i = 0; i < n; i++) cin >> tr[sz + i];
    for (int i = sz - 1; i >= 1; i--) tr[i] = min(tr[2 * i], tr[2 * i + 1]);
    while (q--) {
        int type, x; long long y; cin >> type >> x >> y;
        if (type == 1) update(x - 1, y);
        else cout << query(x - 1, y - 1) << "\n";
    }
}
`,
  },
];
