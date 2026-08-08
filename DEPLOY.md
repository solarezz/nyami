# Деплой Nyami на сервер

Сервер: nginx + Certbot уже стоят. Приложение (бэкенд + собранный фронт) поднимается
в Docker и слушает `127.0.0.1:8787`; наружу пускает nginx на IP **77.91.79.169**,
TLS — через Certbot. Домен: **nyami.solarezz.dev** (A-запись → 77.91.79.169).

Архитектура: `Telegram → https://nyami.solarezz.dev → nginx(77.91.79.169:443) → 127.0.0.1:8787 → Fastify (отдаёт фронт + /api) → Postgres (в Docker)`.

---

## 1. Код на сервер

```bash
cd /opt   # или куда удобно
git clone https://github.com/ТВОЙ_ЛОГИН/nyami.git
cd nyami
```

## 2. Секреты

```bash
cp .env.example .env
nano .env
```
Заполни:
- `BOT_TOKEN` — токен @nyamical_bot из @BotFather
- `GROQ_API_KEY` — ключ Groq
- `DB_PASSWORD` — любой надёжный пароль для БД

## 3. Поднять приложение (Postgres + бэкенд + фронт)

```bash
docker compose -f docker-compose.prod.yml up -d --build
```
Проверка, что живо:
```bash
docker compose -f docker-compose.prod.yml ps
curl -s http://127.0.0.1:8787/api/health   # -> {"ok":true}
```

## 4. nginx + HTTPS

```bash
sudo cp deploy/nginx/nyami.solarezz.dev.conf /etc/nginx/sites-available/nyami.solarezz.dev
sudo ln -s /etc/nginx/sites-available/nyami.solarezz.dev /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d nyami.solarezz.dev
```
Certbot сам допишет SSL-блок на 443 и редирект с 80. После этого:
```bash
curl -s https://nyami.solarezz.dev/api/health   # -> {"ok":true}
```

## 5. Привязать Mini App к боту

В **@BotFather**:
- `/mybots` → **@nyamical_bot** → **Bot Settings** → **Menu Button** → **Configure menu button**
- URL: `https://nyami.solarezz.dev`, текст кнопки: например «Открыть Nyami».

(Альтернатива: `/newapp` → выбрать бота → указать тот же URL — тогда приложение доступно и по прямой ссылке t.me.)

Открой бота в Telegram → нажми кнопку меню → откроется Nyami.

---

## Обновление (после `git push` новых изменений)

```bash
cd /opt/nyami
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## Полезное

```bash
# логи приложения
docker compose -f docker-compose.prod.yml logs -f app
# рестарт
docker compose -f docker-compose.prod.yml restart app
# бэкап БД
docker exec nyami-db-prod pg_dump -U nyami nyami > backup_$(date +%F).sql
```
