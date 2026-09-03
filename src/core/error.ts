import { Request, Response, NextFunction } from 'express';
import { AppError } from './AppError';
import { env } from '../config/env';

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Route not found' });
}

/** Хатогии марказӣ. Ҳар чор аргумент лозим аст, вагарна Express инро намешиносад. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  // JSON-и вайрон дар ҷисми дархост
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'JSON-и нодуруст' });
    return;
  }

  // Ҷисми дархост аз ҳад калон (сурати base64)
  if ((err as { type?: string }).type === 'entity.too.large') {
    res.status(413).json({ error: 'Сурат аз ҳад калон аст' });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: 'Хатогии дохилии сервер',
    ...(env.NODE_ENV === 'development' ? { detail: String(err) } : {}),
  });
}
