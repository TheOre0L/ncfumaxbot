import { Pool } from 'pg';
import dotenv from 'dotenv';
import { News } from './types/news';

dotenv.config();

const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
});

export async function initDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
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
      )
    `);

    // Миграция: добавляем колонку published если её нет
    await client.query(`
      ALTER TABLE news ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT FALSE
    `);

    // Таблица сотрудников
    await client.query(`
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
      )
    `);

    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
}

export async function saveNews(news: News): Promise<boolean> {
  const client = await pool.connect();
  try {
    // Если новость уже есть, обновляем только если published = FALSE
    const result = await client.query(
      `INSERT INTO news (title, url, date, content, images, category, published)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (url) DO UPDATE SET 
         title = EXCLUDED.title,
         date = EXCLUDED.date,
         content = EXCLUDED.content,
         images = EXCLUDED.images,
         category = EXCLUDED.category,
         published = EXCLUDED.published
       WHERE news.published = FALSE
       RETURNING id`,
      [news.title, news.url, news.date, news.content, news.images, news.category, news.published]
    );
    
    const rowCount = result.rowCount !== null ? result.rowCount : 0;
    return rowCount > 0;
  } catch (error) {
    console.error('Error saving news:', error);
    return false;
  } finally {
    client.release();
  }
}

export async function markAsPublished(url: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      'UPDATE news SET published = TRUE WHERE url = $1',
      [url]
    );
  } finally {
    client.release();
  }
}

export async function getUnpublishedNews(): Promise<News[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM news WHERE published = FALSE ORDER BY created_at ASC'
    );
    return result.rows;
  } finally {
    client.release();
  }
}

export async function getLatestNews(): Promise<News | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM news ORDER BY created_at DESC LIMIT 1'
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

export async function newsExists(url: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT id FROM news WHERE url = $1',
      [url]
    );
    return result.rowCount !== null && result.rowCount > 0;
  } finally {
    client.release();
  }
}

export { pool };
