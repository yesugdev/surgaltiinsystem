// Граф ба мод: BFS/DFS, хамгийн богино зам, чиглэлтэй граф, мод/DSU, LCA
const { MOD, reader, lines, text } = require('./util');

/** Энгийн min-heap: [түлхүүр, утга] хосууд */
class Heap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.k.length; }
  push(key, val) {
    const k = this.k, v = this.v;
    let i = k.length;
    k.push(key); v.push(val);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= key) break;
      k[i] = k[p]; v[i] = v[p]; i = p;
    }
    k[i] = key; v[i] = val;
  }
  pop() {
    const k = this.k, v = this.v;
    const top = [k[0], v[0]];
    const lk = k.pop(), lv = v.pop();
    if (k.length) {
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= k.length) break;
        if (c + 1 < k.length && k[c + 1] < k[c]) c++;
        if (k[c] >= lk) break;
        k[i] = k[c]; v[i] = v[c]; i = c;
      }
      k[i] = lk; v[i] = lv;
    }
    return top;
  }
}

/** Үндэс нь 1 модны эцгүүд: res[v] (v = 2..n). shape: 'random' | 'deep' | 'chain' | 'star' */
function parents(R, n, shape = 'random') {
  const order = [1, ...R.shuffle(Array.from({ length: n - 1 }, (_, i) => i + 2))];
  const par = new Array(n + 1).fill(0);
  for (let i = 1; i < n; i++) {
    const j = shape === 'chain' ? i - 1 : shape === 'star' ? 0 : shape === 'deep' ? R.int(Math.max(0, i - 3), i - 1) : R.int(0, i - 1);
    par[order[i]] = order[j];
  }
  return par;
}
/** Модны ирмэгүүд (санамсаргүй дугаар, санамсаргүй дараалал) */
function treeEdges(R, n, shape = 'random') {
  const par = parents(R, n, shape);
  const relabel = R.shuffle(Array.from({ length: n }, (_, i) => i + 1));
  const edges = [];
  for (let v = 2; v <= n; v++) edges.push(R.next() < 0.5 ? [relabel[v - 1], relabel[par[v] - 1]] : [relabel[par[v] - 1], relabel[v - 1]]);
  return R.shuffle(edges);
}
function adjOf(n, edges, directed = false) {
  const g = Array.from({ length: n + 1 }, () => []);
  for (const [a, b] of edges) { g[a].push(b); if (!directed) g[b].push(a); }
  return g;
}
/** BFS: зай (холбогдоогүй бол -1) ба эцэг */
function bfs(g, s) {
  const n = g.length - 1;
  const dist = new Int32Array(n + 1).fill(-1), par = new Int32Array(n + 1);
  const q = new Int32Array(n);
  let h = 0, t = 0;
  q[t++] = s; dist[s] = 0; par[s] = s;
  while (h < t) {
    const u = q[h++];
    for (const v of g[u]) if (dist[v] < 0) { dist[v] = dist[u] + 1; par[v] = u; q[t++] = v; }
  }
  return { dist, par, order: q.subarray(0, t) };
}
/** Binary lifting хүснэгт: up[j][v] */
function lifting(n, par, LOG = 18) {
  const up = [Int32Array.from(par)];
  for (let j = 1; j < LOG; j++) {
    const prev = up[j - 1], cur = new Int32Array(n + 1);
    for (let v = 1; v <= n; v++) cur[v] = prev[prev[v]];
    up.push(cur);
  }
  return up;
}
function readEdges(r, m, weighted = false) {
  return Array.from({ length: m }, () => (weighted ? [r.num(), r.num(), r.num()] : [r.num(), r.num()]));
}
function gridTest(R, n, m, wall) {
  return Array.from({ length: n }, () => Array.from({ length: m }, () => (R.next() < wall ? '#' : '.')).join(''));
}

