import { Pool } from 'pg';
import { News } from './types/news';
declare const pool: Pool;
export declare function initDatabase(): Promise<void>;
export declare function saveNews(news: News): Promise<boolean>;
export declare function markAsPublished(url: string): Promise<void>;
export declare function getUnpublishedNews(): Promise<News[]>;
export declare function getLatestNews(): Promise<News | null>;
export declare function newsExists(url: string): Promise<boolean>;
export { pool };
//# sourceMappingURL=database.d.ts.map