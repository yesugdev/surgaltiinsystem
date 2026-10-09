## 🎯 Энэ сэдвээс юу сурах вэ
- Динамик программчлал (DP) гэж юу вэ, хэзээ хэрэглэх вэ
- **Төлөв → шилжилт → суурь** гэсэн 3 алхмаар DP зохиох
- Сонгодог DP: зоос, шат, үүргэвч (knapsack), засварын зай

## 💡 Гол санаа
Рекурсив шийдэл **ижил дэд бодлогыг олон дахин** тооцоолдог бол хариуг нэг удаа тооцоод **хадгалаад** дахин ашиглана. Энэ л DP.

**Фибоначчи:** `f(n) = f(n−1) + f(n−2)`. Энгийн рекурс f(40)-д сая сая дуудалт хийнэ, учир нь f(38)-ыг дахин дахин бодно. Хадгалбал ердөө 40 алхам.

### DP зохиох 3 асуулт
1. **Төлөв:** `dp[i]` юуг илэрхийлэх вэ? (жишээ: «x дүнг бүрдүүлэх хамгийн цөөн зоос»)
2. **Шилжилт:** `dp[i]` өмнөх төлвүүдээс яаж гарах вэ?
3. **Суурь ба хариу:** `dp[0]` хэд вэ? Хариу аль төлөвт байна?

## 🧠 Алхам алхмаар: Зоос (Minimizing Coins)
Зоос {1, 5, 7}, x = 11-ийг хамгийн цөөн зоосоор.
- Төлөв: `dp[s]` = s дүнг бүрдүүлэх хамгийн цөөн зоос
- Шилжилт: сүүлийн зоос c бол `dp[s] = min(dp[s − c] + 1)`
- Суурь: `dp[0] = 0`

| s | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| dp | 0 | 1 | 2 | 3 | 4 | 1 | 2 | 1 | 2 | 3 | 2 | 3 |

dp[11] = **3** (5 + 5 + 1). Greedy хамгийн томоос нь авбал 7 + 1 + 1 + 1 + 1 = **5 зоос** болж алдана — DP үргэлж зөв.

## 💻 Код
Minimizing Coins:
```cpp
const int INF = 1e9;
vector<int> dp(x + 1, INF);
dp[0] = 0;
for (int s = 1; s <= x; s++)
    for (int c : coins)
        if (c <= s && dp[s - c] != INF)
            dp[s] = min(dp[s], dp[s - c] + 1);
cout << (dp[x] == INF ? -1 : dp[x]) << "\n";
```
Үүргэвч 0/1 (Book Shop) — нэг төлөвийг **ар талаас** шинэчилбэл ном бүрийг нэг л удаа авна:
```cpp
vector<int> dp(budget + 1, 0);       // dp[w] = w мөнгөөр авах хамгийн их хуудас
for (int i = 0; i < n; i++)
    for (int w = budget; w >= price[i]; w--)
        dp[w] = max(dp[w], dp[w - price[i]] + pages[i]);
cout << dp[budget] << "\n";
```
«Хэдэн арга» төрлийн DP (Coin Combinations I) — хариуг модулиор:
```cpp
const int MOD = 1e9 + 7;
vector<int> dp(x + 1, 0);
dp[0] = 1;
for (int s = 1; s <= x; s++)
    for (int c : coins)
        if (c <= s) dp[s] = (dp[s] + dp[s - c]) % MOD;
```

### Сонгодог DP-ийн жагсаалт
| Бодлого | Төлөв |
|---|---|
| Шат / Dice Combinations | `dp[i]` = i-д хүрэх арга |
| Coin Combinations | `dp[s]` = s бүрдүүлэх арга (`% 10⁹+7`) |
| Grid Paths | `dp[i][j]` = (i,j)-д хүрэх зам |
| Edit Distance | `dp[i][j]` = эхний i ба j тэмдэгтийн засварын зай |
| LIS | `dp[i]` = i-ээр төгсөх хамгийн урт өсөх дараалал |

## ⏱️ Нарийн төвөгшил
**Төлвийн тоо × нэг төлвийн шилжилтийн тоо.** Зоос: O(x · k). Үүргэвч: O(n · W).

## ⚠️ Түгээмэл алдаа
- Төлвийг тодорхой тодорхойлохгүйгээр код бичих — **эхлээд цаасан дээр** 3 асуултад хариул.
- Суурь утгыг буруу өгөх (min-д INF, тоолоход 0/1).
- «Хэдэн арга» бодлогод `% (10⁹ + 7)`-ийг мартах.
- Үүргэвчийг урдаас нь давтах → нэг зүйлийг олон удаа авна.

## 🏋️ Дасгал (CSES → Dynamic Programming)
1. **Dice Combinations** — хамгийн энгийн DP
2. **Minimizing Coins**
3. **Coin Combinations I** ба **II** — дарааллын ялгааг ойлго
4. **Removing Digits**
5. **Grid Paths** (DP) — 2D DP
6. **Book Shop** — 0/1 үүргэвч
7. **Edit Distance** — хоёр мөрийн DP

## 📚 Цааш унших
- 📕 *Competitive Programmer's Handbook* — Бүлэг 7 «Dynamic programming» · [cses.fi/book/book.pdf](https://cses.fi/book/book.pdf)
- 🌐 *USACO Guide* — Gold → «Introduction to DP», «Knapsack DP», «Paths on Grids» · [usaco.guide](https://usaco.guide/)
- 🌐 *cp-algorithms* — «Dynamic Programming» хэсэг · [cp-algorithms.com](https://cp-algorithms.com/)
- 📗 *Introduction to Algorithms* (CLRS) — «Dynamic Programming» бүлэг
