import { query, queryOne } from '../../config/db';
import { AppError } from '../../core/AppError';

/**
 * Танзимоти корбар: маълумоти шахсӣ, рақами телефон, парол, афзалиятҳо
 * (забон / мавзӯъ) ва нест кардани ҳисоб.
 *
 * Корбарон дар ҳамон ҷадвали `users` мемонанд, ки json-server-и фронтенд
 * истифода мебарад — бинобар ин ҳама чиз дар `data` (JSONB) нигоҳ дошта
 * мешавад ва `GET /users` мисли пештара кор мекунад.
 */

interface UserRow {
  id: number;
  data: Record<string, unknown>;
}

/** Забонҳо ва мавзӯъҳое, ки фронтенд дастгирӣ мекунад. */
const LANGUAGES = ['tj', 'ru', 'en'];
const THEMES = ['light', 'dark'];

/** Танҳо ҳамин майдонҳо тавассути танзимот иваз мешаванд. */
const PROFILE_FIELDS = ['userName', 'city', 'age', 'avatar'] as const;

export interface PublicUser {
  id: number;
  [key: string]: unknown;
}

/**
 * Корбар бе парол — барои саҳифаи танзимот.
 *
 * Дар `GET /users` парол ҳанӯз бармегардад (фронтенд онро дар браузер
 * муқоиса мекунад — README), вале дар ин ҷо сабаб надорад онро фиристодан.
 */
function toPublic(row: UserRow): PublicUser {
  const { password: _password, ...rest } = row.data;
  return { ...rest, id: row.id };
}

export function requireUserId(value: unknown, field = 'userId'): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(`\`${field}\` бояд ID-и дурусти корбар бошад`, 400);
  }
  return id;
}

async function getRow(userId: number): Promise<UserRow> {
  const row = await queryOne<UserRow>(`SELECT id, data FROM users WHERE id = $1`, [userId]);
  if (!row) throw new AppError('Корбар ёфт нашуд', 404);
  return row;
}

/** Паролро тафтиш мекунад — барои амалҳои муҳим (иваз кардани рақам, нест кардан). */
function verifyPassword(row: UserRow, password: unknown): void {
  if (String(row.data.password ?? '') !== String(password ?? '')) {
    throw new AppError('Парол нодуруст аст', 401);
  }
}

/** Майдонҳои дохили `data`-ро иваз мекунад ва корбари навшударо бармегардонад. */
async function patchData(userId: number, patch: Record<string, unknown>): Promise<PublicUser> {
  const row = await queryOne<UserRow>(
    `UPDATE users SET data = data || $2::jsonb WHERE id = $1 RETURNING id, data`,
    [userId, JSON.stringify(patch)]
  );
  if (!row) throw new AppError('Корбар ёфт нашуд', 404);
  return toPublic(row);
}

// ── Хондан ──────────────────────────────────────────────────────────────

export interface Preferences {
  language: string;
  theme: string;
  notifications: boolean;
}

export interface SettingsView {
  user: PublicUser;
  preferences: Preferences;
}

/** Афзалиятҳо бо қиймати пешфарз, агар корбар онҳоро ҳанӯз иваз накарда бошад. */
function preferencesOf(data: Record<string, unknown>): Preferences {
  const prefs = (data.preferences ?? {}) as Record<string, unknown>;
  const language = String(prefs.language ?? '');
  const theme = String(prefs.theme ?? '');

  return {
    language: LANGUAGES.includes(language) ? language : 'tj',
    theme: THEMES.includes(theme) ? theme : 'light',
    notifications: prefs.notifications !== false,
  };
}

export async function getSettings(userId: number): Promise<SettingsView> {
  const row = await getRow(userId);
  return { user: toPublic(row), preferences: preferencesOf(row.data) };
}

// ── Маълумоти шахсӣ ─────────────────────────────────────────────────────

export interface ProfileInput {
  userName?: unknown;
  city?: unknown;
  age?: unknown;
  avatar?: unknown;
}

export async function updateProfile(userId: number, input: ProfileInput): Promise<PublicUser> {
  await getRow(userId);
  const patch: Record<string, unknown> = {};

  if (input.userName !== undefined) {
    const name = String(input.userName).trim();
    if (name.length < 2) throw new AppError('Ном хеле кӯтоҳ аст', 400);
    if (name.length > 120) throw new AppError('Ном хеле дароз аст', 400);
    patch.userName = name;
  }

  if (input.city !== undefined) {
    const city = String(input.city).trim();
    if (!city) throw new AppError('Шаҳр холӣ буда наметавонад', 400);
    patch.city = city;
  }

  if (input.age !== undefined) {
    const age = Number(input.age);
    // Ҳамон маҳдудият, ки дар RegisterForm.jsx аст
    if (!Number.isFinite(age) || age < 18 || age > 120) {
      throw new AppError('Синну сол бояд аз 18 то 120 бошад', 400);
    }
    patch.age = age;
  }

  if (input.avatar !== undefined) {
    const avatar = String(input.avatar ?? '');
    // Сатри холӣ = суратро нест кардан
    if (avatar && !avatar.startsWith('data:image/')) {
      throw new AppError('`avatar` бояд data-URL-и сурат бошад', 400);
    }
    patch.avatar = avatar;
  }

  if (Object.keys(patch).length === 0) {
    throw new AppError('Ҳеҷ майдоне барои иваз кардан дода нашуд', 400);
  }

  return patchData(userId, patch);
}

