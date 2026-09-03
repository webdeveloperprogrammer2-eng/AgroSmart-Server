import { query, queryOne } from '../../config/db';
import { AppError } from '../../core/AppError';

/**
 * Мантиқи чат: сӯҳбатҳо, паёмҳо (матн / овоз) ва сабти зангҳо.
 *
 * Дар ин ҷо ҳеҷ гуна WebSocket нест — сервис танҳо бо база кор мекунад.
 * Фиристодани хабар ба иштирокчиён дар `realtime/socket.ts` ва
 * `chat.router.ts` иҷро мешавад, то мантиқи база аз нақлиёт ҷудо монад.
 */

export type MessageKind = 'text' | 'voice' | 'call';

export interface Chat {
  id: number;
  participants: number[];
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface Message {
  id: number;
  chatId: number;
  senderId: number;
  kind: MessageKind;
  readAt: string | null;
  createdAt: string;
  [key: string]: unknown;
}

interface ChatRow {
  id: number;
  user_a: number;
  user_b: number;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: number;
  chat_id: number;
  sender_id: number;
  kind: MessageKind;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

function toChat(row: ChatRow): Chat {
  return {
    ...row.data,
    id: row.id,
    participants: [row.user_a, row.user_b],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMessage(row: MessageRow): Message {
  return {
    ...row.data,
    id: row.id,
    chatId: row.chat_id,
    senderId: row.sender_id,
    kind: row.kind,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

/** ID-и корбар аз ҷисм ё query — ҳамеша рақами дуруст талаб мешавад. */
export function requireUserId(value: unknown, field = 'userId'): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(`\`${field}\` бояд ID-и дурусти корбар бошад`, 400);
  }
  return id;
}

/** Ҷуфтро тартиб медиҳад: хурдтар аввал — то (3,5) ва (5,3) як сӯҳбат бошанд. */
function orderPair(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a];
}

export interface OpenChatInput {
  buyerId: number;
  sellerId: number;
  /** Мол, ки дар бораи он сӯҳбат меравад (ихтиёрӣ) */
  productId?: string | number | null;
  productName?: string;
  productType?: string;
  productImg?: string;
}

/**
 * Сӯҳбатро мекушояд: агар аллакай бошад — ҳамонро бармегардонад, вагарна
 * сози нав мекунад. Фронтенд метавонад ҳар дафъа "кушодан"-ро даъват кунад
 * ва такрор пайдо намешавад (индекси UNIQUE дар schema.sql).
 */
export async function openChat(input: OpenChatInput): Promise<{ chat: Chat; created: boolean }> {
  if (input.buyerId === input.sellerId) {
    throw new AppError('Бо худ сӯҳбат кардан мумкин нест', 400);
  }

  const [userA, userB] = orderPair(input.buyerId, input.sellerId);
  const productId = input.productId == null ? '' : String(input.productId);

  const data: Record<string, unknown> = {};
  if (productId) data.productId = productId;
  if (input.productName) data.productName = input.productName;
  if (input.productType) data.productType = input.productType;
  if (input.productImg) data.productImg = input.productImg;

  const existing = await queryOne<ChatRow>(
    `SELECT * FROM chats
     WHERE user_a = $1 AND user_b = $2 AND COALESCE(data->>'productId', '') = $3`,
    [userA, userB, productId]
  );
  if (existing) return { chat: toChat(existing), created: false };

  const row = await queryOne<ChatRow>(
    `INSERT INTO chats (user_a, user_b, data) VALUES ($1, $2, $3::jsonb) RETURNING *`,
    [userA, userB, JSON.stringify(data)]
  );
  return { chat: toChat(row!), created: true };
}

export interface ChatListItem extends Chat {
  /** Ҳамсӯҳбат — ҳамон корбари дуюм */
  peerId: number;
  lastMessage: Message | null;
  unreadCount: number;
}

/**
 * Ҳамаи сӯҳбатҳои корбар, навтаринаш дар боло.
 *
 * Паёми охирин ва шумораи нахондаҳо дар ҳамин як запрос ҳисоб мешаванд —
 * вагарна барои ҳар сӯҳбат як запроси иловагӣ лозим мешуд (N+1).
 */
export async function listChats(userId: number): Promise<ChatListItem[]> {
  const rows = await query<ChatRow & { last: MessageRow | null; unread: string }>(
    `SELECT c.*,
            to_jsonb(m.*) AS last,
            COALESCE(u.cnt, 0) AS unread
     FROM chats c
     LEFT JOIN LATERAL (
       SELECT * FROM messages WHERE chat_id = c.id ORDER BY id DESC LIMIT 1
     ) m ON true
     LEFT JOIN LATERAL (
       SELECT COUNT(*) AS cnt FROM messages
       WHERE chat_id = c.id AND sender_id <> $1 AND read_at IS NULL
     ) u ON true
     WHERE c.user_a = $1 OR c.user_b = $1
     ORDER BY COALESCE(m.created_at, c.created_at) DESC`,
    [userId]
  );

  return rows.map((row) => {
    const chat = toChat(row);
    return {
      ...chat,
      peerId: chat.participants[0] === userId ? chat.participants[1] : chat.participants[0],
      lastMessage: row.last ? toMessage(row.last) : null,
      unreadCount: Number(row.unread),
    };
  });
}

/** Сӯҳбатро мегирад ва тафтиш мекунад, ки корбар иштирокчии он аст. */
export async function getChatFor(chatId: number, userId: number): Promise<Chat> {
  const row = await queryOne<ChatRow>(`SELECT * FROM chats WHERE id = $1`, [chatId]);
  if (!row) throw new AppError('Сӯҳбат ёфт нашуд', 404);

  if (row.user_a !== userId && row.user_b !== userId) {
    throw new AppError('Шумо иштирокчии ин сӯҳбат нестед', 403);
  }
  return toChat(row);
}

export function peerOf(chat: Chat, userId: number): number {
  return chat.participants[0] === userId ? chat.participants[1] : chat.participants[0];
}

export interface HistoryOptions {
  limit?: number;
  /** Танҳо паёмҳои кӯҳнатар аз ин id — барои "боз бор кардан" ҳангоми скролл */
  before?: number;
}

/** Таърихи сӯҳбат бо тартиби кӯҳна → нав (тавре ки дар экран нишон дода мешавад). */
export async function listMessages(chatId: number, options: HistoryOptions = {}): Promise<Message[]> {
  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 200);

  const params: unknown[] = [chatId];
  let beforeSql = '';
  if (options.before !== undefined && Number.isInteger(Number(options.before))) {
    params.push(Number(options.before));
    beforeSql = `AND id < $${params.length}`;
  }
  params.push(limit);

  // Аввал навтаринҳоро мегирем (LIMIT), баъд тартибро баръакс мекунем —
  // вагарна LIMIT паёмҳои аввалини таърихро мегирифт, на охиринҳоро.
  const rows = await query<MessageRow>(
    `SELECT * FROM (
       SELECT * FROM messages
       WHERE chat_id = $1 ${beforeSql}
       ORDER BY id DESC
       LIMIT $${params.length}
     ) t ORDER BY id ASC`,
    params
  );
  return rows.map(toMessage);
}

export interface SendInput {
  chatId: number;
  senderId: number;
  kind?: MessageKind;
  /** kind = 'text' */
  text?: string;
  /** kind = 'voice' — data-URL base64 */
  audio?: string;
  /** kind = 'voice' — давомнокӣ бо сония */
  duration?: number;
  mimeType?: string;
  /** kind = 'call' */
  callId?: string;
  status?: string;
}

function buildMessageData(input: SendInput, kind: MessageKind): Record<string, unknown> {
  if (kind === 'text') {
    const text = String(input.text ?? '').trim();
    if (!text) throw new AppError('Матни паём холӣ аст', 400);
    if (text.length > 5000) throw new AppError('Матн аз ҳад дароз аст (то 5000 ҳарф)', 400);
    return { text };
  }

  if (kind === 'voice') {
    const audio = String(input.audio ?? '');
    if (!audio) throw new AppError('Паёми овозӣ бе `audio` фиристода намешавад', 400);
    if (!audio.startsWith('data:')) {
      throw new AppError('`audio` бояд data-URL бошад (data:audio/webm;base64,...)', 400);
    }
    return {
      audio,
      duration: Number(input.duration) || 0,
      mimeType: input.mimeType ?? 'audio/webm',
    };
  }

  // kind === 'call' — сабти занг дар таърихи сӯҳбат
  return {
    callId: input.callId ?? null,
    status: input.status ?? 'ended',
    duration: Number(input.duration) || 0,
  };
}

/** Паёмро сабт мекунад ва вақти сӯҳбатро нав мекунад (барои тартиби рӯйхат). */
export async function sendMessage(input: SendInput): Promise<Message> {
  const kind: MessageKind = input.kind ?? 'text';
  if (!['text', 'voice', 'call'].includes(kind)) {
    throw new AppError('`kind` бояд text, voice ё call бошад', 400);
  }

  const data = buildMessageData(input, kind);

  const row = await queryOne<MessageRow>(
    `INSERT INTO messages (chat_id, sender_id, kind, data)
     VALUES ($1, $2, $3, $4::jsonb) RETURNING *`,
    [input.chatId, input.senderId, kind, JSON.stringify(data)]
  );

  await query(`UPDATE chats SET updated_at = now() WHERE id = $1`, [input.chatId]);

  return toMessage(row!);
}

/**
 * Паёмҳои ҳамсӯҳбатро хондашуда қайд мекунад.
 * @returns ID-и паёмҳое, ки ҳоло хондашуда шуданд
 */
export async function markRead(chatId: number, readerId: number): Promise<number[]> {
  const rows = await query<{ id: number }>(
    `UPDATE messages SET read_at = now()
     WHERE chat_id = $1 AND sender_id <> $2 AND read_at IS NULL
     RETURNING id`,
    [chatId, readerId]
  );
  return rows.map((r) => r.id);
}

/** Шумораи ҳамаи паёмҳои нахондаи корбар — барои нишони сурх дар навбар. */
export async function totalUnread(userId: number): Promise<number> {
  const row = await queryOne<{ c: string }>(
    `SELECT COUNT(*) AS c
     FROM messages m
     JOIN chats c ON c.id = m.chat_id
     WHERE m.sender_id <> $1
       AND m.read_at IS NULL
       AND ($1 IN (c.user_a, c.user_b))`,
    [userId]
  );
  return Number(row?.c ?? 0);
}
