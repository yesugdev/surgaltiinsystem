## 🎯 Энэ сэдвээс юу сурах вэ
- Анхны тоо, хуваагч, **Эратосфений шигшүүр**
- ХИЕХ (gcd), ХБЕХ (lcm) — Евклидийн алгоритм
- **Модулийн арифметик** ба **хурдан зэрэг**

## 💡 Гол санаа
### Хуваагчид — √n хүртэл шалгахад хангалттай
d нь n-ийн хуваагч бол n / d ч мөн хуваагч. Хосын нэг нь заавал **≤ √n**. Тиймээс анхны тоо эсэхийг O(√n)-д шалгана.

### Эратосфений шигшүүр
2-оос n хүртэлх **бүх** анхны тоог олохын тулд анхны тоо бүрийн **үржвэрүүдийг зурж хаяна**. Үлдсэн нь анхны.

### Евклид
`gcd(a, b) = gcd(b, a mod b)`, `gcd(a, 0) = a`. Маш хурдан — O(log).

### Модулийн арифметик
Хариу асар том бол ихэвчлэн **10⁹ + 7**-д хуваасан үлдэгдлийг хэвлэ гэдэг. Дүрэм:
- `(a + b) mod m = ((a mod m) + (b mod m)) mod m`
- `(a · b) mod m = ((a mod m) · (b mod m)) mod m`
- Хасахад: `(a − b + m) mod m` (сөрөг гарахаас сэргийлнэ)
- **Хуваах** нь шууд биш — модулийн урвуу хэрэгтэй (m анхны бол `a⁻¹ = a^(m−2) mod m`)

## 🧠 Алхам алхмаар: хурдан зэрэг
`3¹³`-ийг 12 удаа үржүүлэхгүйгээр: 13 = `1101₂`
```
3¹³ = 3⁸ · 3⁴ · 3¹      (3², 3⁴, 3⁸-ыг дараалан квадрат болгож авна)
```
Үржүүлэх тоо **O(log b)** болно — b = 10¹⁸ байсан ч 60 алхам.

## 💻 Код
Шигшүүр:
```cpp
vector<bool> isPrime(n + 1, true);
isPrime[0] = isPrime[1] = false;
for (long long i = 2; i * i <= n; i++)
    if (isPrime[i])
        for (long long j = i * i; j <= n; j += i) isPrime[j] = false;
```
ХИЕХ, ХБЕХ:
```cpp
long long g = __gcd(a, b);          // эсвэл C++17: gcd(a, b)
long long l = a / g * b;            // эхлээд хувааж, дараа нь үржүүл (халихаас сэргийлнэ)
```
Хурдан зэрэг (Exponentiation):
```cpp
const long long MOD = 1e9 + 7;
long long power(long long a, long long b) {
    long long r = 1; a %= MOD;
    while (b > 0) {
        if (b & 1) r = r * a % MOD;
        a = a * a % MOD;
        b >>= 1;
    }
    return r;
}
```

## ⏱️ Нарийн төвөгшил
- Анхны эсэх: O(√n)
- Шигшүүр: O(n log log n)
- gcd, хурдан зэрэг: O(log n)

## ⚠️ Түгээмэл алдаа
- `i * i <= n`-д `int` халих → `long long`.
- `a * b % MOD`-д `a * b` нь 10¹⁸-аас хэтэрч болно — хоёулаа MOD-оос бага байхаар тэр бүр `%` хий.
- Сөрөг үлдэгдэл: C++-д `-1 % 5 = -1`. `(x % m + m) % m`.
- Модулиор хуваахдаа шууд `/` ашиглах — буруу!

## 🏋️ Дасгал (CSES → Mathematics)
1. **Exponentiation** — хурдан зэрэг
2. **Exponentiation II** — Ферма: `a^(b^c)`, илтгэгчийг `m − 1`-ээр
3. **Counting Divisors** — шигшүүрийн өөрчлөлт
4. **Common Divisors** — хуваагчийн тоолол
5. **Bit Strings** (Introductory) — 2ⁿ mod m

## 📚 Цааш унших
- 📕 *Competitive Programmer's Handbook* — Бүлэг 21 «Number theory» · [cses.fi/book/book.pdf](https://cses.fi/book/book.pdf)
- 🌐 *cp-algorithms* — «Sieve of Eratosthenes», «Euclidean algorithm», «Binary Exponentiation», «Modular Multiplicative Inverse» · [cp-algorithms.com](https://cp-algorithms.com/)
- 🌐 *USACO Guide* — Gold → «Divisibility», «Modular Arithmetic» · [usaco.guide](https://usaco.guide/)