module.exports = [
  // ---------- BFS ба DFS ----------
  {
    key: 'graph-traversal-1',
    topic: 'graph-traversal',
    title: 'Байшингийн өрөөнүүд',
    difficulty: 'easy',
    statement: `Байшингийн зураг n × m тороор өгөгдөнө: \`.\` — шал, \`#\` — хана. Дээш, доош, зүүн, баруун тийш хөрш шалны нүднүүд нэг **өрөөнд** багтана.

Байшинд хэдэн өрөө байна вэ?

### Оролт
Эхний мөрөнд n ба m. Дараагийн n мөрөнд m тэмдэгт.

### Гаралт
Өрөөний тоо.

### Хязгаар
- 1 ≤ n, m ≤ 1000

> 💡 Шалны нүд бүрээс (өмнө нь очоогүй бол) BFS/DFS эхлүүлж, хэдэн удаа эхлүүлснээ тоол. Гүн рекурс stack халиж болзошгүй — BFS эсвэл өөрийн stack ашигла.`,
    samples: [text([[5, 8], '########', '#..#...#', '####.#.#', '#..#...#', '########'])],
    gen(R) {
      const t = [];
      for (let i = 0; i < 6; i++) { const n = R.int(1, 8), m = R.int(1, 8); t.push(text([[n, m], ...gridTest(R, n, m, 0.4)])); }
      t.push(lines([1, 1], '#'), text([[1000, 1000], ...gridTest(R, 1000, 1000, 0.45)]));
      t.push(text([[1000, 1000], ...Array.from({ length: 1000 }, (_, i) => (i % 2 ? '#'.repeat(999) + '.' : '.'.repeat(1000)))]));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const n = r.num(), m = r.num();
      const g = Array.from({ length: n }, () => r.str());
      const seen = new Uint8Array(n * m);
      const st = new Int32Array(n * m);
      let rooms = 0;
      for (let s = 0; s < n * m; s++) {
        if (seen[s] || g[(s / m) | 0][s % m] === '#') continue;
        rooms++;
        let top = 0;
        st[top++] = s; seen[s] = 1;
        while (top) {
          const c = st[--top], y = (c / m) | 0, x = c % m;
          for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const ny = y + dy, nx = x + dx;
            if (ny < 0 || nx < 0 || ny >= n || nx >= m || g[ny][nx] === '#' || seen[ny * m + nx]) continue;
            seen[ny * m + nx] = 1; st[top++] = ny * m + nx;
          }
        }
      }
      return rooms + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m; cin >> n >> m;
    vector<string> g(n);
    for (auto& s : g) cin >> s;
    int dy[] = {1, -1, 0, 0}, dx[] = {0, 0, 1, -1};
    int rooms = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) {
            if (g[i][j] != '.') continue;
            rooms++;
            queue<pair<int,int>> q; q.push({i, j}); g[i][j] = '#';   // очсоныг хана болгоно
            while (!q.empty()) {
                auto [y, x] = q.front(); q.pop();
                for (int d = 0; d < 4; d++) {
                    int ny = y + dy[d], nx = x + dx[d];
                    if (ny < 0 || nx < 0 || ny >= n || nx >= m || g[ny][nx] != '.') continue;
                    g[ny][nx] = '#'; q.push({ny, nx});
                }
            }
        }
    cout << rooms << "\n";
}
`,
  },
  {
    key: 'graph-traversal-2',
    topic: 'graph-traversal',
    title: 'Төөрдөг байшингаас гарах',
    difficulty: 'medium',
    statement: `Төөрдөг байшин n × m тороор өгөгдөнө: \`.\` — зам, \`#\` — хана, \`A\` — эхлэл, \`B\` — гарц. Нэг алхамд дээш, доош, зүүн, баруун хөрш нүд рүү шилжинэ.

A-аас B хүрэх хамгийн цөөн алхмын тоог ол. Хүрэх боломжгүй бол -1.

### Оролт
Эхний мөрөнд n ба m. Дараагийн n мөрөнд m тэмдэгт. A ба B яг нэг нэг удаа гарна.

### Гаралт
Хамгийн цөөн алхмын тоо эсвэл -1.

### Хязгаар
- 1 ≤ n, m ≤ 1000

> 💡 Жингүй графт хамгийн богино зам = **BFS**.`,
    samples: [text([[5, 8], '########', '#.A#...#', '#.##.#B#', '#......#', '########']), lines([3, 3], 'A#.', '##.', '..B')],
    gen(R) {
      const place = (rows) => {
        const g = rows.map((s) => s.split(''));
        const n = g.length, m = g[0].length;
        const cell = () => [R.int(0, n - 1), R.int(0, m - 1)];
        let a = cell(), b = cell();
        while (b[0] === a[0] && b[1] === a[1]) b = cell();
        g[a[0]][a[1]] = 'A'; g[b[0]][b[1]] = 'B';
        return text([[n, m], ...g.map((x) => x.join(''))]);
      };
      const t = [];
      for (let i = 0; i < 6; i++) { const n = R.int(1, 8), m = R.int(2, 8); t.push(place(gridTest(R, n, m, 0.3))); }
      t.push(place(gridTest(R, 1000, 1000, 0.3)), place(gridTest(R, 1000, 1000, 0.42)));
      const snake = Array.from({ length: 999 }, (_, i) => (i % 4 === 1 ? '#'.repeat(999) + '.' : i % 4 === 3 ? '.' + '#'.repeat(999) : '.'.repeat(1000)));
      snake[0] = 'A' + snake[0].slice(1); snake[998] = snake[998].slice(0, 999) + 'B';
      t.push(text([[999, 1000], ...snake]));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const n = r.num(), m = r.num();
      const g = Array.from({ length: n }, () => r.str());
      let s = 0, e = 0;
      for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { if (g[i][j] === 'A') s = i * m + j; if (g[i][j] === 'B') e = i * m + j; }
      const dist = new Int32Array(n * m).fill(-1), q = new Int32Array(n * m);
      let h = 0, t = 0;
      q[t++] = s; dist[s] = 0;
      while (h < t) {
        const c = q[h++], y = (c / m) | 0, x = c % m;
        for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ny = y + dy, nx = x + dx;
          if (ny < 0 || nx < 0 || ny >= n || nx >= m || g[ny][nx] === '#' || dist[ny * m + nx] >= 0) continue;
          dist[ny * m + nx] = dist[c] + 1; q[t++] = ny * m + nx;
        }
      }
      return dist[e] + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m; cin >> n >> m;
    vector<string> g(n);
    for (auto& s : g) cin >> s;
    vector<vector<int>> dist(n, vector<int>(m, -1));
    queue<pair<int,int>> q;
    int ey = 0, ex = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) {
            if (g[i][j] == 'A') { dist[i][j] = 0; q.push({i, j}); }
            if (g[i][j] == 'B') { ey = i; ex = j; }
        }
    int dy[] = {1, -1, 0, 0}, dx[] = {0, 0, 1, -1};
    while (!q.empty()) {
        auto [y, x] = q.front(); q.pop();
        for (int d = 0; d < 4; d++) {
            int ny = y + dy[d], nx = x + dx[d];
            if (ny < 0 || nx < 0 || ny >= n || nx >= m || g[ny][nx] == '#' || dist[ny][nx] != -1) continue;
            dist[ny][nx] = dist[y][x] + 1;
            q.push({ny, nx});
        }
    }
    cout << dist[ey][ex] << "\n";
}
`,
  },
  // ---------- Хамгийн богино зам ----------
  {
    key: 'shortest-paths-1',
    topic: 'shortest-paths',
    title: 'Хотуудын хоорондох зай',
    difficulty: 'medium',
    statement: `n хот, m **нэг чиглэлтэй** авто зам бий. Зам бүр a хотоос b хот руу c км урттай. Нийслэл бол 1-р хот.

