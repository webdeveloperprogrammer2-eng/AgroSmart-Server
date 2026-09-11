import { query, queryOne } from '../../config/db';
import { AppError } from '../../core/AppError';

/**
 * Амалиёти маъмурӣ: идораи корбарон, бан, нест кардан, хондани сӯҳбатҳо.
 *
 * ҲАР амал дар ин ҷо аввал тафтиш мекунад, ки даъваткунанда воқеан
 * admin/superadmin аст — нақш аз БАЗА хонда мешавад, на аз ҷисми дархост.
 * Вагарна ҳар кас метавонист `{"role":"superadmin"}` фиристад ва ҳама чизро
 * идора кунад.
 */

interface UserRow {
  id: number;
  data: Record<string, unknown>;
}

export type Role = 'user' | 'admin' | 'superadmin';

function normalizeRole(role: unknown): string {
  return String(role ?? '').trim().toLowerCase();
}

function publicUser(row: UserRow): Record<string, unknown> {
  const { password: _p, ...rest } = row.data;
  return { ...rest, id: row.id };
}

export function requireId(value: unknown, field: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(`\`${field}\` бояд ID-и дуруст бошад`, 400);
  }
  return id;
}

async function getUser(userId: number): Promise<UserRow> {
  const row = await queryOne<UserRow>(`SELECT id, data FROM users WHERE id = $1`, [userId]);
  if (!row) throw new AppError('Корбар ёфт нашуд', 404);
  return row;
}

/** Даъваткунанда бояд admin ё superadmin бошад. */
export async function requireAdmin(adminId: number): Promise<UserRow> {
  const row = await getUser(adminId);
  const role = normalizeRole(row.data.role);

  if (role !== 'admin' && role !== 'superadmin') {
    throw new AppError('Шумо ҳуқуқи маъмурӣ надоред', 403);
  }
  if (row.data.banned === true) {
    throw new AppError('Ҳисоби шумо баста аст', 403);
  }
  return row;
}

/** Баъзе амалҳо танҳо аз они SuperAdmin-анд (иваз кардани нақш). */
export async function requireSuperAdmin(adminId: number): Promise<UserRow> {
  const row = await requireAdmin(adminId);
  if (normalizeRole(row.data.role) !== 'superadmin') {
    throw new AppError('Ин амал танҳо барои SuperAdmin аст', 403);
  }
  return row;
}

// ── Корбарон ────────────────────────────────────────────────────────────

/**
 * Рӯйхати ҳамаи корбарон бо ҳисоби молу сӯҳбатҳояшон.
 *
 * Ҳисобҳо дар ҳамон як запрос гирифта мешаванд — вагарна барои ҳар корбар
 * чор запроси иловагӣ лозим мешуд.
 */
export async function listUsers(search?: string): Promise<Record<string, unknown>[]> {
  const params: unknown[] = [];
  let where = '';

  if (search) {
    params.push(`%${search}%`);
    where = `WHERE COALESCE(u.data->>'userName','') ILIKE $1
             OR COALESCE(u.data->>'userPhone','') ILIKE $1`;
  }

  const rows = await query<UserRow & Record<string, string>>(
    `SELECT u.id, u.data,
            (SELECT COUNT(*) FROM mahsulot     m WHERE m.data->>'userId' = u.id::text) AS c_mahsulot,
            (SELECT COUNT(*) FROM zamin        z WHERE z.data->>'userId' = u.id::text) AS c_zamin,
            (SELECT COUNT(*) FROM zamin_apteka a WHERE a.data->>'userId' = u.id::text) AS c_apteka,
            (SELECT COUNT(*) FROM jobs         j WHERE j.data->>'userId' = u.id::text) AS c_jobs,
            (SELECT COUNT(*) FROM chats        c WHERE c.user_a = u.id OR c.user_b = u.id) AS c_chats
     FROM users u ${where} ORDER BY u.id`,
    params
  );

  return rows.map((row) => ({
    ...publicUser(row),
    role: normalizeRole(row.data.role) || 'user',
    banned: row.data.banned === true,
    counts: {
      mahsulot: Number(row.c_mahsulot),
      zamin: Number(row.c_zamin),
      ZaminApteka: Number(row.c_apteka),
      jobs: Number(row.c_jobs),
      chats: Number(row.c_chats),
    },
  }));
}

export async function getUserDetail(userId: number): Promise<Record<string, unknown>> {
  const row = await getUser(userId);
  return { ...publicUser(row), banned: row.data.banned === true };
}

