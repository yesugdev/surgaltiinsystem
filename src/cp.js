// Гүнзгий бэлтгэл (competitive programming): эрх, хэсгүүд, анхдагч сэдвүүд (эхлэлийн онол)
const { User, CpTopic } = require('./models');

// Програмист (4-р түвшин) зэрэглэлд хүрсэн сурагчид автоматаар нээгдэнэ
const CP_UNLOCK_LEVEL = 4;

const SECTIONS = [
  { key: 'basics', name: 'Үндэс', icon: '🧱' },
  { key: 'algo', name: 'Алгоритм', icon: '⚙️' },
  { key: 'ds', name: 'Өгөгдлийн бүтэц', icon: '🗂️' },
  { key: 'graph', name: 'Граф ба мод', icon: '🕸️' },
  { key: 'math', name: 'Математик', icon: '🔢' },
  { key: 'adv', name: 'Ахисан түвшин', icon: '🚀' },
];
const sectionOf = (key) => SECTIONS.find((s) => s.key === key) || SECTIONS[0];

/** Гүнзгий бэлтгэлд нэвтрэх эрх: админ, мэдээлэл зүйн багш, сонгогдсон эсвэл зэрэглэлээр нээгдсэн сурагч */
const cpAccess = (user) => !!user && (!!user.codingStaff || (user.role === 'student' && (user.cpSelected || user.cpRankUnlocked)));

/** Програмист зэрэглэлд хүрвэл нэг удаа нээнэ (зэрэглэл буурсан ч хаахгүй). Шинээр нээгдсэн бол true */
async function syncCpUnlock(user, tier) {
  if (user.role !== 'student' || user.cpRankUnlocked || !tier || tier.level < CP_UNLOCK_LEVEL) return false;
  await User.updateOne({ _id: user._id }, { $set: { cpRankUnlocked: true } });
  user.cpRankUnlocked = true;
  return true;
}

// ---------------- Анхдагч сэдвүүд (эхлэлийн онол — багш засварлана) ----------------
const T = (title, section, icon, summary, theory) => ({ title, section, icon, summary, theory: theory.trim() });

