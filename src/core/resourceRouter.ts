import { Router } from 'express';
import { Repository, ListOptions } from './repository';
import { asyncHandler } from './asyncHandler';
import { ResourceDef } from './resources';

/** Калидҳои хизматӣ дар query-string — онҳо филтр нестанд. */
const CONTROL_KEYS = new Set(['_sort', '_order', '_limit', '_page', '_start', '_end', 'q']);

function readOptions(reqQuery: Record<string, unknown>): ListOptions {
  const filters: Record<string, string> = {};

  for (const [key, value] of Object.entries(reqQuery)) {
    if (CONTROL_KEYS.has(key)) continue;
    // `?a=1&a=2` массив медиҳад — танҳо аввалинашро мегирем
    const single = Array.isArray(value) ? value[0] : value;
    if (typeof single === 'string') filters[key] = single;
  }

  const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

  return {
    filters,
    sort: str(reqQuery._sort),
    order: str(reqQuery._order),
    limit: str(reqQuery._limit),
  };
}

/**
 * Роутери якхела барои ҳар ресурс — маҳз ҳамон амалҳое, ки
 * `createResourceClient` дар фронтенд (src/api/httpClient.js) талаб мекунад:
 * getAll, getById, create, update (PUT), patch, remove.
 */
export function createResourceRouter(resource: ResourceDef): Router {
  const repo = new Repository(resource.table);
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      res.json(await repo.list(readOptions(req.query as Record<string, unknown>)));
    })
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      res.json(await repo.getById(req.params.id));
    })
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      res.status(201).json(await repo.create(req.body));
    })
  );

  router.put(
    '/:id',
    asyncHandler(async (req, res) => {
      res.json(await repo.replace(req.params.id, req.body));
    })
  );

  router.patch(
    '/:id',
    asyncHandler(async (req, res) => {
      res.json(await repo.merge(req.params.id, req.body));
    })
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      await repo.remove(req.params.id);
      // json-server объекти холӣ бармегардонад, на 204 —
      // фронтенд ҷавобро бо res.json() мехонад.
      res.json({});
    })
  );

  return router;
}
