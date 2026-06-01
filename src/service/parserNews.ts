import * as cheerio from 'cheerio';
import { News } from '../types/news';

export class ParserNews {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Получает URL первой (самой свежей) новости со страницы списка
   */
  async fetchFirstNewsUrl(): Promise<string | null> {
    try {
      const url = `${this.baseUrl}1`;
      console.log(`Fetching news list from: ${url}`);

      const response = await fetch(url);
      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        return null;
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Ищем ссылки на конкретные новости
      const newsLinks = $('a[href*="/filial/vse-novosti/glavnaya/"]');

      if (!newsLinks.length) {
        console.log('No news links found on page');
        return null;
      }

      const href = newsLinks.first().attr('href') || '';
      if (!href) return null;

      const newsUrl = href.startsWith('http')
        ? href
        : `https://nti.ncfu.ru${href}`;

      console.log(`First news URL: ${newsUrl}`);
      return newsUrl;
    } catch (error) {
      console.error('Error fetching news list:', error);
      return null;
    }
  }

  /**
   * Получает полную информацию о новости по её URL
   */
  async fetchNewsDetails(newsUrl: string): Promise<News | null> {
    try {
      console.log(`Fetching news details from: ${newsUrl}`);

      // Случайная задержка от 3 до 8 секунд перед запросом
      const delay = Math.floor(Math.random() * 5000) + 3000;
      await new Promise(resolve => setTimeout(resolve, delay));

      const response = await fetch(newsUrl);
      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        return null;
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Заголовок — h1 с классом title
      const title = $('h1.title, h1.js-title').first().text().trim()
        || $('h1').last().text().trim();

      // Контейнер новости — div.news-content
      const newsContent = $('div.news-content');

      // Дата — из блока с метаинформацией
      const metaBlock = newsContent.find('.inline-centered-vertical, .text-muted').first();
      const metaText = metaBlock.text().trim();
      const dateMatch = metaText.match(/(\d{1,2}\s+\S+\s+\d{4}\s+г\.\s+\d{2}:\d{2})/);
      const date = dateMatch ? dateMatch[1] : '';

      // Категория
      const categoryMatch = metaText.match(/Категория:\s*(\S+)/);
      const category = categoryMatch ? categoryMatch[1] : null;

      // Контент — весь текст внутри news-content, но без блока метаданных и галереи
      // Удаляем блок с датой/категорией и галерею, оставляем только текст новости
      const contentClone = newsContent.clone();
      contentClone.find('.inline-centered-vertical').parent().remove();
      contentClone.find('.gallery-news').remove();
      contentClone.find('button').remove();
      contentClone.find('.text-muted').remove();

      // Заменяем <br> на переносы строк, <li> на маркеры
      contentClone.find('br').replaceWith('\n');
      contentClone.find('li').each((_, el) => {
        $(el).prepend('• ');
        $(el).append('\n');
      });

      let content = contentClone.text()
        .replace(/\t/g, '')
        .replace(/ +\n/g, '\n')
        .replace(/\n +/g, '\n')
        .replace(/\n{2,}/g, '\n')
        .trim();

      // Убираем строку с датой/категорией если она попала в контент
      content = content.replace(/\d{1,2}\s+\S+\s+\d{4}\s+г\.\s+\d{2}:\d{2}\.?\s*Категория:\s*\S+\s*/g, '').trim();

      // Все изображения из галереи (полноразмерные — из href ссылок)
      const images: string[] = [];
      $('a.gallery-news__item, .gallery-news a').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          const fullUrl = href.startsWith('http') ? href : `https://nti.ncfu.ru${href}`;
          if (!images.includes(fullUrl)) {
            images.push(fullUrl);
          }
        }
      });

      if (!title) {
        console.log('Could not parse news title');
        return null;
      }

      console.log(`Parsed news: "${title}" | ${date} | ${images.length} images`);

      return {
        title,
        url: newsUrl,
        date,
        content,
        images,
        category,
        published: false,
      };
    } catch (error) {
      console.error('Error fetching news details:', error);
      return null;
    }
  }

  /**
   * Получает первую новость с полной информацией
   */
  async fetchFirstNews(): Promise<News | null> {
    const newsUrl = await this.fetchFirstNewsUrl();
    if (!newsUrl) return null;

    return this.fetchNewsDetails(newsUrl);
  }

  /**
   * Получает список всех новостей со страницы (ссылки на новости)
   */
  async fetchNewsList(): Promise<{ url: string; date: string }[]> {
    try {
      const url = `${this.baseUrl}1`;
      console.log(`Fetching news list from: ${url}`);

      // Случайная задержка от 3 до 8 секунд перед запросом
      const delay = Math.floor(Math.random() * 5000) + 3000;
      await new Promise(resolve => setTimeout(resolve, delay));

      const response = await fetch(url);
      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        return [];
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Ищем все ссылки на новости
      const newsItems: { url: string; date: string }[] = [];
      
      // Сначала ищем в контейнерах новостей
      $('div.news-item, .news-list-item, .news-block').each((_, el) => {
        const linkEl = $(el).find('a[href*="/filial/vse-novosti/glavnaya/"]').first();
        const href = linkEl.attr('href');
        
        if (!href) return;

        const fullUrl = href.startsWith('http') 
          ? href 
          : `https://nti.ncfu.ru${href}`;

        // Ищем дату в элементе новости
        const dateEl = $(el).find('.news-date, .date, .text-muted').first();
        const date = dateEl.text().trim();

        newsItems.push({ url: fullUrl, date });
      });

      // Если не нашли по классам, пробуем альтернативный подход — все ссылки с датами
      if (newsItems.length === 0) {
        console.log('No news items found with first selector, trying alternative...');
        $('a[href*="/filial/vse-novosti/glavnaya/"]').each((_, el) => {
          const href = $(el).attr('href');
          if (!href) return;

          // Ищем ближайший элемент с датой
          const dateEl = $(el).closest('.news-item, .news-list-item, .news-block').find('.news-date, .date, .text-muted').first();
          const date = dateEl.text().trim();

          const fullUrl = href.startsWith('http') 
            ? href 
            : `https://nti.ncfu.ru${href}`;

          newsItems.push({ url: fullUrl, date });
        });
      }

      console.log(`Found ${newsItems.length} news items`);
      
      // Логируем первые 3 новости для отладки
      if (newsItems.length > 0) {
        console.log('First 3 news items:');
        for (let i = 0; i < Math.min(3, newsItems.length); i++) {
          console.log(`  ${i + 1}. ${newsItems[i].url}`);
        }
      }
      
      return newsItems;
    } catch (error) {
      console.error('Error fetching news list:', error);
      return [];
    }
  }
}
