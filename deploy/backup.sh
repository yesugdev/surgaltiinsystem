#!/bin/sh
# Өгөгдлийн сангийн (хэрэглэгч, шалгалт, хичээл, илгээсэн файлууд бүгд) нөөц хувь.
# Хэрэглээ: ./backup.sh            → backups/surgalt-YYYYmmdd-HHMM.archive.gz
#           ./backup.sh NAME.gz    → backups/NAME.gz (sync скриптэд)
# Өдөр бүр автоматаар: crontab -e →  0 3 * * * cd /opt/surgalt/deploy && ./backup.sh >> backups/backup.log 2>&1
set -eu
cd "$(dirname "$0")"
. ./.env

KEEP_DAYS="${KEEP_DAYS:-14}"
NAME="${1:-surgalt-$(date +%Y%m%d-%H%M).archive.gz}"
mkdir -p backups

docker compose exec -T mongo mongodump \
  --username "$MONGO_USER" --password "$MONGO_PASSWORD" --authenticationDatabase admin \
  --db surgaltiin_system --archive --gzip --quiet > "backups/$NAME"

echo "$(date '+%F %T') нөөц үүслээ: backups/$NAME ($(du -h "backups/$NAME" | cut -f1))"
# Хуучин нөөцийг устгана
find backups -name 'surgalt-*.archive.gz' -mtime +"$KEEP_DAYS" -delete