Нийслэлээс хот бүр хүрэх хамгийн богино замын уртыг ол. Хүрэх боломжгүй бол -1.

### Оролт
Эхний мөрөнд n ба m. Дараагийн m мөрөнд a, b, c.

### Гаралт
n тоог нэг мөрөнд хоосон зайгаар (1-р хотын зай 0).

### Хязгаар
- 1 ≤ n ≤ 10⁵, 1 ≤ m ≤ 2·10⁵
- 1 ≤ a, b ≤ n, 1 ≤ c ≤ 10⁹

> 💡 **Dijkstra** + priority_queue — O((n + m) log m). Зай 10¹⁴ хүртэл → \`long long\`.`,
    samples: [lines([4, 5], [1, 2, 4], [1, 3, 1], [3, 2, 2], [2, 4, 5], [4, 1, 1])],
    gen(R) {
      const mk = (n, m, C) => text([[n, m], ...Array.from({ length: m }, () => [R.int(1, n), R.int(1, n), R.int(1, C)])]);
      const t = [];
      for (let i = 0; i < 6; i++) { const n = R.int(1, 8); t.push(mk(n, R.int(1, 15), 10)); }
      t.push(mk(50000, 100000, 1e9));
      const n = 50000, chain = [];
      for (let v = 1; v < n; v++) chain.push([v, v + 1, 1e9]);
      for (let i = 0; i < 50000; i++) { const a = R.int(1, n - 2); chain.push([a, R.int(a + 2, n), 1e9]); }
      t.push(text([[n, chain.length], ...R.shuffle(chain)]));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const n = r.num(), m = r.num();
      const g = Array.from({ length: n + 1 }, () => []);
      for (let i = 0; i < m; i++) { const a = r.num(), b = r.num(), c = r.num(); g[a].push(b, c); }
      const dist = new Float64Array(n + 1).fill(Infinity);
      const h = new Heap();
      dist[1] = 0; h.push(0, 1);
      while (h.size) {
        const [d, u] = h.pop();
        if (d > dist[u]) continue;
        const e = g[u];
        for (let i = 0; i < e.length; i += 2) {
          const v = e[i], nd = d + e[i + 1];
          if (nd < dist[v]) { dist[v] = nd; h.push(nd, v); }
        }
      }
      const out = [];
      for (let v = 1; v <= n; v++) out.push(dist[v] === Infinity ? -1 : dist[v]);
      return out.join(' ') + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m; cin >> n >> m;
    vector<vector<pair<int,long long>>> g(n + 1);
    for (int i = 0; i < m; i++) { int a, b; long long c; cin >> a >> b >> c; g[a].push_back({b, c}); }
    const long long INF = LLONG_MAX;
    vector<long long> dist(n + 1, INF);
    priority_queue<pair<long long,int>, vector<pair<long long,int>>, greater<>> pq;
    dist[1] = 0; pq.push({0, 1});
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;                    // хуучирсан бичлэг
        for (auto [v, c] : g[u])
            if (d + c < dist[v]) { dist[v] = d + c; pq.push({dist[v], v}); }
    }
    for (int v = 1; v <= n; v++) cout << (dist[v] == INF ? -1 : dist[v]) << (v < n ? ' ' : '\n');
}
`,
  },
  {
    key: 'shortest-paths-2',
    topic: 'shortest-paths',
    title: 'Мөнхийн хөдөлгүүр',
    difficulty: 'medium',
    statement: `Нэгэн тоглоомд n өртөө, m нэг чиглэлтэй гарц бий. a-аас b руу гарцаар ороход c зоос **төлнө** (c сөрөг бол |c| зоос **авна**).

Тоглогч ямар нэг өртөөнөөс эхлээд хэд хэдэн гарцаар яваад **буцаж тэр өртөөндөө** ирэхэд зоос нь өсөх (өөрөөр хэлбэл, нийт жин нь сөрөг мөчлөг) боломж байна уу?

### Оролт
Эхний мөрөнд n ба m. Дараагийн m мөрөнд a, b, c.

