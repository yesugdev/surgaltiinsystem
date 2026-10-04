#!/usr/bin/env python3
"""
YeSuvd Judge — сурагчийн кодыг хөрвүүлж, тестүүд дээр ажиллуулна.

Аюулгүй байдал (Docker контейнер дотор):
  * Контейнер интернетгүй (internal сүлжээ), root файлын систем зөвхөн уншигдана, /tmp нь tmpfs
  * Код бүрийг тусдаа root-биш хэрэглэгчээр (slot бүрт өөр uid) ажиллуулна — setpriv
  * Хязгаар: CPU хугацаа, санах ой (address space), процессын тоо, файлын хэмжээ — prlimit
  * Хана цагийн хугацаа хэтэрвэл процессын бүлгийг бүхэлд нь устгана
  * Хүлээгдэж буй гаралт дискэнд бичигдэхгүй (санах ойд харьцуулна)

Windows дээр (локал хөгжүүлэлт) хязгааргүйгээр шууд ажиллуулна — зөвхөн туршилтад.

API (JSON):
  GET  /health                      → {"ok": true, "languages": {...}}
  POST /run   {language, code, timeLimitMs, memoryLimitMb, tests: [{input, output?}],
               mode: "judge" | "outputs", returnOutputFor: [индекс], stopOnFirstFailure}
"""
import json
import os
import shutil
import signal
import subprocess
import tempfile
import threading
import time
import queue
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

POSIX = os.name == 'posix'
IS_ROOT = POSIX and os.geteuid() == 0

TOKEN = os.environ.get('JUDGE_TOKEN', '')
PORT = int(os.environ.get('JUDGE_PORT', '8000'))
SLOTS = max(1, int(os.environ.get('JUDGE_SLOTS', '2')))
RUNNER_UIDS = [int(x) for x in os.environ.get('JUDGE_UIDS', '2001,2002,2003,2004').split(',')]
WORK_ROOT = os.environ.get('JUDGE_WORK', os.path.join(tempfile.gettempdir(), 'yesuvd-judge'))
MAX_BODY = 160 * 1024 * 1024
MAX_OUTPUT = 64 * 1024 * 1024        # нэг ажиллуулалтын гаралтын дээд хэмжээ
MAX_RETURN_OUTPUT = 32 * 1024 * 1024  # outputs горимд буцаах гаралт

PY38 = os.environ.get('JUDGE_PY38', 'python3.8')
PY3 = os.environ.get('JUDGE_PY3', 'python3')
CXX = os.environ.get('JUDGE_CXX', 'g++')
EXE = 'main.exe' if not POSIX else 'main'
# Санах ойг зөв хэмжих туслах (judge/measure.c, Docker image-д хөрвүүлнэ)
MEASURE = os.environ.get('JUDGE_MEASURE') or ('/judge/measure' if os.path.exists('/judge/measure') else None)

LANGS = {
    'cpp17': {
        'src': 'main.cpp',
        'compile': [CXX, '-std=' + os.environ.get('JUDGE_CXX_STD', 'gnu++17'), '-O2', '-pipe', '-o', EXE, 'main.cpp'],
        'run': None,  # хөрвүүлсний дараа: <ажлын хавтас>/main
        'version': [CXX, '--version'],
    },
    'py38': {
        'src': 'main.py',
        'compile': None,
        'run': [PY38, '-B', 'main.py'],
        'version': [PY38, '--version'],
    },
    'py3': {
        'src': 'main.py',
        'compile': None,
        'run': [PY3, '-B', 'main.py'],
        'version': [PY3, '--version'],
    },
}

RUN_ENV = {
    'PATH': '/usr/local/bin:/usr/bin:/bin',
    'LANG': 'C.UTF-8',
    'LC_ALL': 'C.UTF-8',
    'PYTHONIOENCODING': 'utf-8',
    'PYTHONUTF8': '1',
    'PYTHONDONTWRITEBYTECODE': '1',
    'HOME': '/tmp',
}
if not POSIX:  # Windows: системийн орчныг хадгална (компилятор олдохын тулд)
    RUN_ENV = {**os.environ, 'PYTHONIOENCODING': 'utf-8', 'PYTHONUTF8': '1'}

slot_queue = queue.Queue()
for i in range(SLOTS):
    slot_queue.put(i)


