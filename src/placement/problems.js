// 🎯 Түвшин тогтоох contest: 18 бодлого, нийт 100 оноо (5 түвшин × 20 оноо).
// Дэд оноо (15, 17, 18): 7 тестийн 3 нь жижиг хязгаартай → энгийн шийдэл 3/7 × 7 = 3 оноо.
const { reader, lines, text } = require('../cp-problems/util');

const MOD = 1000000007n;
const big = (s) => BigInt(s);
const words = (R, n) => Array.from({ length: n }, () => R.str(R.int(1, 10), 'abcdefghijklmnopqrstuvwxyz'));

/** C-ийн printf("%.2f")-тэй ижил: яг хагас дээр тэгш рүү (жишээ нь -2.125 → -2.12) */
function fixed2(d) {
  const t = d * 1000;
  if (Number.isInteger(t) && Math.abs(t) % 10 === 5) {
    const lo = Math.floor(d * 100);
    const n = lo % 2 === 0 ? lo : lo + 1;
    return (n / 100).toFixed(2);
  }
  return d.toFixed(2);
}

const PROBLEMS = [
  // ================= Түвшин 1 — Маш амархан (5 × 4 = 20) =================
  {
    key: 'placement-01', title: 'Гурван үйлдэл', difficulty: 'easy', points: 4,
    statement: `Хоёр бүхэл тоо $a$, $b$ өгөгдөнө. $a + b$, $a - b$, $a \\times b$-г тус тусад нь мөр болгон хэвлэ.

## Оролт
Нэг мөрөнд $a$ ба $b$.

## Гаралт
3 мөр: $a+b$, $a-b$, $a \\times b$.

## Хязгаар
- $|a|, |b| \\le 10^9$

> ⚠️ Үржвэр $10^{18}$ хүрнэ — 64 битийн төрөл (\`long long\`) хэрэгтэй.`,
    samples: [lines([7, 3])],
    gen(R) {
      return [lines([0, 0]), lines([-5, 8]), lines([1000000000, 1000000000]), lines([-1000000000, 1000000000]), lines([-1000000000, -1000000000]),
        ...Array.from({ length: 4 }, () => lines([R.int(-1e9, 1e9), R.int(-1e9, 1e9)]))];
    },
    solve(input) { const [a, b] = input.trim().split(/\s+/).map(big); return `${a + b}\n${a - b}\n${a * b}\n`; },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    long long a, b;
    cin >> a >> b;
    cout << a + b << "\n" << a - b << "\n" << a * b << "\n";
}
`,
  },
  {
    key: 'placement-02', title: 'Тэгш үү, сондгой юу?', difficulty: 'easy', points: 4,
    statement: `Бүхэл тоо $n$ өгөгдөнө. Тэгш бол \`EVEN\`, сондгой бол \`ODD\` гэж хэвлэ.

## Оролт
Нэг бүхэл тоо $n$.

## Гаралт
\`EVEN\` эсвэл \`ODD\`.

## Хязгаар
- $|n| \\le 10^9$

> ⚠️ Сөрөг тоо: зарим хэлэнд $-7 \\bmod 2 = -1$ гарна.`,
    samples: [lines(-7)],
    gen(R) { return [0, 1, -1, -8, 1000000000, -1000000000, 999999999, R.int(-1e9, 1e9), R.int(-1e9, 1e9)].map((x) => lines(x)); },
    solve(input) { return (Number(input.trim()) % 2 === 0 ? 'EVEN' : 'ODD') + '\n'; },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    long long n;
    cin >> n;
    cout << (n % 2 == 0 ? "EVEN" : "ODD") << "\n";
}
`,
  },
  {
    key: 'placement-03', title: 'Хамгийн их нь', difficulty: 'easy', points: 4,
    statement: `Гурван бүхэл тооны хамгийн ихийг хэвлэ.

## Оролт
Нэг мөрөнд $a$, $b$, $c$.

## Гаралт
Хамгийн их тоо.

