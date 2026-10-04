# YeSuvd Judge — C++17 (g++), Python 3.8.10, Python 3.12 бүхий хамгаалагдсан шүүгч
# Сурагчдын ихэнх нь Python 3.8.10 ашигладаг тул яг тэр хувилбарыг албан ёсны image-ээс хуулна.
FROM python:3.8.10-slim-buster AS py38

FROM python:3.12-slim-bookworm

RUN apt-get update \
 && apt-get install -y --no-install-recommends g++ tzdata \
 && rm -rf /var/lib/apt/lists/*

# Python 3.8.10 (хувилбарын дугаартай файлууд тул 3.12-тай давхцахгүй)
COPY --from=py38 /usr/local/bin/python3.8 /usr/local/bin/python3.8
COPY --from=py38 /usr/local/lib/libpython3.8.so.1.0 /usr/local/lib/libpython3.8.so.1.0
COPY --from=py38 /usr/local/lib/python3.8 /usr/local/lib/python3.8
RUN ldconfig \
 && python3.8 -c "import sys; assert sys.version_info[:3] == (3, 8, 10), sys.version" \
 && python3 --version && g++ --version | head -1

# Код ажиллуулах root-биш хэрэглэгчид (зэрэг шалгах slot бүрт нэг)
RUN for i in 1 2 3 4; do useradd --no-create-home --uid 200$i --shell /usr/sbin/nologin runner$i; done

ENV TZ=Asia/Ulaanbaatar \
    LANG=C.UTF-8 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    JUDGE_WORK=/tmp/judge

COPY measure.c /judge/measure.c
RUN gcc -O2 -o /judge/measure /judge/measure.c && rm /judge/measure.c
COPY worker.py /judge/worker.py

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD python3 -c "import urllib.request,os; r=urllib.request.Request('http://127.0.0.1:8000/health', headers={'X-Judge-Token': os.environ.get('JUDGE_TOKEN','')}); urllib.request.urlopen(r, timeout=8)"

CMD ["python3", "/judge/worker.py"]