### Гаралт
Ийм мөчлөг байвал \`YES\`, үгүй бол \`NO\`.

### Хязгаар
- 1 ≤ n ≤ 2500, 1 ≤ m ≤ 5000
- 1 ≤ a, b ≤ n, −10⁹ ≤ c ≤ 10⁹

> 💡 Онолын «Bellman–Ford» хэсэг (номын 13.1, х. 123): бүх зайг **0**-ээр эхлүүлбэл (хуурамч эх орой) аль ч сөрөг мөчлөг n-р алхамд илэрнэ.`,
    samples: [lines([4, 5], [1, 2, 3], [2, 3, -2], [3, 4, 1], [4, 2, -2], [3, 1, 5]), lines([3, 3], [1, 2, 5], [2, 3, -2], [3, 1, -2])],
    gen(R) {
      const mk = (n, edges) => text([[n, edges.length], ...edges]);
      const rand = (n, m, lo, hi) => Array.from({ length: m }, () => [R.int(1, n), R.int(1, n), R.int(lo, hi)]);
      const dag = (n, m, lo, hi) => {
        const p = R.shuffle(Array.from({ length: n }, (_, i) => i + 1));
        return Array.from({ length: m }, () => { const i = R.int(0, n - 2); return [p[i], p[R.int(i + 1, n - 1)], R.int(lo, hi)]; });
      };
      const t = [];
      for (let i = 0; i < 3; i++) { const n = R.int(2, 6); t.push(mk(n, rand(n, R.int(1, 10), -5, 10))); }
      for (let i = 0; i < 2; i++) { const n = R.int(2, 6); t.push(mk(n, dag(n, R.int(1, 10), -10, 10))); }
      t.push(mk(2500, dag(2500, 5000, -1e9, 1e9)), mk(2500, rand(2500, 5000, 1, 1e9)));
      const planted = rand(2500, 4990, 0, 1e9);
      const cyc = R.shuffle(Array.from({ length: 2500 }, (_, i) => i + 1)).slice(0, 10);
      for (let i = 0; i < 10; i++) planted.push([cyc[i], cyc[(i + 1) % 10], i ? 1e8 : -9e8 - 1]);
      t.push(mk(2500, R.shuffle(planted)));
      const chain = [];
      for (let v = 1; v < 2500; v++) chain.push([v + 1, v, -1]);
      chain.push([1, 2500, 2499]);
      t.push(mk(2500, chain));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const n = r.num(), m = r.num();
      const e = readEdges(r, m, true);
      const dist = new Float64Array(n + 1);
      for (let i = 1; i <= n; i++) {
        let changed = false;
        for (const [a, b, c] of e) if (dist[a] + c < dist[b]) { dist[b] = dist[a] + c; changed = true; }
        if (!changed) return 'NO\n';
        if (i === n) return 'YES\n';
      }
      return 'NO\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, m; cin >> n >> m;
    vector<array<long long,3>> e(m);
    for (auto& [a, b, c] : e) cin >> a >> b >> c;
    vector<long long> dist(n + 1, 0);                // бүх орой эх цэг
    for (int i = 1; i <= n; i++) {
        bool changed = false;
        for (auto [a, b, c] : e)
            if (dist[a] + c < dist[b]) { dist[b] = dist[a] + c; changed = true; }
        if (!changed) { cout << "NO\n"; return 0; }
        if (i == n) { cout << "YES\n"; return 0; }   // n-р алхамд ч өөрчлөгдсөн
    }
}
`,
  },
  // ---------- Чиглэлтэй граф ----------
  {
    key: 'directed-graphs-1',
    topic: 'directed-graphs',
    title: 'Хичээлийн дараалал',
    difficulty: 'medium',
    statement: `Их сургуульд n хичээл бий. m шаардлага өгөгдөнө: «a хичээлийг b хичээлээс **өмнө** үзэх ёстой».

Бүх хичээлийг шаардлагыг зөрчихгүй үзэх дарааллаас **лексикографын хувьд хамгийн бага**-г нь (эхний ялгаатай байрлалд бага дугаартай нь) гарга. Боломжгүй бол \`IMPOSSIBLE\`.

### Оролт
Эхний мөрөнд n ба m. Дараагийн m мөрөнд a ба b.

### Гаралт
n хичээлийн дугаарыг нэг мөрөнд хоосон зайгаар, эсвэл \`IMPOSSIBLE\`.

### Хязгаар
- 1 ≤ n ≤ 10⁵, 1 ≤ m ≤ 2·10⁵, 1 ≤ a, b ≤ n

> 💡 Kahn-ийн алгоритм (номын 16.1, х. 149), гэхдээ энгийн queue-ийн оронд **min-heap** — дараагийн боломжит хамгийн бага дугаарыг сонгоно.`,
    samples: [lines([5, 4], [3, 1], [1, 4], [3, 2], [5, 2]), lines([3, 3], [1, 2], [2, 3], [3, 1])],
    gen(R) {
      const dag = (n, m) => {
        const p = R.shuffle(Array.from({ length: n }, (_, i) => i + 1));
        return Array.from({ length: m }, () => { const i = R.int(0, n - 2); return [p[i], p[R.int(i + 1, Math.min(n - 1, i + 50))]]; });
      };
      const t = [];
      for (let i = 0; i < 5; i++) { const n = R.int(2, 8); t.push(text([[n, Math.min(6, n)], ...dag(n, Math.min(6, n))])); }
      t.push(lines([4, 4], [1, 2], [2, 3], [3, 2], [4, 1]));
      t.push(text([[50000, 100000], ...dag(50000, 100000)]));
      const cyc = dag(50000, 99999); cyc.push([cyc[5][1], cyc[5][0]]);
      t.push(text([[50000, 100000], ...R.shuffle(cyc)]));
      t.push(lines([50000, 1], [50000, 1]));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const n = r.num(), m = r.num();
      const g = Array.from({ length: n + 1 }, () => []);
      const indeg = new Int32Array(n + 1);
      for (let i = 0; i < m; i++) { const a = r.num(), b = r.num(); g[a].push(b); indeg[b]++; }
      const h = new Heap();
      for (let v = 1; v <= n; v++) if (!indeg[v]) h.push(v, v);
      const order = [];
      while (h.size) {
        const [u] = h.pop();
        order.push(u);
        for (const v of g[u]) if (--indeg[v] === 0) h.push(v, v);
      }
      return order.length < n ? 'IMPOSSIBLE\n' : order.join(' ') + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m; cin >> n >> m;
    vector<vector<int>> g(n + 1);
    vector<int> indeg(n + 1, 0);
    for (int i = 0; i < m; i++) { int a, b; cin >> a >> b; g[a].push_back(b); indeg[b]++; }
    priority_queue<int, vector<int>, greater<int>> pq;
    for (int v = 1; v <= n; v++) if (indeg[v] == 0) pq.push(v);
    vector<int> order;
    while (!pq.empty()) {
        int u = pq.top(); pq.pop();
        order.push_back(u);
        for (int v : g[u]) if (--indeg[v] == 0) pq.push(v);
    }
    if ((int)order.size() < n) { cout << "IMPOSSIBLE\n"; return 0; }
    for (int i = 0; i < n; i++) cout << order[i] << (i + 1 < n ? ' ' : '\n');
}
`,
  },
  {
    key: 'directed-graphs-2',
    topic: 'directed-graphs',
    title: 'Аяллын маршрутууд',
    difficulty: 'medium',
    statement: `Аялал жуулчлалын компанид n цэг, m нэг чиглэлтэй зам бий. Замын сүлжээнд **мөчлөг байхгүй** нь баталгаатай.