## Хязгаар
- $|a|, |b|, |c| \\le 10^9$`,
    samples: [lines([5, 12, 9])],
    gen(R) {
      return [lines([1, 2, 3]), lines([3, 2, 1]), lines([2, 3, 1]), lines([-5, -2, -9]), lines([7, 7, 7]), lines([-1000000000, -1000000000, -1000000000]),
        ...Array.from({ length: 3 }, () => lines(R.arr(3, -1e9, 1e9)))];
    },
    solve(input) { return Math.max(...input.trim().split(/\s+/).map(Number)) + '\n'; },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    long long a, b, c;
    cin >> a >> b >> c;
    cout << max({a, b, c}) << "\n";
}
`,
  },
  {
    key: 'placement-04', title: 'Үнэлгээний үсэг', difficulty: 'easy', points: 4,
    statement: `Сурагчийн оноо $s$ өгөгдөнө. Үсгэн үнэлгээг хэвлэ:

| Оноо | Үнэлгээ |
|---|---|
| 90–100 | A |
| 80–89 | B |
| 70–79 | C |
| 60–69 | D |
| 0–59 | F |

## Оролт
Нэг бүхэл тоо $s$.

## Гаралт
Нэг үсэг.

## Хязгаар
- $0 \\le s \\le 100$`,
    samples: [lines(85)],
    gen() { return [100, 90, 89, 80, 79, 70, 69, 60, 59, 0].map((x) => lines(x)); },
    solve(input) { const s = Number(input.trim()); return (s >= 90 ? 'A' : s >= 80 ? 'B' : s >= 70 ? 'C' : s >= 60 ? 'D' : 'F') + '\n'; },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    int s;
    cin >> s;
    if (s >= 90) cout << "A\n";
    else if (s >= 80) cout << "B\n";
    else if (s >= 70) cout << "C\n";
    else if (s >= 60) cout << "D\n";
    else cout << "F\n";
}
`,
  },
  {
    key: 'placement-05', title: '1-ээс N хүртэлх нийлбэр', difficulty: 'easy', points: 4,
    statement: `$N$ өгөгдөнө. $1 + 2 + \\dots + N$-ийг ол.

## Оролт
Нэг бүхэл тоо $N$.

## Гаралт
Нийлбэр.

## Хязгаар
- $1 \\le N \\le 10^6$

