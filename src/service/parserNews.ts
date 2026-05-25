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
}
