// Хичээл бүрийн хялбар бодлогууд (жижиг тест — анхан шатны сурагчдад)
const { reader, lines, text } = require('../cp-problems/util');

const intLine = (input) => input.trim().split(/\s+/).map(Number);
const cases = (R, k, fn) => Array.from({ length: k }, () => fn(R));

module.exports = [
  // ---------- 1. Алгоритм ----------
  {
    key: 'basics-algorithm-1',
    topic: 'basics-algorithm',
    title: 'Hello, World!',
    difficulty: 'easy',
    statement: `Програмист бүрийн анхны програм! Дэлгэцэнд яг дараах текстийг хэвлэ:

\`\`\`
Hello, World!
\`\`\`

### Оролт
Оролт байхгүй.

### Гаралт
\`Hello, World!\` — том, жижиг үсэг, таслал, анхаарлын тэмдгийг яг ижил бич.

> 💡 Онолын «Анхны C++ програм» хэсгийн кодыг харж бичээрэй.`,
    samples: [''],
    gen() { return []; },
    solve() { return 'Hello, World!\n'; },
    ref: String.raw`#include <iostream>
using namespace std;
int main() {
    cout << "Hello, World!" << endl;
    return 0;
}
`,
  },
  {
    key: 'basics-algorithm-2',
    topic: 'basics-algorithm',
    title: 'Ид шидийн тоо',
    difficulty: 'easy',
    statement: `Илбэчин тоглоом тоглуулж байна. Чи нэг тоо **n** бодоод, дараах алгоритмыг **дарааллаар нь** гүйцэтгэ:

1. n дээр **5** нэм.
2. Гарсан тоогоо **2**-оор үрж.
3. Гарсан тооноос **4**-ийг хас.

Эцэст гарсан тоог хэвлэ.

### Оролт
Нэг бүхэл тоо n.

### Гаралт
Алгоритмын үр дүн.

### Хязгаар
- −1000 ≤ n ≤ 1000

### Жишээний тайлбар
n = 3: 3 + 5 = 8 → 8 · 2 = 16 → 16 − 4 = **12**.`,
    samples: [lines(3), lines(-5)],
    gen(R) { return [lines(0), lines(1000), lines(-1000), ...cases(R, 5, () => lines(R.int(-1000, 1000)))]; },
    solve(input) { const n = Number(input.trim()); return ((n + 5) * 2 - 4) + '\n'; },
    ref: String.raw`#include <iostream>
using namespace std;
int main() {
    int n;
    cin >> n;
    n = n + 5;      // 1-р алхам
    n = n * 2;      // 2-р алхам
    n = n - 4;      // 3-р алхам
    cout << n << endl;
    return 0;
}
`,
  },
  // ---------- 2. Хувьсагч ----------
  {
    key: 'basics-variables-1',
    topic: 'basics-variables',
    title: 'Хэдэн настай вэ?',
    difficulty: 'easy',
    statement: `Одоогийн он ба хүний төрсөн он өгөгдөнө. Тэр хүн энэ жил хэдэн нас хүрэх вэ?

### Оролт
Нэг мөрөнд хоёр бүхэл тоо: одоогийн он **y** ба төрсөн он **b**.

### Гаралт
Нас (y − b).

### Хязгаар
- 1900 ≤ b ≤ y ≤ 2100`,
    samples: [lines([2026, 2012])],
    gen(R) { return [lines([2000, 2000]), lines([2100, 1900]), ...cases(R, 6, () => { const b = R.int(1900, 2100); return lines([R.int(b, 2100), b]); })]; },
    solve(input) { const [y, b] = intLine(input); return (y - b) + '\n'; },
    ref: String.raw`#include <iostream>
using namespace std;
int main() {
    int y, b;
    cin >> y >> b;
    int age = y - b;
    cout << age << endl;
    return 0;
}
`,
  },
  {
    key: 'basics-variables-2',
    topic: 'basics-variables',
    title: 'Байраа солих',
    difficulty: 'easy',
    statement: `Хоёр тоо a ба b өгөгдөнө. Тэдгээрийн утгыг **сольж**, эхлээд b-г, дараа нь a-г хэвлэ.

### Оролт
Нэг мөрөнд хоёр бүхэл тоо a ба b.

### Гаралт
b ба a-г хоосон зайгаар тусгаарлан нэг мөрөнд.

### Хязгаар
- −10⁹ ≤ a, b ≤ 10⁹

> 💡 Туслах хувьсагч ашиглан солих аргыг онолоос үзээрэй.`,
    samples: [lines([3, 7])],
    gen(R) { return [lines([0, 0]), lines([-1000000000, 1000000000]), ...cases(R, 6, () => lines([R.int(-1e9, 1e9), R.int(-1e9, 1e9)]))]; },
    solve(input) { const [a, b] = intLine(input); return `${b} ${a}\n`; },
    ref: String.raw`#include <iostream>
using namespace std;
int main() {
    int a, b;
    cin >> a >> b;
    int t = a;   // туслах хувьсагч
    a = b;
    b = t;
    cout << a << " " << b << endl;
    return 0;
}
`,
  },
  // ---------- 3. Өгөгдлийн төрөл ----------
  {
    key: 'basics-types-1',
    topic: 'basics-types',
    title: 'Талбайн хэмжээ',
    difficulty: 'easy',
    statement: `Тэгш өнцөгт талбайн урт **a**, өргөн **b** метр. Талбай хэдэн квадрат метр вэ?

### Оролт
Нэг мөрөнд хоёр бүхэл тоо a ба b.

### Гаралт
Талбай (a · b).

### Хязгаар
- 1 ≤ a, b ≤ 10⁹

> ⚠️ 10⁹ · 10⁹ = 10¹⁸ — \`int\`-д багтахгүй! \`long long\` ашигла.`,
    samples: [lines([5, 4]), lines([100000, 100000])],
    gen(R) { return [lines([1, 1]), lines([1000000000, 1000000000]), lines([999999937, 999999929]), ...cases(R, 5, () => lines([R.int(1, 1e9), R.int(1, 1e9)]))]; },
    solve(input) { const [a, b] = input.trim().split(/\s+/).map(BigInt); return (a * b).toString() + '\n'; },
    ref: String.raw`#include <iostream>
using namespace std;
int main() {
    long long a, b;
    cin >> a >> b;
    cout << a * b << endl;
    return 0;
}
`,
  },
  {
    key: 'basics-types-2',
    topic: 'basics-types',
    title: 'Дундаж дүн',
    difficulty: 'easy',
    statement: `Болд гурван шалгалт өгч a, b, c оноо авчээ. Түүний **дундаж** оноог **2 орны нарийвчлалтай** хэвлэ.

### Оролт
Нэг мөрөнд гурван бүхэл тоо a, b, c.

### Гаралт
(a + b + c) / 3-ыг таслалаас хойш яг 2 оронтойгоор (жишээ нь \`86.33\`).

### Хязгаар
- 0 ≤ a, b, c ≤ 100

> 💡 \`int\` / \`int\` нь бүхэл хуваалт! \`(a + b + c) / 3.0\` гэж бичээд \`fixed << setprecision(2)\` эсвэл \`printf("%.2f")\` ашигла.`,
    samples: [lines([90, 85, 84]), lines([100, 100, 100])],
    gen(R) { return [lines([0, 0, 0]), lines([0, 0, 1]), lines([100, 100, 99]), ...cases(R, 6, () => lines(R.arr(3, 0, 100)))]; },
    solve(input) { const [a, b, c] = intLine(input); return ((a + b + c) / 3).toFixed(2) + '\n'; },
    ref: String.raw`#include <iostream>
#include <iomanip>
using namespace std;
int main() {
    int a, b, c;
    cin >> a >> b >> c;
    double avg = (a + b + c) / 3.0;
    cout << fixed << setprecision(2) << avg << endl;
    return 0;
}
`,
  },
  // ---------- 4. Оператор ----------
  {
    key: 'basics-operators-1',
    topic: 'basics-operators',
    title: 'Цаг ба минут',
    difficulty: 'easy',
    statement: `Кино **m** минут үргэлжилнэ. Үүнийг хэдэн **цаг**, хэдэн **минут** болохыг ол.

### Оролт
Нэг бүхэл тоо m.

### Гаралт
Хоёр тоо: цаг ба минут (хоосон зайгаар).

### Хязгаар
- 0 ≤ m ≤ 10⁶

> 💡 1 цаг = 60 минут. \`/\` ба \`%\` операторууд хэрэгтэй.`,
    samples: [lines(135), lines(45)],
    gen(R) { return [lines(0), lines(60), lines(59), lines(1000000), ...cases(R, 4, () => lines(R.int(0, 1e6)))]; },
    solve(input) { const m = Number(input.trim()); return `${Math.floor(m / 60)} ${m % 60}\n`; },
    ref: String.raw`#include <iostream>
using namespace std;
int main() {
    int m;
    cin >> m;
    cout << m / 60 << " " << m % 60 << endl;
    return 0;
}
`,
  },
  {
    key: 'basics-operators-2',
    topic: 'basics-operators',
    title: 'Цифрүүдийн нийлбэр',
    difficulty: 'easy',
    statement: `**Гурван оронтой** n тоо өгөгдөнө. Түүний цифрүүдийн нийлбэрийг ол.

### Оролт
Нэг бүхэл тоо n.

### Гаралт
Цифрүүдийн нийлбэр.

### Хязгаар
- 100 ≤ n ≤ 999

### Жишээний тайлбар
472 → 4 + 7 + 2 = **13**.

> 💡 Сүүлийн цифр = \`n % 10\`, дунд цифр = \`n / 10 % 10\`, эхний цифр = \`n / 100\`.`,
    samples: [lines(472), lines(100)],
    gen(R) { return [lines(999), lines(505), ...cases(R, 6, () => lines(R.int(100, 999)))]; },
    solve(input) { const n = Number(input.trim()); return (Math.floor(n / 100) + Math.floor(n / 10) % 10 + n % 10) + '\n'; },
    ref: String.raw`#include <iostream>
using namespace std;
int main() {
    int n;
    cin >> n;
    int sum = n / 100 + n / 10 % 10 + n % 10;
    cout << sum << endl;
    return 0;
}
`,
  },
  // ---------- 5. Нөхцөл ----------
  {
    key: 'basics-conditions-1',
    topic: 'basics-conditions',
    title: 'Тэгш үү, сондгой юу?',
    difficulty: 'easy',
    statement: `Бүхэл тоо n өгөгдөнө. Тэгш бол \`EVEN\`, сондгой бол \`ODD\` гэж хэвлэ.

### Оролт
Нэг бүхэл тоо n.

### Гаралт
\`EVEN\` эсвэл \`ODD\`.

### Хязгаар
- −10⁹ ≤ n ≤ 10⁹

> ⚠️ Сөрөг тоонд \`n % 2\` нь −1 гарч болно. \`n % 2 == 0\` гэж шалгавал аюулгүй.`,
    samples: [lines(7), lines(10)],
    gen(R) { return [lines(0), lines(-3), lines(-8), lines(1000000000), lines(-999999999), ...cases(R, 4, () => lines(R.int(-1e9, 1e9)))]; },
    solve(input) { const n = Number(input.trim()); return (n % 2 === 0 ? 'EVEN' : 'ODD') + '\n'; },
    ref: String.raw`#include <iostream>
using namespace std;
int main() {
    int n;
    cin >> n;
    if (n % 2 == 0) cout << "EVEN" << endl;
    else cout << "ODD" << endl;
    return 0;
}
`,
  },
  {
    key: 'basics-conditions-2',
    topic: 'basics-conditions',
    title: 'Үсгэн үнэлгээ',
    difficulty: 'easy',
    statement: `Шалгалтын оноог үсгэн үнэлгээ болго:

| Оноо | Үнэлгээ |
|---|---|
| 90–100 | A |
| 80–89 | B |
| 70–79 | C |
| 60–69 | D |
| 0–59 | F |

### Оролт
Нэг бүхэл тоо s — оноо.

### Гаралт
Нэг үсэг: A, B, C, D эсвэл F.

### Хязгаар
- 0 ≤ s ≤ 100

> 💡 \`if … else if … else\` — нөхцөлүүдийг **ихээс бага руу** дарааллаар шалга.`,
    samples: [lines(85), lines(59)],
    gen() { return [100, 90, 89, 80, 79, 70, 69, 60, 0, 73].map((x) => lines(x)); },
    solve(input) { const s = Number(input.trim()); return (s >= 90 ? 'A' : s >= 80 ? 'B' : s >= 70 ? 'C' : s >= 60 ? 'D' : 'F') + '\n'; },
    ref: String.raw`#include <iostream>
using namespace std;
int main() {
    int s;
    cin >> s;
    if (s >= 90) cout << "A";
    else if (s >= 80) cout << "B";
    else if (s >= 70) cout << "C";
    else if (s >= 60) cout << "D";
    else cout << "F";
    cout << endl;
    return 0;
}
`,
  },
  // ---------- 6. Давталт ----------
  {
    key: 'basics-loops-1',
    topic: 'basics-loops',
    title: '1-ээс n хүртэл',
    difficulty: 'easy',
    statement: `1 + 2 + 3 + … + n нийлбэрийг **давталт** ашиглан ол.

### Оролт
Нэг бүхэл тоо n.

### Гаралт
Нийлбэр.

### Хязгаар
- 1 ≤ n ≤ 10⁶

> ⚠️ n = 10⁶ үед нийлбэр 5·10¹¹ — \`long long\` хэрэгтэй.`,
    samples: [lines(4), lines(10)],
    gen(R) { return [lines(1), lines(1000000), lines(65536), ...cases(R, 4, () => lines(R.int(1, 1e6)))]; },
    solve(input) { const n = Number(input.trim()); return (n * (n + 1) / 2) + '\n'; },
    ref: String.raw`#include <iostream>
using namespace std;
int main() {
    int n;
    cin >> n;
    long long sum = 0;
    for (int i = 1; i <= n; i++) sum += i;
    cout << sum << endl;
    return 0;
}
`,
  },
  {
    key: 'basics-loops-2',
    topic: 'basics-loops',
    title: 'Үржүүлэх хүснэгт',
    difficulty: 'easy',
    statement: `n тооны үржүүлэх хүснэгтийг 1-ээс 10 хүртэл хэвлэ. Мөр бүр \`n x i = r\` хэлбэртэй.

### Оролт
Нэг бүхэл тоо n.

### Гаралт
10 мөр: \`n x 1 = …\`, \`n x 2 = …\`, …, \`n x 10 = …\` (тэмдэгт бүрийн хооронд нэг хоосон зай).

### Хязгаар
- 1 ≤ n ≤ 1000`,
    samples: [lines(7)],
    gen(R) { return [lines(1), lines(1000), ...cases(R, 5, () => lines(R.int(2, 999)))]; },
    solve(input) { const n = Number(input.trim()); return Array.from({ length: 10 }, (_, i) => `${n} x ${i + 1} = ${n * (i + 1)}`).join('\n') + '\n'; },
    ref: String.raw`#include <iostream>
using namespace std;
int main() {
    int n;
    cin >> n;
    for (int i = 1; i <= 10; i++)
        cout << n << " x " << i << " = " << n * i << "\n";
    return 0;
}
`,
  },
  // ---------- 7. Массив ----------
  {
    key: 'basics-arrays-1',
    topic: 'basics-arrays',
    title: 'Хамгийн өндөр сурагч',
    difficulty: 'easy',
    statement: `Ангид n сурагч бий, i-р сурагчийн өндөр hᵢ см. **Хамгийн өндөр** сурагчийн өндөр ба түүний **дугаарыг** (1-ээс эхэлсэн; хэд хэд байвал хамгийн бага дугаарыг) хэвлэ.

### Оролт
Эхний мөрөнд n. Хоёр дахь мөрөнд h₁, h₂, …, hₙ.

### Гаралт
Хамгийн их өндөр ба дугаар (хоосон зайгаар).

### Хязгаар
- 1 ≤ n ≤ 1000
- 100 ≤ hᵢ ≤ 220`,
    samples: [lines(5, [150, 162, 158, 162, 149])],
    gen(R) { return [lines(1, [170]), lines(3, [200, 200, 200]), ...cases(R, 5, () => { const n = R.int(2, 1000); return lines(n, R.arr(n, 100, 220)); })]; },
    solve(input) {
      const r = reader(input); const n = r.num();
      let mx = -1, at = 0;
      for (let i = 1; i <= n; i++) { const h = r.num(); if (h > mx) { mx = h; at = i; } }
      return `${mx} ${at}\n`;
    },
    ref: String.raw`#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n;
    cin >> n;
    vector<int> h(n);
    for (int i = 0; i < n; i++) cin >> h[i];
    int best = 0;                                 // хамгийн өндрийн индекс
    for (int i = 1; i < n; i++) if (h[i] > h[best]) best = i;
    cout << h[best] << " " << best + 1 << endl;
    return 0;
}
`,
  },
  {
    key: 'basics-arrays-2',
    topic: 'basics-arrays',
    title: 'Урвуу дараалал',
    difficulty: 'easy',
    statement: `n тоо өгөгдөнө. Тэдгээрийг **урвуу** дарааллаар хэвлэ.

### Оролт
Эхний мөрөнд n. Хоёр дахь мөрөнд a₁, a₂, …, aₙ.

### Гаралт
aₙ, …, a₂, a₁-ийг нэг мөрөнд хоосон зайгаар.

### Хязгаар
- 1 ≤ n ≤ 10⁵
- −10⁹ ≤ aᵢ ≤ 10⁹`,
    samples: [lines(5, [1, 2, 3, 4, 5]), lines(3, [-7, 0, 12])],
    gen(R) { return [lines(1, [42]), ...cases(R, 5, () => { const n = R.int(2, 50); return lines(n, R.arr(n, -100, 100)); }), lines(100000, R.arr(100000, -1e9, 1e9))]; },
    solve(input) { const r = reader(input); const n = r.num(); return r.rest().slice(0, n).reverse().join(' ') + '\n'; },
    ref: String.raw`#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    for (int i = n - 1; i >= 0; i--) cout << a[i] << (i > 0 ? " " : "\n");
    return 0;
}
`,
  },
  // ---------- 8. Функц ----------
  {
    key: 'basics-functions-1',
    topic: 'basics-functions',
    title: 'Гурвын хамгийн их',
    difficulty: 'easy',
    statement: `q асуулга ирнэ. Асуулга бүрт гурван тоо өгөгдөх бөгөөд хамгийн ихийг нь хэвлэ.

\`int max3(int a, int b, int c)\` гэсэн **функц** бичээд асуулга бүрт дуудаарай.

### Оролт
Эхний мөрөнд q. Дараагийн q мөр бүрт гурван бүхэл тоо a, b, c.

### Гаралт
Асуулга бүрийн хариуг тусдаа мөрөнд.

### Хязгаар
- 1 ≤ q ≤ 1000
- −10⁹ ≤ a, b, c ≤ 10⁹`,
    samples: [lines(3, [3, 9, 4], [-1, -5, -2], [7, 7, 7])],
    gen(R) { return cases(R, 6, () => { const q = R.int(1, 1000); return text([q, ...cases(R, q, () => R.arr(3, -1e9, 1e9))]); }); },
    solve(input) { const r = reader(input); const q = r.num(); const out = []; for (let i = 0; i < q; i++) out.push(Math.max(r.num(), r.num(), r.num())); return out.join('\n') + '\n'; },
    ref: String.raw`#include <iostream>
using namespace std;

int max3(int a, int b, int c) {
    int m = a;
    if (b > m) m = b;
    if (c > m) m = c;
    return m;
}

int main() {
    int q;
    cin >> q;
    while (q--) {
        int a, b, c;
        cin >> a >> b >> c;
        cout << max3(a, b, c) << "\n";
    }
    return 0;
}
`,
  },
  {
    key: 'basics-functions-2',
    topic: 'basics-functions',
    title: 'Анхны тоо мөн үү?',
    difficulty: 'easy',
    statement: `q тоо өгөгдөнө. Тоо бүр **анхны** (зөвхөн 1 ба өөртөө хуваагддаг, 1-ээс их) бол \`YES\`, үгүй бол \`NO\` гэж хэвлэ.

\`bool isPrime(int n)\` функц бичээрэй.

### Оролт
Эхний мөрөнд q. Дараагийн q мөрөнд нэг нэг тоо n.

### Гаралт
Тоо бүрийн хариуг тусдаа мөрөнд.

### Хязгаар
- 1 ≤ q ≤ 1000
- 1 ≤ n ≤ 10⁹

> 💡 √n хүртэл шалгах нь хангалттай (\`d * d <= n\`). 10⁹ хүртэлх тоонд \`d * d\` халихгүйн тулд \`long long\` ашигла.`,
    samples: [lines(5, 2, 1, 9, 17, 999999937)],
    gen(R) {
      const fixed = lines(8, 1, 2, 3, 4, 999999937, 999999938, 1000000000, 999983);
      return [fixed, ...cases(R, 4, () => { const q = R.int(1, 1000); return text([q, ...R.arr(q, 1, 1e9)]); }), text([1000, ...R.arr(1000, 1, 1000)])];
    },
    solve(input) {
      const r = reader(input); const q = r.num(); const out = [];
      const isPrime = (n) => { if (n < 2) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };
      for (let i = 0; i < q; i++) out.push(isPrime(r.num()) ? 'YES' : 'NO');
      return out.join('\n') + '\n';
    },
    ref: String.raw`#include <iostream>
using namespace std;

bool isPrime(long long n) {
    if (n < 2) return false;
    for (long long d = 2; d * d <= n; d++)
        if (n % d == 0) return false;
    return true;
}

int main() {
    int q;
    cin >> q;
    while (q--) {
        long long n;
        cin >> n;
        cout << (isPrime(n) ? "YES" : "NO") << "\n";
    }
    return 0;
}
`,
  },
  // ---------- 9. Тэмдэгт мөр ----------
  {
    key: 'basics-strings-1',
    topic: 'basics-strings',
    title: 'Эгшгийн тоо',
    difficulty: 'easy',
    statement: `Жижиг латин үсгээс тогтох үг өгөгдөнө. Үгэнд хэдэн **эгшиг** (\`a\`, \`e\`, \`i\`, \`o\`, \`u\`) байна вэ?

### Оролт
Нэг мөрөнд үг s.

### Гаралт
Эгшгийн тоо.

### Хязгаар
- 1 ≤ |s| ≤ 1000`,
    samples: [lines('programming'), lines('rhythm')],
    gen(R) { return [lines('a'), lines('aeiou'), lines('bcdfg'), ...cases(R, 5, () => lines(R.str(R.int(1, 1000), 'abcdefghijklmnopqrstuvwxyz')))]; },
    solve(input) { return [...input.trim()].filter((c) => 'aeiou'.includes(c)).length + '\n'; },
    ref: String.raw`#include <iostream>
#include <string>
using namespace std;
int main() {
    string s;
    cin >> s;
    int cnt = 0;
    for (char c : s)
        if (c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u') cnt++;
    cout << cnt << endl;
    return 0;
}
`,
  },
  {
    key: 'basics-strings-2',
    topic: 'basics-strings',
    title: 'Палиндром',
    difficulty: 'easy',
    statement: `Урдаасаа ба хойноосоо ижил уншигддаг үгийг **палиндром** гэнэ (\`level\`, \`noon\`). Өгөгдсөн үг палиндром бол \`YES\`, үгүй бол \`NO\`.

### Оролт
Нэг мөрөнд үг s (жижиг латин үсэг).

### Гаралт
\`YES\` эсвэл \`NO\`.

### Хязгаар
- 1 ≤ |s| ≤ 10⁵`,
    samples: [lines('level'), lines('code')],
    gen(R) {
      const pal = (n) => { const h = R.str(n, 'abc'); return h + [...h].reverse().join(''); };
      return [lines('a'), lines('ab'), lines('aa'), lines(pal(4)), lines(pal(3) + 'x' + [...pal(3)].reverse().join('')), lines(pal(50000)), lines(pal(50000).replace(/.$/, 'z')), ...cases(R, 3, () => lines(R.str(R.int(2, 10), 'ab')))];
    },
    solve(input) { const s = input.trim(); return (s === [...s].reverse().join('') ? 'YES' : 'NO') + '\n'; },
    ref: String.raw`#include <iostream>
#include <string>
using namespace std;
int main() {
    string s;
    cin >> s;
    int i = 0, j = (int)s.size() - 1;
    bool ok = true;
    while (i < j) {
        if (s[i] != s[j]) { ok = false; break; }
        i++; j--;
    }
    cout << (ok ? "YES" : "NO") << endl;
    return 0;
}
`,
  },
  // ---------- 10. Рекурс ----------
  {
    key: 'basics-recursion-1',
    topic: 'basics-recursion',
    title: 'Факториал',
    difficulty: 'easy',
    statement: `n! = 1 · 2 · 3 · … · n (0! = 1). n!-ийг **рекурсив функцээр** ол.

### Оролт
Нэг бүхэл тоо n.

### Гаралт
n!

### Хязгаар
- 0 ≤ n ≤ 20

> ⚠️ 20! ≈ 2.4·10¹⁸ — \`long long\`.`,
    samples: [lines(5), lines(0)],
    gen() { return [1, 2, 10, 13, 19, 20].map((x) => lines(x)); },
    solve(input) { let f = 1n; for (let i = 2n; i <= BigInt(input.trim()); i++) f *= i; return f.toString() + '\n'; },
    ref: String.raw`#include <iostream>
using namespace std;

long long fact(int n) {
    if (n == 0) return 1;          // суурь тохиолдол
    return n * fact(n - 1);        // рекурсив алхам
}

int main() {
    int n;
    cin >> n;
    cout << fact(n) << endl;
    return 0;
}
`,
  },
  {
    key: 'basics-recursion-2',
    topic: 'basics-recursion',
    title: 'Ханойн цамхаг',
    difficulty: 'medium',
    statement: `3 шон бий. 1-р шонд n диск том нь доороо байхаар өрөөстэй. Бүх дискийг **3-р шон** руу зөө:
- нэг удаад нэг диск (шонгийн хамгийн дээд дискийг) зөөнө;
- том дискийг жижиг дискийн дээр тавьж болохгүй.

**Хамгийн цөөн** алхмаар зөөх аргыг хэвлэ.

### Оролт
Нэг бүхэл тоо n.

### Гаралт
Эхний мөрөнд алхмын тоо k. Дараагийн k мөрөнд алхам бүр: \`a b\` — a шонгийн дээд дискийг b шон руу.

### Хязгаар
- 1 ≤ n ≤ 12

> 💡 Онолын \`hanoi(n, from, to, via)\` рекурсив функц. Хамгийн цөөн алхмын дараалал ганцхан байдаг.`,
    samples: [lines(2), lines(3)],
    gen() { return [1, 4, 5, 8, 10, 12].map((x) => lines(x)); },
    solve(input) {
      const out = [];
      const go = (n, a, b, c) => { if (!n) return; go(n - 1, a, c, b); out.push(`${a} ${b}`); go(n - 1, c, b, a); };
      go(Number(input.trim()), 1, 3, 2);
      return out.length + '\n' + out.join('\n') + '\n';
    },
    ref: String.raw`#include <iostream>
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
    return 0;
}
`,
  },
  // ---------- 11. Хайлт ----------
  {
    key: 'basics-search-1',
    topic: 'basics-search',
    title: 'Тоо хайх',
    difficulty: 'easy',
    statement: `n тоо ба x өгөгдөнө. x нь массивт **анх** хэддүгээр байрлалд (1-ээс эхэлсэн) байгааг ол. Байхгүй бол -1.

### Оролт
Эхний мөрөнд n ба x. Хоёр дахь мөрөнд a₁, …, aₙ.

### Гаралт
Эхний байрлал эсвэл -1.

### Хязгаар
- 1 ≤ n ≤ 1000
- −10⁶ ≤ x, aᵢ ≤ 10⁶`,
    samples: [lines([6, 4], [7, 4, 9, 4, 1, 3]), lines([3, 5], [1, 2, 3])],
    gen(R) {
      return [lines([1, 5], [5]), lines([1, 5], [6]), ...cases(R, 6, () => { const n = R.int(1, 1000); const a = R.arr(n, -20, 20); return lines([n, R.int(-25, 25)], a); })];
    },
    solve(input) { const r = reader(input); const n = r.num(), x = r.num(); for (let i = 1; i <= n; i++) if (r.num() === x) return i + '\n'; return '-1\n'; },
    ref: String.raw`#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n, x;
    cin >> n >> x;
    vector<int> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    int pos = -1;
    for (int i = 0; i < n; i++)
        if (a[i] == x) { pos = i + 1; break; }
    cout << pos << endl;
    return 0;
}
`,
  },
  {
    key: 'basics-search-2',
    topic: 'basics-search',
    title: 'Утасны жагсаалт',
    difficulty: 'easy',
    statement: `Сургуулийн утасны жагсаалтад n дугаар **өсөх дарааллаар** бичигдсэн. q асуулга ирнэ: «x дугаар жагсаалтад байна уу?»

### Оролт
Эхний мөрөнд n ба q. Хоёр дахь мөрөнд өсөх дарааллаар n ялгаатай тоо. Дараагийн q мөрөнд x.

### Гаралт
Асуулга бүрт \`YES\` эсвэл \`NO\` тусдаа мөрөнд.

### Хязгаар
- 1 ≤ n, q ≤ 10⁵
- 1 ≤ дугаар, x ≤ 10⁹

> 💡 q · n = 10¹⁰ — шугаман хайлт удаан. Массив эрэмбэлэгдсэн тул **хоёртын хайлт**!`,
    samples: [lines([5, 3], [12, 25, 31, 47, 90], 31, 30, 90)],
    gen(R) {
      const mk = (n, q, M) => {
        const set = new Set(); while (set.size < n) set.add(R.int(1, M));
        const a = [...set].sort((x, y) => x - y);
        const qs = Array.from({ length: q }, () => (R.next() < 0.5 ? a[R.int(0, n - 1)] : R.int(1, M)));
        return text([[n, q], a, ...qs]);
      };
      return [mk(1, 3, 5), mk(10, 10, 30), mk(100, 100, 300), mk(100000, 100000, 1e9), mk(50000, 100000, 100000)];
    },
    solve(input) {
      const r = reader(input); const n = r.num(), q = r.num();
      const s = new Set(); for (let i = 0; i < n; i++) s.add(r.num());
      const out = []; for (let i = 0; i < q; i++) out.push(s.has(r.num()) ? 'YES' : 'NO');
      return out.join('\n') + '\n';
    },
    ref: String.raw`#include <iostream>
#include <vector>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, q;
    cin >> n >> q;
    vector<int> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    while (q--) {
        int x;
        cin >> x;
        int lo = 0, hi = n - 1;
        bool found = false;
        while (lo <= hi) {
            int mid = (lo + hi) / 2;
            if (a[mid] == x) { found = true; break; }
            if (a[mid] < x) lo = mid + 1; else hi = mid - 1;
        }
        cout << (found ? "YES" : "NO") << "\n";
    }
    return 0;
}
`,
  },
  // ---------- 12. Эрэмбэлэлт ----------
  {
    key: 'basics-sorting-1',
    topic: 'basics-sorting',
    title: 'Өндрөөр эгнүүлэх',
    difficulty: 'easy',
    statement: `Биеийн тамирын багш n сурагчийг **намаас өндөр** рүү эгнүүлэхийг хүсэв. Өндрүүдийг өсөх дарааллаар хэвлэ.

### Оролт
Эхний мөрөнд n. Хоёр дахь мөрөнд h₁, …, hₙ.

### Гаралт
Өсөх дарааллаар эрэмбэлсэн өндрүүд нэг мөрөнд.

### Хязгаар
- 1 ≤ n ≤ 10⁵
- 1 ≤ hᵢ ≤ 10⁹

> 💡 n = 10⁵ үед bubble sort удаан — \`sort()\` ашигла.`,
    samples: [lines(5, [158, 142, 165, 142, 150])],
    gen(R) { return [lines(1, [7]), lines(4, [4, 3, 2, 1]), ...cases(R, 4, () => { const n = R.int(2, 100); return lines(n, R.arr(n, 100, 200)); }), lines(100000, R.arr(100000, 1, 1e9))]; },
    solve(input) { const r = reader(input); const n = r.num(); return Float64Array.from({ length: n }, () => r.num()).sort().join(' ') + '\n'; },
    ref: String.raw`#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n;
    cin >> n;
    vector<int> h(n);
    for (int i = 0; i < n; i++) cin >> h[i];
    sort(h.begin(), h.end());
    for (int i = 0; i < n; i++) cout << h[i] << (i + 1 < n ? " " : "\n");
    return 0;
}
`,
  },
  {
    key: 'basics-sorting-2',
    topic: 'basics-sorting',
    title: 'Дундах оноо',
    difficulty: 'easy',
    statement: `Тэмцээнд **сондгой** тооны (n) шүүгч оноо өгчээ. Оноонуудыг эрэмбэлэхэд яг **дунд** байрлах оноог (медиан) ол.

### Оролт
Эхний мөрөнд n. Хоёр дахь мөрөнд n оноо.

### Гаралт
Медиан.

### Хязгаар
- 1 ≤ n ≤ 10⁵, n сондгой
- 0 ≤ оноо ≤ 10⁹

### Жишээний тайлбар
[7, 1, 9, 3, 8] → эрэмбэлбэл [1, 3, **7**, 8, 9] → 7.`,
    samples: [lines(5, [7, 1, 9, 3, 8])],
    gen(R) { return [lines(1, [5]), lines(3, [2, 2, 1]), ...cases(R, 4, () => { const n = 2 * R.int(1, 50) + 1; return lines(n, R.arr(n, 0, 100)); }), lines(99999, R.arr(99999, 0, 1e9))]; },
    solve(input) { const r = reader(input); const n = r.num(); const a = Float64Array.from({ length: n }, () => r.num()).sort(); return a[(n - 1) / 2] + '\n'; },
    ref: String.raw`#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;
int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    sort(a.begin(), a.end());
    cout << a[n / 2] << endl;
    return 0;
}
`,
  },
  // ---------- 13. Ахисан алгоритм ----------
  {
    key: 'basics-advanced-1',
    topic: 'basics-advanced',
    title: 'Шатаар өгсөх',
    difficulty: 'medium',
    statement: `n шаттай шат бий. Нэг алхмаар **1** эсвэл **2** шат өгсөж болно. Шатны оройд гарах хэдэн өөр арга бий вэ?

### Оролт
Нэг бүхэл тоо n.

### Гаралт
Аргын тоо.

### Хязгаар
- 1 ≤ n ≤ 80

### Жишээний тайлбар
n = 3: 1+1+1, 1+2, 2+1 — **3** арга.

> 💡 \`ways[i] = ways[i−1] + ways[i−2]\`. Рекурс n = 80 үед хэт удаан — хариуг массивт хадгал. Хариу маш том → \`long long\`.`,
    samples: [lines(3), lines(5)],
    gen() { return [1, 2, 10, 45, 79, 80].map((x) => lines(x)); },
    solve(input) { const n = Number(input.trim()); let a = 1n, b = 1n; for (let i = 2; i <= n; i++) [a, b] = [b, a + b]; return b.toString() + '\n'; },
    ref: String.raw`#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n;
    cin >> n;
    vector<long long> ways(n + 1);
    ways[0] = 1;
    ways[1] = 1;
    for (int i = 2; i <= n; i++) ways[i] = ways[i - 1] + ways[i - 2];
    cout << ways[n] << endl;
    return 0;
}
`,
  },
  {
    key: 'basics-advanced-2',
    topic: 'basics-advanced',
    title: 'Хоёр бэлэг',
    difficulty: 'medium',
    statement: `Дэлгүүрт n бараа байна, i-р барааны үнэ aᵢ. Сараа яг **x** төгрөгтэй. Тэр **хоёр өөр** бараа худалдаж аваад мөнгөө яг дуусгаж чадах уу?

### Оролт
Эхний мөрөнд n ба x. Хоёр дахь мөрөнд a₁, …, aₙ.

### Гаралт
Чадвал \`YES\`, үгүй бол \`NO\`.

### Хязгаар
- 2 ≤ n ≤ 10⁵
- 1 ≤ x, aᵢ ≤ 10⁹

> 💡 Бүх хосыг шалгавал n² ≈ 10¹⁰ — удаан. Эрэмбэлээд **хоёр заагч** ашигла (онолыг үз). Нийлбэр 2·10⁹ хүрч болно → \`long long\`.`,
    samples: [lines([5, 10], [2, 7, 4, 11, 3]), lines([3, 8], [4, 5, 6])],
    gen(R) {
      const t = [lines([2, 2], [1, 1]), lines([2, 3], [1, 1]), lines([3, 8], [4, 4, 9])];
      for (let i = 0; i < 4; i++) { const n = R.int(2, 20); t.push(lines([n, R.int(2, 40)], R.arr(n, 1, 20))); }
      const big = R.arr(100000, 1, 5e8).map((v) => v * 2);          // бүгд тэгш
      t.push(lines([100000, 999999999], big));                       // сондгой x → NO
      const big2 = R.arr(100000, 1, 1e9);
      t.push(lines([100000, big2[123] + big2[98765]], big2));        // YES
      t.push(lines([100000, 1000000000], Array(100000).fill(1000000000)));   // хос бүр 2·10⁹ → NO
      return t;
    },
    solve(input) {
      const r = reader(input); const n = r.num(), x = r.num();
      const seen = new Set();
      for (let i = 0; i < n; i++) { const v = r.num(); if (seen.has(x - v)) return 'YES\n'; seen.add(v); }
      return 'NO\n';
    },
    ref: String.raw`#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n;
    long long x;
    cin >> n >> x;
    vector<long long> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    sort(a.begin(), a.end());
    int i = 0, j = n - 1;
    bool found = false;
    while (i < j) {
        long long s = a[i] + a[j];
        if (s == x) { found = true; break; }
        if (s < x) i++; else j--;
    }
    cout << (found ? "YES" : "NO") << endl;
    return 0;
}
`,
  },
];
