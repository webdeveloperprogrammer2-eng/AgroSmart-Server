import { Request, Response, NextFunction, RequestHandler } from 'express';

/** Хатогиҳои async-роутерҳоро ба errorHandler мефиристад. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
