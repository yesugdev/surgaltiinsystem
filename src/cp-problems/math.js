// Математик: тоон онол, комбинаторик
const { MOD, mul, powmod, reader, lines, text } = require('./util');

/** fact, invFact массивууд (0..n) */
function factorials(n) {
  const fact = new Array(n + 1), inv = new Array(n + 1);
  fact[0] = 1;
  for (let i = 1; i <= n; i++) fact[i] = mul(fact[i - 1], i);
  inv[n] = powmod(fact[n], MOD - 2);
  for (let i = n; i > 0; i--) inv[i - 1] = mul(inv[i], i);
  return { C: (a, b) => (b < 0 || b > a ? 0 : mul(mul(fact[a], inv[b]), inv[a - b])) };
}

module.exports = [
  // ---------- Тоон онол ----------
  {
    key: 'number-theory-1',
    topic: 'number-theory',
    title: 'Хуваагчийн тоо',
    difficulty: 'easy',
    statement: `q асуулга ирнэ: x тоо бүрийн хувьд түүний **эерэг хуваагчийн тоог** ол. Жишээ нь 12-ын хуваагч 1, 2, 3, 4, 6, 12 → 6.

### Оролт
Эхний мөрөнд q. Дараагийн q мөрөнд x.

### Гаралт
Асуулга бүрийн хариу тусдаа мөрөнд.

### Хязгаар
- 1 ≤ q ≤ 10⁵
- 1 ≤ x ≤ 10⁶

> 💡 Асуулга бүрт √x хүртэл давтахад 10⁵ · 10³ = 10⁸ — арай удаан. Илүү сайн: шигшүүр маягаар d бүрийг түүний бүх үржвэрт нэмж, 10⁶ хүртэлх бүх хариуг урьдчилан бод (O(N log N)).`,
    samples: [lines(4, 12, 1, 7, 36)],
    gen(R) {
      const t = [];
      for (let i = 0; i < 5; i++) { const q = R.int(1, 10); t.push(text([q, ...R.arr(q, 1, 100)])); }
      t.push(lines(5, 1000000, 999983, 720720, 1, 2));
      t.push(text([50000, ...R.arr(50000, 1, 1e6)]));
      t.push(text([50000, ...R.arr(50000, 900000, 1e6)]));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const q = r.num();
      const N = 1000000;
      const d = new Int32Array(N + 1);
      for (let i = 1; i <= N; i++) for (let j = i; j <= N; j += i) d[j]++;
      const out = [];
      for (let i = 0; i < q; i++) out.push(d[r.num()]);
      return out.join('\n') + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
const int N = 1000000;
int cnt[N + 1];
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    for (int d = 1; d <= N; d++)
        for (int m = d; m <= N; m += d) cnt[m]++;   // d нь m-ийн хуваагч
    int q; cin >> q;
    while (q--) { int x; cin >> x; cout << cnt[x] << "\n"; }
}
`,
  },
  {
    key: 'number-theory-2',
    topic: 'number-theory',
    title: 'Хамгийн их ХИЕХ',
    difficulty: 'medium',
    statement: `n эерэг тоо өгөгдөв. Тэдгээрээс **хоёр өөр байрлалын** тоо сонгож хамгийн их ерөнхий хуваагчийг (ХИЕХ, gcd) нь хамгийн их болго. Тэр утгыг гарга.

### Оролт
Эхний мөрөнд n. Хоёр дахь мөрөнд a₁, …, aₙ.

### Гаралт
Хос тоонуудын ХИЕХ-ийн хамгийн их утга.

### Хязгаар
- 2 ≤ n ≤ 2·10⁵
- 1 ≤ aᵢ ≤ 10⁶

> 💡 Бүх хосыг шалгах O(n²) удаан. Харин эсрэгээр бод: d-ээс доош буурч, d-д хуваагдах тоо **дор хаяж хоёр** байгаа эсэхийг шалга. cnt массив + гармоник цуваа → O(M log M).`,
    samples: [lines(5, [3, 14, 15, 7, 9])],
    gen(R) {
      const t = [];
      for (let i = 0; i < 6; i++) { const n = R.int(2, 10); t.push(lines(n, R.arr(n, 1, 50))); }
      t.push(lines(2, [1000000, 1000000]), lines(2, [999983, 999979]));
      t.push(lines(50000, R.arr(50000, 1, 1e6)));
      t.push(lines(100000, R.arr(100000, 1, 1e5)));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const n = r.num();
      const M = 1000000;
      const cnt = new Int32Array(M + 1);
      for (let i = 0; i < n; i++) cnt[r.num()]++;
      for (let d = M; d >= 1; d--) {
        let c = 0;
        for (let m = d; m <= M && c < 2; m += d) c += cnt[m];
        if (c >= 2) return d + '\n';
      }
      return '1\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
const int M = 1000000;
int cnt[M + 1];
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    for (int i = 0; i < n; i++) { int x; cin >> x; cnt[x]++; }
    for (int d = M; d >= 1; d--) {
        int c = 0;
        for (int m = d; m <= M && c < 2; m += d) c += cnt[m];
        if (c >= 2) { cout << d << "\n"; return 0; }
    }
}
`,
  },
  // ---------- Комбинаторик ----------
  {
    key: 'combinatorics-1',
    topic: 'combinatorics',
    title: 'Багийн сонголт',
    difficulty: 'easy',
    statement: `Олимпиадын багш a сурагчаас b сурагчийг багт сонгох хэдэн арга байгааг мэдэхийг хүсчээ — энэ нь C(a, b). Ийм q асуулгад хариул.

Хариуг 10⁹ + 7-д хуваасан үлдэгдлээр гарга.

### Оролт
Эхний мөрөнд q. Дараагийн q мөрөнд a ба b.

### Гаралт
Асуулга бүрийн хувьд C(a, b) mod 10⁹ + 7.

### Хязгаар
- 1 ≤ q ≤ 10⁵
- 0 ≤ b ≤ a ≤ 10⁶

> 💡 Факториал ба урвуу факториалыг **нэг удаа** урьдчилан бод — асуулга бүр O(1).`,
    samples: [lines(3, [5, 2], [10, 0], [6, 3])],
    gen(R) {
      const t = [];
      const mk = (q, M) => text([q, ...Array.from({ length: q }, () => { const a = R.int(0, M); return [a, R.int(0, a)]; })]);
      for (let i = 0; i < 5; i++) t.push(mk(R.int(1, 10), 20));
      t.push(lines(3, [1000000, 500000], [1000000, 1000000], [0, 0]));
      t.push(mk(50000, 1e6), mk(50000, 1e6));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const q = r.num();
      const { C } = factorials(1000000);
      const out = [];
      for (let i = 0; i < q; i++) { const a = r.num(), b = r.num(); out.push(C(a, b)); }
      return out.join('\n') + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
const int MOD = 1e9 + 7, MAXN = 1e6 + 1;
long long fact[MAXN], inv_fact[MAXN];
long long power(long long a, long long b) {
    long long r = 1; a %= MOD;
    for (; b > 0; b >>= 1, a = a * a % MOD) if (b & 1) r = r * a % MOD;
    return r;
}
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    fact[0] = 1;
    for (int i = 1; i < MAXN; i++) fact[i] = fact[i - 1] * i % MOD;
    inv_fact[MAXN - 1] = power(fact[MAXN - 1], MOD - 2);
    for (int i = MAXN - 1; i > 0; i--) inv_fact[i - 1] = inv_fact[i] * i % MOD;
    int q; cin >> q;
    while (q--) {
        int a, b; cin >> a >> b;
        cout << fact[a] * inv_fact[b] % MOD * inv_fact[a - b] % MOD << "\n";
    }
}
`,
  },
  {
    key: 'combinatorics-2',
    topic: 'combinatorics',
    title: 'Зөв хаалтууд',
    difficulty: 'medium',
    statement: `n урттай, \`(\` ба \`)\`-аас тогтох **зөв** хаалтын дараалал хэд байна вэ? Зөв гэдэг нь хаалт бүр хосоороо, зөв дарааллаар хаагдана гэсэн үг: \`(())()\` зөв, \`())(\` буруу.

Хариуг 10⁹ + 7-д хуваасан үлдэгдлээр гарга.

### Оролт
Нэг тоо n.

### Гаралт
Зөв хаалтын дарааллын тоо mod 10⁹ + 7.

### Хязгаар
- 1 ≤ n ≤ 10⁶

> 💡 n сондгой бол 0. Үгүй бол **Каталаны тоо** C(n/2) = C(n, n/2) / (n/2 + 1). Номын 22.2 (х. 210).`,
    samples: [lines(6), lines(5)],
    gen(R) {
      return [lines(2), lines(1), lines(8), lines(2 * R.int(5, 30)), lines(2 * R.int(1000, 5000) + 1), lines(999998), lines(1000000)];
    },
    solve(input) {
      const n = Number(input.trim());
      if (n % 2) return '0\n';
      const { C } = factorials(n);
      return mul(C(n, n / 2), powmod(n / 2 + 1, MOD - 2)) + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
const int MOD = 1e9 + 7;
long long power(long long a, long long b) {
    long long r = 1; a %= MOD;
    for (; b > 0; b >>= 1, a = a * a % MOD) if (b & 1) r = r * a % MOD;
    return r;
}
int main() {
    int n; cin >> n;
    if (n % 2) { cout << 0 << "\n"; return 0; }
    int k = n / 2;
    vector<long long> fact(n + 1);
    fact[0] = 1;
    for (int i = 1; i <= n; i++) fact[i] = fact[i - 1] * i % MOD;
    // Каталан: (2k)! / (k! · (k+1)!)
    long long ans = fact[n] * power(fact[k], MOD - 2) % MOD * power(fact[k] * (k + 1) % MOD, MOD - 2) % MOD;
    cout << ans << "\n";
}
`,
  },
  {
    key: 'combinatorics-3',
    topic: 'combinatorics',
    title: 'Чихэр хуваах',
    difficulty: 'easy',
    statement: `m ширхэг ижил чихрийг n хүүхдэд хуваарилах хэдэн арга бий вэ? Зарим хүүхэд чихэр авахгүй байж болно. Жишээ нь n = 2, m = 2: (2, 0), (1, 1), (0, 2) — 3 арга.

Хариуг 10⁹ + 7-д хуваасан үлдэгдлээр гарга.

### Оролт
Нэг мөрөнд n ба m.

### Гаралт
Аргын тоо mod 10⁹ + 7.

### Хязгаар
- 1 ≤ n, m ≤ 10⁶

> 💡 «Од ба саваа»: m од (чихэр) ба n − 1 саваа (хүүхдийн хил)-ыг мөрөнд байрлуулах → C(n + m − 1, n − 1).`,
    samples: [lines([2, 2]), lines([3, 4])],
    gen(R) {
      const t = [lines([1, 1]), lines([1, 1000000]), lines([1000000, 1])];
      for (let i = 0; i < 3; i++) t.push(lines([R.int(1, 10), R.int(1, 10)]));
      t.push(lines([1000000, 1000000]), lines([R.int(1, 1e6), R.int(1, 1e6)]));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const n = r.num(), m = r.num();
      const { C } = factorials(n + m - 1);
      return C(n + m - 1, n - 1) + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
const int MOD = 1e9 + 7;
long long power(long long a, long long b) {
    long long r = 1; a %= MOD;
    for (; b > 0; b >>= 1, a = a * a % MOD) if (b & 1) r = r * a % MOD;
    return r;
}
int main() {
    int n, m; cin >> n >> m;
    int N = n + m - 1;
    vector<long long> fact(N + 1);
    fact[0] = 1;
    for (int i = 1; i <= N; i++) fact[i] = fact[i - 1] * i % MOD;
    cout << fact[N] * power(fact[n - 1], MOD - 2) % MOD * power(fact[m], MOD - 2) % MOD << "\n";
}
`,
  },
];
