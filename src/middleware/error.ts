import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Route not found' });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  const pgErr = err as { code?: string };
  if (pgErr.code === '23505') {
    res.status(409).json({ error: 'Resource already exists' });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: 'Internal server error',
    ...(env.NODE_ENV !== 'production' ? { detail: String(err) } : {}),
  });
}