> ⚠️ Хариу $5 \\times 10^{11}$ хүрнэ — 64 бит хэрэгтэй.`,
    samples: [lines(10)],
    gen(R) { return [1, 2, 1000000, 999999, 65536, R.int(1, 1e6), R.int(1, 1e6), R.int(1, 1000)].map((x) => lines(x)); },
    solve(input) { const n = Number(input.trim()); return (n * (n + 1)) / 2 + '\n'; },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    long long n, s = 0;
    cin >> n;
    for (long long i = 1; i <= n; i++) s += i;
    cout << s << "\n";
}
`,
  },

  // ================= Түвшин 2 — Амархан (4 × 5 = 20) =================
  {
    key: 'placement-06', title: 'Цифрүүдийн нийлбэр', difficulty: 'easy', points: 5,
    statement: `Эерэг бүхэл тоо $n$-ийн цифрүүдийн нийлбэрийг ол.

## Оролт
Нэг бүхэл тоо $n$.

## Гаралт
Цифрүүдийн нийлбэр.

## Хязгаар
- $1 \\le n \\le 10^{18}$

> 💡 \`while\` давталтаар \`n % 10\` (сүүлийн цифр), \`n / 10\` (таслах).`,
    samples: [lines(12345)],
    gen(R) {
      const rnd = () => String(R.int(1, 9)) + Array.from({ length: R.int(0, 17) }, () => R.int(0, 9)).join('');
      return [lines(1), lines(9), lines(10), lines('1000000000000000000'), lines('999999999999999999'), ...Array.from({ length: 4 }, () => lines(rnd()))];
    },
    solve(input) { return [...input.trim()].reduce((s, c) => s + Number(c), 0) + '\n'; },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    long long n;
    cin >> n;
    int s = 0;
    while (n > 0) { s += n % 10; n /= 10; }
    cout << s << "\n";
}
`,
  },
  {
    key: 'placement-07', title: 'Пирамид', difficulty: 'easy', points: 5, checker: 'lines',
    statement: `$n$ өндөртэй одон пирамид зур. $i$-р мөрөнд эхлээд $n - i$ хоосон зай, дараа нь $2i - 1$ од (\`*\`).

**Мөрийн төгсгөлд хоосон зай бүү үлдээ** — энэ бодлогын гаралтыг мөр бүрээр яг таг шалгана.

## Оролт
Нэг бүхэл тоо $n$.

## Гаралт
$n$ мөр пирамид.

## Хязгаар
- $1 \\le n \\le 50$`,
    samples: [lines(3)],
    gen() { return [1, 2, 4, 7, 10, 25, 49, 50].map((x) => lines(x)); },
    solve(input) {
      const n = Number(input.trim());
      return Array.from({ length: n }, (_, k) => ' '.repeat(n - k - 1) + '*'.repeat(2 * k + 1)).join('\n') + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    cin >> n;
    for (int i = 1; i <= n; i++)
        cout << string(n - i, ' ') << string(2 * i - 1, '*') << "\n";
}
`,
  },
  {
    key: 'placement-08', title: 'Дунджаас дээш', difficulty: 'easy', points: 5,
    statement: `$N$ бүхэл тоо өгөгдөнө. Эхний мөрөнд **дундажийг** таслалаас хойш 2 оронтой, хоёр дахь мөрөнд дунджаас **хатуу их** элементийн тоог хэвлэ.

## Оролт
Эхний мөрөнд $N$. Дараагийн мөрөнд $N$ тоо.

## Гаралт
2 мөр.

## Хязгаар
- $1 \\le N \\le 10^5$
- $|a_i| \\le 10^9$

> 💡 Хоёр удаа гүйнэ: эхлээд нийлбэр, дараа нь харьцуулалт. Нийлбэр 64 бит.`,
    samples: [lines(5, [1, 2, 3, 4, 10])],
    gen(R) {
      return [lines(1, [-7]), lines(4, [5, 5, 5, 5]), lines(3, [-1, -2, -4]), lines(8, [-1, -2, -3, -4, -5, -1, -1, 0]),
        ...Array.from({ length: 3 }, () => { const n = R.int(2, 50); return lines(n, R.arr(n, -100, 100)); }),
        lines(100000, R.arr(100000, -1e9, 1e9))];
    },
    solve(input) {
      const r = reader(input); const n = r.num();
      const a = Array.from({ length: n }, () => r.num());
      const sum = a.reduce((s, x) => s + x, 0);
      return `${fixed2(sum / n)}\n${a.filter((x) => x * n > sum).length}\n`;
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    cin >> n;
    vector<long long> a(n);
    long long sum = 0;
    for (auto& x : a) { cin >> x; sum += x; }
    printf("%.2f\n", (double)sum / n);
    int cnt = 0;
    for (auto x : a) if (x * n > sum) cnt++;     // x > sum / n (бүхэл тоогоор)
    printf("%d\n", cnt);
}
`,
  },
  {
    key: 'placement-09', title: 'Анхны тоо', difficulty: 'easy', points: 5,
    statement: `$Q$ тоо өгөгдөнө. Тус бүр **анхны** бол \`YES\`, үгүй бол \`NO\`.

## Оролт
Эхний мөрөнд $Q$. Дараа нь $Q$ тоо.

## Гаралт
$Q$ мөр.

## Хязгаар
- $1 \\le Q \\le 100$
- $1 \\le n \\le 10^9$

> ⚠️ 1 анхны тоо биш. $n$ хүртэл шалгавал хугацаа хэтэрнэ — $\\sqrt{n}$ хүртэл.`,
    samples: [lines(3, [1, 2, 15])],
    gen(R) {
      return [lines(6, [1, 2, 3, 4, 999999937, 1000000000]), lines(4, [999999929, 999999893, 961748941, 999950884]),
        lines(100, Array.from({ length: 100 }, () => (R.next() < 0.5 ? R.pick([999999937, 999999929, 999999893, 998244353, 1000000007 - 8]) : R.int(1, 1e9)))),
        lines(100, R.arr(100, 1, 100)), lines(100, R.arr(100, 1, 1e9)), lines(2, [49, 97])];
    },
    solve(input) {
      const r = reader(input); const q = r.num();
      const prime = (n) => { if (n < 2) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };
      return Array.from({ length: q }, () => (prime(r.num()) ? 'YES' : 'NO')).join('\n') + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
bool isPrime(long long n) {
    if (n < 2) return false;
    for (long long d = 2; d * d <= n; d++) if (n % d == 0) return false;
    return true;
}
int main() {
    int q;
    cin >> q;
    while (q--) { long long n; cin >> n; cout << (isPrime(n) ? "YES" : "NO") << "\n"; }
}
`,
  },

  // ================= Түвшин 3 — Дунд (6 + 7 + 7 = 20) =================
  {
    key: 'placement-10', title: 'Палиндром өгүүлбэр', difficulty: 'medium', points: 6,
    statement: `Нэг мөр текст өгөгдөнө. **Хоосон зайг тооцохгүй**, **том жижиг үсгийг ялгахгүйгээр** палиндром бол \`YES\`, үгүй бол \`NO\`.

## Оролт
Латин үсэг ба хоосон зайнаас бүрдэх нэг мөр.

## Гаралт
\`YES\` эсвэл \`NO\`.

## Хязгаар
- Мөрийн урт $\\le 1000$, дор хаяж нэг үсэгтэй

> 💡 Бүтэн мөр уншина (\`getline\`). Хоёр заагч эсвэл цэвэрлэсэн мөрийг урвуулж харьцуул.`,
    samples: [lines('Never odd or even')],
    gen(R) {
      const pal = (n) => { const h = R.str(n, 'abcAB'); return h + [...h].reverse().join(''); };
      const spaced = (s) => [...s].map((c) => c + (R.next() < 0.3 ? ' ' : '')).join('').trim();
      return [lines('a'), lines('Ab'), lines('A man a plan a canal Panama'), lines('Hello World'), lines('No lemon no melon'),
        lines(spaced(pal(20))), lines(spaced(pal(20).replace(/^./, 'z'))), lines(spaced(pal(400))), lines('ab  BA'), lines('abc cbx')];
    },
    solve(input) {
      const s = input.split('\n')[0].replace(/ /g, '').toLowerCase();
      return (s === [...s].reverse().join('') ? 'YES' : 'NO') + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    string line, s;
    getline(cin, line);
    for (char c : line) if (c != ' ' && c != '\r') s += tolower(c);
    string r(s.rbegin(), s.rend());
    cout << (s == r ? "YES" : "NO") << "\n";
}
`,
  },
  {
    key: 'placement-11', title: 'Хамгийн урт үг', difficulty: 'medium', points: 7,
    statement: `Нэг мөр текст өгөгдөнө. Эхний мөрөнд **үгийн тоог**, хоёр дахь мөрөнд **хамгийн урт үгийг** хэвлэ. Тэнцүү урттай бол эхэлж гарсныг ав.

## Оролт
Үгс нэг буюу хэд хэдэн хоосон зайгаар тусгаарлагдсан нэг мөр (дор хаяж нэг үг).

## Гаралт
2 мөр.

## Хязгаар
- Мөрийн урт $\\le 10^4$`,
    samples: [lines('I love programming in C')],
    gen(R) {
      const join = (ws) => ws.map((w, i) => (i ? ' '.repeat(R.int(1, 3)) : '') + w).join('');
      return [lines('hello'), lines('ab cd ef'), lines('  leading and trailing  '), lines('aaa bbb ccc dd'), lines('x yyyy zzzz w'),
        lines(join(words(R, 10))), lines(join(words(R, 50))), lines(join(words(R, 1500)))];
    },
    solve(input) {
      const ws = input.split('\n')[0].split(/\s+/).filter(Boolean);
      let best = ws[0];
      for (const w of ws) if (w.length > best.length) best = w;
      return `${ws.length}\n${best}\n`;
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    string line, w, best;
    getline(cin, line);
    stringstream ss(line);
    int cnt = 0;
    while (ss >> w) {
        cnt++;
        if (w.size() > best.size()) best = w;
    }
    cout << cnt << "\n" << best << "\n";
}
`,
  },
  {
    key: 'placement-12', title: 'ХИЕХ ба ХБЕХ', difficulty: 'medium', points: 7,
    statement: `$\\gcd(a, b)$ **функц** бичээд түүгээрээ хамгийн их ерөнхий хуваагч (ХИЕХ) ба хамгийн бага ерөнхий хуваагдагчийг (ХБЕХ) ол.

## Оролт
Нэг мөрөнд $a$ ба $b$.

## Гаралт
ХИЕХ ба ХБЕХ-ийг хоосон зайгаар.

## Хязгаар
- $1 \\le a, b \\le 10^9$

> ⚠️ $\\text{lcm} = a / \\gcd(a,b) \\times b$ — эхлээд хуваахгүй бол халина. Евклидийн алгоритм: $\\gcd(a, b) = \\gcd(b, a \\bmod b)$.`,
    samples: [lines([12, 18])],
    gen(R) {
      return [lines([1, 1]), lines([7, 7]), lines([1000000000, 1000000000]), lines([999999937, 999999929]), lines([1, 1000000000]),
        lines([536870912, 1000000000]), ...Array.from({ length: 3 }, () => lines([R.int(1, 1e9), R.int(1, 1e9)]))];
    },
    solve(input) {
      let [a, b] = input.trim().split(/\s+/).map(big);
      const A = a, B = b;
      while (b) [a, b] = [b, a % b];
      return `${a} ${(A / a) * B}\n`;
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
long long gcd2(long long a, long long b) { return b == 0 ? a : gcd2(b, a % b); }
int main() {
    long long a, b;
    cin >> a >> b;
    long long g = gcd2(a, b);
    cout << g << " " << a / g * b << "\n";
}
`,
  },

  // ================= Түвшин 4 — Хүндэвтэр (6 + 7 + 7 = 20) =================
  {
    key: 'placement-13', title: 'Матрицыг эргүүлэх', difficulty: 'medium', points: 6,
    statement: `$N \\times M$ матрицын хөрвүүлсэн (transpose) $M \\times N$ матрицыг хэвлэ: $B_{j,i} = A_{i,j}$.

## Оролт
Эхний мөрөнд $N$ ба $M$. Дараагийн $N$ мөрөнд $M$ тоо.

## Гаралт
$M$ мөр, мөр бүрт $N$ тоо.

## Хязгаар
- $1 \\le N, M \\le 500$
- $|A_{i,j}| \\le 10^9$`,
    samples: [lines([2, 3], [1, 2, 3], [4, 5, 6])],
    gen(R) {
      const mk = (n, m, M) => text([[n, m], ...Array.from({ length: n }, () => R.arr(m, -M, M))]);
      return [mk(1, 1, 9), mk(1, 5, 9), mk(5, 1, 9), mk(3, 3, 9), mk(4, 7, 100), mk(500, 500, 1e9), mk(500, 1, 1e9), mk(1, 500, 1e9)];
    },
    solve(input) {
      const r = reader(input); const n = r.num(), m = r.num();
      const a = Array.from({ length: n }, () => Array.from({ length: m }, () => r.str()));
      return Array.from({ length: m }, (_, j) => a.map((row) => row[j]).join(' ')).join('\n') + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m;
    cin >> n >> m;
    vector<vector<long long>> a(n, vector<long long>(m));
    for (auto& row : a) for (auto& x : row) cin >> x;
    for (int j = 0; j < m; j++)
        for (int i = 0; i < n; i++) cout << a[i][j] << (i + 1 < n ? ' ' : '\n');
}
`,
  },
  {
    key: 'placement-14', title: 'Давтамжаар эрэмбэлэх', difficulty: 'medium', points: 7,
    statement: `$N$ тоо өгөгдөнө. **Ялгаатай** утга бүрийг давтамжтай нь хэвлэ. Давтамж **ихээс бага** руу, тэнцүү бол **утга бага** нь эхэнд.

## Оролт
Эхний мөрөнд $N$. Дараагийн мөрөнд $N$ тоо.

## Гаралт
Мөр бүрт «утга давтамж».

## Хязгаар
- $1 \\le N \\le 2 \\times 10^5$
- $|a_i| \\le 10^9$

> 💡 \`map\`-аар тоолоод өөрийн харьцуулагчтай \`sort\`.`,
    samples: [lines(7, [4, 1, 4, 2, 1, 4, 3])],
    gen(R) {
      return [lines(1, [5]), lines(5, [3, 3, 3, 3, 3]), lines(6, [-1, 2, -1, 2, 0, 0]), lines(5, [5, 4, 3, 2, 1]),
        ...Array.from({ length: 2 }, () => { const n = R.int(5, 60); return lines(n, R.arr(n, -5, 5)); }),
        lines(200000, R.arr(200000, -1e9, 1e9)), lines(200000, R.arr(200000, -300, 300))];
    },
    solve(input) {
      const r = reader(input); const n = r.num();
      const cnt = new Map();
      for (let i = 0; i < n; i++) { const x = r.num(); cnt.set(x, (cnt.get(x) || 0) + 1); }
      return [...cnt].sort((p, q) => q[1] - p[1] || p[0] - q[0]).map(([v, c]) => `${v} ${c}`).join('\n') + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n;
    cin >> n;
    map<long long, int> cnt;
    for (int i = 0; i < n; i++) { long long x; cin >> x; cnt[x]++; }
    vector<pair<long long, int>> v(cnt.begin(), cnt.end());
    sort(v.begin(), v.end(), [](auto& a, auto& b) { return a.second != b.second ? a.second > b.second : a.first < b.first; });
    for (auto& [val, c] : v) cout << val << " " << c << "\n";
}
`,
  },
  {
    key: 'placement-15', title: 'Хэдэн тоо ≤ x вэ?', difficulty: 'medium', points: 7,
    statement: `$N$ тоо, дараа нь $Q$ асуулга өгөгдөнө. Асуулга бүрт $x$-ээс **бага буюу тэнцүү** элементийн тоог хэвлэ.

## Оролт
Эхний мөрөнд $N$, дараагийн мөрөнд $N$ тоо. Дараа нь $Q$, дараагийн мөрөнд $Q$ ширхэг $x$.

## Гаралт
$Q$ мөр.

## Хязгаар
- $1 \\le N, Q \\le 2 \\times 10^5$
- Бүх тоо $|\\cdot| \\le 10^9$

## Дэд оноо
| Хязгаар | Оноо |
|---|---|
| $N, Q \\le 1000$ — энгийн давталт хүрнэ | 3 |
| Бүтэн хязгаар — $O((N + Q)\\log N)$ хэрэгтэй | 7 |`,
    samples: [lines(5, [7, 1, 5, 3, 9], 3, [4, 9, 0])],
    gen(R) {
      const mk = (n, q, M) => { const a = R.arr(n, -M, M); return text([n, a, q, Array.from({ length: q }, () => (R.next() < 0.2 ? R.pick(a) : R.int(-M - 5, M + 5)))]); };
      // жижиг: 2 (+ жишээ = 3/7), том: 4
      return [mk(1000, 1000, 50), mk(800, 1000, 1e9),
        mk(200000, 200000, 1e9), mk(200000, 200000, 1000), text([200000, Array(200000).fill(5), 200000, Array.from({ length: 200000 }, (_, i) => (i % 3) + 4)]), mk(200000, 200000, 1e9)];
    },
    solve(input) {
      const r = reader(input); const n = r.num();
      const a = Float64Array.from({ length: n }, () => r.num()).sort();
      const q = r.num(); const out = [];
      for (let i = 0; i < q; i++) {
        const x = r.num(); let lo = 0, hi = n;
        while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] <= x) lo = m + 1; else hi = m; }
        out.push(lo);
      }
      return out.join('\n') + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, q;
    cin >> n;
    vector<long long> a(n);
    for (auto& x : a) cin >> x;
    sort(a.begin(), a.end());
    cin >> q;
    while (q--) {
        long long x; cin >> x;
        cout << upper_bound(a.begin(), a.end(), x) - a.begin() << "\n";
    }
}
`,
  },

  // ================= Түвшин 5 — Хүнд (6 + 7 + 7 = 20) =================
  {
    key: 'placement-16', title: 'Ханойн цамхаг', difficulty: 'hard', points: 6,
    statement: `1-р шонд $n$ диск томоос нь жижиг рүү (том нь доор) өрөөстэй. Бүгдийг **3-р шон** руу зөөх **хамгийн цөөн** нүүдлийг ол:
- нэг удаад нэг диск зөөнө;
- том дискийг жижиг дээр тавьж болохгүй.

## Оролт
Нэг бүхэл тоо $n$.

## Гаралт
Эхний мөрөнд нүүдлийн тоо, дараа нь нүүдэл бүрийг «хаанаас хаашаа» хэлбэрээр.

## Хязгаар
- $1 \\le n \\le 10$

> 💡 Рекурс: $n-1$ дискийг туслах шон руу, том дискийг зорилго руу, $n-1$-ийг дээр нь.`,
    samples: [lines(2)],
    gen() { return [1, 3, 4, 6, 8, 9, 10].map((x) => lines(x)); },
    solve(input) {
      const out = [];
      const go = (n, a, b, c) => { if (!n) return; go(n - 1, a, c, b); out.push(`${a} ${b}`); go(n - 1, c, b, a); };
      go(Number(input.trim()), 1, 3, 2);
      return out.length + '\n' + out.join('\n') + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
void hanoi(int n, int from, int to, int via) {
    if (n == 0) return;
    hanoi(n - 1, from, via, to);
    cout << from << " " << to << "\n";
    hanoi(n - 1, via, to, from);
}
int main() {
    int n;
    cin >> n;
    cout << (1 << n) - 1 << "\n";
    hanoi(n, 1, 3, 2);
}
`,
  },
  {
    key: 'placement-17', title: 'Хэсгийн нийлбэр', difficulty: 'hard', points: 7,
    statement: `$N$ тоо ба $Q$ асуулга өгөгдөнө. Асуулга бүр $l$ $r$ бөгөөд $a_l + a_{l+1} + \\dots + a_r$-ийг хэвлэ (1-ээс эхэлсэн индекс).

## Оролт
Эхний мөрөнд $N$, дараагийн мөрөнд $N$ тоо. Дараа нь $Q$, дараагийн $Q$ мөрөнд $l$ $r$.

## Гаралт
$Q$ мөр.

## Хязгаар
- $1 \\le N, Q \\le 2 \\times 10^5$
- $|a_i| \\le 10^9$, $1 \\le l \\le r \\le N$

## Дэд оноо
| Хязгаар | Оноо |
|---|---|
| $N, Q \\le 1000$ | 3 |
| Бүтэн хязгаар — префикс нийлбэр | 7 |

> ⚠️ Нийлбэр $2 \\times 10^{14}$ хүрнэ — 64 бит.`,
    samples: [lines(5, [3, 1, 4, 1, 5], 3, [1, 3], [2, 5], [4, 4])],
    gen(R) {
      const mk = (n, q, M) => {
        const qs = Array.from({ length: q }, () => { const x = R.int(1, n), y = R.int(1, n); return R.next() < 0.1 ? [x, x] : [Math.min(x, y), Math.max(x, y)]; });
        return text([n, R.arr(n, -M, M), q, ...qs]);
      };
      return [mk(1000, 1000, 1e9), mk(1, 3, 1e9),
        mk(200000, 200000, 1e9), mk(200000, 200000, 1e9), mk(200000, 200000, 10), text([200000, Array(200000).fill(1000000000), 200000, ...Array.from({ length: 200000 }, () => [1, 200000])])];
    },
    solve(input) {
      const r = reader(input); const n = r.num();
      const pre = new Float64Array(n + 1);
      for (let i = 1; i <= n; i++) pre[i] = pre[i - 1] + r.num();
      const q = r.num(); const out = [];
      for (let i = 0; i < q; i++) { const l = r.num(), rr = r.num(); out.push(pre[rr] - pre[l - 1]); }
      return out.join('\n') + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, q;
    cin >> n;
    vector<long long> pre(n + 1, 0);
    for (int i = 1; i <= n; i++) { long long x; cin >> x; pre[i] = pre[i - 1] + x; }
    cin >> q;
    while (q--) { int l, r; cin >> l >> r; cout << pre[r] - pre[l - 1] << "\n"; }
}
`,
  },
  {
    key: 'placement-18', title: 'Эвдэрсэн шаттай шат', difficulty: 'hard', points: 7,
    statement: `$n$ шаттай шатаар $0$-ээс $n$ руу өгсөнө. Нэг алхамд **1, 2 эсвэл 3** шат давж болно. $K$ шат эвдэрсэн тул түүн дээр гишгэж болохгүй. Өгсөх аргын тоог $10^9 + 7$-д хуваасан үлдэгдлээр хэвлэ.

## Оролт
Эхний мөрөнд $n$ ба $K$. Дараагийн мөрөнд $K$ ширхэг эвдэрсэн шатны дугаар ($K = 0$ бол энэ мөр байхгүй).

## Гаралт
Аргын тоо $\\bmod (10^9 + 7)$.

## Хязгаар
- $1 \\le n \\le 10^6$, $0 \\le K < n$
- $1 \\le b_i < n$, ялгаатай

## Дэд оноо
| Хязгаар | Оноо |
|---|---|
| $n \\le 20$ — рекурсээр хүрнэ | 3 |
| Бүтэн хязгаар — динамик програмчлал | 7 |

> 💡 $\\text{ways}[i] = \\text{ways}[i-1] + \\text{ways}[i-2] + \\text{ways}[i-3]$, эвдэрсэн шатанд $0$.`,
    samples: [lines([4, 0]), lines([4, 1], [2])],
    gen(R) {
      const mk = (n, k) => {
        const set = new Set(); while (set.size < k) set.add(R.int(1, n - 1));
        return k ? lines([n, k], [...set]) : lines([n, 0]);
      };
      // жижиг: 1 (+ 2 жишээ = 3/7), том: 4 (нэг нь дараалсан 3 эвдэрсэн → 0)
      return [mk(20, 3),
        mk(1000000, 0), mk(1000000, 1000), lines([1000000, 3], [500000, 500001, 500002]), mk(999999, 300000)];
    },
    solve(input) {
      const r = reader(input); const n = r.num(), k = r.num();
      const broken = new Uint8Array(n + 1);
      for (let i = 0; i < k; i++) broken[r.num()] = 1;
      const w = new Int32Array(n + 1); w[0] = 1;
      const M = Number(MOD);
      for (let i = 1; i <= n; i++) {
        if (broken[i]) continue;
        let s = w[i - 1] + (i >= 2 ? w[i - 2] : 0);
        if (s >= M) s -= M;
        s += i >= 3 ? w[i - 3] : 0;
        if (s >= M) s -= M;
        w[i] = s;
      }
      return w[n] + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
const long long MOD = 1e9 + 7;
int main() {
    int n, k;
    cin >> n >> k;
    vector<char> broken(n + 1, 0);
    for (int i = 0; i < k; i++) { int b; cin >> b; broken[b] = 1; }
    vector<long long> w(n + 1, 0);
    w[0] = 1;
    for (int i = 1; i <= n; i++) {
        if (broken[i]) continue;
        for (int s = 1; s <= 3 && s <= i; s++) w[i] += w[i - s];
        w[i] %= MOD;
    }
    cout << w[n] << "\n";
}
`,
  },
];

module.exports = { PROBLEMS, fixed2 };
