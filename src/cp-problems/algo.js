// Алгоритм: эрэмбэлэлт/хоёртын хайлт, prefix/хоёр заагч, шуналт, бүрэн хайлт, DP
const { MOD, reader, lines, text } = require('./util');

function upperBound(a, x) { // a эрэмбэлэгдсэн; x-ээс их анхны индекс
  let lo = 0, hi = a.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] <= x) lo = m + 1; else hi = m; }
  return lo;
}

module.exports = [
  // ---------- Эрэмбэлэлт ба хоёртын хайлт ----------
  {
    key: 'sorting-1',
    topic: 'sorting-search',
    title: 'Замын дагуух дэлгүүрүүд',
    difficulty: 'easy',
    statement: `Урт шулуун замын дагуу n дэлгүүр байрлана. i-р дэлгүүр замын эхнээс xᵢ метрт (хэд хэдэн дэлгүүр нэг цэгт байж болно).

q асуулга ирнэ: «[l, r] хэрчимд (төгсгөлүүдийг оруулаад) хэдэн дэлгүүр байна вэ?»

### Оролт
Эхний мөрөнд n ба q. Хоёр дахь мөрөнд x₁, …, xₙ. Дараагийн q мөр бүрт l ба r.

### Гаралт
Асуулга бүрийн хариуг тусдаа мөрөнд.

### Хязгаар
- 1 ≤ n, q ≤ 2·10⁵
- 1 ≤ xᵢ ≤ 10⁹, 1 ≤ l ≤ r ≤ 10⁹

> 💡 Эрэмбэлээд \`upper_bound(r) − lower_bound(l)\`.`,
    samples: [lines([5, 3], [8, 2, 15, 8, 4], [3, 8], [9, 14], [1, 100])],
    gen(R) {
      const t = [];
      const mk = (n, q, M) => {
        const rows = [[n, q], R.arr(n, 1, M)];
        for (let i = 0; i < q; i++) { const a = R.int(1, M), b = R.int(1, M); rows.push([Math.min(a, b), Math.max(a, b)]); }
        return text(rows);
      };
      for (let i = 0; i < 6; i++) t.push(mk(R.int(1, 10), R.int(1, 10), 20));
      t.push(mk(50000, 50000, 1e9), mk(50000, 50000, 1000));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const n = r.num(), q = r.num();
      const x = Float64Array.from({ length: n }, () => r.num()).sort();
      const out = [];
      for (let i = 0; i < q; i++) { const l = r.num(), rr = r.num(); out.push(upperBound(x, rr) - upperBound(x, l - 1)); }
      return out.join('\n') + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, q; cin >> n >> q;
    vector<int> x(n);
    for (auto& v : x) cin >> v;
    sort(x.begin(), x.end());
    while (q--) {
        int l, r; cin >> l >> r;
        cout << upper_bound(x.begin(), x.end(), r) - lower_bound(x.begin(), x.end(), l) << "\n";
    }
}
`,
  },
  {
    key: 'sorting-2',
    topic: 'sorting-search',
    title: 'Талхны үйлдвэр',
    difficulty: 'medium',
    statement: `Талхны үйлдвэрт n зуух бий. i-р зуух нэг талхыг tᵢ минутад жигнэнэ (нэг дор нэг талх). Бүх зуух зэрэг ажиллана.

Нийт **k** талх жигнэхэд хамгийн багадаа хэдэн минут хэрэгтэй вэ?

### Оролт
Эхний мөрөнд n ба k. Хоёр дахь мөрөнд t₁, …, tₙ.

### Гаралт
Хамгийн бага хугацаа (минут).

### Хязгаар
- 1 ≤ n ≤ 2·10⁵
- 1 ≤ k ≤ 10⁹
- 1 ≤ tᵢ ≤ 10⁶

> 💡 **Хариуг хоёртын хайлтаар ол:** T минутад Σ ⌊T / tᵢ⌋ талх жигнэгдэнэ. Энэ нь T-ээс хамаарч өсдөг тул k-д хүрэх хамгийн бага T-г хайна. Хариу 10¹⁵ хүртэл → \`long long\`.`,
    samples: [lines([3, 7], [3, 2, 5])],
    gen(R) {
      const t = [];
      for (let i = 0; i < 6; i++) { const n = R.int(1, 6); t.push(lines([n, R.int(1, 30)], R.arr(n, 1, 10))); }
      t.push(lines([1, 1000000000], [1000000]));
      t.push(lines([50000, 1000000000], R.arr(50000, 1, 1e6)));
      t.push(lines([50000, 1000000000], R.arr(50000, 999000, 1e6)));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const n = r.num(), k = r.num();
      const t = Array.from({ length: n }, () => r.num());
      let lo = 1, hi = Math.min(...t) * k;
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        let made = 0;
        for (let i = 0; i < n && made < k; i++) made += Math.floor(mid / t[i]);
        if (made >= k) hi = mid; else lo = mid + 1;
      }
      return lo + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; long long k; cin >> n >> k;
    vector<long long> t(n);
    for (auto& x : t) cin >> x;
    long long lo = 1, hi = *min_element(t.begin(), t.end()) * k;
    while (lo < hi) {
        long long mid = lo + (hi - lo) / 2, made = 0;
        for (int i = 0; i < n && made < k; i++) made += mid / t[i];
        if (made >= k) hi = mid; else lo = mid + 1;
    }
    cout << lo << "\n";
}
`,
  },
  // ---------- Prefix sum ба хоёр заагч ----------
  {
    key: 'prefix-1',
    topic: 'prefix-two-pointers',
    title: 'Алхамын тоолуур',
    difficulty: 'easy',
    statement: `Болд ухаалаг цагаараа n өдрийн алхамаа тоолжээ: i-р өдөр aᵢ алхам.

q асуулга ирнэ: «l-р өдрөөс r-р өдөр хүртэл (хоёуланг нь оруулаад) нийт хэдэн алхсан бэ?»

### Оролт
Эхний мөрөнд n ба q. Хоёр дахь мөрөнд a₁, …, aₙ. Дараагийн q мөрөнд l ба r.

### Гаралт
Асуулга бүрийн хариу тусдаа мөрөнд.

### Хязгаар
- 1 ≤ n, q ≤ 2·10⁵
- 1 ≤ aᵢ ≤ 10⁹, 1 ≤ l ≤ r ≤ n

> 💡 \`pre[i] = a₁ + … + aᵢ\` → хариу \`pre[r] − pre[l−1]\`. Нийлбэр 2·10¹⁴ хүрнэ — \`long long\`!`,
    samples: [lines([5, 3], [3, 1, 4, 1, 5], [1, 3], [2, 5], [4, 4])],
    gen(R) {
      const t = [];
      const mk = (n, q, M) => {
        const rows = [[n, q], R.arr(n, 1, M)];
        for (let i = 0; i < q; i++) { const a = R.int(1, n), b = R.int(1, n); rows.push([Math.min(a, b), Math.max(a, b)]); }
        return text(rows);
      };
      for (let i = 0; i < 6; i++) t.push(mk(R.int(1, 10), R.int(1, 10), 10));
      t.push(mk(50000, 50000, 1e9), mk(50000, 50000, 1e9));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const n = r.num(), q = r.num();
      const pre = new Float64Array(n + 1);
      for (let i = 1; i <= n; i++) pre[i] = pre[i - 1] + r.num();
      const out = [];
      for (let i = 0; i < q; i++) { const l = r.num(), rr = r.num(); out.push(pre[rr] - pre[l - 1]); }
      return out.join('\n') + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, q; cin >> n >> q;
    vector<long long> pre(n + 1, 0);
    for (int i = 1; i <= n; i++) { long long x; cin >> x; pre[i] = pre[i - 1] + x; }
    while (q--) {
        int l, r; cin >> l >> r;
        cout << pre[r] - pre[l - 1] << "\n";
    }
}
`,
  },
  {
    key: 'prefix-2',
    topic: 'prefix-two-pointers',
    title: 'Нийлбэр нь яг x',
    difficulty: 'easy',
    statement: `n **эерэг** тоон дараалал ба x тоо өгөгдөв. Элементүүдийн нийлбэр нь яг x болох **дараалсан хэсэг** (дэд массив) хэд байна вэ?

### Оролт
Эхний мөрөнд n ба x. Хоёр дахь мөрөнд a₁, …, aₙ.

### Гаралт
Ийм дэд массивын тоо.

### Хязгаар
- 1 ≤ n ≤ 2·10⁵
- 1 ≤ x, aᵢ ≤ 10⁹

> 💡 Бүх тоо эерэг тул **хоёр заагч**: баруун хилийг нэмэх тусам нийлбэр өснө; x-ээс хэтэрвэл зүүн хилийг урагшлуул.`,
    samples: [lines([6, 5], [2, 3, 1, 4, 1, 4])],
    gen(R) {
      const t = [];
      for (let i = 0; i < 7; i++) { const n = R.int(1, 15); t.push(lines([n, R.int(1, 12)], R.arr(n, 1, 5))); }
      t.push(lines([5, 1000000000], [1000000000, 1000000000, 1000000000, 1, 1]));
      t.push(lines([50000, 500], R.arr(50000, 1, 10)));
      t.push(lines([50000, 1000000000], R.arr(50000, 1, 1e9)));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const n = r.num(), x = r.num();
      const a = Array.from({ length: n }, () => r.num());
      let cnt = 0, sum = 0, l = 0;
      for (let rr = 0; rr < n; rr++) {
        sum += a[rr];
        while (sum > x) sum -= a[l++];
        if (sum === x) cnt++;
      }
      return cnt + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; long long x; cin >> n >> x;
    vector<long long> a(n);
    for (auto& v : a) cin >> v;
    long long cnt = 0, sum = 0;
    for (int l = 0, r = 0; r < n; r++) {
        sum += a[r];
        while (sum > x) sum -= a[l++];   // хэтэрсэн бол зүүн хилийг урагшлуулна
        if (sum == x) cnt++;
    }
    cout << cnt << "\n";
}
`,
  },
  {
    key: 'prefix-3',
    topic: 'prefix-two-pointers',
    title: 'Долоо хоногийн хамгийн хүйтэн өдөр',
    difficulty: 'medium',
    statement: `Цаг уурын станц n өдрийн температурыг бүртгэжээ: a₁, …, aₙ. Дараалсан k өдөр бүхий **цонх** бүрийн хамгийн бага температурыг ол (цонх [1..k], [2..k+1], …, [n−k+1..n]).

### Оролт
Эхний мөрөнд n ба k. Хоёр дахь мөрөнд a₁, …, aₙ.

### Гаралт
n − k + 1 тоог нэг мөрөнд хоосон зайгаар.

### Хязгаар
- 1 ≤ k ≤ n ≤ 2·10⁵
- −10⁹ ≤ aᵢ ≤ 10⁹

> 💡 Номын «Sliding window minimum» (х. 81): **deque**-д утга нь өсөх дарааллаар индекс хадгал — O(n).`,
    samples: [lines([8, 3], [5, -2, 4, 6, -3, 1, 7, 0])],
    gen(R) {
      const t = [];
      for (let i = 0; i < 7; i++) { const n = R.int(1, 15); t.push(lines([n, R.int(1, n)], R.arr(n, -9, 9))); }
      t.push(lines([1, 1], [-1000000000]));
      t.push(lines([50000, 1000], R.arr(50000, -1e9, 1e9)));
      t.push(lines([50000, 2], Array.from({ length: 50000 }, (_, i) => 50000 - i)));
      t.push(lines([50000, 50000], Array.from({ length: 50000 }, (_, i) => i)));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const n = r.num(), k = r.num();
      const a = Array.from({ length: n }, () => r.num());
      const dq = new Int32Array(n);
      let h = 0, tl = 0;
      const out = [];
      for (let i = 0; i < n; i++) {
        while (tl > h && a[dq[tl - 1]] >= a[i]) tl--;
        dq[tl++] = i;
        if (dq[h] <= i - k) h++;
        if (i >= k - 1) out.push(a[dq[h]]);
      }
      return out.join(' ') + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, k; cin >> n >> k;
    vector<long long> a(n);
    for (auto& v : a) cin >> v;
    deque<int> dq;                                    // a[dq] өсөх дараалалтай
    for (int i = 0; i < n; i++) {
        while (!dq.empty() && a[dq.back()] >= a[i]) dq.pop_back();
        dq.push_back(i);
        if (dq.front() <= i - k) dq.pop_front();      // цонхноос гарсан
        if (i >= k - 1) cout << a[dq.front()] << (i + 1 < n ? ' ' : '\n');
    }
}
`,
  },
  // ---------- Шуналт ----------
  {
    key: 'greedy-1',
    topic: 'greedy',
    title: 'Хурлын танхим',
    difficulty: 'easy',
    statement: `Сургуулийн хурлын танхимыг n арга хэмжээ захиалахыг хүсчээ. i-р арга хэмжээ aᵢ цагт эхэлж bᵢ цагт дуусна. Танхимд нэг зэрэг нэг л арга хэмжээ болно; нэг нь дуусах мөчид нөгөө нь эхэлж болно.

Хамгийн олон арга хэмжээ зохион байгуулах тоог ол.

### Оролт
Эхний мөрөнд n. Дараагийн n мөрөнд aᵢ ба bᵢ.

### Гаралт
Хамгийн олон арга хэмжээний тоо.

### Хязгаар
- 1 ≤ n ≤ 2·10⁵
- 1 ≤ aᵢ < bᵢ ≤ 10⁹

> 💡 Номын 6.2 «Scheduling» (х. 58): **хамгийн эрт дуусах**-ыг сонго.`,
    samples: [lines(4, [1, 4], [2, 3], [3, 7], [5, 8])],
    gen(R) {
      const t = [];
      const mk = (n, M, L) => {
        const rows = [n];
        for (let i = 0; i < n; i++) { const a = R.int(1, M - 1); rows.push([a, Math.min(M, a + R.int(1, L))]); }
        return text(rows);
      };
      for (let i = 0; i < 7; i++) t.push(mk(R.int(1, 10), 20, 6));
      t.push(mk(50000, 1e9, 1e5), mk(50000, 1e9, 1e9), mk(50000, 1000, 3));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const n = r.num();
      const ev = Array.from({ length: n }, () => [r.num(), r.num()]).sort((x, y) => x[1] - y[1]);
      let cnt = 0, last = -Infinity;
      for (const [a, b] of ev) if (a >= last) { cnt++; last = b; }
      return cnt + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    vector<pair<int,int>> ev(n);                     // {дуусах, эхлэх}
    for (auto& [b, a] : ev) cin >> a >> b;
    sort(ev.begin(), ev.end());
    int cnt = 0, last = 0;
    for (auto [b, a] : ev) if (a >= last) { cnt++; last = b; }
    cout << cnt << "\n";
}
`,
  },
  {
    key: 'greedy-2',
    topic: 'greedy',
    title: 'Гэрийн даалгаврууд',
    difficulty: 'medium',
    statement: `Сараа n даалгавартай. i-р даалгаврыг хийхэд aᵢ минут шаардана, «хугацаа» нь dᵢ. Тэр 0-р минутаас эхлэн даалгавруудыг ямар нэг дарааллаар **нэг нэгээр нь** хийнэ.

Даалгаврыг fᵢ минутад дуусгавал **dᵢ − fᵢ** оноо авна (сөрөг байж болно). Нийт оноог хамгийн их болго.

### Оролт
Эхний мөрөнд n. Дараагийн n мөрөнд aᵢ ба dᵢ.

### Гаралт
Хамгийн их нийт оноо.

### Хязгаар
- 1 ≤ n ≤ 2·10⁵
- 1 ≤ aᵢ ≤ 1000, 1 ≤ dᵢ ≤ 10⁹

> 💡 Номын 6.3 «Tasks and deadlines» (х. 60): Σdᵢ дарааллаас **хамаарахгүй**! Тиймээс зөвхөн Σfᵢ-г багасгах хэрэгтэй.`,
    samples: [lines(4, [6, 10], [8, 15], [5, 12], [2, 3])],
    gen(R) {
      const t = [];
      const mk = (n, A, D) => text([n, ...Array.from({ length: n }, () => [R.int(1, A), R.int(1, D)])]);
      for (let i = 0; i < 7; i++) t.push(mk(R.int(1, 8), 10, 30));
      t.push(mk(100000, 1000, 1e9), mk(50000, 1000, 10));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const n = r.num();
      const tasks = Array.from({ length: n }, () => [r.num(), r.num()]).sort((x, y) => x[0] - y[0]);
      let time = 0, score = 0;
      for (const [a, d] of tasks) { time += a; score += d - time; }
      return score + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    vector<pair<long long,long long>> t(n);
    for (auto& [a, d] : t) cin >> a >> d;
    sort(t.begin(), t.end());                        // богино даалгаврыг эхэлж
    long long time = 0, score = 0;
    for (auto [a, d] : t) { time += a; score += d - time; }
    cout << score << "\n";
}
`,
  },
  // ---------- Бүрэн хайлт ----------
  {
    key: 'complete-1',
    topic: 'complete-search',
    title: 'Үсгийн сэлгэмэл',
    difficulty: 'easy',
    statement: `Жижиг латин үсгээс бүрдсэн s мөр өгөгдөв. Түүний үсгүүдийг сэлгэж гаргаж болох **бүх ялгаатай** мөрийг цагаан толгойн дарааллаар гарга.

### Оролт
Нэг мөрөнд s.

### Гаралт
Эхний мөрөнд ялгаатай мөрийн тоо k. Дараагийн k мөрөнд мөрүүд цагаан толгойн дарааллаар.

### Хязгаар
- 1 ≤ |s| ≤ 8

> 💡 Үсгүүдийг эрэмбэлээд \`next_permutation\` — давхардсан үсэгтэй үед ч ялгаатай сэлгэмэл бүрийг нэг удаа гаргана.`,
    samples: [lines('aabc')],
    gen(R) {
      const t = [lines('z'), lines('aaaa'), lines('ba')];
      for (let i = 0; i < 4; i++) t.push(lines(R.str(R.int(2, 7), 'abcd')));
      t.push(lines('abcdefgh'), lines('hgfedcba'), lines('aabbccdd'));
      return t;
    },
    solve(input) {
      const a = input.trim().split('').sort();
      const out = [];
      for (;;) {
        out.push(a.join(''));
        let i = a.length - 2;
        while (i >= 0 && a[i] >= a[i + 1]) i--;
        if (i < 0) break;
        let j = a.length - 1;
        while (a[j] <= a[i]) j--;
        [a[i], a[j]] = [a[j], a[i]];
        for (let l = i + 1, rr = a.length - 1; l < rr; l++, rr--) [a[l], a[rr]] = [a[rr], a[l]];
      }
      return out.length + '\n' + out.join('\n') + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    string s; cin >> s;
    sort(s.begin(), s.end());
    vector<string> res;
    do res.push_back(s); while (next_permutation(s.begin(), s.end()));
    cout << res.size() << "\n";
    for (auto& x : res) cout << x << "\n";
}
`,
  },
  {
    key: 'complete-2',
    topic: 'complete-search',
    title: 'Найман хатан',
    difficulty: 'medium',
    statement: `8×8 шатрын хөлөгт **8 хатан** тавих хэрэгтэй: аль ч хоёр хатан бие биеэ идэхгүй (нэг мөр, багана, диагональд байхгүй). Зарим нүд эвдэрсэн (\`*\`) — тэнд хатан тавьж болохгүй, гэхдээ хатнууд тэр нүдийг «дамжин» идэж чадна.

Хэдэн янзаар тавьж болох вэ?

### Оролт
8 мөр, мөр бүрт 8 тэмдэгт: \`.\` — сул нүд, \`*\` — эвдэрсэн нүд.

### Гаралт
Тавих аргын тоо.

> 💡 Номын 5.3 «Backtracking» (х. 50): мөр бүрт нэг хатан — баганыг сонгоод, багана ба хоёр диагональ эзлэгдсэн эсэхийг массиваар шалга.`,
    samples: [text(['........', '........', '..*.....', '........', '........', '.....**.', '...*....', '........'])],
    gen(R) {
      const t = [text(Array(8).fill('........')), text(Array(8).fill('********'))];
      for (let i = 0; i < 6; i++) {
        const p = [0.05, 0.1, 0.15, 0.2, 0.08, 0.03][i];
        t.push(text([...Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => (R.next() < p ? '*' : '.')).join(''))]));
      }
      return t;
    },
    solve(input) {
      const g = input.trim().split('\n').map((s) => s.trim());
      const col = Array(8).fill(false), d1 = Array(15).fill(false), d2 = Array(15).fill(false);
      let cnt = 0;
      const go = (row) => {
        if (row === 8) { cnt++; return; }
        for (let c = 0; c < 8; c++) {
          if (g[row][c] === '*' || col[c] || d1[row + c] || d2[row - c + 7]) continue;
          col[c] = d1[row + c] = d2[row - c + 7] = true;
          go(row + 1);
          col[c] = d1[row + c] = d2[row - c + 7] = false;
        }
      };
      go(0);
      return cnt + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
string g[8];
bool col[8], d1[15], d2[15];
int cnt = 0;
void go(int row) {
    if (row == 8) { cnt++; return; }
    for (int c = 0; c < 8; c++) {
        if (g[row][c] == '*' || col[c] || d1[row + c] || d2[row - c + 7]) continue;
        col[c] = d1[row + c] = d2[row - c + 7] = true;
        go(row + 1);
        col[c] = d1[row + c] = d2[row - c + 7] = false;   // буцаах (backtrack)
    }
}
int main() {
    for (auto& s : g) cin >> s;
    go(0);
    cout << cnt << "\n";
}
`,
  },
  {
    key: 'complete-3',
    topic: 'complete-search',
    title: 'Хагасаар хайх',
    difficulty: 'hard',
    timeLimitMs: 2000,
    statement: `n тоо ба x өгөгдөв. Элементүүдийн нийлбэр нь яг x болох **дэд олонлог** хэд байна вэ? (Ижил утгатай боловч өөр байрлалтай элементүүдийг ялгаатай гэж тооцно.)

### Оролт
Эхний мөрөнд n ба x. Хоёр дахь мөрөнд a₁, …, aₙ.

### Гаралт
Дэд олонлогийн тоо.

### Хязгаар
- 1 ≤ n ≤ 40
- 1 ≤ x, aᵢ ≤ 10⁹

> 💡 2⁴⁰ ≈ 10¹² хэт олон. Номын 5.5 «Meet in the middle» (х. 54): хоёр хагасын дэд нийлбэрүүдийг (2²⁰ тус бүр) гаргаад нэгтгэ.`,
    samples: [lines([4, 5], [1, 2, 3, 2])],
    gen(R) {
      const t = [];
      for (let i = 0; i < 5; i++) { const n = R.int(1, 12); t.push(lines([n, R.int(1, 20)], R.arr(n, 1, 6))); }
      const subsetSum = (a) => a.reduce((s, v) => (R.next() < 0.5 ? s + v : s), 0) || a[0];
      let a = R.arr(40, 1, 1e9); t.push(lines([40, Math.min(1e9, subsetSum(a))], a));
      a = R.arr(40, 1, 5e7); t.push(lines([40, Math.min(1e9, subsetSum(a))], a));
      a = R.arr(40, 1, 30); t.push(lines([40, 300], a));
      t.push(lines([40, 20], Array(40).fill(1)));
      a = R.arr(39, 1, 1000); t.push(lines([39, 19000], a));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const n = r.num(), x = r.num();
      const a = Array.from({ length: n }, () => r.num());
      const sums = (v) => {
        const s = new Float64Array(1 << v.length);
        for (let m = 1; m < s.length; m++) { const b = 31 - Math.clz32(m & -m); s[m] = s[m ^ (1 << b)] + v[b]; }
        return s.sort();
      };
      const h = n >> 1;
      const L = sums(a.slice(0, h)), Rs = sums(a.slice(h));
      let i = 0, j = Rs.length - 1, cnt = 0;
      while (i < L.length && j >= 0) {
        const s = L[i] + Rs[j];
        if (s < x) i++;
        else if (s > x) j--;
        else {
          const lv = L[i], rv = Rs[j];
          let ci = 0, cj = 0;
          while (i < L.length && L[i] === lv) { ci++; i++; }
          while (j >= 0 && Rs[j] === rv) { cj++; j--; }
          cnt += ci * cj;
        }
      }
      return cnt + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
vector<long long> sums(const vector<long long>& v) {
    int k = v.size();
    vector<long long> s(1 << k, 0);
    for (int mask = 1; mask < (1 << k); mask++) {
        int b = __builtin_ctz(mask);
        s[mask] = s[mask ^ (1 << b)] + v[b];
    }
    sort(s.begin(), s.end());
    return s;
}
int main() {
    int n; long long x; cin >> n >> x;
    vector<long long> a(n);
    for (auto& v : a) cin >> v;
    int h = n / 2;
    auto L = sums(vector<long long>(a.begin(), a.begin() + h));
    auto R = sums(vector<long long>(a.begin() + h, a.end()));
    long long cnt = 0;
    for (long long s : L) {
        auto range = equal_range(R.begin(), R.end(), x - s);
        cnt += range.second - range.first;
    }
    cout << cnt << "\n";
}
`,
  },
  // ---------- DP ----------
  {
    key: 'dp-1',
    topic: 'dp',
    title: 'Шооны нийлбэр',
    difficulty: 'easy',
    statement: `Шоог хэд хэдэн удаа шидэж (гарах утга 1–6), гарсан утгуудын нийлбэр яг n болох **дарааллын** тоог ол. Жишээ нь n = 3: 1+1+1, 1+2, 2+1, 3 — 4 арга.

Хариуг 10⁹ + 7-д хуваасан үлдэгдлээр гарга.

### Оролт
Нэг тоо n.

### Гаралт
Аргын тоо mod 10⁹ + 7.

### Хязгаар
- 1 ≤ n ≤ 10⁶

> 💡 \`dp[s] = dp[s−1] + dp[s−2] + … + dp[s−6]\`, \`dp[0] = 1\`.`,
    samples: [lines(3), lines(7)],
    gen(R) {
      return [lines(1), lines(2), lines(6), lines(R.int(8, 50)), lines(R.int(100, 1000)), lines(123456), lines(999999), lines(1000000)];
    },
    solve(input) {
      const n = Number(input.trim());
      const dp = new Int32Array(n + 1);
      dp[0] = 1;
      for (let s = 1; s <= n; s++) {
        let v = 0;
        for (let d = 1; d <= 6 && d <= s; d++) { v += dp[s - d]; if (v >= MOD) v -= MOD; }
        dp[s] = v;
      }
      return dp[n] + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
const int MOD = 1e9 + 7;
int main() {
    int n; cin >> n;
    vector<long long> dp(n + 1, 0);
    dp[0] = 1;
    for (int s = 1; s <= n; s++)
        for (int d = 1; d <= 6 && d <= s; d++) dp[s] = (dp[s] + dp[s - d]) % MOD;
    cout << dp[n] << "\n";
}
`,
  },
  {
    key: 'dp-2',
    topic: 'dp',
    title: 'Өсөх дараалал',
    difficulty: 'medium',
    statement: `n тоон дараалал өгөгдөв. Түүнээс хэдэн элементийг (дарааллыг нь хадгалан) сонгож **хатуу өсөх** дэд дараалал үүсгэе. Хамгийн урт нь хэд вэ?

### Оролт
Эхний мөрөнд n. Хоёр дахь мөрөнд a₁, …, aₙ.

### Гаралт
Хамгийн урт хатуу өсөх дэд дарааллын урт.

### Хязгаар
- 1 ≤ n ≤ 2·10⁵
- 1 ≤ aᵢ ≤ 10⁹

> 💡 O(n²) DP удаан. Номын 7.2 (х. 70) болон онолын «LIS-ийг O(n log n)-д» хэсгийг үз: \`tail\` массив + \`lower_bound\`.`,
    samples: [lines(8, [7, 3, 5, 3, 6, 2, 9, 8])],
    gen(R) {
      const t = [];
      for (let i = 0; i < 7; i++) { const n = R.int(1, 15); t.push(lines(n, R.arr(n, 1, 10))); }
      t.push(lines(5, [4, 4, 4, 4, 4]));
      t.push(lines(50000, R.arr(50000, 1, 1e9)));
      t.push(lines(50000, Array.from({ length: 50000 }, (_, i) => i + 1 + R.int(0, 50))));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const n = r.num();
      const tail = [];
      for (let i = 0; i < n; i++) {
        const x = r.num();
        let lo = 0, hi = tail.length;
        while (lo < hi) { const m = (lo + hi) >> 1; if (tail[m] < x) lo = m + 1; else hi = m; }
        tail[lo] = x;
      }
      return tail.length + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    vector<int> tail;
    for (int i = 0; i < n; i++) {
        int x; cin >> x;
        auto it = lower_bound(tail.begin(), tail.end(), x);
        if (it == tail.end()) tail.push_back(x); else *it = x;
    }
    cout << tail.size() << "\n";
}
`,
  },
  {
    key: 'dp-3',
    topic: 'dp',
    title: 'Үг засварлах',
    difficulty: 'medium',
    statement: `Хоёр үг a ба b өгөгдөв. Нэг алхамд a-д нэг үсэг **нэмэх**, **устгах** эсвэл **солих** боломжтой. a-г b болгоход хамгийн багадаа хэдэн алхам хэрэгтэй вэ? (Засварын зай буюу Левенштейний зай.)

### Оролт
Эхний мөрөнд a, хоёр дахь мөрөнд b (жижиг латин үсэг).

### Гаралт
Хамгийн бага алхмын тоо.

### Хязгаар
- 1 ≤ |a|, |b| ≤ 5000

> 💡 Номын 7.5 (х. 74): \`dp[i][j]\` = a-ийн эхний i үсгийг b-ийн эхний j үсэг болгох зардал. Санах ойг хэмнэхийн тулд зөвхөн хоёр мөр хадгалж болно.`,
    samples: [lines('love', 'movie')],
    gen(R) {
      const t = [lines('a', 'a'), lines('abc', 'xyz'), lines('a', 'bbbbbbbb')];
      for (let i = 0; i < 4; i++) t.push(lines(R.str(R.int(1, 10), 'abc'), R.str(R.int(1, 10), 'abc')));
      t.push(lines(R.str(5000, 'ab'), R.str(5000, 'ab')));
      t.push(lines(R.str(5000, 'abcdefghijklmnopqrstuvwxyz'), R.str(4000, 'abcdefghijklmnopqrstuvwxyz')));
      return t;
    },
    solve(input) {
      const [a, b] = input.trim().split('\n').map((s) => s.trim());
      const m = b.length;
      let prev = Int32Array.from({ length: m + 1 }, (_, j) => j), cur = new Int32Array(m + 1);
      for (let i = 1; i <= a.length; i++) {
        cur[0] = i;
        for (let j = 1; j <= m; j++) {
          cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
        [prev, cur] = [cur, prev];
      }
      return prev[m] + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    string a, b; cin >> a >> b;
    int n = a.size(), m = b.size();
    vector<int> prev(m + 1), cur(m + 1);
    for (int j = 0; j <= m; j++) prev[j] = j;
    for (int i = 1; i <= n; i++) {
        cur[0] = i;
        for (int j = 1; j <= m; j++)
            cur[j] = min({prev[j] + 1,                                 // устгах
                          cur[j - 1] + 1,                              // нэмэх
                          prev[j - 1] + (a[i - 1] != b[j - 1])});      // солих
        swap(prev, cur);
    }
    cout << prev[m] << "\n";
}
`,
  },
];
