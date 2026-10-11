// Үндэс: нарийн төвөгшил, бит үйлдэл
const { MOD, powmod, reader, lines } = require('./util');

module.exports = [
  {
    key: 'complexity-1',
    topic: 'complexity',
    title: 'Хамгийн ашигтай үе',
    difficulty: 'easy',
    statement: `Нэгэн дэлгүүр n өдрийн турш ажилласан. i-р өдрийн цэвэр ашиг нь aᵢ төгрөг (сөрөг бол алдагдал).

Дэлгүүрийн эзэн **дараалсан** хэдэн өдрийг (дор хаяж нэг өдөр) сонгоод тайландаа «хамгийн амжилттай үе» гэж бичих гэж байна. Сонгосон өдрүүдийн нийт ашиг хамгийн их байх ёстой. Тэр нийт ашгийг ол.

### Оролт
Эхний мөрөнд n. Хоёр дахь мөрөнд a₁, a₂, …, aₙ.

### Гаралт
Хамгийн их нийт ашиг.

### Хязгаар
- 1 ≤ n ≤ 2·10⁵
- −10⁹ ≤ aᵢ ≤ 10⁹

> 💡 O(n²) шийдэл удаан. Кадений арга: «одоогийн өдрөөр төгсөх хамгийн сайн нийлбэр»-ийг хадгал.`,
    samples: [lines(8, [-1, 2, 4, -3, 5, 2, -5, 2]), lines(3, [-5, -2, -7])],
    gen(R) {
      const t = [];
      for (let i = 0; i < 8; i++) { const n = R.int(1, 12); t.push(lines(n, R.arr(n, -10, 10))); }
      t.push(lines(1, [1000000000]), lines(4, [-1000000000, -1000000000, -1, -1000000000]));
      t.push(lines(50000, R.arr(50000, -1e9, 1e9)));
      t.push(lines(50000, R.arr(50000, -1000, 1003)));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const n = r.num();
      let best = -Infinity, cur = 0;
      for (let i = 0; i < n; i++) { const x = r.num(); cur = Math.max(x, cur + x); best = Math.max(best, cur); }
      return best + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    long long best = LLONG_MIN, cur = 0;
    for (int i = 0; i < n; i++) {
        long long x; cin >> x;
        cur = max(x, cur + x);          // өмнөхөө үргэлжлүүлэх эсвэл шинээр эхлэх
        best = max(best, cur);
    }
    cout << best << "\n";
}
`,
  },
  {
    key: 'complexity-2',
    topic: 'complexity',
    title: 'Ялгаатай дугаарууд',
    difficulty: 'easy',
    statement: `Сургуулийн номын санд n ном буцаж ирсэн. Ном бүр дээр каталогийн дугаар бичээстэй бөгөөд нэг номын хэд хэдэн хувь ирсэн байж болно.

Хэдэн **өөр** ном ирсэн бэ?

### Оролт
Эхний мөрөнд n. Хоёр дахь мөрөнд n ширхэг дугаар x₁, …, xₙ.

### Гаралт
Ялгаатай дугаарын тоо.

### Хязгаар
- 1 ≤ n ≤ 2·10⁵
- 1 ≤ xᵢ ≤ 10⁹

> 💡 Бүх хосыг харьцуулбал O(n²) — n = 2·10⁵ үед 2·10¹⁰ үйлдэл! Эрэмбэлээд хөршүүдийг харьцуул.`,
    samples: [lines(6, [5, 2, 5, 9, 2, 5])],
    gen(R) {
      const t = [];
      for (let i = 0; i < 7; i++) { const n = R.int(1, 15); t.push(lines(n, R.arr(n, 1, 6))); }
      t.push(lines(1, [7]));
      t.push(lines(50000, R.arr(50000, 1, 1e9)));
      t.push(lines(50000, R.arr(50000, 1, 1000)));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const n = r.num();
      const s = new Set();
      for (let i = 0; i < n; i++) s.add(r.num());
      return s.size + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    vector<int> x(n);
    for (auto& v : x) cin >> v;
    sort(x.begin(), x.end());
    int cnt = 0;
    for (int i = 0; i < n; i++) if (i == 0 || x[i] != x[i - 1]) cnt++;
    cout << cnt << "\n";
}
`,
  },
  {
    key: 'bits-1',
    topic: 'bits',
    title: 'Тэнцүү хоёр баг',
    difficulty: 'easy',
    statement: `Биеийн тамирын багш n сурагчийг **хоёр баг** болгон хуваах гэж байна. i-р сурагчийн хүч pᵢ. Багуудын нийт хүчний зөрүү аль болох бага байх ёстой (нэг баг хоосон байж болно).

Хамгийн бага зөрүүг ол.

### Оролт
Эхний мөрөнд n. Хоёр дахь мөрөнд p₁, …, pₙ.

### Гаралт
Хоёр багийн нийт хүчний хамгийн бага зөрүү.

### Хязгаар
- 1 ≤ n ≤ 20
- 1 ≤ pᵢ ≤ 10⁹

> 💡 Сурагч бүр 1-р эсвэл 2-р багт — нийт 2ⁿ хувилбар. Bitmask-аар бүгдийг шалга.`,
    samples: [lines(5, [3, 2, 7, 4, 1])],
    gen(R) {
      const t = [];
      for (let i = 0; i < 6; i++) { const n = R.int(1, 8); t.push(lines(n, R.arr(n, 1, 20))); }
      t.push(lines(1, [1000000000]));
      t.push(lines(20, R.arr(20, 1, 1e9)), lines(20, R.arr(20, 1, 1e9)), lines(20, R.arr(20, 1, 100)));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const n = r.num();
      const p = Array.from({ length: n }, () => r.num());
      const total = p.reduce((a, b) => a + b, 0);
      const sum = new Float64Array(1 << n);
      let best = Infinity;
      for (let m = 0; m < 1 << n; m++) {
        if (m) { const b = 31 - Math.clz32(m & -m); sum[m] = sum[m ^ (1 << b)] + p[b]; }
        best = Math.min(best, Math.abs(total - 2 * sum[m]));
      }
      return best + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    int n; cin >> n;
    vector<long long> p(n);
    long long total = 0;
    for (auto& x : p) { cin >> x; total += x; }
    long long best = LLONG_MAX;
    for (int mask = 0; mask < (1 << n); mask++) {
        long long s = 0;                       // 1-р багийн нийт хүч
        for (int i = 0; i < n; i++) if (mask >> i & 1) s += p[i];
        best = min(best, llabs(total - 2 * s));
    }
    cout << best << "\n";
}
`,
  },
  {
    key: 'bits-2',
    topic: 'bits',
    title: 'XOR-уудын нийлбэр',
    difficulty: 'medium',
    statement: `n тоо өгөгдөв. Тэдгээрийн **бүх 2ⁿ дэд олонлогийн** хувьд элементүүдийн XOR-ыг олоод (хоосон олонлогийн XOR = 0) нэмье.

Нийлбэрийг 10⁹ + 7-д хуваасан үлдэгдлээр гарга.

### Оролт
Эхний мөрөнд n. Хоёр дахь мөрөнд a₁, …, aₙ.

### Гаралт
Бүх дэд олонлогийн XOR-уудын нийлбэр mod 10⁹ + 7.

### Хязгаар
- 1 ≤ n ≤ 2·10⁵
- 0 ≤ aᵢ ≤ 10⁹

> 💡 Бит бүрийг тусад нь бод: аль нэг тоонд тухайн бит асаалттай бол яг хэдэн дэд олонлогийн XOR-д тэр бит асаалттай байх вэ?`,
    samples: [lines(3, [1, 2, 3])],
    gen(R) {
      const t = [];
      for (let i = 0; i < 6; i++) { const n = R.int(1, 10); t.push(lines(n, R.arr(n, 0, 15))); }
      t.push(lines(3, [0, 0, 0]), lines(1, [1000000000]));
      t.push(lines(50000, R.arr(50000, 0, 1e9)));
      t.push(lines(100000, R.arr(100000, 0, 1)));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const n = r.num();
      let or = 0;
      for (let i = 0; i < n; i++) or = (or | r.num()) >>> 0;
      return Number((BigInt(or) * BigInt(powmod(2, n - 1))) % BigInt(MOD)) + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
const long long MOD = 1e9 + 7;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    long long orAll = 0;
    for (int i = 0; i < n; i++) { long long x; cin >> x; orAll |= x; }
    // OR-д асаалттай бит бүр яг 2^(n-1) дэд олонлогийн XOR-д асаалттай
    long long pw = 1;
    for (int i = 0; i < n - 1; i++) pw = pw * 2 % MOD;
    cout << orAll % MOD * pw % MOD << "\n";
}
`,
  },
];
