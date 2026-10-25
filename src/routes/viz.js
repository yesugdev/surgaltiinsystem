// 🎬 Алгоритмын визуализаци — бүх нэвтэрсэн хэрэглэгчид. Алгоритмууд хөтөч дээр ажиллана (public/viz/algos.js).
const express = require('express');
const { requireRole } = require('../middleware/auth');
const { GROUPS, ALGOS } = require('../../public/viz/algos');

const router = express.Router();
router.use(requireRole());

const card = (key) => {
  const a = ALGOS[key];
  return { key, title: a.title, mn: a.mn, tagline: a.tagline, time: a.time, space: a.space, group: a.group };
};

router.get('/', (req, res) => {
  const groups = GROUPS.map((g) => ({ ...g, algos: Object.keys(ALGOS).filter((k) => ALGOS[k].group === g.key).map(card) }));
  res.render('viz/index', { title: 'Алгоритмын визуализаци', groups });
});

router.get('/:key', (req, res) => {
  const a = Object.hasOwn(ALGOS, req.params.key) ? ALGOS[req.params.key] : null;
  if (!a) return res.status(404).render('error', { title: 'Олдсонгүй', message: 'Ийм алгоритм алга.' });
  const keys = Object.keys(ALGOS);
  const i = keys.indexOf(req.params.key);
  res.render('viz/show', {
    title: a.title,
    bodyClass: 'viz-body',
    key: req.params.key,
    algo: card(req.params.key),
    inputs: a.inputs,
    prev: i > 0 ? card(keys[i - 1]) : null,
    next: i < keys.length - 1 ? card(keys[i + 1]) : null,
  });
});

module.exports = router;
