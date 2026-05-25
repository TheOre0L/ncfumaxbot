import cron from 'node-cron';
import { Bot } from '@maxhub/max-bot-api';
import { ParserNews } from './parserNews';
import { formatNewsWithAI } from './aiFormatter';
import { initDatabase, saveNews, newsExists, markAsPublished, getUnpublishedNews } from '../database';
import { News } from '../types/news';

export class NewsMonitor {
  private parser: ParserNews;
  private bot: Bot;
  private chatId: number;
  private isRunning: boolean = false;

  constructor(baseUrl: string, bot: Bot, chatId: number) {
    this.parser = new ParserNews(baseUrl);
    this.bot = bot;
    this.chatId = chatId;
  }

  async start(): Promise<void> {
    console.log('Starting news monitor...');

    // Инициализируем базу данных
    await initDatabase();

    // Сразу проверяем и публикуем
    await this.checkAndSaveNews();

    // Запускаем проверку каждые 30 минут
    cron.schedule('*/30 * * * *', () => {
      this.checkAndSaveNews();
    });

    console.log('News monitor started. Checking every 30 minutes.');
  }

  private async checkAndSaveNews(): Promise<void> {
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
      const exists = await newsExists(newsUrl);

      if (!exists) {
        // Новость новая — получаем полную информацию
        const news = await this.parser.fetchNewsDetails(newsUrl);

        if (!news) {
          console.log('Failed to fetch news details');
          return;
        }

        const saved = await saveNews(news);
        if (saved) {
          console.log(`✅ New news saved: "${news.title}"`);
        }
      }

      // Публикуем все неопубликованные новости
      await this.publishUnpublishedNews();
    } catch (error) {
      console.error('Error checking news:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async publishUnpublishedNews(): Promise<void> {
    const unpublished = await getUnpublishedNews();

    for (const news of unpublished) {
      try {
        await this.publishToChannel(news);
        await markAsPublished(news.url);
        console.log(`📢 Published to channel: "${news.title}"`);
      } catch (error) {
        console.error(`Failed to publish "${news.title}":`, error);
      }
    }
  }

  private async publishToChannel(news: News): Promise<void> {
    // Форматируем контент через DeepSeek
    const formattedContent = news.content
      ? await formatNewsWithAI(news.content)
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
        } catch (error) {
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