1-р цэгээс n-р цэг хүрэх **ялгаатай маршрутын** тоог ол (маршрут = замуудын дараалал). Хариуг 10⁹ + 7-д хуваасан үлдэгдлээр.

### Оролт
Эхний мөрөнд n ба m. Дараагийн m мөрөнд a ба b (a-аас b руу зам). Хоёр цэгийн хооронд хэд хэдэн зам байж болно.

### Гаралт
Маршрутын тоо mod 10⁹ + 7.

### Хязгаар
- 2 ≤ n ≤ 10⁵, 1 ≤ m ≤ 2·10⁵

> 💡 Номын 16.2 (х. 151): топологи эрэмбээр \`ways[v] += ways[u]\`.`,
    samples: [lines([4, 5], [1, 2], [2, 4], [1, 3], [3, 4], [1, 4])],
    gen(R) {
      const dag = (n, m, span) => {
        const mid = R.shuffle(Array.from({ length: n - 2 }, (_, i) => i + 2));
        const p = [1, ...mid, n];
        return Array.from({ length: m }, () => { const i = R.int(0, n - 2); return [p[i], p[R.int(i + 1, Math.min(n - 1, i + span))]]; });
      };
      const t = [];
      for (let i = 0; i < 5; i++) { const n = R.int(2, 7); t.push(text([[n, 8], ...dag(n, 8, n)])); }
      t.push(lines([3, 1], [2, 3]));
      t.push(text([[50000, 100000], ...dag(50000, 100000, 3)]));
      t.push(text([[50000, 100000], ...dag(50000, 100000, 100)]));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const n = r.num(), m = r.num();
      const g = Array.from({ length: n + 1 }, () => []);
      const indeg = new Int32Array(n + 1);
      for (let i = 0; i < m; i++) { const a = r.num(), b = r.num(); g[a].push(b); indeg[b]++; }
      const q = [];
      for (let v = 1; v <= n; v++) if (!indeg[v]) q.push(v);
      const ways = new Array(n + 1).fill(0);
      ways[1] = 1;
      for (let h = 0; h < q.length; h++) {
        const u = q[h];
        for (const v of g[u]) { ways[v] = (ways[v] + ways[u]) % MOD; if (--indeg[v] === 0) q.push(v); }
      }
      return ways[n] + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
const int MOD = 1e9 + 7;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m; cin >> n >> m;
    vector<vector<int>> g(n + 1);
    vector<int> indeg(n + 1, 0);
    for (int i = 0; i < m; i++) { int a, b; cin >> a >> b; g[a].push_back(b); indeg[b]++; }
    queue<int> q;
    for (int v = 1; v <= n; v++) if (indeg[v] == 0) q.push(v);
    vector<long long> ways(n + 1, 0);
    ways[1] = 1;
    while (!q.empty()) {                              // Kahn: топологи эрэмбээр
        int u = q.front(); q.pop();
        for (int v : g[u]) {
            ways[v] = (ways[v] + ways[u]) % MOD;
            if (--indeg[v] == 0) q.push(v);
        }
    }
    cout << ways[n] << "\n";
}
`,
  },
  {
    key: 'directed-graphs-3',
    topic: 'directed-graphs',
    title: 'Гаригийн порталууд',
    difficulty: 'hard',
    statement: `Галактикт n гариг бий. i-р гариг дээр яг нэг портал байх бөгөөд тэр нь tᵢ гариг руу аваачна (tᵢ = i байж болно).

q асуулга: «x гарагаас эхлээд порталаар **k удаа** аялбал аль гариг дээр очих вэ?»

### Оролт
Эхний мөрөнд n ба q. Хоёр дахь мөрөнд t₁, …, tₙ. Дараагийн q мөрөнд x ба k.

### Гаралт
Асуулга бүрийн хариу тусдаа мөрөнд.

### Хязгаар
- 1 ≤ n, q ≤ 2·10⁵
- 1 ≤ tᵢ, x ≤ n, 0 ≤ k ≤ 10⁹

