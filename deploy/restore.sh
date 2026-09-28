#!/bin/sh
# Нөөц хувиас сэргээнэ. АНХААР: одоогийн өгөгдлийг нөөцийнхөөр СОЛИНО.
# Хэрэглээ: ./restore.sh backups/surgalt-20261001-0300.archive.gz
set -eu
cd "$(dirname "$0")"
. ./.env

FILE="${1:-}"
[ -f "$FILE" ] || { echo "Файл олдсонгүй: $FILE"; exit 1; }

printf 'Одоогийн өгөгдөл "%s" нөөцөөр солигдоно. Үргэлжлүүлэх үү? (yes/no) ' "$FILE"
read -r answer
[ "$answer" = "yes" ] || { echo "Цуцаллаа."; exit 1; }

docker compose exec -T mongo mongorestore \
  --username "$MONGO_USER" --password "$MONGO_PASSWORD" --authenticationDatabase admin \
  --drop --archive --gzip \
  --nsFrom 'surgaltiin_system.*' --nsTo 'surgaltiin_system.*' < "$FILE"

docker compose restart app
echo "Сэргээлт дууслаа."
