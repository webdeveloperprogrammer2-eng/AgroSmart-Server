import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env';
import { RESOURCES } from './core/resources';
import { createResourceRouter } from './core/resourceRouter';
import { notFound, errorHandler } from './core/error';
import swaggerUi from 'swagger-ui-express';
import { openapiSpec } from './docs/openapi';
import chatRouter from './modules/chat/chat.router';

export function createApp() {
  const app = express();

  app.use(
    cors({ origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',') })
  );

  // Суратҳо ҳамчун data-URL меоянд (components/shared/ImagePicker.jsx),
  // барои ҳамин маҳдудияти пешфарзи 100kb кифоя нест.
  app.use(express.json({ limit: env.JSON_LIMIT }));

  if (env.NODE_ENV !== 'test') app.use(morgan('dev'));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Ҳуҷҷатҳо: Swagger UI дар /docs, худи спецификация дар /docs.json
  app.get('/docs.json', (_req, res) => res.json(openapiSpec));
  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(openapiSpec, {
      customSiteTitle: 'AgroSmart API',
      // Рӯйхати гурӯҳҳо пӯшида кушода мешавад — ҳамаи шаш ресурс якбора намоён
      swaggerOptions: { docExpansion: 'list', defaultModelsExpandDepth: -1 },
    })
  );

  // Рӯйхати ресурсҳо — ба монанди саҳифаи асосии json-server
  app.get('/', (_req, res) => {
    const base = `http://localhost:${env.PORT}`;
    res.json(
      Object.fromEntries(RESOURCES.map((r) => [r.path, `${base}/${r.path}`]))
    );
  });

  for (const resource of RESOURCES) {
    app.use(`/${resource.path}`, createResourceRouter(resource));
  }

  // Чат — мантиқи худаш дорад (иштирокчиён, дастрасӣ, паёмҳо),
  // бинобар ин ба CRUD-и умумии json-server дохил намешавад.
  app.use('/chats', chatRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
