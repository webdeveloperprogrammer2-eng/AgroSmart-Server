import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',

  // Фронтенд (src/api/config.js) ба http://localhost:8000 муроҷиат мекунад.
  PORT: parseInt(process.env.PORT ?? '8000', 10),

  DATABASE_URL: required('DATABASE_URL'),
  PGSSL: (process.env.PGSSL ?? 'false') === 'true',

  // Суратҳо ҳамчун data-URL (base64) фиристода мешаванд, бинобар ин
  // ҳаҷми ҷисми дархост калон аст.
  JSON_LIMIT: process.env.JSON_LIMIT ?? '15mb',

  CORS_ORIGIN: process.env.CORS_ORIGIN ?? '*',

  // Агар дар давоми ин қадар соат ягон дархост наояд, сервер худаш хомӯш
  // мешавад. Ҳар дархост ҳисобро аз сифр оғоз мекунад. 0 = ҳеҷ гоҳ нахобад.
  IDLE_SHUTDOWN_HOURS: parseFloat(process.env.IDLE_SHUTDOWN_HOURS ?? '24'),

  // Render-и ройгон баъди 15 дақиқа хоб мекунад — сервер худашро ping мекунад.
  // RENDER_EXTERNAL_URL-ро Render худаш медиҳад; дар localhost холӣ → хомӯш.
  KEEP_ALIVE_URL: process.env.KEEP_ALIVE_URL ?? process.env.RENDER_EXTERNAL_URL ?? '',
  KEEP_ALIVE_MINUTES: parseFloat(process.env.KEEP_ALIVE_MINUTES ?? '3'),
};