// ── Рақами телефон ──────────────────────────────────────────────────────

/**
 * Рақам логин аст, бинобар ин иваз кардани он паролро талаб мекунад
 * ва рақами нав набояд аллакай банд бошад.
 */
export async function updatePhone(
  userId: number,
  newPhone: unknown,
  password: unknown
): Promise<PublicUser> {
  const row = await getRow(userId);
  verifyPassword(row, password);

  const phone = String(newPhone ?? '').trim();
  if (phone.length < 5) throw new AppError('Рақами телефон нодуруст аст', 400);

  if (phone !== String(row.data.userPhone ?? '')) {
    const taken = await queryOne(
      `SELECT id FROM users WHERE data->>'userPhone' = $1 AND id <> $2`,
      [phone, userId]
    );
    if (taken) throw new AppError('Ин рақам аллакай банд аст', 409);
  }

  return patchData(userId, { userPhone: phone });
}

// ── Парол ───────────────────────────────────────────────────────────────

export async function changePassword(
  userId: number,
  oldPassword: unknown,
  newPassword: unknown
): Promise<{ message: string }> {
  const row = await getRow(userId);
  verifyPassword(row, oldPassword);

  const next = String(newPassword ?? '');
  // Ҳамон маҳдудияти RegisterForm.jsx
  if (next.length < 4) throw new AppError('Пароли нав хеле кӯтоҳ аст (аз 4 ҳарф)', 400);
  if (next.length > 128) throw new AppError('Пароли нав хеле дароз аст', 400);
  if (next === String(row.data.password ?? '')) {
    throw new AppError('Пароли нав бояд аз кӯҳна фарқ кунад', 400);
  }

  await patchData(userId, { password: next });
  return { message: 'Парол иваз шуд' };
}

// ── Афзалиятҳо ──────────────────────────────────────────────────────────

/**
 * Забон ва мавзӯъ пештар танҳо дар localStorage буданд — дар дастгоҳи дигар
 * гум мешуданд. Ҳоло дар сервер мемонанд ва ҳамроҳи корбар мераванд.
 */
export async function updatePreferences(
  userId: number,
  input: Record<string, unknown>
): Promise<Preferences> {
  const row = await getRow(userId);
  const current = preferencesOf(row.data);
  const next: Preferences = { ...current };

  if (input.language !== undefined) {
    const language = String(input.language);
    if (!LANGUAGES.includes(language)) {
      throw new AppError(`\`language\` бояд яке аз инҳо бошад: ${LANGUAGES.join(', ')}`, 400);
    }
    next.language = language;
  }

  if (input.theme !== undefined) {
    const theme = String(input.theme);
    if (!THEMES.includes(theme)) {
      throw new AppError(`\`theme\` бояд яке аз инҳо бошад: ${THEMES.join(', ')}`, 400);
    }
    next.theme = theme;
  }

  if (input.notifications !== undefined) {
    next.notifications = input.notifications !== false;
  }

  await patchData(userId, { preferences: next });
  return next;
}

// ── Нест кардани ҳисоб ──────────────────────────────────────────────────

export interface DeleteReport {
  mahsulot: number;
  zamin: number;
  ZaminApteka: number;
  jobs: number;
  notifications: number;
  chats: number;
  favorites: number;
}

/**
 * Ҳисоб ва ҳамаи чизҳои корбарро нест мекунад.
 *
 * Ҷадвалҳои бозор ба `users` FOREIGN KEY надоранд (userId дар JSONB аст),
 * бинобар ин ҳар кадомро дастӣ тоза мекунем — вагарна дар бозор моли
 * "бесоҳиб" мемонд ва дар саҳифаи он хатогӣ мебаромад.
 */
export async function deleteAccount(userId: number, password: unknown): Promise<DeleteReport> {
  const row = await getRow(userId);
  verifyPassword(row, password);

  const id = String(userId);
  const report: DeleteReport = {
    mahsulot: 0, zamin: 0, ZaminApteka: 0, jobs: 0,
    notifications: 0, chats: 0, favorites: 0,
  };

  for (const [key, table] of [
    ['mahsulot', 'mahsulot'],
    ['zamin', 'zamin'],
    ['ZaminApteka', 'zamin_apteka'],
    ['jobs', 'jobs'],
  ] as const) {
    const rows = await query<{ id: number }>(
      `DELETE FROM "${table}" WHERE data->>'userId' = $1 RETURNING id`,
      [id]
    );
    report[key] = rows.length;
  }

  // Хабарномаҳо: ҳам ҳамчун фурӯшанда, ҳам ҳамчун харидор
  const notifications = await query<{ id: number }>(
    `DELETE FROM notifications
     WHERE data->>'userId' = $1 OR data->>'buyerId' = $1 RETURNING id`,
    [id]
  );
  report.notifications = notifications.length;

  // Паёмҳо худашон бо ON DELETE CASCADE-и chat_id нест мешаванд
  const chats = await query<{ id: number }>(
    `DELETE FROM chats WHERE user_a = $1 OR user_b = $1 RETURNING id`,
    [userId]
  );
  report.chats = chats.length;

  const favorites = await query<{ id: number }>(
    `DELETE FROM favorites WHERE user_id = $1 RETURNING id`,
    [userId]
  );
  report.favorites = favorites.length;

  await query(`DELETE FROM users WHERE id = $1`, [userId]);

  return report;
}
