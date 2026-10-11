## 🎯 Энэ сэдвээс юу сурах вэ
- **Биномын коэффициент** C(n, k)-г олон удаа, модулиор хурдан тооцох
- **Каталаны тоо** — зөв хаалтын дараалал, бусад хэрэглээ
- **Оруулах-хасах зарчим**
- Тоолох бодлогыг томьёо болгож хувиргах

## 💡 Гол санаа
### Биномын коэффициент
C(n, k) = n элементээс k-г **дарааллыг үл хамааран** сонгох аргын тоо = `n! / (k! · (n−k)!)`.
Жишээ: 5 сурагчаас 2-ыг сонгох = C(5, 2) = 10.

Хариуг **10⁹ + 7**-оор авах үед хуваах шууд боломжгүй тул **модулийн урвуу** ашиглана:
`a / b ≡ a · b^(MOD−2)` (MOD анхны тоо — Фермагийн бага теорем). Факториал ба урвуу факториалыг **нэг удаа** урьдчилан тооцвол асуулга бүр O(1).

Паскалийн гурвалжин (`C(n,k) = C(n−1,k−1) + C(n−1,k)`) нь n ≤ 5000 үед хялбар өөр арга.

### Каталаны тоо
`Cₙ = C(2n, n) / (n + 1)` → 1, 1, 2, 5, 14, 42, …
- n хос хаалтаар бүтээх **зөв хаалтын дарааллын** тоо (n = 3: `((()))`, `(()())`, `(())()`, `()(())`, `()()()` = 5)
- n+1 навчтай бүтэн хоёртын мод, олон өнцөгтийн гурвалжинжуулалт гэх мэт

### Оруулах-хасах
|A ∪ B| = |A| + |B| − |A ∩ B|. 1..n дотор 2 эсвэл 3-т хуваагдах тоо: ⌊n/2⌋ + ⌊n/3⌋ − ⌊n/6⌋.

## 🧠 Алхам алхмаар: C(5, 2) mod p
```
fact = [1, 1, 2, 6, 24, 120]
C(5,2) = fact[5] · inv(fact[2]) · inv(fact[3]) = 120 · inv(2) · inv(6) = 10
```

## 💻 Код
Факториал + урвуу факториал (олон асуулга):
```cpp
const int MOD = 1e9 + 7, MAXN = 1e6 + 5;
long long fact[MAXN], inv_fact[MAXN];

long long power(long long a, long long b) {
    long long r = 1; a %= MOD;
    for (; b > 0; b >>= 1, a = a * a % MOD) if (b & 1) r = r * a % MOD;
    return r;
}
void precompute() {
    fact[0] = 1;
    for (int i = 1; i < MAXN; i++) fact[i] = fact[i - 1] * i % MOD;
    inv_fact[MAXN - 1] = power(fact[MAXN - 1], MOD - 2);          // нэг л удаа урвуу
    for (int i = MAXN - 1; i > 0; i--) inv_fact[i - 1] = inv_fact[i] * i % MOD;
}
long long C(int n, int k) {
    if (k < 0 || k > n) return 0;
    return fact[n] * inv_fact[k] % MOD * inv_fact[n - k] % MOD;
}
long long catalan(int n) { return C(2 * n, n) * power(n + 1, MOD - 2) % MOD; }
```

## ⏱️ Нарийн төвөгшил
Бэлтгэл **O(MAXN)**, асуулга бүр **O(1)** (урвуу нэг удаа O(log MOD)).

## ⚠️ Түгээмэл алдаа
- Модулиор хуваахдаа `/` ашиглах — заавал урвуугаар үржүүл.
- Үржвэр бүрийн дараа `% MOD` хийхээ мартах → `long long` ч халина.
- k > n эсвэл k < 0 үед 0 буцаахаа мартах.
- MAXN-ийг 2n-ийг багтаахаар авах (Каталанд C(2n, n) хэрэгтэй!).

## 🏋️ Дасгал (CSES → Mathematics)
1. **Binomial Coefficients** — олон асуулга, факториал
2. **Bracket Sequences I** — Каталаны тоо
3. **Creating Strings II** — давхардалтай сэлгэмэл: n! / (c₁!·c₂!·…)
4. **Distributing Apples** — «од ба саваа»: C(n + m − 1, n − 1)

## 📚 Цааш унших
- 📕 *Competitive Programmer's Handbook* — Бүлэг 22 «Combinatorics»: 22.1 Binomial coefficients (х. 208), 22.2 Catalan numbers (х. 210), 22.3 Inclusion-exclusion (х. 212); Бүлэг 21.2 Modular arithmetic (х. 201)
- 🌐 *cp-algorithms* — «Binomial Coefficients», «Catalan Numbers» · [cp-algorithms.com](https://cp-algorithms.com/)
- 🌐 *USACO Guide* — Gold → «Combinatorics» · [usaco.guide](https://usaco.guide/)
