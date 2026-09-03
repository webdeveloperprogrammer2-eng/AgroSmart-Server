import { WebSocket } from 'ws';

/**
 * Реестри пайвастшавиҳои зинда.
 *
 * Як корбар метавонад якчанд пайвастшавӣ дошта бошад (ду таб дар браузер,
 * телефон + компютер), бинобар ин барои ҳар userId маҷмӯи сокетҳо нигоҳ
 * дошта мешавад, на як сокет. Паём ба ҲАМАИ дастгоҳҳои ӯ меравад.
 */

type Payload = Record<string, unknown>;

const connections = new Map<number, Set<WebSocket>>();

export function addConnection(userId: number, socket: WebSocket): void {
  let set = connections.get(userId);
  if (!set) {
    set = new Set();
    connections.set(userId, set);
  }
  set.add(socket);
}

/** @returns оё ин охирин пайвастшавии ҳамин корбар буд (яъне ӯ офлайн шуд) */
export function removeConnection(userId: number, socket: WebSocket): boolean {
  const set = connections.get(userId);
  if (!set) return false;

  set.delete(socket);
  if (set.size > 0) return false;

  connections.delete(userId);
  return true;
}

export function isOnline(userId: number): boolean {
  return connections.has(userId);
}

export function onlineUsers(): number[] {
  return [...connections.keys()];
}

/**
 * Паёмро ба ҳамаи дастгоҳҳои як корбар мефиристад.
 *
 * @param exclude сокете, ки паёмро фиристод — ба худи ӯ баргардонида намешавад
 * @returns шумораи сокетҳое, ки паём расид
 */
export function sendToUser(userId: number, payload: Payload, exclude?: WebSocket): number {
  const set = connections.get(userId);
  if (!set) return 0;

  const raw = JSON.stringify(payload);
  let sent = 0;

  for (const socket of set) {
    if (socket === exclude) continue;
    if (socket.readyState !== WebSocket.OPEN) continue;
    socket.send(raw);
    sent += 1;
  }

  return sent;
}

/** Паём ба якчанд корбар (одатан ду иштирокчии сӯҳбат). */
export function sendToUsers(userIds: number[], payload: Payload, exclude?: WebSocket): number {
  let sent = 0;
  for (const userId of userIds) {
    sent += sendToUser(userId, payload, exclude);
  }
  return sent;
}

/** Танҳо барои санҷиш ва хомӯш кардани сервер. */
export function clearConnections(): void {
  connections.clear();
}
