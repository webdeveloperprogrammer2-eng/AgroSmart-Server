import { Router } from 'express';
import { asyncHandler } from '../../core/asyncHandler';
import { AppError } from '../../core/AppError';
import * as chatService from './chat.service';
import * as hub from '../../realtime/hub';

/**
 * REST барои чат.
 *
 * WebSocket барои паёмҳои зинда аст, вале REST низ лозим: таърихи сӯҳбат,
 * рӯйхати чатҳо ва фиристодани паём вақте ки сокет ҳанӯз кушода нашудааст.
 * Паёме, ки бо REST фиристода шуд, ҳамон лаҳза бо WebSocket ба ҳар ду
 * тараф мерасад — яъне ду роҳ як натиҷа медиҳанд.
 *
 * `userId` аз query ё ҷисми дархост гирифта мешавад, чунки авторизатсия
 * ҳанӯз нест (README, "Известное ограничение").
 */

const router = Router();

/** ID-и корбар: аз query (?userId=) ё аз ҷисми дархост. */
function actorId(req: { query: Record<string, unknown>; body: Record<string, unknown> }): number {
  return chatService.requireUserId(req.query.userId ?? req.body?.userId);
}

function chatIdFrom(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id)) throw new AppError('`chatId` нодуруст аст', 400);
  return id;
}

/** Паёмро ба ҳар ду иштирокчӣ мефиристад. */
function pushMessage(message: chatService.Message, peerId: number): void {
  const event = { type: 'chat:message', chatId: message.chatId, message };
  hub.sendToUser(message.senderId, event);
  hub.sendToUser(peerId, event);
}

// ── Сӯҳбатҳо ────────────────────────────────────────────────────────────

/** Рӯйхати сӯҳбатҳои корбар: GET /chats?userId=3 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = actorId(req as never);
    res.json(await chatService.listChats(userId));
  })
);

/**
 * Кушодани сӯҳбат бо фурӯшанда: POST /chats
 * Агар чунин сӯҳбат бошад — ҳамонро бармегардонад (201 танҳо барои нав).
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const buyerId = chatService.requireUserId(req.body?.buyerId ?? req.body?.userId, 'buyerId');
    const sellerId = chatService.requireUserId(req.body?.sellerId, 'sellerId');

    const { chat, created } = await chatService.openChat({
      buyerId,
      sellerId,
      productId: req.body?.productId,
      productName: req.body?.productName,
      productType: req.body?.productType,
      productImg: req.body?.productImg,
    });

    // Ҳамсӯҳбатро огоҳ мекунем, ки сӯҳбати нав пайдо шуд
    if (created) {
      hub.sendToUser(sellerId, { type: 'chat:new', chat });
    }

    res.status(created ? 201 : 200).json(chat);
  })
);

/** Як сӯҳбат: GET /chats/:id?userId=3 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = actorId(req as never);
    res.json(await chatService.getChatFor(chatIdFrom(req.params.id), userId));
  })
);

// ── Паёмҳо ──────────────────────────────────────────────────────────────

/**
 * Таърихи сӯҳбат: GET /chats/:id/messages?userId=3&_limit=50&_before=120
 * Тартиб: кӯҳна → нав.
 */
router.get(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    const userId = actorId(req as never);
    const chatId = chatIdFrom(req.params.id);

    await chatService.getChatFor(chatId, userId); // тафтиши дастрасӣ

    res.json(
      await chatService.listMessages(chatId, {
        limit: req.query._limit ? Number(req.query._limit) : undefined,
        before: req.query._before ? Number(req.query._before) : undefined,
      })
    );
  })
);

/**
 * Фиристодани паём: POST /chats/:id/messages
 *   матн  { userId, text }
 *   овоз  { userId, kind: "voice", audio: "data:audio/webm;base64,...", duration }
 */
router.post(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    const userId = actorId(req as never);
    const chatId = chatIdFrom(req.params.id);

    const chat = await chatService.getChatFor(chatId, userId);

    const message = await chatService.sendMessage({
      chatId,
      senderId: userId,
      kind: req.body?.kind,
      text: req.body?.text,
      audio: req.body?.audio,
      duration: req.body?.duration,
      mimeType: req.body?.mimeType,
    });

    pushMessage(message, chatService.peerOf(chat, userId));
    res.status(201).json(message);
  })
);

/** Хондашуда қайд кардан: POST /chats/:id/read */
router.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const userId = actorId(req as never);
    const chatId = chatIdFrom(req.params.id);

    const chat = await chatService.getChatFor(chatId, userId);
    const messageIds = await chatService.markRead(chatId, userId);

    if (messageIds.length > 0) {
      hub.sendToUser(chatService.peerOf(chat, userId), {
        type: 'chat:read',
        chatId,
        userId,
        messageIds,
      });
    }

    res.json({ chatId, messageIds, count: messageIds.length });
  })
);

// ── Кӯмакӣ ──────────────────────────────────────────────────────────────

/** Шумораи умумии паёмҳои нахонда: GET /chats/unread/count?userId=3 */
router.get(
  '/unread/count',
  asyncHandler(async (req, res) => {
    const userId = actorId(req as never);
    res.json({ userId, unread: await chatService.totalUnread(userId) });
  })
);

export default router;
