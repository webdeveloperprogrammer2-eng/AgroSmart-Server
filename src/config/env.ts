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
};