const DEFAULT_TOPICS = [
  T('Нарийн төвөгшил ба хурдан оролт/гаралт', 'basics', '⏱️', 'Big-O, хугацааны хязгаарт багтах эсэхийг урьдчилан тооцох', `
## Санаа
Шүүгч ихэвчлэн **1 секундэд ~10⁸ энгийн үйлдэл** гүйцэтгэдэг (Python ~10⁷). Бодлогын хязгаараас алгоритмын нарийн төвөгшлийг тааж болно:

| n-ийн хязгаар | Тохирох нарийн төвөгшил |
|---|---|
| n ≤ 10 | O(n!) — бүх сэлгэмэл |
| n ≤ 20 | O(2ⁿ) — бүх дэд олонлог |
| n ≤ 500 | O(n³) |
| n ≤ 5000 | O(n²) |
| n ≤ 10⁶ | O(n log n) эсвэл O(n) |
| n ≤ 10¹⁸ | O(log n) эсвэл O(1) |

## Хурдан оролт/гаралт
C++:
\`\`\`cpp
ios::sync_with_stdio(false);
cin.tie(nullptr);
\`\`\`
Python:
\`\`\`python
import sys
input = sys.stdin.readline
data = sys.stdin.buffer.read().split()   # бүх оролтыг нэг дор
\`\`\`

## Анхаарах
- Том тоонд C++-д \`long long\` (≈9·10¹⁸) ашигла.
- Олон мөр хэвлэхдээ Python-д \`"\\n".join(...)\` ашигла.`),

  T('Эрэмбэлэлт ба хоёртын хайлт', 'algo', '🔍', 'sort, lower_bound, хариуг хоёртын хайлтаар олох', `
## Эрэмбэлэлт
- C++: \`sort(a.begin(), a.end());\` — O(n log n)
- Python: \`a.sort()\`, \`sorted(a, key=...)\`

## Хоёртын хайлт
Эрэмбэлэгдсэн массивт утгыг **O(log n)**-д хайна.
\`\`\`cpp
int i = lower_bound(a.begin(), a.end(), x) - a.begin(); // x-ээс багагүй эхний байрлал
\`\`\`
\`\`\`python
from bisect import bisect_left
i = bisect_left(a, x)
\`\`\`

## Хариуг хоёртын хайлтаар олох
«Хамгийн бага X-ийг ол» төрлийн бодлогод \`ok(X)\` нь монотон (X өсөхөд false → true) бол:
\`\`\`python
lo, hi = 0, 10**18
while lo < hi:
    mid = (lo + hi) // 2
    if ok(mid): hi = mid
    else: lo = mid + 1
print(lo)
\`\`\``),

  T('Prefix sum ба хоёр заагч', 'algo', '➕', 'Хэрчмийн нийлбэрийг O(1)-д, хоёр заагчийн арга', `
## Prefix sum
\`p[i] = a[0] + … + a[i-1]\` гэж урьдчилан тооцвол [l, r] хэрчмийн нийлбэр = \`p[r+1] - p[l]\` — **O(1)**.
\`\`\`python
p = [0]
for x in a: p.append(p[-1] + x)
s = p[r + 1] - p[l]
\`\`\`

## Хоёр заагч (two pointers)
Эрэмбэлэгдсэн массивт нийлбэр нь S байх хос, нийлбэр нь ≤ S байх хамгийн урт хэрчим зэргийг **O(n)**-д олно.
\`\`\`python
best = l = cur = 0
for r in range(n):
    cur += a[r]
    while cur > S:
        cur -= a[l]; l += 1
    best = max(best, r - l + 1)
\`\`\``),

  T('Шуналт алгоритм (Greedy)', 'algo', '🪙', 'Алхам бүрт хамгийн сайныг сонгох — хэзээ зөв бэ?', `
## Санаа
Алхам бүрт **тухайн үеийн хамгийн сайн** сонголтыг хийж, буцаж засахгүй. Хурдан, гэхдээ **зөв гэдгийг батлах** хэрэгтэй.

## Сонгодог жишээ: ажлуудыг сонгох
Хамгийн олон давхцахгүй ажил сонгохын тулд **хамгийн эрт дуусдаг**-ийг түрүүлж ав.
\`\`\`python
jobs.sort(key=lambda x: x[1])      # дуусах хугацаагаар
cnt, end = 0, -1
for s, e in jobs:
    if s >= end:
        cnt += 1; end = e
\`\`\`

## Зөвлөгөө
- Эхлээд жижиг жишээн дээр шуналт буруу болох эсрэг жишээ хайж үз.
- Ихэнх greedy бодлого **эрэмбэлэлтээр** эхэлдэг.`),

  T('Рекурс ба бүрэн хайлт', 'algo', '🌀', 'Рекурс, backtracking, бүх хувилбарыг шалгах', `
## Рекурс
Функц өөрийгөө дуудна. **Суурь тохиолдол**-ыг мартаж болохгүй.

## Бүх дэд олонлог (n ≤ 20)
\`\`\`python
def go(i, chosen):
    if i == n:
        check(chosen); return
    go(i + 1, chosen)               # i-г авахгүй
    go(i + 1, chosen + [a[i]])      # i-г авна
\`\`\`

## Backtracking
Нөхцөл зөрчигдвөл тэр салааг цааш үргэлжлүүлэхгүй — жишээ нь N хатан.

## Анхаар
- Python-д рекурсийн гүн: \`sys.setrecursionlimit(10**6)\`
- O(2ⁿ) нь n ≈ 20 хүртэл л багтана.`),

  T('Динамик программчлал (DP)', 'algo', '🧩', 'Дэд бодлогын хариуг хадгалж дахин ашиглах', `
## Санаа
Том бодлогыг **давхцдаг дэд бодлогууд**-д хувааж, хариуг нь хүснэгтэд хадгална.
1. **Төлөв**-ийг тодорхойл: \`dp[i]\` юуг илэрхийлэх вэ?
2. **Шилжилт**: \`dp[i]\` өмнөх төлвөөс яаж гарах вэ?
3. **Суурь** утга ба **хариу** хаана байна?

## Жишээ: шат (1 эсвэл 2 алхам)
\`\`\`python
dp = [0] * (n + 1)
dp[0] = 1
for i in range(1, n + 1):
    dp[i] = dp[i - 1] + (dp[i - 2] if i >= 2 else 0)
\`\`\`

## Сонгодог DP
- Үүргэвч (knapsack): \`dp[w] = max(dp[w], dp[w - wt] + val)\`
- Хамгийн урт өсөх дэд дараалал (LIS)
- Хоёр мөрийн хамгийн урт ерөнхий дэд дараалал (LCS)`),

  T('Тоон онол', 'math', '🔢', 'ХИЕХ, анхны тоо, модулийн арифметик', `
## ХИЕХ (gcd)
\`\`\`python
from math import gcd
\`\`\`
\`lcm(a, b) = a // gcd(a, b) * b\`

## Эратосфений шигшүүр — n хүртэлх анхны тоо, O(n log log n)
\`\`\`python
is_p = [True] * (n + 1); is_p[0] = is_p[1] = False
for i in range(2, int(n ** 0.5) + 1):
    if is_p[i]:
        for j in range(i * i, n + 1, i): is_p[j] = False
\`\`\`

## Модулийн арифметик
Хариу их том бол \`10⁹+7\`-оор хуваасан үлдэгдлийг хэвлэ. Нэмэх, үржих бүрт \`% MOD\`.
Хурдан зэрэг: Python \`pow(a, b, MOD)\` — O(log b).`),

  T('Stack, queue, set, map', 'ds', '🗂️', 'Стандарт өгөгдлийн бүтцийг зөв сонгох', `
| Бүтэц | C++ | Python | Хурд |
|---|---|---|---|
| Stack | \`stack\`, \`vector\` | \`list\` (append/pop) | O(1) |
| Queue | \`queue\`, \`deque\` | \`collections.deque\` | O(1) |
| Эрэмбэтэй олонлог | \`set\`, \`map\` | — (\`sorted\` + bisect) | O(log n) |
| Хэш | \`unordered_map\` | \`dict\`, \`set\` | O(1) дунджаар |
| Priority queue | \`priority_queue\` | \`heapq\` | O(log n) |

## Жишээ: хаалтын зөв эсэх (stack)
\`\`\`python
st = []
for ch in s:
    if ch in '([{': st.append(ch)
    elif not st or '([{'[')]}'.index(ch)] != st.pop(): print('NO'); break
\`\`\`

## Анхаар
Python-д \`list.pop(0)\` нь O(n) — оронд нь \`deque.popleft()\`.`),

  T('Граф: BFS ба DFS', 'graph', '🕸️', 'Графыг хадгалах, нэвтрэх, холбоост бүрэлдэхүүн', `
## Хадгалах — хөршийн жагсаалт
\`\`\`python
g = [[] for _ in range(n)]
for _ in range(m):
    u, v = map(int, input().split())
    g[u].append(v); g[v].append(u)
\`\`\`

## BFS — жингүй графын хамгийн богино зам, O(n + m)
\`\`\`python
from collections import deque
dist = [-1] * n; dist[s] = 0; q = deque([s])
while q:
    u = q.popleft()
    for v in g[u]:
        if dist[v] == -1:
            dist[v] = dist[u] + 1; q.append(v)
\`\`\`

## DFS
Холбоост бүрэлдэхүүн, мөчлөг илрүүлэх, торон (grid) дээрх «арал» тоолоход.`),

  T('Хамгийн богино зам (Dijkstra)', 'graph', '🗺️', 'Жинтэй графын хамгийн богино зам', `
## Dijkstra — сөрөг биш жинтэй граф, O((n + m) log n)
\`\`\`python
import heapq
INF = float('inf')
dist = [INF] * n; dist[s] = 0
pq = [(0, s)]
while pq:
    d, u = heapq.heappop(pq)
    if d > dist[u]: continue
    for v, w in g[u]:
        if d + w < dist[v]:
            dist[v] = d + w
            heapq.heappush(pq, (dist[v], v))
\`\`\`

## Бусад
- Жин бүгд 1 бол BFS хангалттай.
- Сөрөг жин бол Bellman–Ford, бүх хосын зай (n ≤ 400) бол Floyd–Warshall.`),

  T('Мод ба DSU', 'graph', '🌳', 'Модны шинж, нэгтгэх-олох (Disjoint Set Union)', `
## Мод
n оройтой, n−1 ирмэгтэй, мөчлөггүй холбоост граф. DFS-ээр эцэг, гүн, дэд модны хэмжээг олно.

## DSU — бүлгүүдийг нэгтгэх, нэг бүлэгт эсэхийг шалгах (бараг O(1))
\`\`\`python
parent = list(range(n))
def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]; x = parent[x]
    return x
def union(a, b):
    a, b = find(a), find(b)
    if a != b: parent[a] = b
\`\`\`

## Kruskal — хамгийн бага нийт жинтэй тулгуур мод
Ирмэгүүдийг жингээр эрэмбэлж, мөчлөг үүсгэхгүй бол DSU-гаар нэгтгэнэ.`),

  T('Segment tree ба Fenwick tree', 'adv', '🌲', 'Хэрчмийн асуулга, шинэчлэлийг O(log n)-д', `
## Хэзээ хэрэгтэй вэ?
Массивын утга **өөрчлөгдөх** бөгөөд хэрчмийн нийлбэр/мин/макс-ыг олон удаа асуух үед prefix sum хангалтгүй.

## Fenwick (BIT) — нийлбэр, O(log n)
\`\`\`python
bit = [0] * (n + 1)
def add(i, v):            # i: 1-ээс эхэлсэн
    while i <= n: bit[i] += v; i += i & -i
def total(i):             # a[1..i] нийлбэр
    s = 0
    while i > 0: s += bit[i]; i -= i & -i
    return s
\`\`\`
Хэрчим [l, r] = \`total(r) - total(l - 1)\`.

## Segment tree
Мин, макс, ХИЕХ зэрэг ямар ч «нэгтгэх» үйлдэлд ажиллана. Хэрчмийн шинэчлэлд lazy propagation.`),
];

/** Анхны ачаалалт: сэдэв огт байхгүй бол анхдагч 12 сэдвийг үүсгэнэ */
async function seedDefaultTopics() {
  if (await CpTopic.exists({})) return 0;
  await CpTopic.insertMany(DEFAULT_TOPICS.map((t, i) => ({ ...t, order: (i + 1) * 10, published: true })));
  return DEFAULT_TOPICS.length;
}

module.exports = { CP_UNLOCK_LEVEL, SECTIONS, sectionOf, cpAccess, syncCpUnlock, seedDefaultTopics, DEFAULT_TOPICS };
