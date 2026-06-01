#!/bin/bash

# ============================================
# Скрипт автоматического деплоя Max Bot
# ============================================

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   Деплой Max Bot НТИ (филиал) СКФУ        ${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Проверка наличия .env файла
check_env() {
    echo -e "${YELLOW}[1/5] Проверка переменных окружения...${NC}"
    
    if [ ! -f .env ]; then
        echo -e "${RED}Ошибка: Файл .env не найден!${NC}"
        echo -e "${YELLOW}Создайте .env файл со следующими переменными:${NC}"
        echo ""
        echo "MAX_BOT_TOKEN=your-bot-token"
        echo "CHAT_ID_MAX=your-chat-id"
        echo "BASE_URL_NEWS=https://nti.ncfu.ru/filial/vse-novosti/?PAGEN_1="
        echo ""
        echo "DATABASE_HOST=localhost"
        echo "DATABASE_PORT=5432"
        echo "DATABASE_USER=postgres"
        echo "DATABASE_PASSWORD=your-password"
        echo "DATABASE_NAME=maxbot"
        echo ""
        echo "DEEPSEEK_API_KEY=your-deepseek-api-key"
        echo ""
        echo "DIRECTOR_FIO=Ефанов А.В."
        echo "DIRECTOR_FULL_NAME=Алексей Валерьевич"
        echo "DIRECTOR_POSITION=Директору НТИ (филиал) СКФУ"
        echo ""
        echo "Или скопируйте пример:"
        echo "  cp .env.simple .env"
        exit 1
    fi
    
    # Проверка обязательных переменных
    source .env
    
    if [ -z "$MAX_BOT_TOKEN" ]; then
        echo -e "${RED}Ошибка: MAX_BOT_TOKEN не указан в .env${NC}"
        exit 1
    fi
    
    if [ -z "$DATABASE_HOST" ]; then
        echo -e "${RED}Ошибка: DATABASE_HOST не указан в .env${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Переменные окружения проверены${NC}"
}

# Установка зависимостей
install_deps() {
    echo -e "${YELLOW}[2/5] Установка зависимостей...${NC}"
    
    if [ -f package-lock.json ]; then
        npm ci --prefer-offline
    else
        npm install
    fi
    
    echo -e "${GREEN}✓ Зависимости установлены${NC}"
}

# Сборка TypeScript
build_project() {
    echo -e "${YELLOW}[3/5] Компиляция TypeScript...${NC}"
    
    npm run build
    
    echo -e "${GREEN}✓ Проект скомпилирован${NC}"
}

# Проверка базы данных
check_db() {
    echo -e "${YELLOW}[4/5] Проверка подключения к БД...${NC}"
    
    # Проверяем подключение к PostgreSQL
    if command -v psql &> /dev/null; then
        source .env
        if PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USER -d $DATABASE_NAME -c "SELECT 1" &>/dev/null; then
            echo -e "${GREEN}✓ Подключение к БД успешно${NC}"
        else
            echo -e "${YELLOW}⚠ Не удалось подключиться к БД. Убедитесь, что PostgreSQL запущен.${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ psql не установлен, пропускаю проверку БД${NC}"
    fi
}

# Финальная проверка
final_check() {
    echo -e "${YELLOW}[5/5] Финальная проверка...${NC}"
    
    # Проверка, что dist существует
    if [ ! -d dist ]; then
        echo -e "${RED}Ошибка: Сборка не удалась, папка dist не найдена${NC}"
        exit 1
    fi
    
    # Проверка главного файла
    if [ ! -f dist/index.js ]; then
        echo -e "${RED}Ошибка: dist/index.js не найден${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Все проверки пройдены${NC}"
}

# Вывод информации
show_info() {
    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}   Деплой успешно завершён!               ${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo -e "${BLUE}Для запуска:${NC}"
    echo "  npm start"
    echo ""
    echo -e "${BLUE}Для запуска с PM2 (рекомендуется):${NC}"
    echo "  pm2 start dist/index.js --name max-bot"
    echo "  pm2 save"
    echo ""
    echo -e "${BLUE}Для просмотра логов:${NC}"
    echo "  pm2 logs max-bot"
    echo ""
}

# Запуск всех этапов
main() {
    check_env
    install_deps
    build_project
    check_db
    final_check
    show_info
}

# Обработка аргументов
case "$1" in
    --skip-deps)
        check_env
        build_project
        check_db
        final_check
        show_info
        ;;
    --build-only)
        check_env
        build_project
        final_check
        ;;
    --help)
        echo "Использование: ./deploy.sh [опция]"
        echo ""
        echo "Опции:"
        echo "  --skip-deps   Пропустить установку зависимостей"
        echo "  --build-only  Только сборка проекта"
        echo "  --help        Показать эту справку"
        echo ""
        echo "Без аргументов - полный деплой"
        ;;
    *)
        main
        ;;
esac