/**
 * Бан / кушодани бан.
 *
 * Корбари басташуда дар `/chats` паём фиристода наметавонад ва ҳангоми
 * вуруд ба админка рад мешавад.
 */
export async function setBanned(
  adminId: number,
  targetId: number,
  banned: boolean,
  reason?: string
): Promise<Record<string, unknown>> {
  const admin = await requireAdmin(adminId);
  const target = await getUser(targetId);

  if (adminId === targetId) {
    throw new AppError('Худро бастан мумкин нест', 400);
  }

  // Admin-и оддӣ ба admin/superadmin даст расонда наметавонад
  const targetRole = normalizeRole(target.data.role);
  if (normalizeRole(admin.data.role) !== 'superadmin' && targetRole !== 'user') {
    throw new AppError('Танҳо SuperAdmin метавонад ба маъмур даст расонад', 403);
  }

  const patch: Record<string, unknown> = { banned };
  if (banned) {
    patch.bannedAt = new Date().toISOString();
    patch.banReason = String(reason ?? '').trim() || null;
    patch.bannedBy = adminId;
  } else {
    patch.bannedAt = null;
    patch.banReason = null;
    patch.bannedBy = null;
  }

  const row = await queryOne<UserRow>(
    `UPDATE users SET data = data || $2::jsonb WHERE id = $1 RETURNING id, data`,
    [targetId, JSON.stringify(patch)]
  );
  return { ...publicUser(row!), banned };
}

/** Иваз кардани нақш — танҳо SuperAdmin. */
export async function setRole(
  adminId: number,
  targetId: number,
  role: string
): Promise<Record<string, unknown>> {
  await requireSuperAdmin(adminId);

  const next = normalizeRole(role);
  if (!['user', 'admin', 'superadmin'].includes(next)) {
    throw new AppError('`role` бояд user | admin | superadmin бошад', 400);
  }
  if (adminId === targetId) {
    throw new AppError('Нақши худро иваз кардан мумкин нест', 400);
  }
  await getUser(targetId);

  const row = await queryOne<UserRow>(
    `UPDATE users SET data = data || $2::jsonb WHERE id = $1 RETURNING id, data`,
    [targetId, JSON.stringify({ role: next })]
  );
  return publicUser(row!);
}

export interface DeleteReport {
  mahsulot: number; zamin: number; ZaminApteka: number;
  jobs: number; notifications: number; chats: number; favorites: number;
}

/** Корбар ва ҳамаи чизҳояшро нест мекунад (мисли `/settings/account`). */
export async function deleteUser(adminId: number, targetId: number): Promise<DeleteReport> {
  const admin = await requireAdmin(adminId);
  const target = await getUser(targetId);

  if (adminId === targetId) throw new AppError('Худро нест кардан мумкин нест', 400);

  const targetRole = normalizeRole(target.data.role);
  if (normalizeRole(admin.data.role) !== 'superadmin' && targetRole !== 'user') {
    throw new AppError('Танҳо SuperAdmin метавонад маъмурро нест кунад', 403);
  }

  const id = String(targetId);
  const report: DeleteReport = {
    mahsulot: 0, zamin: 0, ZaminApteka: 0, jobs: 0,
    notifications: 0, chats: 0, favorites: 0,
  };

  for (const [key, table] of [
    ['mahsulot', 'mahsulot'], ['zamin', 'zamin'],
    ['ZaminApteka', 'zamin_apteka'], ['jobs', 'jobs'],
  ] as const) {
    const rows = await query<{ id: number }>(
      `DELETE FROM "${table}" WHERE data->>'userId' = $1 RETURNING id`, [id]
    );
    report[key] = rows.length;
  }

  report.notifications = (await query<{ id: number }>(
    `DELETE FROM notifications WHERE data->>'userId' = $1 OR data->>'buyerId' = $1 RETURNING id`, [id]
  )).length;

  report.chats = (await query<{ id: number }>(
    `DELETE FROM chats WHERE user_a = $1 OR user_b = $1 RETURNING id`, [targetId]
  )).length;

  report.favorites = (await query<{ id: number }>(
    `DELETE FROM favorites WHERE user_id = $1 RETURNING id`, [targetId]
  )).length;

  await query(`DELETE FROM users WHERE id = $1`, [targetId]);
  return report;
}

// ── Сӯҳбатҳо ────────────────────────────────────────────────────────────

