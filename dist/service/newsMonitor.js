"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsMonitor = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const parserNews_1 = require("./parserNews");
const aiFormatter_1 = require("./aiFormatter");
const database_1 = require("../database");
class NewsMonitor {
    constructor(baseUrl, bot, chatId) {
        this.isRunning = false;
        this.parser = new parserNews_1.ParserNews(baseUrl);
        this.bot = bot;
        this.chatId = chatId;
    }
    async start() {
        console.log('Starting news monitor...');
        // Инициализируем базу данных
        await (0, database_1.initDatabase)();
        // Сразу проверяем и публикуем
        await this.checkAndSaveNews();
        // Запускаем проверку каждые 30 минут
        node_cron_1.default.schedule('*/30 * * * *', () => {
            this.checkAndSaveNews();
        });
        console.log('News monitor started. Checking every 30 minutes.');
    }
    async checkAndSaveNews() {
        if (this.isRunning) {
            console.log('News check already in progress, skipping...');
            return;
        }
        this.isRunning = true;
        console.log(`[${new Date().toISOString()}] Checking for new news...`);
        try {
            // Получаем URL первой новости
            const newsUrl = await this.parser.fetchFirstNewsUrl();
            if (!newsUrl) {
                console.log('No news URL found');
                return;
            }
            // Проверяем, есть ли уже эта новость в базе
            const exists = await (0, database_1.newsExists)(newsUrl);
            if (!exists) {
                // Новость новая — получаем полную информацию
                const news = await this.parser.fetchNewsDetails(newsUrl);
                if (!news) {
                    console.log('Failed to fetch news details');
                    return;
                }
                const saved = await (0, database_1.saveNews)(news);
                if (saved) {
                    console.log(`✅ New news saved: "${news.title}"`);
                }
            }
            // Публикуем все неопубликованные новости
            await this.publishUnpublishedNews();
        }
        catch (error) {
            console.error('Error checking news:', error);
        }
        finally {
            this.isRunning = false;
        }
    }
    async publishUnpublishedNews() {
        const unpublished = await (0, database_1.getUnpublishedNews)();
        for (const news of unpublished) {
            try {
                await this.publishToChannel(news);
                await (0, database_1.markAsPublished)(news.url);
                console.log(`📢 Published to channel: "${news.title}"`);
            }
            catch (error) {
                console.error(`Failed to publish "${news.title}":`, error);
            }
        }
    }
    async publishToChannel(news) {
        // Форматируем контент через DeepSeek
        const formattedContent = news.content
            ? await (0, aiFormatter_1.formatNewsWithAI)(news.content)
            : '';
        let message = `**${news.title}**\n\n`;
        if (formattedContent) {
            message += `${formattedContent}\n\n`;
        }
        message += `🔗 ${news.url}`;
        // Загружаем изображения через API
        const attachments = [];
        if (news.images && news.images.length > 0) {
            for (const imageUrl of news.images) {
                try {
                    const uploaded = await this.bot.api.uploadImage({ url: imageUrl });
                    if (uploaded) {
                        attachments.push(uploaded.toJson());
                    }
                }
                catch (error) {
                    console.error(`Failed to upload image ${imageUrl}:`, error);
                }
            }
        }
        await this.bot.api.sendMessageToChat(this.chatId, message, {
            attachments: attachments.length > 0 ? attachments : undefined,
            format: 'markdown',
        });
    }
}
exports.NewsMonitor = NewsMonitor;
//# sourceMappingURL=newsMonitor.js.map