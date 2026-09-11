import { Router } from 'express';
import { query, queryOne } from '../../config/db';
import { asyncHandler } from '../../core/asyncHandler';
import { AppError } from '../../core/AppError';

/**
 * `/favorites` — молҳои нигоҳдоштаи корбар (маҳсулот, замин, дорувори).
 *
 * Дар сомона тугмаи "нигоҳ доштан" набуд — корбар моли маъқулшударо
 * бояд дасти худ дар ёд медошт. Ин ҷадвал ҳамон нақшро иҷро мекунад.
 */

/** Кадом бозорҳо мумкин аст — ҳамон номҳое, ки фронтенд истифода мебарад. */
const TYPES: Record<string, string> = {
  mahsulot: 'mahsulot',
  zamin: 'zamin',
  ZaminApteka: 'zamin_apteka',
};

const router = Router();

function userIdFrom(value: unknown): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('`userId` бояд ID-и дурусти корбар бошад', 400);
  }
  return id;
}

function tableFor(itemType: unknown): string {
  const table = TYPES[String(itemType ?? '')];
  if (!table) {
    throw new AppError(`\`itemType\` бояд яке аз инҳо бошад: ${Object.keys(TYPES).join(', ')}`, 400);
  }
  return table;
}

/**
 * Рӯйхати нигоҳдоштаҳо: GET /favorites?userId=3
 *
 * Ҳамроҳи ҳар сатр худи мол низ бармегардад (`item`) — вагарна фронтенд
 * бояд барои ҳар нигоҳдошта як дархости алоҳида мефиристод.
 * Агар мол нест шуда бошад, `item` = null.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = userIdFrom(req.query.userId);

    const rows = await query<{
      id: number;
      item_type: string;
      item_id: string;
      created_at: string;
    }>(
      `SELECT id, item_type, item_id, created_at FROM favorites
       WHERE user_id = $1 ORDER BY id DESC`,
      [userId]
    );

    const result = [];
    for (const row of rows) {
      const table = TYPES[row.item_type];
      let item = null;

      if (table && Number.isInteger(Number(row.item_id))) {
        const found = await queryOne<{ id: number; data: Record<string, unknown> }>(
          `SELECT id, data FROM "${table}" WHERE id = $1`,
          [Number(row.item_id)]
        );
        if (found) item = { ...found.data, id: found.id };
      }

      result.push({
        id: row.id,
        itemType: row.item_type,
        itemId: row.item_id,
        createdAt: row.created_at,
        item,
      });
    }

    res.json(result);
  })
);

/** Илова кардан: POST /favorites — такрор хато намедиҳад, ҳамонашро бармегардонад */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const userId = userIdFrom(req.body?.userId);
    const itemType = String(req.body?.itemType);
    const table = tableFor(itemType);
    const itemId = String(req.body?.itemId ?? '');

    if (!itemId) throw new AppError('`itemId` лозим аст', 400);

    const exists = await queryOne(`SELECT id FROM "${table}" WHERE id = $1`, [Number(itemId)]);
    if (!exists) throw new AppError('Чунин мол ёфт нашуд', 404);

    // ON CONFLICT — тугмаро ду бор пахш кардан хато набояд диҳад
    const row = await queryOne<{ id: number; created_at: string }>(
      `INSERT INTO favorites (user_id, item_type, item_id) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, item_type, item_id) DO UPDATE SET user_id = EXCLUDED.user_id
       RETURNING id, created_at`,
      [userId, itemType, itemId]
    );

    res.status(201).json({ id: row!.id, userId, itemType, itemId, createdAt: row!.created_at });
  })
);

/** Хориҷ кардан бо ID-и сатр: DELETE /favorites/:id?userId=3 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = userIdFrom(req.query.userId ?? req.body?.userId);
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new AppError('ID нодуруст аст', 400);

    const row = await queryOne<{ id: number }>(
      `DELETE FROM favorites WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );
    if (!row) throw new AppError('Дар рӯйхати нигоҳдоштаҳо ёфт нашуд', 404);

    res.json({});
  })
);

/**
 * Хориҷ кардан бо худи мол: DELETE /favorites?userId=3&itemType=mahsulot&itemId=7
 * Барои тугмаи "дил" қулай аст — фронтенд ID-и сатри favorites-ро надонад ҳам мешавад.
 */
router.delete(
  '/',
  asyncHandler(async (req, res) => {
    const userId = userIdFrom(req.query.userId);
    const itemType = String(req.query.itemType ?? '');
    tableFor(itemType);
    const itemId = String(req.query.itemId ?? '');

    const row = await queryOne<{ id: number }>(
      `DELETE FROM favorites WHERE user_id = $1 AND item_type = $2 AND item_id = $3 RETURNING id`,
      [userId, itemType, itemId]
    );
    if (!row) throw new AppError('Дар рӯйхати нигоҳдоштаҳо ёфт нашуд', 404);

    res.json({});
  })
);

export default router;
