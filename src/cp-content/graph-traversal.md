## 🎯 Энэ сэдвээс юу сурах вэ
- Граф гэж юу вэ: орой, ирмэг, чиглэлтэй/чиглэлгүй
- Графыг санах ойд хадгалах — **хөршийн жагсаалт**
- **DFS** ба **BFS**: холбоост бүрэлдэхүүн, хамгийн богино зам (жингүй), торон дээрх бодлого

## 💡 Гол санаа
**Граф** = цэгүүд (**орой**) ба тэдгээрийг холбосон шугамууд (**ирмэг**). Хотууд ба замууд, найзууд, торон дээрх нүднүүд — бүгд граф.

### Хоёр нэвтрэх арга
| | DFS (гүн рүү) | BFS (өргөн рүү) |
|---|---|---|
| Санаа | Нэг замаар аль болох гүн орж, гацвал буцна | Эхлэлээс давхарга давхаргаар тэлнэ |
| Бүтэц | рекурс / stack | queue |
| Хэзээ | холбоост байдал, мөчлөг, бүрэлдэхүүн тоолох | **жингүй графын хамгийн богино зам** |

BFS-ийг усанд шидсэн чулууны долгионтой зүйрлэж болно: эхлээд 1 алхам зайтайг, дараа нь 2 алхамтайг гэх мэт.

## 🧠 Алхам алхмаар: BFS
```
Граф: 1–2, 1–3, 2–4, 3–4, 4–5        Эхлэл: 1
queue: [1]        dist: 1→0
pop 1 → 2, 3      dist: 2→1, 3→1
pop 2 → 4         dist: 4→2
pop 3 → (4 аль хэдийн)
pop 4 → 5         dist: 5→3
```

## 💻 Код
Хөршийн жагсаалт:
```cpp
vector<vector<int>> g(n + 1);
for (int i = 0; i < m; i++) {
    int u, v; cin >> u >> v;
    g[u].push_back(v); g[v].push_back(u);   // чиглэлгүй
}
```
BFS — хамгийн богино зам (Message Route):
```cpp
vector<int> dist(n + 1, -1), par(n + 1, 0);
queue<int> q; q.push(1); dist[1] = 0;
while (!q.empty()) {
    int u = q.front(); q.pop();
    for (int v : g[u]) if (dist[v] == -1) {
        dist[v] = dist[u] + 1; par[v] = u; q.push(v);
    }
}
// замыг сэргээх: n → par[n] → ... → 1
```
DFS — холбоост бүрэлдэхүүн тоолох:
```cpp
vector<bool> seen(n + 1, false);
void dfs(int u) {
    seen[u] = true;
    for (int v : g[u]) if (!seen[v]) dfs(v);
}
// main дотор:
int comps = 0;
for (int s = 1; s <= n; s++)
    if (!seen[s]) { comps++; dfs(s); }
```
Торон (grid) дээр: нүд бүр орой, дээш/доош/зүүн/баруун нь хөршүүд (Counting Rooms):
```cpp
int n, m;
vector<string> grid;
vector<vector<bool>> seen;
const int dr[4] = {1, -1, 0, 0}, dc[4] = {0, 0, 1, -1};

void fill(int r, int c) {            // нэг өрөөг бүхэлд нь тэмдэглэнэ (BFS)
    queue<pair<int,int>> q; q.push({r, c}); seen[r][c] = true;
    while (!q.empty()) {
        auto [x, y] = q.front(); q.pop();
        for (int k = 0; k < 4; k++) {
            int nx = x + dr[k], ny = y + dc[k];
            if (nx < 0 || ny < 0 || nx >= n || ny >= m) continue;   // торноос гарсан
            if (grid[nx][ny] == '#' || seen[nx][ny]) continue;     // хана эсвэл үзсэн
            seen[nx][ny] = true; q.push({nx, ny});
        }
    }
}
```

## ⏱️ Нарийн төвөгшил
DFS ба BFS: **O(n + m)** (орой + ирмэг).

## ⚠️ Түгээмэл алдаа
- Оройг queue-д хийхдээ **тэр дор нь** тэмдэглэхгүй бол нэг оройг олон удаа хийнэ.
- 10⁶ гаруй гүнтэй рекурсив DFS (жишээ нь урт гинж) stack халиж болно — тийм үед BFS эсвэл өөрийн `stack`-аар давталттай бич.
- Чиглэлгүй графт ирмэгийг **хоёр тийш** нэмэхээ мартах.
- Оройн дугаар 1-ээс эхэлдэг бол массив n+1 урттай.

## 🏋️ Дасгал (CSES → Graph Algorithms)
1. **Counting Rooms** — торон дээрх бүрэлдэхүүн
2. **Labyrinth** — BFS + зам сэргээх
3. **Building Roads** — бүрэлдэхүүнүүдийг холбох
4. **Message Route** — BFS хамгийн богино зам
5. **Building Teams** — хоёр өнгөөр будах (bipartite)
6. **Round Trip** — мөчлөг олох

## 📚 Цааш унших
- 📕 *Competitive Programmer's Handbook* — Бүлэг 11 «Basics of graphs», Бүлэг 12 «Graph traversal» · [cses.fi/book/book.pdf](https://cses.fi/book/book.pdf)
- 🌐 *USACO Guide* — Silver → «Graph Traversal», «Flood Fill» · [usaco.guide](https://usaco.guide/)
- 🌐 *cp-algorithms* — «Breadth-first search», «Depth First Search» · [cp-algorithms.com](https://cp-algorithms.com/)
