// Карт хэлбэрийн засварлагчаас (JSON) ирсэн тестийн асуултыг шалгаж, хадгалах хэлбэрт оруулна.
// Дүрэм нь текст форматын задлагчтай (public/question-parser.js) ижил.
const MAX_QUESTIONS = 300;
const MAX_OPTIONS = 20;
const TYPES = ['single', 'multiple', 'text'];

function toQuestionsJson(questions) {
  return JSON.stringify(
    (questions || []).map((q) => ({
      type: q.type,
      text: q.text,
      points: q.points,
      options: (q.options || []).map((o) => ({ text: o.text, isCorrect: !!o.isCorrect })),
      acceptedAnswers: [...(q.acceptedAnswers || [])],
    }))
  );
}

function parseQuestionsJson(raw) {
  const errors = [];
  let list;
  try {
    list = JSON.parse(String(raw || '[]'));
  } catch {
    return { questions: [], errors: ['Асуултуудыг уншиж чадсангүй. Хуудсаа шинэчлээд дахин оролдоно уу.'] };
  }
  if (!Array.isArray(list)) list = [];
  if (!list.length) errors.push('Дор хаяж нэг асуулт нэмнэ үү.');
  if (list.length > MAX_QUESTIONS) errors.push(`Хамгийн ихдээ ${MAX_QUESTIONS} асуулт байна.`);

  const questions = list.slice(0, MAX_QUESTIONS).map((q, i) => {
    const n = i + 1;
    const e = (msg) => errors.push(`${n}-р асуулт: ${msg}`);
    const type = TYPES.includes(q?.type) ? q.type : 'single';
    const text = String(q?.text ?? '').trim().slice(0, 10000);
    let points = Number(q?.points);
    if (!(points > 0 && points <= 1000)) {
      e('Оноо 0-ээс их, 1000-аас бага тоо байна.');
      points = 1;
    }
    if (!text) e('Асуултын текстийг бичнэ үү.');

    if (type === 'text') {
      const acceptedAnswers = (Array.isArray(q?.acceptedAnswers) ? q.acceptedAnswers : [])
        .map((a) => String(a ?? '').trim().slice(0, 500))
        .filter(Boolean)
        .slice(0, 50);
      return { type, text, points, options: [], acceptedAnswers };
    }

    const options = (Array.isArray(q?.options) ? q.options : [])
      .map((o) => ({ text: String(o?.text ?? '').trim().slice(0, 2000), isCorrect: o?.isCorrect === true }))
      .filter((o) => o.text);
    const nCorrect = options.filter((o) => o.isCorrect).length;
    if (options.length < 2) e('Дор хаяж 2 хариултын сонголт бичнэ үү.');
    if (options.length > MAX_OPTIONS) e(`Хамгийн ихдээ ${MAX_OPTIONS} сонголт байна.`);
    if (type === 'single' && nCorrect !== 1) e('Зөв хариултыг яг нэгийг сонгоно уу.');
    if (type === 'multiple' && nCorrect < 1) e('Дор хаяж нэг зөв хариулт сонгоно уу.');
    return { type, text, points, options, acceptedAnswers: [] };
  });
  return { questions, errors };
}

module.exports = { parseQuestionsJson, toQuestionsJson };
