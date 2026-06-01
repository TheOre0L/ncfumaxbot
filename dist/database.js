"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.initDatabase = initDatabase;
exports.saveNews = saveNews;
exports.markAsPublished = markAsPublished;
exports.getUnpublishedNews = getUnpublishedNews;
exports.getLatestNews = getLatestNews;
exports.newsExists = newsExists;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pool = new pg_1.Pool({
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
});
exports.pool = pool;
async function initDatabase() {
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
    }
    finally {
        client.release();
    }
}
async function saveNews(news) {
    const client = await pool.connect();
    try {
        const result = await client.query(`INSERT INTO news (title, url, date, content, images, category, published)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (url) DO NOTHING RETURNING id`, [news.title, news.url, news.date, news.content, news.images, news.category, news.published]);
        return result.rowCount !== null && result.rowCount > 0;
    }
    catch (error) {
        console.error('Error saving news:', error);
        return false;
    }
    finally {
        client.release();
    }
}
async function markAsPublished(url) {
    const client = await pool.connect();
    try {
        await client.query('UPDATE news SET published = TRUE WHERE url = $1', [url]);
    }
    finally {
        client.release();
    }
}
async function getUnpublishedNews() {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM news WHERE published = FALSE ORDER BY created_at ASC');
        return result.rows;
    }
    finally {
        client.release();
    }
}
async function getLatestNews() {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM news ORDER BY created_at DESC LIMIT 1');
        return result.rows[0] || null;
    }
    finally {
        client.release();
    }
}
async function newsExists(url) {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT id FROM news WHERE url = $1', [url]);
        return result.rowCount !== null && result.rowCount > 0;
    }
    finally {
        client.release();
    }
}
//# sourceMappingURL=database.js.map