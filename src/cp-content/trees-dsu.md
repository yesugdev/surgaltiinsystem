## 🎯 Энэ сэдвээс юу сурах вэ
- Мод (tree) ба түүний шинж, модон дээрх DFS
- Дэд модны хэмжээ, модны диаметр
- **DSU (Union-Find)** ба **Kruskal**-ийн хамгийн бага тулгуур мод

## 💡 Гол санаа
### Мод
n оройтой, **n − 1 ирмэгтэй**, холбоост, **мөчлөггүй** граф. Аль ч хоёр оройн хооронд **яг нэг** зам бий. Гэр бүлийн мод, байгууллагын бүтэц — бүгд мод.

Модон дээр DFS хийхдээ «эцгээ» санаад буцаж явахгүй — тэгвэл тусдаа `seen` массив хэрэггүй.

### DSU (Disjoint Set Union)
Хүмүүс **бүлгүүдэд** хуваагдсан гэж бод. Хоёр үйлдлийг хурдан хийнэ:
- `find(x)` — x аль бүлэгт вэ (бүлгийн «тэргүүн»)
- `union(a, b)` — a, b-гийн бүлгийг нэгтгэх

Хоёр сайжруулалт (**замыг шахах** + **хэмжээгээр нэгтгэх**) хийвэл үйлдэл бүр бараг **O(1)**.

## 🧠 Алхам алхмаар: Kruskal
Хамгийн бага нийт жинтэй тулгуур мод (бүх хотыг хамгийн хямдаар холбох):
1. Ирмэгүүдийг **жингээр нь эрэмбэлнэ**.
2. Хөнгөнөөс нь эхлэн: хоёр төгсгөл нь **өөр бүлэгт** байвал ирмэгийг авч, бүлгүүдийг нэгтгэнэ; нэг бүлэгт байвал мөчлөг үүсэх тул алгасна.
3. n − 1 ирмэг авбал дуусна (эс бөгөөс холбох боломжгүй).

## 💻 Код
DSU:
```cpp
vector<int> parent(n + 1), sz(n + 1, 1);
iota(parent.begin(), parent.end(), 0);
function<int(int)> find = [&](int x) {
    return parent[x] == x ? x : parent[x] = find(parent[x]);   // замыг шахах
};
auto unite = [&](int a, int b) {
    a = find(a); b = find(b);
    if (a == b) return false;
    if (sz[a] < sz[b]) swap(a, b);                              // хэмжээгээр
    parent[b] = a; sz[a] += sz[b];
    return true;
};
```
Kruskal (Road Reparation):
```cpp
vector<array<int,3>> edges(m);                 // {w, u, v} — эхний элементээр эрэмбэлэгдэнэ
for (auto &[w, u, v] : edges) cin >> u >> v >> w;
sort(edges.begin(), edges.end());
ll total = 0; int used = 0;
for (auto [w, u, v] : edges)
    if (unite(u, v)) { total += w; used++; }
if (used == n - 1) cout << total << "\n";
else cout << "IMPOSSIBLE\n";
```
Дэд модны хэмжээ (Subordinates) — DFS, эцгээ санаж:
```cpp
vector<vector<int>> children(n + 1);
vector<int> sub(n + 1, 1);                     // sub[u] = u-ийн дэд модны оройн тоо
void dfs(int u) {
    for (int c : children[u]) {
        dfs(c);
        sub[u] += sub[c];
    }
}
// dfs(1); хариу: дэд ажилтан = sub[u] - 1
```
### Модны диаметр (хамгийн урт зам)
Аль нэг оройгоос **хамгийн хол** оройг BFS-ээр ол → тэр оройгоос дахин хамгийн холыг ол. Хоёр дахь зай = диаметр.
```cpp
auto bfs = [&](int s) {                        // {хамгийн хол орой, зай}
    vector<int> d(n + 1, -1); d[s] = 0;
    queue<int> q; q.push(s);
    int far = s;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        if (d[u] > d[far]) far = u;
        for (int v : g[u]) if (d[v] == -1) { d[v] = d[u] + 1; q.push(v); }
    }
    return make_pair(far, d[far]);
};
int a = bfs(1).first;
cout << bfs(a).second << "\n";                 // диаметр
```

## ⏱️ Нарийн төвөгшил
- Модон дээрх DFS/BFS: O(n)
- DSU үйлдэл: бараг O(1)
- Kruskal: O(m log m) (эрэмбэлэлт)

## ⚠️ Түгээмэл алдаа
- DSU-д `find`-ийн оронд `parent[x]`-ийг шууд харьцуулах.
- Kruskal-д ирмэгийг эрэмбэлэхээ мартах.
- Модон дээр DFS хийхдээ эцэг рүүгээ буцах → төгсгөлгүй давталт.
- Гинж хэлбэртэй мод (2·10⁵ гүн) дээр рекурсив DFS stack халиж болно — тийм үед BFS дараалал ашигла.

## 🏋️ Дасгал (CSES → Tree Algorithms, Graph Algorithms)
1. **Subordinates** — дэд модны хэмжээ
2. **Tree Diameter** — хоёр удаагийн BFS
3. **Road Reparation** — Kruskal
4. **Road Construction** — DSU, бүлгийн тоо ба хамгийн том бүлэг
5. **Tree Distances I** — орой бүрээс хамгийн хол зай

## 📚 Цааш унших
- 📕 *Competitive Programmer's Handbook* — Бүлэг 14 «Tree algorithms», Бүлэг 15 «Spanning trees» · [cses.fi/book/book.pdf](https://cses.fi/book/book.pdf)
- 🌐 *USACO Guide* — Silver → «Introduction to Tree Algorithms», Gold → «Disjoint Set Union», «Minimum Spanning Trees» · [usaco.guide](https://usaco.guide/)
- 🌐 *cp-algorithms* — «Disjoint Set Union» · [cp-algorithms.com/data_structures/disjoint_set_union.html](https://cp-algorithms.com/data_structures/disjoint_set_union.html)
