import type { Request, Response, NextFunction } from 'express';
import type { Server } from 'http';

/**
 * Хомӯшкунӣ аз рӯи бекорӣ (idle shutdown).
 *
 * Сервер ТАНҲО он вақт хомӯш мешавад, ки дар давоми `hours` соат ягон
 * фаъолият набошад. Ҳар дархости HTTP ё пайвасти WebSocket таймерро
 * аз сифр оғоз мекунад — яъне то даме ки касе истифода барад, сервер
 * ҳеҷ гоҳ намеистад.
 *
 * IDLE_SHUTDOWN_HOURS=0 → тамоман хомӯш намешавад.
 */
export function createIdleShutdown(hours: number) {
  const ms = Math.max(0, hours) * 60 * 60 * 1000;

  let timer: NodeJS.Timeout | null = null;
  let lastActivity = Date.now();
  let onIdle: (() => void) | null = null;

  function touch() {
    lastActivity = Date.now();
    if (!ms || !onIdle) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => onIdle && onIdle(), ms);
    // unref: худи таймер равандро зинда нигоҳ надорад — ин кори server аст
    timer.unref?.();
  }

  /** Ҳар дархости HTTP-ро ҳамчун фаъолият ҳисоб мекунад. */
  function middleware(_req: Request, _res: Response, next: NextFunction) {
    touch();
    next();
  }

  /** Баъди `listen` даъват мешавад. */
  function start(server: Server, handler: () => void) {
    onIdle = handler;
    // WebSocket handshake низ фаъолият аст (middleware-и express онро намебинад)
    server.on('upgrade', touch);
    if (!ms) {
      console.log('⏳ Idle shutdown: хомӯш (IDLE_SHUTDOWN_HOURS=0) — сервер ҳамеша кор мекунад');
      return;
    }
    touch();
    console.log(`⏳ Idle shutdown: баъди ${hours} соат бефаъолиятӣ хомӯш мешавад`);
  }

  return { middleware, start, touch, get lastActivity() { return lastActivity; } };
}