/** Ҳамаи сӯҳбатҳои сомона бо номи ҳар ду тараф ва паёми охирин. */
export async function listAllChats(limit = 100): Promise<Record<string, unknown>[]> {
  const rows = await query<{
    id: number; user_a: number; user_b: number;
    data: Record<string, unknown>; created_at: string;
    name_a: string | null; name_b: string | null;
    total: string; last_at: string | null;
  }>(
    `SELECT c.id, c.user_a, c.user_b, c.data, c.created_at,
            ua.data->>'userName' AS name_a,
            ub.data->>'userName' AS name_b,
            (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id) AS total,
            (SELECT MAX(created_at) FROM messages m WHERE m.chat_id = c.id) AS last_at
     FROM chats c
     LEFT JOIN users ua ON ua.id = c.user_a
     LEFT JOIN users ub ON ub.id = c.user_b
     ORDER BY COALESCE((SELECT MAX(created_at) FROM messages m WHERE m.chat_id = c.id),
                       c.created_at) DESC
     LIMIT $1`,
    [Math.min(Math.max(limit, 1), 500)]
  );

  return rows.map((row) => ({
    id: row.id,
    participants: [
      { id: row.user_a, userName: row.name_a },
      { id: row.user_b, userName: row.name_b },
    ],
    productName: row.data.productName ?? null,
    messagesCount: Number(row.total),
    lastMessageAt: row.last_at,
    createdAt: row.created_at,
  }));
}

/**
 * Хондани ҳар сӯҳбат — бе маҳдудияти иштирок.
 *
 * Дар `/chats/:id/messages` корбари бегона 403 мегирад; ин ҷо маъмур
 * ҳамаро мебинад. Аз ҳамин сабаб роҳи алоҳида сохта шуд, на "истисно"
 * дар мантиқи чат — то тасодуфан ба корбари оддӣ дастрасӣ надиҳем.
 */