def kill_uid(uid):
    """Тухайн uid-ийн үлдсэн бүх процессыг устгана (fork хийж зугтсан ч)."""
    if not IS_ROOT:
        return
    for pid in os.listdir('/proc'):
        if not pid.isdigit():
            continue
        try:
            with open(f'/proc/{pid}/status') as f:
                for line in f:
                    if line.startswith('Uid:'):
                        if int(line.split()[1]) == uid:
                            os.kill(int(pid), signal.SIGKILL)
                        break
        except (OSError, ValueError):
            pass


def sandbox_cmd(cmd, uid, cpu_s, mem_mb, nproc, fsize, measure_fd=None):
    """setpriv (uid солих) → measure (хэмжилт) → prlimit (хязгаар) → програм."""
    if not POSIX:
        return cmd
    limits = [
        f'--cpu={cpu_s}:{cpu_s + 1}',
        f'--nproc={nproc}',
        f'--fsize={fsize}',
        '--nofile=64',
        '--core=0',
    ]
    if mem_mb:
        b = mem_mb * 1024 * 1024
        limits += [f'--as={b}', f'--stack={b}']
    wrapped = ['prlimit', *limits, '--', *cmd]
    if measure_fd is not None:
        wrapped = [MEASURE, str(measure_fd), *wrapped]
    if IS_ROOT:
        wrapped = ['setpriv', f'--reuid={uid}', f'--regid={uid}', '--clear-groups', '--no-new-privs', *wrapped]
    return wrapped


