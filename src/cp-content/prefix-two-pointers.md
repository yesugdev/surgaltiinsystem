## 🎯 Энэ сэдвээс юу сурах вэ
- **Prefix sum**: хэрчмийн нийлбэрийг O(1)-д олох
- Хоёр хэмжээст prefix sum
- **Хоёр заагч**: O(n²)-ийг O(n) болгох арга

## 💡 Гол санаа
### Prefix sum
Хэрвээ «a[l]-ээс a[r] хүртэлх нийлбэр хэд вэ?» гэсэн асуулт **олон удаа** ирвэл бүрт нь нэмэх нь удаан. Оронд нь **урьдчилан** хуримтлагдсан нийлбэрийг тооцно:

```
a  =    3   1   4   1   5
p  = 0  3   4   8   9  14        p[i] = a[0] + … + a[i-1]
```
[l, r] хэрчмийн нийлбэр = `p[r+1] − p[l]`. Жишээ: a[1..3] = 1 + 4 + 1 = `p[4] − p[1]` = 9 − 3 = **6**.

### Хоёр заагч
Хоёр индекс (l, r) зөвхөн **урагшаа** хөдөлдөг тул нийт O(n) алхам хийнэ. Ихэвчлэн «нөхцөлийг хангасан хамгийн урт/богино хэрчим» эсвэл эрэмбэлэгдсэн массивт «нийлбэр нь x байх хос» бодлогод хэрэглэнэ.

## 🧠 Алхам алхмаар: нийлбэр нь x байх хос (Sum of Two Values)
Эрэмбэлэгдсэн массивт l-ийг эхнээс, r-ийг төгсгөлөөс эхлүүлнэ:
- `a[l] + a[r] < x` → нийлбэр бага, **l++**
- `a[l] + a[r] > x` → нийлбэр их, **r−−**
- тэнцүү → олдлоо!

Заагч бүр хамгийн ихдээ n алхам хийх тул **O(n)**.

## 💻 Код
Prefix sum:
```cpp
vector<long long> p(n + 1, 0);
for (int i = 0; i < n; i++) p[i + 1] = p[i] + a[i];
// a[l..r] нийлбэр:
long long s = p[r + 1] - p[l];
```
Хоёр хэмжээст (Forest Queries):
```cpp
// P[i][j] = зүүн дээд (0,0)-ээс (i-1, j-1) хүртэлх нийлбэр
vector<vector<int>> P(n + 1, vector<int>(m + 1, 0));
for (int i = 0; i < n; i++)
    for (int j = 0; j < m; j++)
        P[i+1][j+1] = g[i][j] + P[i][j+1] + P[i+1][j] - P[i][j];
// (r1,c1)–(r2,c2) тэгш өнцөгтийн нийлбэр:
int s = P[r2+1][c2+1] - P[r1][c2+1] - P[r2+1][c1] + P[r1][c1];
```
Хоёр заагч — нийлбэр нь S-ээс хэтрэхгүй хамгийн урт хэрчим (сөрөг биш тоонд):
```cpp
ll cur = 0;
int best = 0, l = 0;
for (int r = 0; r < n; r++) {
    cur += a[r];
    while (cur > S) cur -= a[l++];   // хэтэрвэл зүүн заагчийг урагшлуул
    best = max(best, r - l + 1);
}
```
Нийлбэр нь x байх хос (Sum of Two Values), эрэмбэлэгдсэн массивт:
```cpp
int l = 0, r = n - 1;
while (l < r) {
    ll s = a[l] + a[r];
    if (s == x) { /* олдлоо */ break; }
    if (s < x) l++; else r--;
}
```

## ⏱️ Нарийн төвөгшил
- Prefix sum: бэлтгэл O(n), асуулга бүр O(1)
- Хоёр заагч: O(n) (эрэмбэлэлт хэрэгтэй бол O(n log n))

## ⚠️ Түгээмэл алдаа
- Индексийн «нэгээр зөрөх» алдаа: `p` нь n+1 урттай, `p[0] = 0`.
- Хоёр заагч **сөрөг тоотой** массивт ихэвчлэн ажиллахгүй — prefix sum + hash map ашигла (Subarray Sums II).
- Нийлбэр томорч халих → `long long`.

## 🏋️ Дасгал (CSES)
1. **Static Range Sum Queries** — prefix sum
2. **Forest Queries** — 2D prefix sum
3. **Sum of Two Values** — хоёр заагч
4. **Subarray Sums I** — хоёр заагч
5. **Subarray Sums II** — prefix sum + map
6. **Maximum Subarray Sum** — Kadane-ийн арга

## 📚 Цааш унших
- 📕 *Competitive Programmer's Handbook* — Бүлэг 8 «Amortized analysis» (two pointers), Бүлэг 9.1 «Static array queries» · [cses.fi/book/book.pdf](https://cses.fi/book/book.pdf)
- 🌐 *USACO Guide* — Silver → «Prefix Sums», «Two Pointers» · [usaco.guide](https://usaco.guide/)
