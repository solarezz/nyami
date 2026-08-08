# Nyami 🥗

Telegram Mini App для подсчёта калорий по фото или тексту (распознаёт нейросеть) + чат с ИИ-коучем, который знает остаток калорий за день.

## Структура

```
frontend/   React + Vite + TypeScript + Telegram Mini Apps SDK   (текущая фаза)
backend/    FastAPI + PostgreSQL + Gemini                        (следующая фаза)
```

## Запуск (локально)

```bash
npm install            # ставит зависимости всех воркспейсов
docker compose up -d   # поднимает свой PostgreSQL в контейнере
npm run db:migrate -w backend   # создаёт таблицы
```
Затем в двух терминалах:
```bash
npm run dev:api        # бэкенд на http://localhost:8787
```
```bash
npm run dev:web        # фронт на http://localhost:5173
```

Вне Telegram фронт работает как обычный сайт (тема — системная, авторизация — dev-режим).

### База данных
Своя, в Docker (`docker-compose.yml`): Postgres 16, данные в томе `nyami-pgdata`.
`DATABASE_URL` уже прописан в `backend/.env`. Без запущенной БД бэкенд откатывается на in-memory мок.

### Экраны (фаза 1, mock-данные)
Онбординг · Сегодня · Добавить еду · Карточка-оценка · Коуч (чат) · Прогресс.

## Дальше по плану
1. ✅ Фронтенд-каркас на mock-данных
2. ⬜ Бэкенд: FastAPI, схема БД (users/days/meals), авторизация через Telegram `initData`
3. ⬜ Gemini: распознавание фото/текста → калории; чат-коуч с контекстом дня
4. ⬜ Привязка бота в @BotFather, деплой (HTTPS обязателен)

### Понадобится
- **Gemini API key** — [Google AI Studio](https://aistudio.google.com/apikey) (есть бесплатный тариф)
- **Токен бота** — [@BotFather](https://t.me/BotFather)
