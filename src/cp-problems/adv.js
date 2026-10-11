// Ахисан түвшин: тэмдэгт мөр
const { lines } = require('./util');

/** KMP prefix function */
function prefixFunction(s) {
  const pi = new Int32Array(s.length);
  for (let i = 1; i < s.length; i++) {
    let k = pi[i - 1];
    while (k > 0 && s[i] !== s[k]) k = pi[k - 1];
    if (s[i] === s[k]) k++;
    pi[i] = k;
  }
  return pi;
}

module.exports = [
  {
    key: 'strings-1',
    topic: 'strings',
    title: 'Үг хайх',
    difficulty: 'medium',
    statement: `Урт текст t ба үг p өгөгдөв. p нь t дотор **хэдэн удаа** орсныг ол (давхцаж болно: \`aaaa\` дотор \`aa\` 3 удаа).

### Оролт
Эхний мөрөнд t, хоёр дахь мөрөнд p (жижиг латин үсэг).

### Гаралт
Орсон тоо.

### Хязгаар
- 1 ≤ |t|, |p| ≤ 10⁶

> 💡 Энгийн харьцуулалт O(|t|·|p|) — \`aaaa…a\` дээр удаан. **KMP** (\`p + '#' + t\`-ийн prefix function) эсвэл Z-алгоритм (номын 26.4, х. 247) — O(|t| + |p|).`,
    samples: [lines('abababa', 'aba'), lines('aaaa', 'aa')],
    gen(R) {
      const t = [lines('a', 'b'), lines('abc', 'abcd'), lines('xyz', 'xyz')];
      for (let i = 0; i < 4; i++) t.push(lines(R.str(R.int(1, 20), 'ab'), R.str(R.int(1, 3), 'ab')));
      t.push(lines('a'.repeat(500000), 'a'.repeat(1000)));
      t.push(lines('a'.repeat(499999) + 'b', 'a'.repeat(250000) + 'b'));
      t.push(lines(R.str(500000, 'ab'), R.str(8, 'ab')));
      return t;
    },
    solve(input) {
      const [t, p] = input.trim().split('\n').map((s) => s.trim());
      const pi = prefixFunction(p + '#' + t);
      let cnt = 0;
      for (let i = p.length + 1; i < pi.length; i++) if (pi[i] === p.length) cnt++;
      return cnt + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    string t, p; cin >> t >> p;
    string s = p + "#" + t;
    int n = s.size(), m = p.size();
    vector<int> pi(n, 0);
    int cnt = 0;
    for (int i = 1; i < n; i++) {
        int k = pi[i - 1];
        while (k > 0 && s[i] != s[k]) k = pi[k - 1];
        if (s[i] == s[k]) k++;
        pi[i] = k;
        if (k == m) cnt++;                            // p бүтэн таарлаа
    }
    cout << cnt << "\n";
}
`,
  },
  {
    key: 'strings-2',
    topic: 'strings',
    title: 'Давтагдах хээ',
    difficulty: 'medium',
    statement: `Монгол хээ нэг хэсгийг дахин дахин давтаж бүтдэг. s мөрийн **үе** гэдэг нь бүх боломжит i-д sᵢ = sᵢ₊ₚ байх эерэг тоо p (сүүлийн давталт дутуу байж болно: \`abcabca\`-ийн үе 3).

s-ийн хамгийн бага үеийг ол.

### Оролт
Нэг мөрөнд s (жижиг латин үсэг).

### Гаралт
Хамгийн бага үе.

### Хязгаар
- 1 ≤ |s| ≤ 10⁶

> 💡 Prefix function-ийн сүүлийн утга π[n−1] = хамгийн урт «prefix = suffix». Хариу = n − π[n−1].`,
    samples: [lines('abcabca'), lines('aaaa'), lines('abcd')],
    gen(R) {
      const t = [lines('z'), lines('abab'), lines('aabaa')];
      for (let i = 0; i < 4; i++) { const b = R.str(R.int(1, 4), 'ab'); t.push(lines(b.repeat(R.int(1, 5)) + b.slice(0, R.int(0, b.length - 1)))); }
      const b = R.str(777, 'abc');
      t.push(lines(b.repeat(1287) + b.slice(0, 100)));
      t.push(lines('a'.repeat(999999) + 'b'), lines(R.str(1000000, 'ab')));
      return t;
    },
    solve(input) {
      const s = input.trim();
      const pi = prefixFunction(s);
      return s.length - pi[s.length - 1] + '\n';
    },
    ref: String.raw`#include <bits/stdc++.h>
using namespace std;
int main() {
    string s; cin >> s;
    int n = s.size();
    vector<int> pi(n, 0);
    for (int i = 1; i < n; i++) {
        int k = pi[i - 1];
        while (k > 0 && s[i] != s[k]) k = pi[k - 1];
        if (s[i] == s[k]) k++;
        pi[i] = k;
    }
    cout << n - pi[n - 1] << "\n";
}
`,
  },
];
