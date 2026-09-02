import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { openapiSpec } from './docs/openapi';
import { notFound, errorHandler } from './middleware/error';

import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import foldersRoutes from './modules/folders/folders.routes';
import contactsRoutes from './modules/contacts/contacts.routes';
import debtsRoutes from './modules/debts/debts.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';

export function createApp() {
  const app = express();

  // Web UI + API docs are mounted before helmet so its CSP doesn't block
  // their inline scripts/styles.
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // API docs.
  app.get('/docs.json', (_req, res) => res.json(openapiSpec));
  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(openapiSpec, { customSiteTitle: 'Debt Tracker API Docs' })
  );

  app.use(helmet());
  app.use(
    cors({ origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',') })
  );
  app.use(express.json());
  if (env.NODE_ENV !== 'test') app.use(morgan('dev'));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/folders', foldersRoutes);
  app.use('/api/contacts', contactsRoutes);
  app.use('/api/debts', debtsRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
