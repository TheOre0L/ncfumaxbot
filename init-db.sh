#!/bin/bash

# ============================================
# Скрипт инициализации базы данных для Max Bot
# ============================================

set -e

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   Инициализация БД для Max Bot           ${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Значения по умолчанию
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_NAME="maxbot"

# Читаем .env файл корректно
if [ -f .env ]; then
    while IFS='=' read -r key value; do
        # Пропускаем комментарии и пустые строки
        [[ "$key" =~ ^#.*$ ]] && continue
        [[ -z "$key" ]] && continue
        
        # Удаляем кавычки из значения
        value="${value%\"}"
        value="${value#\"}"
        value="${value%\'}"
        value="${value#\'}"
        
        case "$key" in
            DATABASE_HOST) DB_HOST="$value" ;;
            DATABASE_PORT) DB_PORT="$value" ;;
            DATABASE_USER) DB_USER="$value" ;;
            DATABASE_PASSWORD) DB_PASSWORD="$value" ;;
            DATABASE_NAME) DB_NAME="$value" ;;
        esac
    done < .env
fi

echo -e "${YELLOW}Параметры подключения:${NC}"
echo "  Хост: $DB_HOST"
echo "  Порт: $DB_PORT"
echo "  Пользователь: $DB_USER"
echo "  База данных: $DB_NAME"
echo ""

# SQL для создания таблиц
SQL=$(cat <<'EOSQL'
-- Таблица новостей
CREATE TABLE IF NOT EXISTS news (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    date TEXT,
    content TEXT,
    images TEXT[] DEFAULT '{}',
    category TEXT,
    published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица сотрудников
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    max_user_id BIGINT UNIQUE NOT NULL,
    last_name TEXT NOT NULL,
    first_name TEXT NOT NULL,
    middle_name TEXT,
    position TEXT,
    department TEXT,
    phone TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_news_url ON news(url);
CREATE INDEX IF NOT EXISTS idx_news_published ON news(published);
CREATE INDEX IF NOT EXISTS idx_employees_max_user_id ON employees(max_user_id);
EOSQL
)

# Проверка подключения
echo -e "${YELLOW}[1/3] Проверка подключения к PostgreSQL...${NC}"
if ! PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "SELECT 1" &>/dev/null; then
    echo -e "${RED}Ошибка: Не удалось подключиться к PostgreSQL${NC}"
    echo "Проверьте параметры подключения и убедитесь, что PostgreSQL запущен"
    exit 1
fi
echo -e "${GREEN}✓ Подключение успешно${NC}"

# Создание базы данных если не существует
echo -e "${YELLOW}[2/3] Создание базы данных...${NC}"
if ! PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"
    echo -e "${GREEN}✓ База данных '$DB_NAME' создана${NC}"
else
    echo -e "${GREEN}✓ База данных '$DB_NAME' уже существует${NC}"
fi

# Создание таблиц
echo -e "${YELLOW}[3/3] Создание таблиц...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<< "$SQL"
echo -e "${GREEN}✓ Таблицы созданы${NC}"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   База данных успешно инициализирована!   ${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${BLUE}Созданные таблицы:${NC}"
echo "  - news (новости)"
echo "  - sent_messages (отправленные сообщения)"
