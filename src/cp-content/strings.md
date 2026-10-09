## 🎯 Энэ сэдвээс юу сурах вэ
- Тэмдэгт мөртэй хурдан ажиллах (C++ `string`)
- Палиндром, тэмдэгт тоолох
- Хэв маяг хайх: **префикс функц (KMP)** ба **полиномын hash**

## 💡 Гол санаа
### Энгийн хайлт яагаад удаан вэ?
Урт n текстэд урт m хэв маягийг байрлал бүрээс тулгавал **O(n · m)** — n, m ≈ 10⁶ бол хэтэрнэ.

### Префикс функц (KMP)
`π[i]` = s-ийн эхний i+1 тэмдэгтийн **өмнөтгөл бөгөөд хойтголтой давхцах** хамгийн урт хэсэг (өөрөөсөө бусад). Жишээ:
```
s = a b a b a c
π = 0 0 1 2 3 0
```
Хэв маягийг олохдоо `pattern + "#" + text` мөрийн π-г тооцоод, **π = m** болсон газар л тохиолдол. Бүгд **O(n + m)**.

### Hash
Мөрийг тоо болгон хувиргана: `h = s₀·p^(k−1) + s₁·p^(k−2) + … (mod M)`. Хоёр дэд мөрийг O(1)-д харьцуулж болно (prefix hash-аар). Маш ховор «мөргөлдөөн» гарч болох тул хоёр өөр модуль ашиглах нь найдвартай.

## 🧠 Алхам алхмаар: Palindrome Reorder
Үсгүүдийг сольж палиндром үүсгэх боломжтой юу?
1. Үсэг бүрийг тоол.
2. **Сондгой** тоотой үсэг 1-ээс олон бол боломжгүй.
3. Тал хэсгийг бүрдүүлж, дунд нь сондгой үсгийг тавьж, урвуугаар нь залга.

## 💻 Код
Префикс функц:
```cpp
vector<int> prefix_function(const string &s) {
    int n = s.size();
    vector<int> pi(n, 0);
    for (int i = 1; i < n; i++) {
        int k = pi[i - 1];
        while (k > 0 && s[i] != s[k]) k = pi[k - 1];
        if (s[i] == s[k]) k++;
        pi[i] = k;
    }
    return pi;
}
// String Matching: хэдэн удаа гарах вэ
// auto pi = prefix_function(pat + "#" + text);  count(pi == pat.size())
```
Polynomial hash (дэд мөрийн hash O(1)) — хоёр модультай тул мөргөлдөөн бараг гарахгүй:
```cpp
const ll M1 = 1e9 + 7, M2 = 998244353, P = 131;
int n = s.size();
vector<ll> h1(n + 1, 0), h2(n + 1, 0), p1(n + 1, 1), p2(n + 1, 1);
for (int i = 0; i < n; i++) {
    h1[i + 1] = (h1[i] * P + s[i]) % M1;
    h2[i + 1] = (h2[i] * P + s[i]) % M2;
    p1[i + 1] = p1[i] * P % M1;
    p2[i + 1] = p2[i] * P % M2;
}
// s[l..r) дэд мөрийн hash
auto get = [&](int l, int r) {
    ll a = (h1[r] - h1[l] * p1[r - l] % M1 + M1) % M1;
    ll b = (h2[r] - h2[l] * p2[r - l] % M2 + M2) % M2;
    return make_pair(a, b);
};
// хоёр дэд мөр тэнцүү эсэх: get(l1, r1) == get(l2, r2)
```

## ⏱️ Нарийн төвөгшил
- Префикс функц / KMP: **O(n + m)**
- Hash: бэлтгэл O(n), дэд мөр бүрийг O(1)

## ⚠️ Түгээмэл алдаа
- `s = s + ch` нь мөрийг бүхэлд нь хуулна → O(n²). `s += ch` эсвэл `s.push_back(ch)` ашигла.
- C++-д `s.substr()`-ийг давталтан дотор → хуулбар үүсгэж удаан.
- Тусгаарлагч `#` тэмдэгт мөрт байхгүй тэмдэгт байх ёстой.
- Ганц модультай hash-д санаатай «эсрэг тест» байж болно.

## 🏋️ Дасгал (CSES → String Algorithms, Introductory)
1. **Palindrome Reorder** — тоолол
2. **String Matching** — KMP
3. **Finding Borders** — префикс функц
4. **Finding Periods** — префикс функц / Z-функц

## 📚 Цааш унших
- 📕 *Competitive Programmer's Handbook* — Бүлэг 26 «String algorithms» · [cses.fi/book/book.pdf](https://cses.fi/book/book.pdf)
- 🌐 *cp-algorithms* — «Prefix function. Knuth–Morris–Pratt», «String Hashing» · [cp-algorithms.com/string/prefix-function.html](https://cp-algorithms.com/string/prefix-function.html)
- 🌐 *USACO Guide* — Gold → «String Hashing» · [usaco.guide](https://usaco.guide/)
