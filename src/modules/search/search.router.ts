import { Router } from 'express';
import { query } from '../../config/db';
import { asyncHandler } from '../../core/asyncHandler';
import { AppError } from '../../core/AppError';

/**
 * `/search` — ҷустуҷӯ дар ҳар се бозор якбора.
 *
 * Пештар ҳар саҳифа тамоми рӯйхатро мегирифт ва дар браузер филтр мекард
 * (`pages/profile/api.js`). Вақте молҳо зиёд шаванд, ин ҳам трафик ва ҳам
 * вақти зиёд мегирад — ва ҷустуҷӯи умумӣ (дар се бозор якбора) умуман набуд.
 */

const SOURCES = [
  { type: 'mahsulot', table: 'mahsulot' },
  { type: 'zamin', table: 'zamin' },
  { type: 'ZaminApteka', table: 'zamin_apteka' },
] as const;

const router = Router();

/**
 * GET /search?q=себ&type=mahsulot&city=Dushanbe&minPrice=5&maxPrice=50&_limit=20
 *
 * `q` дар ном, тавсиф ва шаҳр ҷустуҷӯ мекунад, ба ҳарфи хурд/калон
 * аҳамият намедиҳад.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    const type = String(req.query.type ?? '');
    const city = String(req.query.city ?? '');
    const category = String(req.query.category ?? '');
    const limit = Math.min(Math.max(Number(req.query._limit) || 30, 1), 200);

    if (type && !SOURCES.some((s) => s.type === type)) {
      throw new AppError(
        `\`type\` бояд яке аз инҳо бошад: ${SOURCES.map((s) => s.type).join(', ')}`,
        400
      );
    }

    const minPrice = req.query.minPrice !== undefined ? Number(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice !== undefined ? Number(req.query.maxPrice) : null;

    const sources = type ? SOURCES.filter((s) => s.type === type) : SOURCES;
    const results: Record<string, unknown>[] = [];

    for (const source of sources) {
      const where: string[] = [];
      const params: unknown[] = [];

      if (q) {
        params.push(`%${q}%`);
        // `description` дар маҳсулот/дорувори, `desc` дар замин — ҳар дуро мегирем
        where.push(
          `(COALESCE(data->>'name','') ILIKE $${params.length}
            OR COALESCE(data->>'description','') ILIKE $${params.length}
            OR COALESCE(data->>'desc','') ILIKE $${params.length}
            OR COALESCE(data->>'city','') ILIKE $${params.length})`
        );
      }

      if (city) {
        params.push(city);
        where.push(`data->>'city' = $${params.length}`);
      }

      if (category) {
        params.push(category);
        where.push(`data->>'category' = $${params.length}`);
      }

      // Нарх дар JSONB матн аст — барои муқоиса ба рақам табдил мешавад
      if (minPrice !== null && Number.isFinite(minPrice)) {
        params.push(minPrice);
        where.push(`COALESCE((data->>'price')::numeric, 0) >= $${params.length}`);
      }
      if (maxPrice !== null && Number.isFinite(maxPrice)) {
        params.push(maxPrice);
        where.push(`COALESCE((data->>'price')::numeric, 0) <= $${params.length}`);
      }

      params.push(limit);

      const rows = await query<{ id: number; data: Record<string, unknown> }>(
        `SELECT id, data FROM "${source.table}"
         ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
         ORDER BY id DESC LIMIT $${params.length}`,
        params
      );

      for (const row of rows) {
        results.push({ ...row.data, id: row.id, _type: source.type });
      }
    }

    res.json({ query: q, count: results.length, results: results.slice(0, limit) });
  })
);

export default router;
