#!/bin/bash

# ============================================
# Скрипт деплоя Max Bot на VPS сервер
# ============================================
# Использование: ./deploy-vps.sh user@host
# Пример: ./deploy-vps.sh root@192.168.1.100

set -e

if [ -z "$1" ]; then
    echo "Использование: ./deploy-vps.sh user@host"
    echo "Пример: ./deploy-vps.sh root@192.168.1.100"
    exit 1
fi

SERVER="$1"
APP_DIR="/opt/max-bot"

echo "============================================"
echo "  Деплой Max Bot на $SERVER"
echo "============================================"
echo ""

# 1. Сборка Docker образа локально
echo "[1/5] Сборка Docker образа..."
docker build -t max-bot:latest .

# 2. Сохранение образа в файл
echo "[2/5] Экспорт Docker образа..."
docker save max-bot:latest | gzip > max-bot.tar.gz

# 3. Копирование на сервер
echo "[3/5] Копирование на сервер..."
scp max-bot.tar.gz $SERVER:/tmp/
scp docker-compose.yml $SERVER:/tmp/
scp .env $SERVER:/tmp/max-bot.env

# 4. Деплой на сервере
echo "[4/5] Развертывание на сервере..."
ssh $SERVER << 'ENDSSH'
set -e

# Создаём директорию
mkdir -p /opt/max-bot

# Определяем команду docker-compose или docker compose
if command -v docker-compose &> /dev/null; then
    COMPOSE="docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE="docker compose"
else
    echo "Ошибка: docker-compose не установлен"
    exit 1
fi

echo "Использую: $COMPOSE"

# Останавливаем старый контейнер
cd /opt/max-bot
$COMPOSE down 2>/dev/null || true

# Перемещаем файлы
mv /tmp/max-bot.tar.gz /opt/max-bot/
mv /tmp/docker-compose.yml /opt/max-bot/
mv /tmp/max-bot.env /opt/max-bot/.env

cd /opt/max-bot

# Загружаем новый образ
docker load < max-bot.tar.gz
rm max-bot.tar.gz

# Запускаем контейнеры
$COMPOSE up -d

# Очистка старых образов
docker image prune -f

echo "✅ Деплой завершён!"
ENDSSH

# 5. Очистка локальных файлов
echo "[5/5] Очистка..."
rm -f max-bot.tar.gz

echo ""
echo "============================================"
echo "  Готово! Max Bot запущен на $SERVER"
echo "============================================"
echo ""
echo "Логи: ssh $SERVER 'docker logs -f max-bot'"
