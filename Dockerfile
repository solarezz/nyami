# syntax=docker/dockerfile:1
# --- сборка ---
FROM node:20-alpine AS build
WORKDIR /app
# Сначала только манифесты — слой npm install кэшируется, пока package.json не меняются.
# Поэтому повторные сборки (git pull без смены зависимостей) не переустанавливают пакеты.
COPY package.json ./
COPY shared/package.json ./shared/
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/
RUN --mount=type=cache,target=/root/.npm npm install
# Затем исходники и сборка фронта + бэка.
COPY . .
RUN npm run build -w frontend && npm run build -w backend

# --- рантайм ---
FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/shared ./shared
COPY --from=build /app/frontend/dist ./frontend/dist
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/drizzle ./backend/drizzle
COPY --from=build /app/backend/drizzle.config.ts ./backend/drizzle.config.ts

WORKDIR /app/backend
EXPOSE 8787
# миграции + запуск задаются в docker-compose.prod.yml (command)
CMD ["node", "dist/server.js"]
