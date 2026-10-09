## 🎯 Энэ сэдвээс юу сурах вэ
- Рекурсийг ойлгох: суурь тохиолдол + өөрийгөө дуудах
- **Бүрэн хайлт**: бүх хувилбарыг шалгах (дэд олонлог, сэлгэмэл)
- **Backtracking**: буруу замыг эрт тасдах

## 💡 Гол санаа
Хариуг олох хамгийн найдвартай арга бол **бүх боломжийг шалгах**. n жижиг (≤ 10–20) үед энэ хангалттай хурдан. Олимпиадад ч эхлээд бүрэн хайлтаар бичээд, дараа нь хурдасгах нь сайн дадал.

### Рекурс = өөрийгөө дуудах функц
Хоёр зүйл заавал байна:
1. **Суурь тохиолдол** — хэзээ зогсох
2. **Рекурс алхам** — бодлогыг жижигрүүлж өөрийгөө дуудах

```
f(3) → f(2) → f(1) → f(0) = суурь, зогсоно
```

## 🧠 Алхам алхмаар: «авах / авахгүй» мод
Элемент бүр дээр **хоёр сонголт** — авах эсвэл авахгүй. n = 3 бол 2³ = 8 навч:
```
                 []
          /              \
      [a0]                []
     /    \             /    \
 [a0,a1] [a0]        [a1]     []
   ...    ...        ...     ...
```

## 💻 Код
Бүх дэд олонлог (рекурс):
```cpp
vector<int> chosen;
void go(int i) {
    if (i == n) {               // суурь: бүх элементийг шийдсэн
        check(chosen);
        return;
    }
    go(i + 1);                  // a[i]-г авахгүй
    chosen.push_back(a[i]);
    go(i + 1);                  // a[i]-г авна
    chosen.pop_back();          // буцаах (backtrack)
}
```
Бүх сэлгэмэл (Creating Strings):
```cpp
sort(s.begin(), s.end());
do {
    cout << s << "\n";
} while (next_permutation(s.begin(), s.end()));   // давхардалгүй, эрэмбээр
```
Backtracking — 8 хатан (Chessboard and Queens):
```cpp
string board[8];
bool col[8], d1[15], d2[15];   // багана, хоёр диагональ эзлэгдсэн эсэх
int ways = 0;

void place(int r) {
    if (r == 8) { ways++; return; }
    for (int c = 0; c < 8; c++) {
        if (board[r][c] == '*' || col[c] || d1[r + c] || d2[r - c + 7]) continue;
        col[c] = d1[r + c] = d2[r - c + 7] = true;
        place(r + 1);
        col[c] = d1[r + c] = d2[r - c + 7] = false;   // буцаах
    }
}
```

## ⏱️ Нарийн төвөгшил
- Дэд олонлог: O(2ⁿ) — n ≤ 20
- Сэлгэмэл: O(n!) — n ≤ 10
- Backtracking нь практикт хамаагүй хурдан (тасдалтын ачаар)

## ⚠️ Түгээмэл алдаа
- Суурь тохиолдлыг мартах → төгсгөлгүй рекурс.
- Backtrack хийхдээ өөрчилсөн төлвөө **буцааж сэргээхээ** мартах.

## 🏋️ Дасгал (CSES → Introductory Problems)
1. **Apple Division** — бүх дэд олонлог
2. **Creating Strings** — сэлгэмэл
3. **Chessboard and Queens** — backtracking
4. **Tower of Hanoi** — сонгодог рекурс
5. **Grid Paths** (Introductory) — хүчтэй тасдалттай backtracking (хүнд!)

## 📚 Цааш унших
- 📕 *Competitive Programmer's Handbook* — Бүлэг 5 «Complete search» · [cses.fi/book/book.pdf](https://cses.fi/book/book.pdf)
- 🌐 *USACO Guide* — Bronze → «Complete Search», «Complete Search with Recursion» · [usaco.guide](https://usaco.guide/)