> 💡 Номын 16.3 «Successor paths» (х. 154): \`up[j][x]\` = x-ээс 2ʲ алхмын дараах гариг. k-г хоёртын задаргаагаар → O(log k).`,
    samples: [lines([4, 3], [2, 3, 1, 4], [1, 2], [1, 7], [4, 1000000000])],
    gen(R) {
      const mk = (n, q, K, succ) => {
        const rows = [[n, q], succ || R.arr(n, 1, n)];
        for (let i = 0; i < q; i++) rows.push([R.int(1, n), R.int(0, K)]);
        return text(rows);
      };
      const t = [];
      for (let i = 0; i < 5; i++) t.push(mk(R.int(1, 8), R.int(1, 8), 20));
      t.push(mk(50000, 50000, 1e9));
      t.push(mk(50000, 50000, 1e9, Array.from({ length: 50000 }, (_, i) => (i + 1) % 50000 + 1)));
      t.push(mk(50000, 50000, 1e9, Array.from({ length: 50000 }, (_, i) => Math.max(1, i))));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const n = r.num(), q = r.num();
      const par = new Int32Array(n + 1);
      for (let i = 1; i <= n; i++) par[i] = r.num();
      const up = lifting(n, par, 30);
      const out = [];
      for (let i = 0; i < q; i++) {
        let x = r.num(), k = r.num();
        for (let j = 0; k > 0; j++, k = Math.floor(k / 2)) if (k % 2) x = up[j][x];
        out.push(x);
      }
      return out.join('\n') + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
const int LOG = 30;
int up[LOG][200001];
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, q; cin >> n >> q;
    for (int i = 1; i <= n; i++) cin >> up[0][i];
    for (int j = 1; j < LOG; j++)
        for (int x = 1; x <= n; x++) up[j][x] = up[j - 1][up[j - 1][x]];
    while (q--) {
        int x; long long k; cin >> x >> k;
        for (int j = 0; j < LOG; j++) if (k >> j & 1) x = up[j][x];
        cout << x << "\n";
    }
}
`,
  },
  // ---------- Мод ба DSU ----------
  {
    key: 'trees-dsu-1',
    topic: 'trees-dsu',
    title: 'Компанийн бүтэц',
    difficulty: 'easy',
    statement: `Компанид n ажилтан бий; 1-р ажилтан бол захирал. Бусад ажилтан бүр яг нэг шууд даргатай. Ажилтан бүрийн хувьд түүний **бүх доод албан тушаалтны** (шууд болон шууд бус) тоог ол.

### Оролт
Эхний мөрөнд n. Хоёр дахь мөрөнд n − 1 тоо: 2, 3, …, n-р ажилтны шууд дарга.

### Гаралт
n тоог нэг мөрөнд: 1, 2, …, n-р ажилтны доод албан тушаалтны тоо.

### Хязгаар
- 1 ≤ n ≤ 2·10⁵

> 💡 Дэд модны хэмжээ: \`size[v] = 1 + Σ size[хүүхэд]\`. Гинж маягийн модонд рекурс stack халиж болно — BFS дарааллыг урвуугаар нь боловсруул.`,
    samples: [lines(5, [1, 1, 2, 3])],
    gen(R) {
      const mk = (n, shape) => { const p = parents(R, n, shape); return lines(n, p.slice(2)); };
      const t = [lines(1, '')];
      for (let i = 0; i < 5; i++) t.push(mk(R.int(2, 10), 'random'));
      t.push(mk(100000, 'random'), mk(100000, 'chain'), mk(100000, 'star'));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const n = r.num();
      const g = Array.from({ length: n + 1 }, () => []);
      for (let v = 2; v <= n; v++) g[r.num()].push(v);
      const { order } = bfs(g, 1);
      const size = new Int32Array(n + 1).fill(1);
      const par = new Int32Array(n + 1);
      for (let v = 1; v <= n; v++) for (const c of g[v]) par[c] = v;
      for (let i = order.length - 1; i > 0; i--) size[par[order[i]]] += size[order[i]];
      const out = [];
      for (let v = 1; v <= n; v++) out.push(size[v] - 1);
      return out.join(' ') + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    vector<int> par(n + 1, 0);
    vector<vector<int>> ch(n + 1);
    for (int v = 2; v <= n; v++) { cin >> par[v]; ch[par[v]].push_back(v); }
    vector<int> order = {1};                          // BFS дараалал
    for (int i = 0; i < (int)order.size(); i++)
        for (int c : ch[order[i]]) order.push_back(c);
    vector<int> sz(n + 1, 1);
    for (int i = n - 1; i > 0; i--) sz[par[order[i]]] += sz[order[i]];   // навчнаас дээш
    for (int v = 1; v <= n; v++) cout << sz[v] - 1 << (v < n ? ' ' : '\n');
}
`,
  },
  {
    key: 'trees-dsu-2',
    topic: 'trees-dsu',
    title: 'Модны диаметр',
    difficulty: 'medium',
    statement: `n оройтой мод өгөгдөв. Хоёр оройн хоорондох **хамгийн урт** замын ирмэгийн тоог (модны диаметр) ол.

### Оролт
Эхний мөрөнд n. Дараагийн n − 1 мөрөнд ирмэг a, b.

### Гаралт
Модны диаметр.

### Хязгаар
- 1 ≤ n ≤ 2·10⁵

