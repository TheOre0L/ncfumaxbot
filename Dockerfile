# ============================================
# Dockerfile для Max Bot НТИ (филиал) СКФУ
# ============================================

FROM node:20-alpine AS base

# ============================================
# Stage 1: Установка зависимостей
# ============================================
FROM base AS deps

WORKDIR /app

# Копируем package файлы
COPY package.json package-lock.json* ./

# Устанавливаем зависимости
RUN npm ci --prefer-offline

# ============================================
# Stage 2: Сборка
# ============================================
FROM base AS builder

WORKDIR /app

# Копируем зависимости
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Компилируем TypeScript
RUN npm run build

# ============================================
# Stage 3: Production образ
# ============================================
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production

# Создаём непривилегированного пользователя
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 bot

# Копируем скомпилированный код
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Копируем публичные файлы (если есть)
COPY --from=builder /app/public ./public 2>/dev/null || true

# Переключаемся на непривилегированного пользователя
USER bot

# Запуск бота
CMD ["node", "dist/index.js"]
