#!/bin/sh
# Шинэ кодыг GitHub-аас татаж аппыг шинэчилнэ. Өгөгдөл, файлууд хэвээр үлдэнэ.
# Хэрэглээ (сервер дээр): /opt/surgalt/deploy/update.sh
set -eu
cd "$(dirname "$0")"

echo "1/4 Өгөгдлийг нөөцөлж байна..."
./backup.sh

echo "2/4 Шинэ код татаж байна..."
BEFORE=$(git -C .. rev-parse --short HEAD)
git -C .. pull --ff-only
AFTER=$(git -C .. rev-parse --short HEAD)
if [ "$BEFORE" = "$AFTER" ]; then
  echo "    Шинэ өөрчлөлт алга ($AFTER). Дахин build хийж байна."
else
  git -C .. log --oneline "$BEFORE..$AFTER" | sed 's/^/    + /'
fi

echo "3/4 Build хийж, аппыг дахин асааж байна..."
docker compose up -d --build app judge

echo "4/4 Шалгаж байна..."
i=0
while [ $i -lt 30 ]; do
  if docker compose exec -T app node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    docker image prune -f >/dev/null 2>&1 || true
    echo "Амжилттай: $(git -C .. log -1 --format='%h %s')"
    exit 0
  fi
  i=$((i + 1))
  sleep 2
done
echo "АЛДАА: апп асахгүй байна. Лог: docker compose logs --tail 50 app"
echo "Өмнөх хувилбар руу буцаах: git -C .. checkout $BEFORE && docker compose up -d --build app"
exit 1
