import { News } from '../types/news';
export declare class ParserNews {
    private baseUrl;
    constructor(baseUrl: string);
    /**
     * Получает URL первой (самой свежей) новости со страницы списка
     */
    fetchFirstNewsUrl(): Promise<string | null>;
    /**
     * Получает полную информацию о новости по её URL
     */
    fetchNewsDetails(newsUrl: string): Promise<News | null>;
    /**
     * Получает первую новость с полной информацией
     */
    fetchFirstNews(): Promise<News | null>;
}
//# sourceMappingURL=parserNews.d.ts.map