def run_process(cmd, cwd, stdin_path, stdout_path, stderr_path, time_ms, mem_mb, uid,
                nproc=1, wall_extra_s=1.0, fsize=MAX_OUTPUT):
    """Процесс ажиллуулж {exit, signal, time_ms, mem_kb, wall_timeout} буцаана."""
    cpu_s = max(1, -(-time_ms // 1000))  # дээш тоймлосон секунд
    wall = time_ms / 1000 * 2 + wall_extra_s
    m_read = m_write = None
    if POSIX and MEASURE:
        m_read, m_write = os.pipe()
    full = sandbox_cmd(cmd, uid, cpu_s, mem_mb, nproc, fsize, m_write)
    start = time.monotonic()
    with open(stdin_path, 'rb') as fin, open(stdout_path, 'wb') as fout, open(stderr_path, 'wb') as ferr:
        try:
            p = subprocess.Popen(full, cwd=cwd, stdin=fin, stdout=fout, stderr=ferr, env=RUN_ENV,
                                 start_new_session=POSIX, close_fds=True,
                                 pass_fds=(m_write,) if m_write is not None else ())
        except FileNotFoundError as e:
            for fd in (m_read, m_write):
                if fd is not None:
                    os.close(fd)
            return {'exit': -1, 'signal': 0, 'time_ms': 0, 'mem_kb': 0, 'wall_timeout': False, 'missing': str(e)}
        if m_write is not None:
            os.close(m_write)
        wall_timeout = False
        if POSIX:
            while True:
                pid, status, ru = os.wait4(p.pid, os.WNOHANG)
                if pid:
                    break
                if time.monotonic() - start > wall:
                    wall_timeout = True
                    try:
                        os.killpg(p.pid, signal.SIGKILL)
                    except OSError:
                        pass
                    pid, status, ru = os.wait4(p.pid, 0)
                    break
                time.sleep(0.005)
            p.returncode = 0  # Popen дахин reap хийхгүй
            kill_uid(uid)
            sig = os.WTERMSIG(status) if os.WIFSIGNALED(status) else 0
            code = os.WEXITSTATUS(status) if os.WIFEXITED(status) else -1
            cpu_ms = int((ru.ru_utime + ru.ru_stime) * 1000)
            mem_kb = ru.ru_maxrss
            if m_read is not None:
                # measure-ийн бичсэн үнэн хэмжилт (програм өөрөө); тасарсан бол дээрхийг ашиглана
                try:
                    data = os.read(m_read, 256).decode().split()
                    if len(data) == 4:
                        code, sig, cpu_ms, mem_kb = (int(x) for x in data)
                except (OSError, ValueError):
                    pass
                finally:
                    os.close(m_read)
            return {'exit': code, 'signal': sig, 'time_ms': cpu_ms, 'mem_kb': mem_kb,
                    'wall_timeout': wall_timeout}
        # Windows: зөвхөн хана цагаар хэмжинэ
        try:
            p.wait(timeout=wall)
        except subprocess.TimeoutExpired:
            wall_timeout = True
            p.kill()
            p.wait()
        elapsed = int((time.monotonic() - start) * 1000)
        return {'exit': p.returncode, 'signal': 0, 'time_ms': elapsed, 'mem_kb': 0, 'wall_timeout': wall_timeout}


def read_head(path, limit):
    with open(path, 'rb') as f:
        return f.read(limit)


def tokens_equal(expected: bytes, actual: bytes) -> bool:
    """Хоосон зай, мөр шилжилтийг үл тооцож үгээр харьцуулна (олимпиадын стандарт)."""
    return expected.split() == actual.split()


def classify(r, time_ms, mem_mb, stderr: bytes, out_size=0):
    if r.get('missing'):
        return 'SE'
    # Python SIGXFSZ-ийг үл тоодог тул гаралтын файлын хэмжээгээр шалгана
    if out_size >= MAX_OUTPUT or (POSIX and r['signal'] == signal.SIGXFSZ) or b'File too large' in stderr[-2000:]:
        return 'OLE'
    if r['wall_timeout'] or r['time_ms'] > time_ms:
        return 'TLE'
    if POSIX and r['signal'] == signal.SIGXCPU:
        return 'TLE'
    over_mem = mem_mb and r['mem_kb'] > mem_mb * 1024
    if r['signal'] or r['exit'] != 0:
        low = stderr[-4000:]
        if over_mem or b'MemoryError' in low or b'bad_alloc' in low or (mem_mb and r['mem_kb'] > mem_mb * 1024 * 0.9):
            return 'MLE'
        return 'RE'
    if over_mem:
        return 'MLE'
    return None


def judge(req):
    lang = LANGS.get(req.get('language'))
    if not lang:
        return {'error': 'Тодорхойгүй хэл'}
    code = req.get('code') or ''
    if len(code.encode('utf-8')) > 256 * 1024:
        return {'error': 'Код хэт урт'}
    time_ms = int(min(max(int(req.get('timeLimitMs') or 1000), 100), 30000))
    mem_mb = int(min(max(int(req.get('memoryLimitMb') or 256), 16), 2048))
    tests = req.get('tests') or []
    mode = req.get('mode') or 'judge'
    want_output = set(req.get('returnOutputFor') or [])
    stop_first = bool(req.get('stopOnFirstFailure'))

    slot = slot_queue.get()
    uid = RUNNER_UIDS[slot % len(RUNNER_UIDS)]
    work = tempfile.mkdtemp(prefix=f'run{slot}-', dir=WORK_ROOT)
    io_dir = None
    try:
        if IS_ROOT:
            os.chown(work, uid, uid)
        os.chmod(work, 0o700)
        src = os.path.join(work, lang['src'])
        with open(src, 'w', encoding='utf-8', newline='\n') as f:
            f.write(code)
        if IS_ROOT:
            os.chown(src, uid, uid)
        # Компилятор-т өгөх, гаралтын файлууд worker-ийн хавтсанд (сурагчийн код харахгүй)
        io_dir = tempfile.mkdtemp(prefix=f'io{slot}-', dir=WORK_ROOT)
        os.chmod(io_dir, 0o700)
        null_in = os.path.join(io_dir, 'empty')
        open(null_in, 'wb').close()

        result = {'compile': {'ok': True, 'output': ''}, 'results': []}
        if lang['compile']:
            out_p, err_p = os.path.join(io_dir, 'c.out'), os.path.join(io_dir, 'c.err')
            r = run_process(lang['compile'], work, null_in, out_p, err_p, 15000, 1024, uid,
                            nproc=64, wall_extra_s=5, fsize=64 * 1024 * 1024)
            msg = (read_head(out_p, 20000) + read_head(err_p, 20000)).decode('utf-8', 'replace')
            if r.get('missing'):
                return {'error': 'Компилятор олдсонгүй: ' + r['missing']}
            if r['exit'] != 0 or r['signal'] or r['wall_timeout']:
                if r['wall_timeout']:
                    msg += '\nКомпиляц хэт удаан үргэлжилсэн.'
                result['compile'] = {'ok': False, 'output': msg.replace(work, '').strip()}
                return result
            result['compile']['output'] = msg.replace(work, '').strip()

        # Хөрвүүлсэн програмын бүтэн зам (Windows-д харьцангуй зам cwd-ээр хайгддаггүй)
        run_cmd = [os.path.join(work, EXE)] if lang['compile'] else lang['run']
        for i, t in enumerate(tests):
            in_p = os.path.join(io_dir, 'in.txt')
            out_p, err_p = os.path.join(io_dir, 'out.txt'), os.path.join(io_dir, 'err.txt')
            with open(in_p, 'w', encoding='utf-8', newline='\n') as f:
                f.write(t.get('input') or '')
            r = run_process(run_cmd, work, in_p, out_p, err_p, time_ms, mem_mb, uid)
            stderr = read_head(err_p, 1 << 16)
            verdict = classify(r, time_ms, mem_mb, stderr, os.path.getsize(out_p))
            item = {'verdict': verdict, 'timeMs': r['time_ms'], 'memoryKb': r['mem_kb']}
            if mode == 'outputs':
                actual = read_head(out_p, MAX_RETURN_OUTPUT + 1)
                if len(actual) > MAX_RETURN_OUTPUT:
                    item['verdict'] = verdict or 'OLE'
                else:
                    item['output'] = actual.decode('utf-8', 'replace')
                item['verdict'] = item['verdict'] or 'OK'
            else:
                if verdict is None:
                    actual = read_head(out_p, MAX_OUTPUT + 1)
                    verdict = 'AC' if tokens_equal((t.get('output') or '').encode('utf-8'), actual) else 'WA'
                    item['verdict'] = verdict
                if i in want_output:
                    item['output'] = read_head(out_p, 4096).decode('utf-8', 'replace')
            if item['verdict'] not in ('AC', 'OK') and stderr:
                item['stderr'] = stderr[-2000:].decode('utf-8', 'replace').replace(work, '')
            result['results'].append(item)
            for p in (in_p, out_p, err_p):
                try:
                    os.remove(p)
                except OSError:
                    pass
            if stop_first and item['verdict'] not in ('AC', 'OK'):
                break
        return result
    finally:
        kill_uid(uid)
        shutil.rmtree(work, ignore_errors=True)
        if io_dir:
            shutil.rmtree(io_dir, ignore_errors=True)
        slot_queue.put(slot)


def versions():
    out = {}
    for key, lang in LANGS.items():
        try:
            v = subprocess.run(lang['version'], capture_output=True, text=True, timeout=10)
            out[key] = (v.stdout or v.stderr).strip().splitlines()[0]
        except Exception as e:  # noqa: BLE001
            out[key] = 'олдсонгүй: ' + str(e)
    return out


class Handler(BaseHTTPRequestHandler):
    server_version = 'YeSuvdJudge/1'

    def _send(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _authorized(self):
        return not TOKEN or self.headers.get('X-Judge-Token') == TOKEN

    def do_GET(self):
        if self.path != '/health':
            return self._send(404, {'error': 'not found'})
        if not self._authorized():
            return self._send(401, {'error': 'unauthorized'})
        self._send(200, {'ok': True, 'slots': SLOTS, 'sandbox': IS_ROOT, 'languages': versions()})

    def do_POST(self):
        if self.path != '/run':
            return self._send(404, {'error': 'not found'})
        if not self._authorized():
            return self._send(401, {'error': 'unauthorized'})
        length = int(self.headers.get('Content-Length') or 0)
        if length <= 0 or length > MAX_BODY:
            return self._send(413, {'error': 'Хүсэлт хэт том'})
        try:
            req = json.loads(self.rfile.read(length))
        except ValueError:
            return self._send(400, {'error': 'JSON буруу'})
        try:
            self._send(200, judge(req))
        except Exception as e:  # noqa: BLE001
            self._send(500, {'error': 'Шүүгчийн алдаа: ' + str(e)})

    def log_message(self, fmt, *args):  # энгийн лог
        print('%s %s' % (self.address_string(), fmt % args), flush=True)


def main():
    os.makedirs(WORK_ROOT, exist_ok=True)
    os.chmod(WORK_ROOT, 0o711)
    if not POSIX:
        print('АНХААР: Windows дээр хамгаалалтгүй ажиллаж байна (зөвхөн локал туршилтад).', flush=True)
    elif not IS_ROOT:
        print('АНХААР: root биш тул кодыг тусдаа хэрэглэгчээр ажиллуулж чадахгүй.', flush=True)
    print(f'YeSuvd judge :{PORT} slots={SLOTS}', flush=True)
    ThreadingHTTPServer(('0.0.0.0', PORT), Handler).serve_forever()


if __name__ == '__main__':
    main()
