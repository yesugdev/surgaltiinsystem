const express = require('express');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { requireRole, homeFor, flash } = require('../middleware/auth');
const { clean } = require('../helpers');

const router = express.Router();

router.get('/', (req, res) => {
  if (!req.user) return res.redirect('/login');
  res.redirect(homeFor(req.user.role));
});

router.get('/login', (req, res) => {
  if (req.user) return res.redirect(homeFor(req.user.role));
  res.render('login', { title: 'Нэвтрэх', error: null, username: '' });
});

// Нууц үг таах оролдлогыг хязгаарлана. Сургуулийн нэг сүлжээнээс (нэг IP) олон сурагч
// нэвтэрдэг тул IP + нэвтрэх нэрээр нарийн, зөвхөн IP-ээр өргөн хязгаар тавина.
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS_PER_USER = 10;
const MAX_FAILS_PER_IP = 100;
const failures = new Map(); // key → { count, resetAt }

function failCount(key) {
  const f = failures.get(key);
  if (!f || f.resetAt < Date.now()) return 0;
  return f.count;
}

function addFailure(key) {
  const f = failures.get(key);
  if (!f || f.resetAt < Date.now()) failures.set(key, { count: 1, resetAt: Date.now() + FAIL_WINDOW_MS });
  else f.count++;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, f] of failures) if (f.resetAt < now) failures.delete(k);
}, 60 * 1000).unref();

router.post('/login', async (req, res, next) => {
  const username = clean(req.body.username, 64).toLowerCase();
  const password = String(req.body.password ?? '');
  const userKey = 'u:' + req.ip + ':' + username;
  const ipKey = 'ip:' + req.ip;

  if (failCount(userKey) >= MAX_FAILS_PER_USER || failCount(ipKey) >= MAX_FAILS_PER_IP) {
    return res.status(429).render('login', {
      title: 'Нэвтрэх',
      error: 'Хэт олон удаа буруу оролдлоо. 15 минутын дараа дахин оролдоно уу.',
      username,
    });
  }

  const user = await User.findOne({ username });
  const ok = user && user.active && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) {
    addFailure(userKey);
    addFailure(ipKey);
    return res.status(401).render('login', {
      title: 'Нэвтрэх',
      error: 'Нэвтрэх нэр эсвэл нууц үг буруу байна.',
      username,
    });
  }
  failures.delete(userKey);
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.userId = String(user._id);
    res.redirect(homeFor(user.role));
  });
});

// Гарах: нэг компьютер дээр олон сурагч ээлжилдэг тул энэ сайтын cookie, cache, хадгалсан код (localStorage)-ыг
// бүгдийг цэвэрлэнэ. Clear-Site-Data-г redirect биш 200 хариунд илгээх нь хөтчүүдэд найдвартай; дэмждэггүй
// хөтчид (хуучин Safari) JS-ээр мөн цэвэрлэнэ.
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.set('Clear-Site-Data', '"cache", "cookies", "storage"');
    res.set('Cache-Control', 'no-store');
    res.type('html').send(`<!doctype html><html lang="mn"><head><meta charset="utf-8"><title>Гарч байна…</title>
<meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="1;url=/login"></head>
<body style="font-family:system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0;color:#6b7384">Гарч байна…
<script>try{localStorage.clear()}catch(e){}try{sessionStorage.clear()}catch(e){}location.replace('/login')</script></body></html>`);
  });
});

router.get('/password', requireRole(), (req, res) => {
  res.render('password', { title: 'Нууц үг солих', error: null });
});

router.post('/password', requireRole(), async (req, res) => {
  const { current = '', password = '', confirm = '' } = req.body;
  const user = await User.findById(req.user._id);
  const fail = (error) => res.status(400).render('password', { title: 'Нууц үг солих', error });

  if (!(await bcrypt.compare(String(current), user.passwordHash))) return fail('Одоогийн нууц үг буруу байна.');
  if (String(password).length < 6) return fail('Шинэ нууц үг хамгийн багадаа 6 тэмдэгт байна.');
  if (password !== confirm) return fail('Шинэ нууц үгнүүд таарахгүй байна.');

  user.passwordHash = await bcrypt.hash(String(password), 10);
  await user.save();
  flash(req, 'success', 'Нууц үг амжилттай солигдлоо.');
  res.redirect(homeFor(user.role));
});

module.exports = router;
