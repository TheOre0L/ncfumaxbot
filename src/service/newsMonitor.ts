import cron from 'node-cron';
import { Bot } from '@maxhub/max-bot-api';
import { ParserNews } from './parserNews';
import { formatNewsWithAI } from './aiFormatter';
import { initDatabase, saveNews, newsExists, markAsPublished, getUnpublishedNews, getLatestNews } from '../database';
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

    try {
      // Получаем список всех новостей со страницы
      console.log('Fetching news list...');
      const newsList = await this.parser.fetchNewsList();

      if (newsList.length === 0) {
        console.log('No news found on page');
        return;
      }

      console.log(`Found ${newsList.length} news items on page`);

      // Логируем первые 3 новости для отладки
      if (newsList.length > 0) {
        console.log('First 3 news items:');
        for (let i = 0; i < Math.min(3, newsList.length); i++) {
          console.log(`  ${i + 1}. ${newsList[i].url}`);
        }
      }

      // Обрабатываем каждую новость со страницы
      for (let i = 0; i < newsList.length; i++) {
        const newsItem = newsList[i];
        console.log(`[${i + 1}/${newsList.length}] Processing: ${newsItem.url}`);
        
        // Случайная задержка от 3 до 8 секунд
        const delay = Math.floor(Math.random() * 5000) + 3000;
        console.log(`Waiting ${delay}ms before next request...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Если новость уже в БД — пропускаем
        const exists = await newsExists(newsItem.url);
        if (exists) {
          console.log(`  News already in DB`);
          continue;
        }

        // Новость новая — получаем полную информацию
        console.log(`  Fetching details...`);
        const news = await this.parser.fetchNewsDetails(newsItem.url);

        if (!news) {
          console.log(`  Failed to fetch news details`);
          continue;
        }

        // Сохраняем
        const saved = await saveNews(news);
        if (saved) {
          console.log(`  ✅ Saved: ${news.title}`);
        }
      }

      // Публикуем все неопубликованные новости
      const unpublished = await getUnpublishedNews();
      console.log(`Found ${unpublished.length} unpublished news items`);
      for (const news of unpublished) {
        console.log(`  - ${news.title}`);
      }
      await this.publishUnpublishedNews();
    } catch (error) {
      console.error('Error checking news:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async publishUnpublishedNews(): Promise<void> {
    const unpublished = await getUnpublishedNews();
    console.log(`Found ${unpublished.length} unpublished news items`);

    // Публикуем в порядке добавления в БД (created_at ASC)
    for (const news of unpublished) {
      try {
        await this.publishToChannel(news);
        await markAsPublished(news.url);
        console.log(`Published: ${news.title}`);
      } catch (error) {
        console.error(`Failed to publish "${news.title}":`, error);
      }
    }
  }

  private async publishToChannel(news: News): Promise<void> {
    let message = `**${news.title}**\n\n`;
    if (news.content) {
      message += `${news.content}\n\n`;
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
