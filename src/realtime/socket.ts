import { Server } from 'http';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import * as chatService from '../modules/chat/chat.service';
import * as hub from './hub';

/**
 * WebSocket барои чати воқеӣ (real-time).
 *
 * Пайвастшавӣ: ws://localhost:8000/ws?userId=3
 *
 * ⚠️ userId аз query гирифта мешавад ва тафтиш намешавад, чунки дар лоиҳа
 * ҳанӯз авторизатсия нест (парол дар браузер муқоиса мешавад — README).
 * Яъне ҳар кас метавонад худро корбари дигар нишон диҳад. Ҳангоми
 * илова кардани JWT ҳамин ҷо бояд токен тафтиш шавад.
 *
 * ── Аз клиент ба сервер ──────────────────────────────────────────────
 *   { type: 'chat:send',   chatId, kind, text | audio, duration }
 *   { type: 'chat:typing', chatId, typing }
 *   { type: 'chat:read',   chatId }
 *   { type: 'call:offer',  chatId, callId, sdp }
 *   { type: 'call:answer', chatId, callId, sdp }
 *   { type: 'call:ice',    chatId, callId, candidate }
 *   { type: 'call:end',    chatId, callId, reason, duration }
 *   { type: 'ping' }
 *
 * ── Аз сервер ба клиент ──────────────────────────────────────────────
 *   { type: 'ready', userId, online }
 *   { type: 'chat:message', chatId, message }
 *   { type: 'chat:typing',  chatId, userId, typing }
 *   { type: 'chat:read',    chatId, userId, messageIds }
 *   { type: 'call:incoming' | 'call:answer' | 'call:ice' | 'call:end', ... }
 *   { type: 'presence', userId, online }
 *   { type: 'error', error }
 */

interface ClientMessage {
  type?: string;
  chatId?: number;
  callId?: string;
  [key: string]: unknown;
}

/** Ҳар сокет ID-и корбари худро нигоҳ медорад. */
const socketUser = new WeakMap<WebSocket, number>();
/** Барои ping/pong — сокети "мурда" пӯшида мешавад. */
const alive = new WeakMap<WebSocket, boolean>();

function fail(socket: WebSocket, error: string): void {
  socket.send(JSON.stringify({ type: 'error', error }));
}

/** Сӯҳбатро мегирад ва ҳамсӯҳбатро бармегардонад. */
async function resolvePeer(chatId: unknown, userId: number) {
  const id = Number(chatId);
  if (!Number.isInteger(id)) throw new Error('`chatId` нодуруст аст');

  const chat = await chatService.getChatFor(id, userId);
  return { chat, peerId: chatService.peerOf(chat, userId) };
}

