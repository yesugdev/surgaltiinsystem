// Туршилтын өгөгдөл: 1 багш, 1 анги, 3 сурагч, 1 нийтлэгдсэн шалгалт
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Subject, Class, User, Exam, Lesson, Problem, ProblemTest } = require('../src/models');
const LessonParser = require('../public/lesson-parser');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/surgaltiin_system';

async function upsertUser(username, password, fullName, role, classId = null) {
  const passwordHash = await bcrypt.hash(password, 10);
  return User.findOneAndUpdate(
    { username },
    { $setOnInsert: { username, passwordHash, fullName, role, classId } },
    { upsert: true, new: true }
  );
}

async function main() {
  await mongoose.connect(MONGODB_URI);

  const cls = await Class.findOneAndUpdate(
    { name: '10А (туршилт)' },
    { $setOnInsert: { name: '10А (туршилт)', schoolYear: '2026-2027' } },
    { upsert: true, new: true }
  );
  const subject = async (name, code) =>
    Subject.findOneAndUpdate({ name }, { $setOnInsert: { name, code } }, { upsert: true, new: true });
  const math = await subject('Математик', 'MATH');
  await subject('Физик', 'PHYS');
  const teacher = await upsertUser('bagsh', 'bagsh123', 'Туршилтын Багш', 'teacher');
  await User.updateOne({ _id: teacher._id }, { $addToSet: { subjectIds: math._id } });
  await upsertUser('demo001', 'demo123', 'Бат Болд', 'student', cls._id);
  await upsertUser('demo002', 'demo123', 'Дорж Сарнай', 'student', cls._id);
  await upsertUser('demo003', 'demo123', 'Ганбаатар Тэмүүлэн', 'student', cls._id);

  if (!(await Exam.exists({ title: 'Математик — туршилтын шалгалт' }))) {
    await Exam.create({
      title: 'Математик — туршилтын шалгалт',
      description: 'Асуулт бүрийг анхааралтай уншаад хариулна уу.',
      subject: math._id,
      createdBy: teacher._id,
      durationMinutes: 20,
      published: true,
      showResults: true,
      classIds: [cls._id],
      questions: [
        {
          type: 'single',
          text: '7 × 8 = ?',
          points: 1,
          options: [{ text: '54' }, { text: '56', isCorrect: true }, { text: '63' }, { text: '48' }],
        },
        {
          type: 'multiple',
          text: 'Дараахаас анхны тоонуудыг сонгоно уу.',
          points: 2,
          options: [{ text: '2', isCorrect: true }, { text: '9' }, { text: '11', isCorrect: true }, { text: '15' }],
        },
        { type: 'text', text: 'Монгол улсын нийслэл хот аль вэ?', points: 1, acceptedAnswers: ['Улаанбаатар', 'Улаанбаатар хот'] },
        { type: 'text', text: 'Пифагорын теоремыг өөрийн үгээр тайлбарлана уу.', points: 3 },
      ],
    });
  }

  if (!(await Lesson.exists({ title: 'Квадрат тэгшитгэл' }))) {
    const parsed = LessonParser.parse(LessonParser.EXAMPLE);
    await Lesson.create({
      title: 'Квадрат тэгшитгэл',
      description: 'Дискриминант ашиглан квадрат тэгшитгэл бодох',
      subject: math._id,
      createdBy: teacher._id,
      classIds: [cls._id],
      published: true,
      theory: parsed.theory,
      tasks: parsed.tasks.map(({ line, ...t }) => ({
        ...t,
        questions: (t.questions || []).map(({ number, line: l, ...q }) => q),
      })),
    });
  }

  // Өрсөлдөөнт Coding: Мэдээлэл зүй төрөл, жишээ бодлого
  const info = await subject('Мэдээлэл зүй', 'INFO');
  await User.updateOne({ _id: teacher._id }, { $addToSet: { subjectIds: info._id } });
  if (!(await Problem.exists({ title: 'Хоёр тооны нийлбэр' }))) {
    const problem = await Problem.create({
      title: 'Хоёр тооны нийлбэр',
      createdBy: teacher._id, // «Мэдээлэл зүй» оноогдсон тул бодлого оруулах эрхтэй
      published: true,
      statement: 'Хоёр бүхэл тоо **a**, **b** өгөгдөнө. Тэдгээрийн нийлбэрийг ол.\n\n## Оролт\nНэг мөрөнд хоёр бүхэл тоо a, b (−10⁹ ≤ a, b ≤ 10⁹).\n\n## Гаралт\na + b-г хэвлэнэ.',
      timeLimitMs: 1000,
      memoryLimitMb: 256,
      refLanguage: 'py38',
      refCode: 'a, b = map(int, input().split())\nprint(a + b)\n',
    });
    const cases = [['1 2', '3'], ['-5 5', '0'], ['1000000000 1000000000', '2000000000'], ['-1000000000 -7', '-1000000007'], ['0 0', '0']];
    await ProblemTest.insertMany(cases.map(([i, o], k) => ({ problem: problem._id, order: k + 1, input: i + '\n', output: o + '\n', sample: k === 0 })));
    await Problem.updateOne({ _id: problem._id }, { testCount: cases.length, sampleCount: 1, testsSize: cases.reduce((s, [i, o]) => s + i.length + o.length + 2, 0) });
  }

  console.log('Туршилтын өгөгдөл бэлэн:');
  console.log('  Багш:    bagsh / bagsh123 (Математик, Мэдээлэл зүй)');
  console.log('  Сурагч:  demo001, demo002, demo003 / demo123');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
