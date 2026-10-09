## 🎯 Энэ сэдвээс юу сурах вэ
- Stack, queue, deque, set, map, priority queue — **хэзээ аль нь**
- C++ STL-ийн бүтцүүдийг зөв ашиглах
- Сонгодог бодлого: хаалт шалгах, хамгийн ойрын бага утга, гулсах цонх

## 💡 Гол санаа
Өгөгдлийн бүтэц бол өгөгдлийг **ямар үйлдлийг хурдан хийх**-ээр нь зохион байгуулах арга. Зөв бүтэц сонгох нь O(n²)-ийг O(n log n) болгодог.

| Бүтэц | Санаа | C++ | Үндсэн үйлдэл |
|---|---|---|---|
| Stack | Сүүлд орсон нь эхэлж гарна (тавагны овоо) | `stack`, `vector` | O(1) |
| Queue | Эхэлж орсон нь эхэлж гарна (дараалал) | `queue` | O(1) |
| Deque | Хоёр талаас нь | `deque` | O(1) |
| Эрэмбэтэй олонлог | Эрэмбэтэй, давхардалгүй | `set` (давхардалтай бол `multiset`) | O(log n) |
| Эрэмбэтэй толь | түлхүүр → утга | `map` | O(log n) |
| Hash олонлог/толь | Эрэмбэгүй, маш хурдан | `unordered_set`, `unordered_map` | O(1) дунджаар |
| Priority queue | Хамгийн их/багыг хурдан авах | `priority_queue` | O(log n) |

## 🧠 Алхам алхмаар: хамгийн ойрын бага утга (Nearest Smaller Values)
Байрлал бүрийн хувьд **зүүн талын хамгийн ойрын бага** утгыг ол. Stack-д «нэр дэвшигчдийг» хадгална:
- шинэ a[i] ирэхэд stack-ийн оройд ≥ a[i] байгааг **хаяна** (тэд дахиж хэзээ ч хариу болохгүй);
- үлдсэн орой нь хариу; дараа нь a[i]-г stack-д хийнэ.

Элемент бүр stack-д нэг удаа орж, нэг удаа гарах тул нийт **O(n)**.

## 💻 Код
Nearest Smaller Values (1-ээс эхэлсэн байрлал, байхгүй бол 0):
```cpp
stack<int> st;               // байрлалууд
for (int i = 0; i < n; i++) {
    while (!st.empty() && a[st.top()] >= a[i]) st.pop();
    cout << (st.empty() ? 0 : st.top() + 1) << " ";
    st.push(i);
}
```
Хаалтын зөв эсэх:
```cpp
bool valid(const string &s) {
    stack<char> st;
    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') { st.push(c); continue; }
        if (st.empty()) return false;
        char o = st.top(); st.pop();
        if ((c == ')' && o != '(') || (c == ']' && o != '[') || (c == '}' && o != '{')) return false;
    }
    return st.empty();
}
```
Priority queue:
```cpp
priority_queue<int> mx;                             // хамгийн их нь орой
priority_queue<int, vector<int>, greater<int>> mn;  // хамгийн бага нь орой
mx.push(5); int top = mx.top(); mx.pop();
```
set / multiset / map:
```cpp
multiset<int> ms = {5, 1, 5, 3};
auto it = ms.lower_bound(4);          // 4-өөс багагүй хамгийн бага → 5
if (it != ms.end()) ms.erase(it);     // зөвхөн нэгийг устгана
map<string, int> cnt;
for (auto &w : words) cnt[w]++;       // тоолох (түлхүүрээр эрэмбэтэй)
```

## ⏱️ Нарийн төвөгшил
Хүснэгтэд заасан. `set`, `map`, `priority_queue` — O(log n); `stack`, `queue` — O(1).

## ⚠️ Түгээмэл алдаа
- `set`-д давхардсан утга хадгалагдахгүй — тоо хэрэгтэй бол `multiset`. `multiset.erase(x)` нь **бүх** x-ийг устгана; нэгийг устгахдаа `ms.erase(ms.find(x))`.
- `lower_bound(ms.begin(), ms.end(), x)` (O(n)) биш, **`ms.lower_bound(x)`** (O(log n)) ашигла.
- `unordered_map` муу тохиолдолд удааширч болно; эргэлзвэл `map`.
- Хоосон stack/queue-ээс `top()`/`front()` авах → алдаа.

## 🏋️ Дасгал (CSES)
1. **Nearest Smaller Values** — монотон stack
2. **Concert Tickets** — multiset
3. **Traffic Lights** — set
4. **Room Allocation** — priority queue
5. **Playlist** — гулсах цонх + set/map

## 📚 Цааш унших
- 📕 *Competitive Programmer's Handbook* — Бүлэг 4 «Data structures» · [cses.fi/book/book.pdf](https://cses.fi/book/book.pdf)
- 🌐 *USACO Guide* — Bronze → «Introduction to Data Structures», Silver → «Introduction to Sets & Maps», Gold → «Stacks» · [usaco.guide](https://usaco.guide/)
- 🌐 *cp-algorithms* — «Minimum stack / Minimum queue» · [cp-algorithms.com](https://cp-algorithms.com/)
