## 🎯 Энэ сэдвээс юу сурах вэ
- Утга нь **өөрчлөгддөг** массив дээрх хэрчмийн асуулга
- **Fenwick tree (BIT)** — нийлбэрт хамгийн богино код
- **Segment tree** — мин, макс, gcd гээд ямар ч «нэгтгэх» үйлдэлд

## 💡 Гол санаа
Prefix sum нь асуулгад O(1) боловч нэг утга өөрчлөгдвөл бүхэлд нь O(n)-д дахин тооцно. Асуулга ба өөрчлөлт **холилдон** 10⁵ удаа ирвэл O(n · q) = 10¹⁰ — хэтэрнэ.

Шийдэл: массивыг **хэсгүүдэд** хувааж, хэсэг бүрийн хариуг урьдчилан хадгална. Тэгвэл асуулга ч, өөрчлөлт ч **O(log n)**.

### Segment tree-г төсөөлөх
```
                 [0..7] = 36
           [0..3] = 10        [4..7] = 26
        [0..1]  [2..3]     [4..5]   [6..7]
        a0 a1   a2 a3      a4 a5    a6 a7
```
Аль ч хэрчим [l, r]-ийг **≈ 2 log n** зангилааны нийлбэрээр бүрдүүлж болно. Нэг утга өөрчлөгдвөл зөвхөн түүнээс дээш **log n** зангилааг шинэчилнэ.

| | Prefix sum | Fenwick | Segment tree |
|---|---|---|---|
| Асуулга | O(1) | O(log n) | O(log n) |
| Өөрчлөлт | O(n) | O(log n) | O(log n) |
| Мин/макс | ❌ | ❌ (амархан биш) | ✅ |
| Код | маш богино | богино | дунд |

## 💻 Код
Fenwick tree (Dynamic Range Sum Queries), 1-ээс эхэлсэн индекс:
```cpp
vector<long long> bit(n + 1, 0);
void add(int i, long long v) { for (; i <= n; i += i & -i) bit[i] += v; }
long long sum(int i) { long long s = 0; for (; i > 0; i -= i & -i) s += bit[i]; return s; }
// a[k] = u болгох: add(k, u - a[k]); a[k] = u;
// [l, r] нийлбэр: sum(r) - sum(l - 1)
```
Segment tree — хэрчмийн минимум (Dynamic Range Minimum Queries), доороос дээш бичлэг:
```cpp
int sz = 1; while (sz < n) sz <<= 1;
vector<long long> t(2 * sz, LLONG_MAX);
for (int i = 0; i < n; i++) t[sz + i] = a[i];
for (int i = sz - 1; i > 0; i--) t[i] = min(t[2*i], t[2*i+1]);

void update(int p, long long v) {           // a[p] = v (0-ээс)
    p += sz; t[p] = v;
    for (p >>= 1; p > 0; p >>= 1) t[p] = min(t[2*p], t[2*p+1]);
}
long long query(int l, int r) {             // [l, r] хаалттай
    long long res = LLONG_MAX;
    for (l += sz, r += sz + 1; l < r; l >>= 1, r >>= 1) {
        if (l & 1) res = min(res, t[l++]);
        if (r & 1) res = min(res, t[--r]);
    }
    return res;
}
```

## ⏱️ Нарийн төвөгшил
Бэлтгэл O(n), асуулга/өөрчлөлт бүр **O(log n)**. Санах ой O(n).

## ⚠️ Түгээмэл алдаа
- Fenwick нь **1-ээс** эхэлдэг; 0 индекс өгвөл төгсгөлгүй давталт.
- «Утгыг u болгох» ба «u-гаар нэмэх»-ийг андуурах.
- Segment tree-ийн хэмжээг хангалтгүй авах (2·sz эсвэл 4n).
- 2·10⁵ асуулгатай бодлогод `cin`-ийг хурдасгахаа (`ios::sync_with_stdio(false)`) бүү март.

## 🏋️ Дасгал (CSES → Range Queries)
1. **Static Range Sum Queries** — prefix sum (дурсамж)
2. **Dynamic Range Sum Queries** — Fenwick
3. **Dynamic Range Minimum Queries** — segment tree
4. **Range Xor Queries** — prefix xor
5. **Hotel Queries** — segment tree дээр «хайлт» (хүнд)

## 📚 Цааш унших
- 📕 *Competitive Programmer's Handbook* — Бүлэг 9 «Range queries» · [cses.fi/book/book.pdf](https://cses.fi/book/book.pdf)
- 🌐 *cp-algorithms* — «Fenwick Tree», «Segment Tree» · [cp-algorithms.com/data_structures/segment_tree.html](https://cp-algorithms.com/data_structures/segment_tree.html)
- 🌐 *USACO Guide* — Gold → «Point Update Range Sum», Platinum → «Segment Tree» · [usaco.guide](https://usaco.guide/)
