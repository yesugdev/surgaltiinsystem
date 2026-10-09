## 🎯 Энэ сэдвээс юу сурах вэ
- Жинтэй графын хамгийн богино зам
- **Dijkstra** — олимпиадын хамгийн чухал алгоритмуудын нэг
- Хэзээ BFS, Dijkstra, Bellman–Ford, Floyd–Warshall хэрэглэх вэ

## 💡 Гол санаа
Ирмэг бүр **жинтэй** (зай, хугацаа, үнэ) бол BFS ажиллахгүй: цөөн ирмэгтэй зам урт байж болно.

**Dijkstra-ийн санаа:** одоогоор хамгийн **ойр** байгаа, хараахан «баталгаажаагүй» оройг сонгоод, түүнээс хөршүүдийн зайг сайжруулна (**relaxation**). Хамгийн ойрыг хурдан олохын тулд **priority queue** ашиглана.

> Сөрөг жинтэй ирмэг байвал Dijkstra **буруу** ажиллана!

### Аль алгоритм вэ?
| Нөхцөл | Алгоритм | Хурд |
|---|---|---|
| Жин бүгд ижил (эсвэл жингүй) | BFS | O(n + m) |
| Жин ≥ 0 | **Dijkstra** | O((n + m) log n) |
| Сөрөг жин байж болно | Bellman–Ford | O(n · m) |
| Бүх хосын хоорондох зай, n ≤ 500 | Floyd–Warshall | O(n³) |

## 🧠 Алхам алхмаар
```
1 →(2) 2,  1 →(5) 3,  2 →(1) 3,  3 →(3) 4          эхлэл 1
dist: [0, ∞, ∞, ∞]
1-ийг ав:  2 → 2,  3 → 5
2-ыг ав (2):  3 → min(5, 2+1) = 3
3-ыг ав (3):  4 → 6
Хариу: dist = [0, 2, 3, 6]
```

## 💻 Код
Dijkstra (Shortest Routes I):
```cpp
const long long INF = LLONG_MAX;
vector<vector<pair<int,int>>> g(n + 1);       // (хөрш, жин)
vector<long long> dist(n + 1, INF);
priority_queue<pair<long long,int>, vector<pair<long long,int>>, greater<>> pq;
dist[1] = 0; pq.push({0, 1});
while (!pq.empty()) {
    auto [d, u] = pq.top(); pq.pop();
    if (d > dist[u]) continue;                // хуучирсан бичлэг
    for (auto [v, w] : g[u])
        if (d + w < dist[v]) {
            dist[v] = d + w;
            pq.push({dist[v], v});
        }
}
```
Floyd–Warshall (Shortest Routes II):
```cpp
const ll INF = 1e18;
vector<vector<ll>> d(n + 1, vector<ll>(n + 1, INF));
for (int i = 1; i <= n; i++) d[i][i] = 0;
// ирмэг бүрт: d[u][v] = d[v][u] = min(d[u][v], w);
for (int k = 1; k <= n; k++)
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= n; j++)
            if (d[i][k] < INF && d[k][j] < INF)          // INF + INF халихаас сэргийлнэ
                d[i][j] = min(d[i][j], d[i][k] + d[k][j]);
```

## ⏱️ Нарийн төвөгшил
Dijkstra: **O((n + m) log n)**. Floyd: O(n³).

## ⚠️ Түгээмэл алдаа
- `if (d > dist[u]) continue;` мөрийг мартах → маш удаан болно.
- Зай томорч халих: C++-д `long long`, INF-г хангалттай том.
- Сөрөг жинтэй графт Dijkstra хэрэглэх.
- Чиглэлтэй графт ирмэгийг хоёр тийш нэмэх (бодлогоо анхааралтай унш!).

## 🏋️ Дасгал (CSES → Graph Algorithms)
1. **Shortest Routes I** — Dijkstra
2. **Shortest Routes II** — Floyd–Warshall
3. **Flight Discount** — Dijkstra төлөвтэй (хөнгөлөлт ашигласан эсэх)
4. **Investigation** — Dijkstra + DP (хүнд)

## 📚 Цааш унших
- 📕 *Competitive Programmer's Handbook* — Бүлэг 13 «Shortest paths» · [cses.fi/book/book.pdf](https://cses.fi/book/book.pdf)
- 🌐 *USACO Guide* — Gold → «Shortest Paths with Non-Negative Edge Weights» · [usaco.guide](https://usaco.guide/)
- 🌐 *cp-algorithms* — «Dijkstra Algorithm» · [cp-algorithms.com/graph/dijkstra.html](https://cp-algorithms.com/graph/dijkstra.html)
- 📗 *Introduction to Algorithms* (CLRS) — «Single-Source Shortest Paths»
