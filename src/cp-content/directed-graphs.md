## 🎯 Энэ сэдвээс юу сурах вэ
- Мөчлөггүй чиглэлтэй граф (**DAG**) ба **топологи эрэмбэ**
- Чиглэлтэй графт мөчлөг илрүүлэх
- DAG дээрх **динамик программчлал**: замын тоо, хамгийн урт зам
- «Залгамжлагчийн граф» ба k алхмын дараах оройг O(log k)-д олох

## 💡 Гол санаа
### Топологи эрэмбэ
Хичээлүүдийн дарааллыг бод: «Алгоритм»-ыг судлахаас өмнө «Програмчлалын үндэс»-ийг заавал үзэх ёстой. Хэрвээ a → b ирмэг «a нь b-ээс өмнө байх ёстой» гэсэн утгатай бол бүх оройг **дүрмийг зөрчихгүйгээр** нэг мөрөнд жагсаахыг топологи эрэмбэ гэнэ.

- Графт **мөчлөг** байвал топологи эрэмбэ **байхгүй** (мөчлөгийн аль ч орой бусдаасаа түрүүлж чадахгүй).
- Мөчлөггүй бол заавал байна, гэхдээ ганц биш байж болно.

### Хоёр арга
| Арга | Санаа |
|---|---|
| **Kahn (BFS)** | Орох ирмэггүй (in-degree = 0) оройг дараалалд хийнэ; гаргасан оройн ирмэгүүдийг «устгаж», шинээр 0 болсныг нэмнэ. Бүх орой гарахгүй бол мөчлөг бий. |
| **DFS** | Оройг «боловсруулж дууссан» үед жагсаалтад нэмнэ; урвуу жагсаалт нь топологи эрэмбэ. «Боловсруулж байгаа» оройд дахин хүрвэл мөчлөг. |

### DAG дээрх DP
Мөчлөггүй тул оройнуудыг топологи эрэмбээр нь боловсруулбал оройн бүх «өмнөх» хариу бэлэн байна:
`paths(x) = Σ paths(a)` — x руу ирмэгтэй бүх a-гаар. Эхлэл `paths(1) = 1`.

> Номын гол санаа: **ямар ч DP бодлогыг DAG гэж үзэж болно** — төлөв = орой, шилжилт = ирмэг.

## 🧠 Алхам алхмаар (Kahn)
```
Ирмэг: 1→2, 1→3, 2→4, 3→4        in-degree: 1:0 2:1 3:1 4:2
queue: [1]          → 1-ийг гаргана; 2:0, 3:0 → queue: [2, 3]
2-ыг гаргана; 4:1   → 3-ыг гаргана; 4:0 → queue: [4]
Эрэмбэ: 1 2 3 4
```

## 💻 Код
Kahn — лексикографын хамгийн бага эрэмбэ (min-heap), мөчлөгтэй бол IMPOSSIBLE:
```cpp
vector<vector<int>> g(n + 1);
vector<int> indeg(n + 1, 0);
for (int i = 0; i < m; i++) { int a, b; cin >> a >> b; g[a].push_back(b); indeg[b]++; }

priority_queue<int, vector<int>, greater<int>> pq;   // энгийн queue ч болно
for (int v = 1; v <= n; v++) if (indeg[v] == 0) pq.push(v);
vector<int> order;
while (!pq.empty()) {
    int u = pq.top(); pq.pop();
    order.push_back(u);
    for (int v : g[u]) if (--indeg[v] == 0) pq.push(v);
}
if ((int)order.size() < n) cout << "IMPOSSIBLE\n";   // мөчлөг бий
else for (int v : order) cout << v << " ";
```
Замын тоо (1 → n), топологи эрэмбээр:
```cpp
const int MOD = 1e9 + 7;
vector<long long> ways(n + 1, 0);
ways[1] = 1;
for (int u : order)                 // order = топологи эрэмбэ
    for (int v : g[u]) ways[v] = (ways[v] + ways[u]) % MOD;
cout << ways[n] << "\n";
```
k алхмын дараах орой (залгамжлагчийн граф, binary lifting):
```cpp
const int LOG = 30;                 // k ≤ 10^9
vector<array<int, LOG>> up(n + 1);  // up[x][j] = x-ээс 2^j алхмын дараах орой
for (int x = 1; x <= n; x++) up[x][0] = succ[x];
for (int j = 1; j < LOG; j++)
    for (int x = 1; x <= n; x++) up[x][j] = up[up[x][j - 1]][j - 1];
auto jump = [&](int x, long long k) {
    for (int j = 0; j < LOG; j++) if (k >> j & 1) x = up[x][j];
    return x;
};
```

## ⏱️ Нарийн төвөгшил
- Топологи эрэмбэ (Kahn / DFS): **O(n + m)** (min-heap-тэй бол O((n + m) log n))
- DAG дээрх DP: O(n + m)
- Binary lifting: бэлтгэл O(n log k), асуулга бүр O(log k)

## ⚠️ Түгээмэл алдаа
- Мөчлөг шалгахаа мартах — бүх орой эрэмбэд орсон эсэхийг заавал шалга.
- Чиглэлтэй графт ирмэгийг хоёр тийш нэмэх.
- Топологи эрэмбэ ганц биш — бодлого «аль нэгийг» эсвэл «лексикографын хамгийн багыг» шаардаж байгааг анхааралтай унш.
- Замын тоо их том болно → модулиор.

## 🏋️ Дасгал (CSES → Graph Algorithms)
1. **Course Schedule** — топологи эрэмбэ
2. **Longest Flight Route** — DAG дээрх хамгийн урт зам
3. **Game Routes** — DAG дээрх замын тоо
4. **Planets Queries I** — binary lifting

## 📚 Цааш унших
- 📕 *Competitive Programmer's Handbook* — Бүлэг 16 «Directed graphs»: 16.1 Topological sorting (х. 149), 16.2 Dynamic programming (х. 151), 16.3 Successor paths (х. 154), 16.4 Cycle detection (х. 155)
- 🌐 *cp-algorithms* — «Topological Sorting» · [cp-algorithms.com](https://cp-algorithms.com/)
- 🌐 *USACO Guide* — Gold → «Topological Sort» · [usaco.guide](https://usaco.guide/)
