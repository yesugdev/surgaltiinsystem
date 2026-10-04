// Шүүгч (judge/worker.py) рүү хандах клиент ба илгээлтийн дараалал
const { Problem, ProblemTest, CodeSubmission } = require('./models');

const JUDGE_URL = (process.env.JUDGE_URL || 'http://127.0.0.1:5055').replace(/\/$/, '');
const JUDGE_TOKEN = process.env.JUDGE_TOKEN || '';
const CONCURRENCY = Math.max(1, Number(process.env.JUDGE_CONCURRENCY) || 2);

const LANGUAGES = {
  cpp17: { label: 'C++17', ext: 'cpp', mode: 'cpp' },
  py38: { label: 'Python 3.8', ext: 'py', mode: 'python' },
  py3: { label: 'Python 3.12', ext: 'py', mode: 'python' },
};

const VERDICTS = {
  AC: { label: 'Зөв', short: 'AC', tone: 'ok' },
  WA: { label: 'Буруу хариулт', short: 'WA', tone: 'bad' },
  TLE: { label: 'Хугацаа хэтэрсэн', short: 'TLE', tone: 'warn' },
  MLE: { label: 'Санах ой хэтэрсэн', short: 'MLE', tone: 'warn' },
  RE: { label: 'Ажиллах үеийн алдаа', short: 'RE', tone: 'bad' },
  CE: { label: 'Хөрвүүлэлтийн алдаа', short: 'CE', tone: 'bad' },
  OLE: { label: 'Гаралт хэт их', short: 'OLE', tone: 'warn' },
  SE: { label: 'Системийн алдаа', short: 'SE', tone: 'muted' },
};

class JudgeError extends Error {}

/** Шүүгч рүү код илгээж ажиллуулна */
async function run(payload, timeoutMs = 300000) {
  let res;
  try {
    res = await fetch(JUDGE_URL + '/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Judge-Token': JUDGE_TOKEN },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    throw new JudgeError('Шүүгч сервертэй холбогдож чадсангүй. Түр хүлээгээд дахин оролдоно уу.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new JudgeError(data.error || `Шүүгчийн алдаа (${res.status})`);
  return data;
}

async function health() {
  try {
    const res = await fetch(JUDGE_URL + '/health', { headers: { 'X-Judge-Token': JUDGE_TOKEN }, signal: AbortSignal.timeout(5000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/**
 * Кодыг өгсөн оролтууд дээр ажиллуулж гаралтыг буцаана (зөв бодолтоор гаралт үүсгэх, генератор).
 * @returns {Promise<{compileError?: string, results: Array<{verdict, output, timeMs, stderr}>}>}
 */
async function runOutputs({ language, code, inputs, timeLimitMs, memoryLimitMb }) {
  const data = await run({ mode: 'outputs', language, code, timeLimitMs, memoryLimitMb, tests: inputs.map((input) => ({ input })) }, 600000);
  if (!data.compile.ok) return { compileError: data.compile.output, results: [] };
  for (const r of data.results) if (typeof r.output === 'string') r.output = r.output.replace(/\r\n?/g, '\n');
  return { results: data.results };
}

const textLimit = (s, n) => (s && s.length > n ? s.slice(0, n) + '\n…' : s || '');

/** Нэг илгээлтийг шүүнэ */
async function judgeSubmission(sub) {
  const problem = await Problem.findById(sub.problem).lean();
  const tests = problem ? await ProblemTest.find({ problem: problem._id }).sort({ order: 1 }).lean() : [];
  if (!problem || !tests.length) {
    return { status: 'error', error: 'Энэ бодлогод тест оруулаагүй байна. Багшид хандана уу.' };
  }
  const data = await run({
    mode: 'judge',
    language: sub.language,
    code: sub.code,
    timeLimitMs: problem.timeLimitMs,
    memoryLimitMb: problem.memoryLimitMb,
    tests: tests.map((t) => ({ input: t.input, output: t.output })),
    returnOutputFor: tests.map((t, i) => (t.sample ? i : -1)).filter((i) => i >= 0),
  });
  if (!data.compile.ok) {
    return {
      status: 'done', verdict: 'CE', score: 0, passed: 0, total: tests.length,
      compileOutput: textLimit(data.compile.output, 10000), results: [],
    };
  }
  const results = data.results.map((r, i) => ({
    verdict: r.verdict,
    timeMs: r.timeMs,
    memoryKb: r.memoryKb,
    sample: tests[i].sample,
    output: tests[i].sample ? textLimit(r.output, 2000) : undefined,
    stderr: textLimit(r.stderr, 1500) || undefined,
  }));
  const passed = results.filter((r) => r.verdict === 'AC').length;
  const firstBad = results.find((r) => r.verdict !== 'AC');
  return {
    status: 'done',
    verdict: firstBad ? firstBad.verdict : 'AC',
    score: Math.round((passed / tests.length) * 100),
    passed,
    total: tests.length,
    timeMs: Math.max(0, ...results.map((r) => r.timeMs || 0)),
    memoryKb: Math.max(0, ...results.map((r) => r.memoryKb || 0)),
    compileOutput: textLimit(data.compile.output, 4000),
    results,
  };
}

// ---------------- Дараалал ----------------
let running = 0;
let started = false;

async function pump() {
  while (running < CONCURRENCY) {
    const sub = await CodeSubmission.findOneAndUpdate(
      { status: 'queued' },
      { $set: { status: 'running' } },
      { sort: { createdAt: 1 }, new: true }
    );
    if (!sub) return;
    running++;
    judgeSubmission(sub)
      .catch((e) => {
        if (!(e instanceof JudgeError)) console.error('Judge:', e);
        return { status: 'error', error: e instanceof JudgeError ? e.message : 'Шалгах үед алдаа гарлаа.' };
      })
      .then((update) => CodeSubmission.updateOne({ _id: sub._id }, { $set: { ...update, judgedAt: new Date() } }))
      .catch((e) => console.error('Judge save:', e))
      .finally(() => {
        running--;
        pump().catch((e) => console.error('Judge pump:', e));
      });
  }
}

/** Шинэ илгээлт орсон үед дуудна */
function kick() {
  pump().catch((e) => console.error('Judge pump:', e));
}

/** Сервер асахад: тасарсан шалгалтыг дахин дараалалд оруулж, үе үе шалгана */
async function start() {
  if (started) return;
  started = true;
  await CodeSubmission.updateMany({ status: 'running' }, { $set: { status: 'queued' } });
  setInterval(kick, 3000).unref();
  kick();
}

module.exports = { LANGUAGES, VERDICTS, JudgeError, run, runOutputs, health, start, kick, JUDGE_URL };