export async function readChat(chatId: number, limit = 200): Promise<Record<string, unknown>[]> {
  const rows = await query<{
    id: number; chat_id: number; sender_id: number; kind: string;
    data: Record<string, unknown>; read_at: string | null; created_at: string;
    sender_name: string | null;
  }>(
    `SELECT m.*, u.data->>'userName' AS sender_name
     FROM messages m
     LEFT JOIN users u ON u.id = m.sender_id
     WHERE m.chat_id = $1
     ORDER BY m.id ASC
     LIMIT $2`,
    [chatId, Math.min(Math.max(limit, 1), 1000)]
  );

  return rows.map((row) => ({
    ...row.data,
    id: row.id,
    chatId: row.chat_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    kind: row.kind,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

export async function deleteChat(chatId: number): Promise<void> {
  const row = await queryOne<{ id: number }>(
    `DELETE FROM chats WHERE id = $1 RETURNING id`, [chatId]
  );
  if (!row) throw new AppError('Сӯҳбат ёфт нашуд', 404);
}

// ── Оморҳо ──────────────────────────────────────────────────────────────

/** Рақамҳо барои саҳифаи асосии админка. */
export async function stats(): Promise<Record<string, unknown>> {
  const one = async (sql: string) =>
    Number((await queryOne<{ c: string }>(sql))?.c ?? 0);

  return {
    users: await one(`SELECT COUNT(*) AS c FROM users`),
    admins: await one(
      `SELECT COUNT(*) AS c FROM users WHERE LOWER(data->>'role') IN ('admin','superadmin')`
    ),
    banned: await one(`SELECT COUNT(*) AS c FROM users WHERE data->>'banned' = 'true'`),
    mahsulot: await one(`SELECT COUNT(*) AS c FROM mahsulot`),
    zamin: await one(`SELECT COUNT(*) AS c FROM zamin`),
    ZaminApteka: await one(`SELECT COUNT(*) AS c FROM zamin_apteka`),
    jobs: await one(`SELECT COUNT(*) AS c FROM jobs`),
    chats: await one(`SELECT COUNT(*) AS c FROM chats`),
    messages: await one(`SELECT COUNT(*) AS c FROM messages`),
    notifications: await one(`SELECT COUNT(*) AS c FROM notifications`),
  };
}

/** Оё корбар баста аст — дар чат истифода мешавад. */
export async function isBanned(userId: number): Promise<boolean> {
  const row = await queryOne<{ banned: string | null }>(
    `SELECT data->>'banned' AS banned FROM users WHERE id = $1`, [userId]
  );
  return row?.banned === 'true';
}

// ── Хабарномаҳои маъмур ─────────────────────────────────────────────────

export interface AdminNotification {
  id: string;
  type: 'new_user' | 'new_listing' | 'new_order' | 'new_chat';
  title: string;
  userId: number | null;
  userName: string | null;
  createdAt: string;
  meta: Record<string, unknown>;
}

/**
 * Лентаи рӯйдодҳои сомона барои маъмур.
 *
 * Ҷадвали алоҳида сохта нашуд — ҳама чиз аз маълумоти мавҷуда ҷамъ мешавад
 * (корбари нав, моли нав, фармоиш, сӯҳбати нав). Бартарии ин: рӯйдодҳои
 * гузашта низ фавран дида мешаванд, на танҳо онҳое ки баъди илова шудани
 * ин функсия рӯй додаанд.
 *
 * `id` аз навъ + id-и сабт сохта мешавад, то дар рӯйхат такрор нашавад.
 */
export async function notifications(
  limit = 50,
  since?: string
): Promise<{ count: number; items: AdminNotification[] }> {
  const cap = Math.min(Math.max(limit, 1), 200);
  const sinceSql = since ? `AND created_at > $2` : '';
  const params = (extra: unknown[] = []) => (since ? [cap, since, ...extra] : [cap, ...extra]);

  const items: AdminNotification[] = [];

  // Корбарони нав
  const users = await query<{ id: number; data: Record<string, unknown>; created_at: string }>(
    `SELECT id, data, created_at FROM users
     WHERE true ${sinceSql} ORDER BY id DESC LIMIT $1`,
    params()
  );
  for (const u of users) {
    items.push({
      id: `new_user:${u.id}`,
      type: 'new_user',
      title: `Корбари нав: ${u.data.userName ?? '—'}`,
      userId: u.id,
      userName: (u.data.userName as string) ?? null,
      createdAt: u.created_at,
      meta: { userPhone: u.data.userPhone ?? null, city: u.data.city ?? null,
              role: normalizeRole(u.data.role) || 'user' },
    });
  }

  // Молҳои нав дар ҳар се бозор
  for (const [type, table] of [
    ['mahsulot', 'mahsulot'], ['zamin', 'zamin'], ['ZaminApteka', 'zamin_apteka'],
  ] as const) {
    const rows = await query<{ id: number; data: Record<string, unknown>; created_at: string }>(
      `SELECT id, data, created_at FROM "${table}"
       WHERE true ${sinceSql} ORDER BY id DESC LIMIT $1`,
      params()
    );
    for (const row of rows) {
      items.push({
        id: `new_listing:${type}:${row.id}`,
        type: 'new_listing',
        title: `Моли нав (${type}): ${row.data.name ?? '—'}`,
        userId: row.data.userId ? Number(row.data.userId) : null,
        userName: (row.data.farmerName as string) ?? null,
        createdAt: row.created_at,
        meta: { market: type, itemId: row.id, price: row.data.price ?? null,
                city: row.data.city ?? null },
      });
    }
  }

  // Фармоишҳо (ҳамон хабарномаҳое, ки ба фурӯшанда мераванд)
  const orders = await query<{ id: number; data: Record<string, unknown>; created_at: string }>(
    `SELECT id, data, created_at FROM notifications
     WHERE true ${sinceSql} ORDER BY id DESC LIMIT $1`,
    params()
  );
  for (const o of orders) {
    items.push({
      id: `new_order:${o.id}`,
      type: 'new_order',
      title: `Фармоиш: ${o.data.buyerName ?? '—'} → ${o.data.total ?? 0} сомонӣ`,
      userId: o.data.buyerId ? Number(o.data.buyerId) : null,
      userName: (o.data.buyerName as string) ?? null,
      createdAt: o.created_at,
      meta: { sellerId: o.data.userId ?? null, total: o.data.total ?? 0,
              itemsCount: Array.isArray(o.data.items) ? o.data.items.length : 0 },
    });
  }

  // Сӯҳбатҳои нав
  const chats = await query<{ id: number; user_a: number; user_b: number; created_at: string }>(
    `SELECT id, user_a, user_b, created_at FROM chats
     WHERE true ${sinceSql} ORDER BY id DESC LIMIT $1`,
    params()
  );
  for (const c of chats) {
    items.push({
      id: `new_chat:${c.id}`,
      type: 'new_chat',
      title: `Сӯҳбати нав: #${c.user_a} ↔ #${c.user_b}`,
      userId: c.user_a,
      userName: null,
      createdAt: c.created_at,
      meta: { chatId: c.id, participants: [c.user_a, c.user_b] },
    });
  }

  // Навтарин дар боло, баъд то `limit` бурида мешавад
  items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const sliced = items.slice(0, cap);

  return { count: sliced.length, items: sliced };
}
