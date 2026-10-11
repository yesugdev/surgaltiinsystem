## 🎯 Энэ сэдвээс юу сурах вэ
- Модон дээрх асуулгад хурдан хариулах: **k-р өвөг**, **хамгийн ойрын нийтлэг өвөг (LCA)**
- **Binary lifting** — 2-ын зэргээр «үсрэх» хүснэгт
- Хоёр оройн хоорондох зайг LCA-аар олох

## 💡 Гол санаа
### k-р өвөг
Удам угсааны модонд «Батын 5 үеийн өмнөх өвөг хэн бэ?» гэж асуувал эцгээр нь нэг нэгээр өгсөх нь O(k). Асуулт 2·10⁵ удаа ирвэл удаан.

**Binary lifting:** орой бүрийн хувьд **1, 2, 4, 8, …** үеийн өмнөх өвгийг урьдчилан хадгална:
`up[x][j] = up[ up[x][j−1] ][j−1]` («2ʲ алхам = 2ʲ⁻¹ алхам + 2ʲ⁻¹ алхам»).
Дараа нь k-г хоёртын тооллоор задлаад (k = 13 = 8 + 4 + 1) хэдхэн үсрэлтээр хүрнэ — **O(log n)**.

### Хамгийн ойрын нийтлэг өвөг (LCA)
a ба b-ийн аль алиных нь өвөг болох оройнуудаас хамгийн **гүн** (тэдэнд хамгийн ойр) нь LCA.
1. Гүнзгий оройг нөгөөгийнхөө **гүнтэй тэнцэтэл** өргөнө (k-р өвгийн аргаар).
2. Тэнцүү болсон бол дууслаа. Үгүй бол хоёуланг нь **хамт** өгсүүлнэ: том үсрэлтээс эхлэн, өвгүүд нь **ялгаатай** хэвээр бол үсэрнэ.
3. Эцэст нь тэдний эцэг = LCA.

### Хоёр оройн зай
`dist(a, b) = depth[a] + depth[b] − 2 · depth[LCA(a, b)]`

## 🧠 Алхам алхмаар
```
        1
      /   \
     2     3
    / \     \
   4   5     6
  /
 7
LCA(7, 5): гүн 7=3, 5=2 → 7-г 1 үе өргөхөд 4; 4≠5 → хамт өгсөхөд 2 = 2 → LCA = 2
dist(7, 6) = 3 + 2 − 2·0 = 5   (LCA = 1, гүн 0)
```

## 💻 Код
Binary lifting + LCA (мод 1-ээс эхэлсэн, үндэс = 1):
```cpp
const int LOG = 18;                      // 2^18 > 2·10^5
int n;
vector<vector<int>> g;
vector<int> depth;
vector<array<int, LOG>> up;

void build() {                           // BFS-ээр эцэг, гүнг олно (рекурсгүй)
    depth.assign(n + 1, -1);
    up.assign(n + 1, {});
    queue<int> q; q.push(1); depth[1] = 0; up[1][0] = 1;   // үндэсний эцэг = өөрөө
    while (!q.empty()) {
        int u = q.front(); q.pop();
        for (int v : g[u]) if (depth[v] == -1) {
            depth[v] = depth[u] + 1; up[v][0] = u; q.push(v);
        }
    }
    for (int j = 1; j < LOG; j++)
        for (int x = 1; x <= n; x++) up[x][j] = up[up[x][j - 1]][j - 1];
}

int kth(int x, int k) {                  // x-ийн k-р өвөг (байхгүй бол -1)
    if (k > depth[x]) return -1;
    for (int j = 0; j < LOG; j++) if (k >> j & 1) x = up[x][j];
    return x;
}

int lca(int a, int b) {
    if (depth[a] < depth[b]) swap(a, b);
    a = kth(a, depth[a] - depth[b]);     // ижил гүнд
    if (a == b) return a;
    for (int j = LOG - 1; j >= 0; j--)
        if (up[a][j] != up[b][j]) { a = up[a][j]; b = up[b][j]; }
    return up[a][0];
}

int dist(int a, int b) { return depth[a] + depth[b] - 2 * depth[lca(a, b)]; }
```

## ⏱️ Нарийн төвөгшил
Бэлтгэл **O(n log n)**, асуулга бүр **O(log n)**. Санах ой O(n log n).

## ⚠️ Түгээмэл алдаа
- `LOG`-ийг хэт бага авах: n ≤ 2·10⁵ бол 2^LOG > n байх ёстой (18).
- Үндэсний эцгийг тодорхойлохгүй орхих → хүснэгт буруу утгатай болно. Үндэсний эцгийг өөрөө гэж тавь.
- LCA-д эхлээд гүнийг тэнцүүлэхээ мартах.
- Гүн модон (гинж) дээр рекурсив DFS stack халиж болно — BFS ашигла.

## 🏋️ Дасгал (CSES → Tree Algorithms)
1. **Company Queries I** — k-р өвөг
2. **Company Queries II** — LCA
3. **Distance Queries** — LCA-аар зай

## 📚 Цааш унших
- 📕 *Competitive Programmer's Handbook* — Бүлэг 18 «Tree queries»: 18.1 Finding ancestors (х. 163), 18.2 Subtrees and paths (х. 164), 18.3 Lowest common ancestor (х. 167), 18.4 Offline algorithms (х. 170)
- 🌐 *cp-algorithms* — «Lowest Common Ancestor — Binary Lifting» · [cp-algorithms.com](https://cp-algorithms.com/)
- 🌐 *USACO Guide* — Platinum → «Binary Jumping» · [usaco.guide](https://usaco.guide/)
