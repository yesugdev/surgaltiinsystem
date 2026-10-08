const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const session = require('express-session');
const compression = require('compression');
const { MongoStore } = require('connect-mongo');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { User } = require('./models');
const helpers = require('./helpers');
const files = require('./files');
const { loadUser } = require('./middleware/auth');

const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/surgaltiin_system';
const IS_PROD = process.env.NODE_ENV === 'production';

async function ensureAdmin() {
  if (await User.exists({ role: 'admin' })) return;
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  await User.create({
    username,
    passwordHash: await bcrypt.hash(password, 10),
    fullName: 'Системийн админ',
    role: 'admin',
  });
  const shown = process.env.ADMIN_PASSWORD ? '(ADMIN_PASSWORD-д заасан)' : password;
  console.log(`\n  Анхны админ үүслээ → нэвтрэх нэр: ${username}, нууц үг: ${shown}`);
  console.log('  Нэвтэрсний дараа нууц үгээ заавал солино уу!\n');
}

async function main() {
  if (IS_PROD) {
    // Production-д аюултай анхдагч утгаар асахаас сэргийлнэ
    const missing = ['SESSION_SECRET', 'MONGODB_URI', 'ADMIN_PASSWORD'].filter((k) => !process.env[k]);
    if (missing.length) throw new Error('Production орчинд заавал тохируулах: ' + missing.join(', '));
    if (process.env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET хамгийн багадаа 32 тэмдэгт байна.');
  }

  await mongoose.connect(MONGODB_URI);
  await mongoose.syncIndexes();
  await ensureAdmin();

  if (!process.env.SESSION_SECRET) {
    console.warn('SESSION_SECRET тохируулаагүй тул түр түлхүүр ашиглаж байна (сервер дахин асахад бүх хэрэглэгч гарна).');
  }

  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));
  if (process.env.TRUST_PROXY) app.set('trust proxy', 1);

  // codingPts: Өрсөлдөөнт Coding-ийн 0–100 хувийг бодлогын хүндийн зэргийн оноогоор; codingDiff: зэргийн мэдээлэл
  Object.assign(app.locals, helpers, { fmtSize: files.fmtSize, viewKind: files.viewKind, codingPts: require('./coding-ranks').toPoints, codingDiff: require('./coding-ranks').difficultyOf });
  app.disable('x-powered-by');
  // HTML, CSS, JS хариуг gzip-ээр шахна (3D дэвсгэрийн скрипт 535KB → ~140KB)
  app.use(compression());

  // Docker/Caddy-ийн эрүүл мэндийн шалгалт
  app.get('/healthz', (req, res) => {
    const ok = mongoose.connection.readyState === 1;
    res.status(ok ? 200 : 503).json({ ok });
  });

  // Хөдөлгөөнт аватар (өөрчлөгддөггүй, ~100KB тус бүр) — хөтөч 30 хоног кэшилнэ
  app.use('/img/avatars', express.static(path.join(__dirname, '..', 'public', 'img', 'avatars'), { maxAge: '30d', immutable: true }));
  app.use(express.static(path.join(__dirname, '..', 'public')));
  // PowerPoint-ийг хөтөч дотор зурах сан
  app.get('/vendor/pptx-preview.js', (req, res) =>
    res.sendFile(require.resolve('pptx-preview/dist/pptx-preview.umd.js'), { maxAge: '7d' })
  );
  app.get('/vendor/jszip.js', (req, res) => res.sendFile(require.resolve('jszip/dist/jszip.min.js'), { maxAge: '7d' }));
  app.use(express.urlencoded({ extended: false, limit: '10mb' }));
  app.use((req, res, next) => {
    req.body ??= {};
    next();
  });
  app.use(
    session({
      secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({ client: mongoose.connection.getClient(), collectionName: 'sessions' }),
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.COOKIE_SECURE === 'true',
        maxAge: 10 * 60 * 60 * 1000,
      },
    })
  );
  app.use(loadUser);

  app.use('/', require('./routes/auth'));
  app.use('/admin', require('./routes/admin'));
  app.use('/exams', require('./routes/exams'));
  app.use('/student', require('./routes/student'));
  app.use('/lessons', require('./routes/lessons'));
  app.use('/learn', require('./routes/learn'));
  app.use('/files', require('./routes/files'));
  app.use('/cp', require('./routes/cp'));
  app.use('/coding/manage', require('./routes/coding-manage'));
  app.use('/coding', require('./routes/coding'));

  app.use((req, res) => {
    res.status(404).render('error', { title: 'Олдсонгүй', message: 'Хуудас олдсонгүй.' });
  });
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).render('error', { title: 'Алдаа', message: 'Системийн алдаа гарлаа. Дахин оролдоно уу.' });
  });

  const server = app.listen(PORT, () => console.log(`YeSuvd ажиллаж байна: http://localhost:${PORT}`));
  // Өрсөлдөөнт Coding: илгээлтийн дараалал
  require('./judge').start().catch((e) => console.error('Judge дараалал:', e.message));
  require('./problem-number').backfillNumbers().catch((e) => console.error('Бодлогын дугаар:', e.message));
  require('./cp').seedDefaultTopics().catch((e) => console.error('Гүнзгий бэлтгэлийн сэдэв:', e.message));

  // docker stop / шинэчлэлийн үед эхэлсэн хүсэлтүүдийг дуусгаад унтарна
  const shutdown = (signal) => {
    console.log(`${signal} хүлээн авлаа, унтарч байна...`);
    server.close(() => mongoose.disconnect().finally(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Сервер асахад алдаа гарлаа:', err.message);
  process.exit(1);
});