> 💡 Номын 14.2 (х. 135): дурын оройгоос хамгийн алс оройг (a) ол, дараа нь a-аас хамгийн алс орой хүртэлх зай — хариу. Хоёр BFS.`,
    samples: [lines(5, [1, 2], [1, 3], [3, 4], [3, 5]), lines(1)],
    gen(R) {
      const mk = (n, shape) => text([n, ...treeEdges(R, n, shape)]);
      const t = [];
      for (let i = 0; i < 6; i++) t.push(mk(R.int(2, 10), 'random'));
      t.push(mk(100000, 'deep'), mk(100000, 'chain'), mk(100000, 'star'));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const n = r.num();
      const g = adjOf(n, readEdges(r, n - 1));
      const far = (d) => { let best = 1; for (let v = 1; v <= n; v++) if (d[v] > d[best]) best = v; return best; };
      const a = far(bfs(g, 1).dist);
      const d = bfs(g, a).dist;
      return d[far(d)] + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int n;
vector<vector<int>> g;
vector<int> bfs(int s) {
    vector<int> d(n + 1, -1);
    queue<int> q; q.push(s); d[s] = 0;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        for (int v : g[u]) if (d[v] < 0) { d[v] = d[u] + 1; q.push(v); }
    }
    return d;
}
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    cin >> n;
    g.assign(n + 1, {});
    for (int i = 0; i < n - 1; i++) { int a, b; cin >> a >> b; g[a].push_back(b); g[b].push_back(a); }
    auto d1 = bfs(1);
    int a = max_element(d1.begin() + 1, d1.end()) - d1.begin();   // хамгийн алс орой
    auto d2 = bfs(a);
    cout << *max_element(d2.begin() + 1, d2.end()) << "\n";
}
`,
  },
  {
    key: 'trees-dsu-3',
    topic: 'trees-dsu',
    title: 'Тосгоны интернэт',
    difficulty: 'medium',
    statement: `n тосгоныг интернэтэд холбох гэж байна. m боломжит кабелийн шугам бий: a ба b тосгоныг c төгрөгөөр холбоно (хоёр чиглэлд ажиллана).

Бүх тосгоныг хоорондоо (шууд эсвэл бусдаар дамжин) холбох **хамгийн бага** зардлыг ол. Боломжгүй бол \`IMPOSSIBLE\`.

### Оролт
Эхний мөрөнд n ба m. Дараагийн m мөрөнд a, b, c.

### Гаралт
Хамгийн бага зардал эсвэл \`IMPOSSIBLE\`.

### Хязгаар
- 1 ≤ n ≤ 10⁵, 1 ≤ m ≤ 2·10⁵
- 1 ≤ a, b ≤ n, 1 ≤ c ≤ 10⁹

> 💡 Хамгийн бага бүрхэх мод: **Kruskal + DSU** (номын 15.1–15.2) эсвэл Prim (15.3). Нийт зардал 10¹⁴ хүртэл.`,
    samples: [lines([4, 5], [1, 2, 3], [2, 3, 1], [1, 3, 5], [3, 4, 2], [1, 4, 7]), lines([3, 1], [1, 2, 4])],
    gen(R) {
      const connected = (n, extra, C) => {
        const e = treeEdges(R, n).map(([a, b]) => [a, b, R.int(1, C)]);
        for (let i = 0; i < extra; i++) e.push([R.int(1, n), R.int(1, n), R.int(1, C)]);
        return text([[n, e.length], ...R.shuffle(e)]);
      };
      const t = [];
      for (let i = 0; i < 5; i++) t.push(connected(R.int(2, 8), R.int(0, 6), 10));
      t.push(lines([4, 2], [1, 2, 1], [3, 4, 1]), lines([1, 1], [1, 1, 5]));
      t.push(connected(50000, 100001, 1e9));
      t.push(text([[50000, 100000], ...Array.from({ length: 100000 }, () => [R.int(1, 49999), R.int(1, 49999), R.int(1, 1e9)])]));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const n = r.num(), m = r.num();
      const e = readEdges(r, m, true).sort((x, y) => x[2] - y[2]);
      const p = Int32Array.from({ length: n + 1 }, (_, i) => i);
      const find = (x) => { while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; };
      let cost = 0, used = 0;
      for (const [a, b, c] of e) {
        const x = find(a), y = find(b);
        if (x !== y) { p[x] = y; cost += c; used++; }
      }
      return used === n - 1 ? cost + '\n' : 'IMPOSSIBLE\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
vector<int> p, sz;
int find(int x) { return p[x] == x ? x : p[x] = find(p[x]); }
bool unite(int a, int b) {
    a = find(a); b = find(b);
    if (a == b) return false;
    if (sz[a] < sz[b]) swap(a, b);
    p[b] = a; sz[a] += sz[b];
    return true;
}
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m; cin >> n >> m;
    vector<array<long long,3>> e(m);                 // {c, a, b}
    for (auto& [c, a, b] : e) cin >> a >> b >> c;
    sort(e.begin(), e.end());
    p.resize(n + 1); sz.assign(n + 1, 1);
    iota(p.begin(), p.end(), 0);
    long long cost = 0; int used = 0;
    for (auto [c, a, b] : e) if (unite(a, b)) { cost += c; used++; }
    if (used == n - 1) cout << cost << "\n"; else cout << "IMPOSSIBLE\n";
}
`,
  },
  // ---------- Модон дээрх асуулга ----------
  {
    key: 'tree-queries-1',
    topic: 'tree-queries',
    title: 'Удмын бичиг',
    difficulty: 'medium',
    statement: `Удмын бичигт n хүн бүртгэгдсэн; 1-р хүн бол хамгийн эртний өвөг. Бусад хүн бүрийн эцэг өгөгдөнө.

q асуулга: «x хүний **k үеийн** өмнөх өвөг хэн бэ?» (k = 1 бол эцэг). Ийм өвөг байхгүй бол -1.

### Оролт
Эхний мөрөнд n ба q. Хоёр дахь мөрөнд 2, 3, …, n-р хүний эцэг. Дараагийн q мөрөнд x ба k.

### Гаралт
Асуулга бүрийн хариу тусдаа мөрөнд.

### Хязгаар
- 1 ≤ n, q ≤ 2·10⁵
- 1 ≤ x, k ≤ n

> 💡 Нэг нэгээр өгсөх O(k) — гинж маягийн модонд удаан. **Binary lifting** (номын 18.1, х. 163).`,
    samples: [lines([5, 4], [1, 1, 3, 3], [4, 1], [4, 2], [4, 3], [2, 1])],
    gen(R) {
      const mk = (n, q, shape) => {
        const p = parents(R, n, shape);
        const rows = [[n, q], p.slice(2)];
        for (let i = 0; i < q; i++) rows.push([R.int(1, n), R.int(1, shape === 'random' ? Math.min(n, 30) : n)]);
        return text(rows);
      };
      const t = [];
      for (let i = 0; i < 5; i++) t.push(mk(R.int(2, 10), R.int(1, 10), 'random'));
      t.push(mk(50000, 50000, 'random'), mk(50000, 50000, 'deep'), mk(50000, 50000, 'chain'));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const n = r.num(), q = r.num();
      const par = new Int32Array(n + 1);
      par[1] = 1;
      const g = Array.from({ length: n + 1 }, () => []);
      for (let v = 2; v <= n; v++) { par[v] = r.num(); g[par[v]].push(v); }
      const depth = bfs(g, 1).dist;
      const up = lifting(n, par);
      const out = [];
      for (let i = 0; i < q; i++) {
        let x = r.num(), k = r.num();
        if (k > depth[x]) { out.push(-1); continue; }
        for (let j = 0; k; j++, k >>= 1) if (k & 1) x = up[j][x];
        out.push(x);
      }
      return out.join('\n') + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
const int LOG = 18;
int up[LOG][200001], depth_[200001];
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, q; cin >> n >> q;
    vector<vector<int>> ch(n + 1);
    up[0][1] = 1;                                     // үндэсний эцэг = өөрөө
    for (int v = 2; v <= n; v++) { cin >> up[0][v]; ch[up[0][v]].push_back(v); }
    vector<int> order = {1};
    for (int i = 0; i < (int)order.size(); i++)
        for (int c : ch[order[i]]) { depth_[c] = depth_[order[i]] + 1; order.push_back(c); }
    for (int j = 1; j < LOG; j++)
        for (int v = 1; v <= n; v++) up[j][v] = up[j - 1][up[j - 1][v]];
    while (q--) {
        int x, k; cin >> x >> k;
        if (k > depth_[x]) { cout << -1 << "\n"; continue; }
        for (int j = 0; j < LOG; j++) if (k >> j & 1) x = up[j][x];
        cout << x << "\n";
    }
}
`,
  },
  {
    key: 'tree-queries-2',
    topic: 'tree-queries',
    title: 'Тосгон хоорондын зай',
    difficulty: 'hard',
    statement: `n тосгоныг n − 1 замаар холбосон бөгөөд аль ч хоёр тосгоны хооронд яг нэг зам бий (мод). Зам бүр 1 цагийн явалт.

q асуулга: «a тосгоноос b тосгон хүртэл хэдэн цаг явах вэ?»

### Оролт
Эхний мөрөнд n ба q. Дараагийн n − 1 мөрөнд зам (хоёр тосгон). Дараагийн q мөрөнд a ба b.

### Гаралт
Асуулга бүрийн хариу тусдаа мөрөнд.

### Хязгаар
- 1 ≤ n, q ≤ 2·10⁵

> 💡 \`dist(a, b) = depth[a] + depth[b] − 2·depth[LCA(a, b)]\` (номын 18.3, х. 167).`,
    samples: [lines([7, 3], [1, 2], [1, 3], [2, 4], [2, 5], [3, 6], [4, 7], [7, 5], [7, 6], [3, 3])],
    gen(R) {
      const mk = (n, q, shape) => {
        const rows = [[n, q], ...treeEdges(R, n, shape)];
        for (let i = 0; i < q; i++) rows.push([R.int(1, n), R.int(1, n)]);
        return text(rows);
      };
      const t = [];
      for (let i = 0; i < 5; i++) t.push(mk(R.int(2, 10), R.int(1, 10), 'random'));
      t.push(lines([1, 1], [1, 1]));
      t.push(mk(50000, 50000, 'random'), mk(50000, 50000, 'deep'), mk(50000, 50000, 'chain'));
      return t;
    },
    solve(input) {
      const r = reader(input);
      const n = r.num(), q = r.num();
      const g = adjOf(n, readEdges(r, n - 1));
      const { dist: depth, par } = bfs(g, 1);
      const LOG = 18;
      const up = lifting(n, par, LOG);
      const lca = (a, b) => {
        if (depth[a] < depth[b]) [a, b] = [b, a];
        for (let k = depth[a] - depth[b], j = 0; k; j++, k >>= 1) if (k & 1) a = up[j][a];
        if (a === b) return a;
        for (let j = LOG - 1; j >= 0; j--) if (up[j][a] !== up[j][b]) { a = up[j][a]; b = up[j][b]; }
        return up[0][a];
      };
      const out = [];
      for (let i = 0; i < q; i++) { const a = r.num(), b = r.num(); out.push(depth[a] + depth[b] - 2 * depth[lca(a, b)]); }
      return out.join('\n') + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
const int LOG = 18;
int n;
vector<vector<int>> g;
vector<int> depth;
vector<array<int, LOG>> up;
void build() {
    depth.assign(n + 1, -1);
    up.assign(n + 1, {});
    queue<int> q; q.push(1); depth[1] = 0; up[1][0] = 1;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        for (int v : g[u]) if (depth[v] == -1) { depth[v] = depth[u] + 1; up[v][0] = u; q.push(v); }
    }
    for (int j = 1; j < LOG; j++)
        for (int x = 1; x <= n; x++) up[x][j] = up[up[x][j - 1]][j - 1];
}
int lca(int a, int b) {
    if (depth[a] < depth[b]) swap(a, b);
    for (int k = depth[a] - depth[b], j = 0; k; j++, k >>= 1) if (k & 1) a = up[a][j];
    if (a == b) return a;
    for (int j = LOG - 1; j >= 0; j--)
        if (up[a][j] != up[b][j]) { a = up[a][j]; b = up[b][j]; }
    return up[a][0];
}
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int q; cin >> n >> q;
    g.assign(n + 1, {});
    for (int i = 0; i < n - 1; i++) { int a, b; cin >> a >> b; g[a].push_back(b); g[b].push_back(a); }
    build();
    while (q--) {
        int a, b; cin >> a >> b;
        cout << depth[a] + depth[b] - 2 * depth[lca(a, b)] << "\n";
    }
}
`,
  },
];
