# Production байршуулалт — learn.yesuvd.tech

Нэг серверт Docker Compose-оор 3 контейнер ажиллана:

| Контейнер | Үүрэг |
|---|---|
| `caddy` | 80/443 порт, **HTTPS сертификатыг автоматаар** авч сунгана (Let's Encrypt) |
| `app`   | YeSuvd апп (Node.js), зөвхөн дотоод сүлжээнд |
| `mongo` | MongoDB 8, нууц үгтэй, гаднаас холбогдох боломжгүй. Илгээсэн файлууд ч энд (GridFS) |

## 1. Бэлтгэл (нэг удаа)

1. **DNS:** домэйн удирдлагын самбарт `learn` дэд домэйнд **A бичлэг** үүсгэж серверийн IP-г заана.
   Шалгах: `nslookup learn.yesuvd.tech` → серверийн IP гарах ёстой.
2. **Серверт** 80 ба 443 порт нээлттэй байх (firewall / cloud security group).
3. **Docker** суулгах (Ubuntu):
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```

## 2. Кодыг серверт татах

```bash
sudo git clone https://github.com/yesugdev/surgaltiinsystem.git /opt/surgalt
sudo chown -R $USER:$USER /opt/surgalt
chmod +x /opt/surgalt/deploy/*.sh
```

## 3. Тохиргоо

```bash
cd /opt/surgalt/deploy
cp .env.example .env
nano .env
```
Нууц утгуудыг үүсгэх (гурвууланг нь тус тусад нь):
```bash
openssl rand -hex 32
```
`MONGO_PASSWORD`, `SESSION_SECRET`, `ADMIN_PASSWORD`-ийг заавал бөглөнө. **`.env` файлыг хэнд ч бүү дамжуул.**

## 4. Асаах

```bash
cd /opt/surgalt/deploy
docker compose up -d --build
docker compose ps          # бүгд "healthy" болох хүртэл 1-2 минут
docker compose logs -f caddy   # сертификат авсан эсэх ("certificate obtained successfully")
```
Дараа нь **https://learn.yesuvd.tech** нээж `ADMIN_USERNAME` / `ADMIN_PASSWORD`-оор нэвтэрнэ.
Нэвтэрсний дараа **«Нууц үг»** цэснээс нууц үгээ солино уу.

## 5. Локал өгөгдлийг серверт шилжүүлэх (заавал биш)

Компьютер дээрх одоогийн анги, сурагч, шалгалт, хичээл, илгээсэн файлуудыг зөөх бол:

```bash
# Компьютер дээр (MongoDB ажиллаж байхад):
docker run --rm mongo:8 mongodump --uri "mongodb://host.docker.internal:27017/surgaltiin_system" --archive --gzip > surgalt-local.archive.gz
ssh user@SERVER_IP "mkdir -p /opt/surgalt/deploy/backups"
scp surgalt-local.archive.gz user@SERVER_IP:/opt/surgalt/deploy/backups/

# Сервер дээр:
cd /opt/surgalt/deploy && ./restore.sh backups/surgalt-local.archive.gz
```
Шилжүүлсний дараа локал дээрх хэрэглэгчдийн нууц үгээр нэвтэрнэ (`.env`-ийн ADMIN_PASSWORD хэрэглэгдэхгүй).

## 6. Нөөцлөлт

```bash
./backup.sh                                   # гараар
crontab -e                                    # өдөр бүр 03:00-д автоматаар:
0 3 * * * cd /opt/surgalt/deploy && ./backup.sh >> backups/backup.log 2>&1
```
Нөөц `deploy/backups/`-д хадгалагдаж, 14 хоногоос хуучныг нь устгана. **Нөөцийг өөр газар (өөр сервер, компьютер) үе үе хуулж аваарай.**

Сэргээх: `./restore.sh backups/surgalt-YYYYmmdd-HHMM.archive.gz`

## 7. Шинэчлэх (код өөрчлөгдсөн үед)

Компьютер дээрээ `git push` хийсний дараа сервер дээр:
```bash
cd /opt/surgalt/deploy
./backup.sh
git pull
docker compose up -d --build app
```
Өгөгдөл (`mongo_data` volume) болон сертификат (`caddy_data`) хэвээр үлдэнэ.

## Ашигтай командууд

```bash
docker compose ps                 # төлөв
docker compose logs -f app        # апп лог
docker compose restart app        # аппыг дахин асаах
docker compose down               # зогсоох (өгөгдөл устахгүй)
```
> **Анхаар:** `docker compose down -v` нь өгөгдлийн санг **бүр мөсөн устгана**.

## Серверт 80/443-ыг өөр nginx контейнер (`edge` сүлжээ) эзэмшдэг бол — yesuvd.tech сервер

Энэ серверт `fx-nginx-1` (`/opt/fx`) бүх домэйны HTTPS-ийг хариуцдаг. Caddy-г унтрааж, апп-ыг `edge` сүлжээнд
`learn-app` нэрээр нэгтгэнэ:

- `edge/docker-compose.override.yml` → `deploy/docker-compose.override.yml` болгож хуулна (Caddy унтарч, апп edge-д нэгдэнэ).
- `edge/learn.conf.template` → `/opt/fx/nginx/templates/`-д хуулж, fx-ийн compose-д mount нэмнэ.
- Сертификатыг fx-ийн certbot volume-д авна (`certbot certonly --webroot -w /var/www/certbot -d learn.yesuvd.tech`).

## Серверт өөр сайт (nginx г.м.) 80/443 портыг эзэлсэн бол

`.env`-д `HTTP_PORT=8080`, `HTTPS_PORT=8443` гэх мэт өөр порт өгөөд, одоогийн nginx-ээс
`learn.yesuvd.tech` хүсэлтийг `http://127.0.0.1:8080` руу дамжуулна. Энэ тохиолдолд HTTPS-ийг nginx хариуцах тул
`.env`-д `DOMAIN=:80` гэж тавина (Caddy зөвхөн HTTP-ээр хүлээн авна).
nginx-ийн тохиргоонд `client_max_body_size 150m;` болон `proxy_set_header X-Forwarded-Proto $scheme;` заавал нэмнэ.