async function handleMessage(socket: WebSocket, userId: number, raw: RawData): Promise<void> {
  let payload: ClientMessage;
  try {
    payload = JSON.parse(String(raw));
  } catch {
    fail(socket, 'JSON-и нодуруст');
    return;
  }

  const type = String(payload.type ?? '');

  if (type === 'ping') {
    socket.send(JSON.stringify({ type: 'pong' }));
    return;
  }

  // Паёми нав: сабт мешавад ва фавран ба ҳар ду тараф мерасад
  if (type === 'chat:send') {
    const { peerId } = await resolvePeer(payload.chatId, userId);

    const message = await chatService.sendMessage({
      chatId: Number(payload.chatId),
      senderId: userId,
      kind: payload.kind as chatService.MessageKind,
      text: payload.text as string,
      audio: payload.audio as string,
      duration: payload.duration as number,
      mimeType: payload.mimeType as string,
    });

    const event = { type: 'chat:message', chatId: message.chatId, message };
    // Ба фиристанда низ мефиристем — то ҳамаи табҳои ӯ паёмро бинанд
    hub.sendToUser(userId, event);
    hub.sendToUser(peerId, event);
    return;
  }

  // "Менависад..." — дар база сабт намешавад, танҳо ба ҳамсӯҳбат мерасад
  if (type === 'chat:typing') {
    const { peerId } = await resolvePeer(payload.chatId, userId);
    hub.sendToUser(peerId, {
      type: 'chat:typing',
      chatId: Number(payload.chatId),
      userId,
      typing: payload.typing !== false,
    });
    return;
  }

  if (type === 'chat:read') {
    const { peerId } = await resolvePeer(payload.chatId, userId);
    const messageIds = await chatService.markRead(Number(payload.chatId), userId);
    if (messageIds.length === 0) return;

    hub.sendToUser(peerId, {
      type: 'chat:read',
      chatId: Number(payload.chatId),
      userId,
      messageIds,
    });
    return;
  }

  // ── Занги аудио: сервер танҳо сигналҳои WebRTC-ро мебарад ───────────
  // Худи овоз аз браузер ба браузер мустақим меравад (peer-to-peer),
  // аз сервер намегузарад — вагарна трафик ва таъхир зиёд мешуд.
  if (type === 'call:offer') {
    const { peerId } = await resolvePeer(payload.chatId, userId);

    if (!hub.isOnline(peerId)) {
      // Ҳамсӯҳбат офлайн аст — занг ба таърих ҳамчун "нарасид" сабт мешавад
      const message = await chatService.sendMessage({
        chatId: Number(payload.chatId),
        senderId: userId,
        kind: 'call',
        callId: payload.callId as string,
        status: 'missed',
      });
      hub.sendToUser(userId, {
        type: 'call:end',
        chatId: Number(payload.chatId),
        callId: payload.callId,
        reason: 'offline',
      });
      hub.sendToUser(userId, { type: 'chat:message', chatId: message.chatId, message });
      return;
    }

    hub.sendToUser(peerId, {
      type: 'call:incoming',
      chatId: Number(payload.chatId),
      callId: payload.callId,
      from: userId,
      sdp: payload.sdp,
    });
    return;
  }

  if (type === 'call:answer' || type === 'call:ice') {
    const { peerId } = await resolvePeer(payload.chatId, userId);
    hub.sendToUser(peerId, {
      type,
      chatId: Number(payload.chatId),
      callId: payload.callId,
      from: userId,
      sdp: payload.sdp,
      candidate: payload.candidate,
    });
    return;
  }

  if (type === 'call:end') {
    const { peerId } = await resolvePeer(payload.chatId, userId);
    const reason = String(payload.reason ?? 'ended');

    // Занг дар таърих сабт мешавад — то дар чат сатри "Занг, 1:20" монад
    const message = await chatService.sendMessage({
      chatId: Number(payload.chatId),
      senderId: userId,
      kind: 'call',
      callId: payload.callId as string,
      status: reason,
      duration: payload.duration as number,
    });

    const endEvent = {
      type: 'call:end',
      chatId: Number(payload.chatId),
      callId: payload.callId,
      from: userId,
      reason,
    };
    hub.sendToUser(peerId, endEvent);

    const msgEvent = { type: 'chat:message', chatId: message.chatId, message };
    hub.sendToUser(userId, msgEvent);
    hub.sendToUser(peerId, msgEvent);
    return;
  }

  fail(socket, `Навъи номаълуми паём: ${type}`);
}

export function attachWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({
    server,
    path: '/ws',
    // Паёми овозӣ ҳамчун base64 меояд — маҳдудияти пешфарз кам аст
    maxPayload: 20 * 1024 * 1024,
  });

  wss.on('connection', (socket, req) => {
    const url = new URL(req.url ?? '/ws', 'http://localhost');
    const userId = Number(url.searchParams.get('userId'));

    if (!Number.isInteger(userId) || userId <= 0) {
      socket.send(JSON.stringify({ type: 'error', error: '`userId` дар суроға лозим аст' }));
      socket.close(1008, 'userId required');
      return;
    }

    socketUser.set(socket, userId);
    alive.set(socket, true);

    const wasOffline = !hub.isOnline(userId);
    hub.addConnection(userId, socket);

    socket.send(JSON.stringify({ type: 'ready', userId, online: hub.onlineUsers() }));

    // Дигаронро огоҳ мекунем, ки ин корбар онлайн шуд
    if (wasOffline) {
      for (const other of hub.onlineUsers()) {
        if (other !== userId) hub.sendToUser(other, { type: 'presence', userId, online: true });
      }
    }

    socket.on('pong', () => alive.set(socket, true));

    socket.on('message', (raw) => {
      handleMessage(socket, userId, raw).catch((err) => {
        // Хатои як паём набояд тамоми пайвастшавиро вайрон кунад
        fail(socket, err instanceof Error ? err.message : 'Хатогии сервер');
      });
    });

    socket.on('close', () => {
      const wentOffline = hub.removeConnection(userId, socket);
      if (!wentOffline) return;

      for (const other of hub.onlineUsers()) {
        hub.sendToUser(other, { type: 'presence', userId, online: false });
      }
    });

    socket.on('error', () => socket.close());
  });

  // Пайвастшавиҳои "мурда" (интернет қатъ шуд) худашон хабар намедиҳанд —
  // бо ping ҳар 30 сония тафтиш мешаванд, вагарна корбар абадан "онлайн" мемонад.
  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (alive.get(socket) === false) {
        socket.terminate();
        continue;
      }
      alive.set(socket, false);
      socket.ping();
    }
  }, 30_000);

  wss.on('close', () => clearInterval(heartbeat));

  return wss;
}
