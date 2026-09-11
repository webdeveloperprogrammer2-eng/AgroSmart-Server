import { Router } from 'express';
import { asyncHandler } from '../../core/asyncHandler';
import * as service from './admin.service';

/**
 * `/admin` — панели маъмур.
 *
 * Дар ҳар дархост `adminId` лозим аст ва нақши ӯ аз БАЗА тафтиш мешавад
 * (`requireAdmin`). Танҳо фиристодани `role: "superadmin"` дар ҷисм кор
 * намекунад — ҳамин тафтиш роҳи асосии муҳофизат аст, то даме ки JWT нест.
 */

const router = Router();

const adminIdOf = (req: { query: Record<string, unknown>; body?: Record<string, unknown> }) =>
  service.requireId(req.query.adminId ?? req.body?.adminId, 'adminId');

// ── Оморҳо ──────────────────────────────────────────────────────────────

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    await service.requireAdmin(adminIdOf(req as never));
    res.json(await service.stats());
  })
);

/** GET /admin/notifications?adminId=1&_limit=50&since=ISO — лентаи рӯйдодҳо */
router.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    await service.requireAdmin(adminIdOf(req as never));
    const limit = Number(req.query._limit) || 50;
    const since = typeof req.query.since === 'string' ? req.query.since : undefined;
    res.json(await service.notifications(limit, since));
  })
);

// ── Корбарон ────────────────────────────────────────────────────────────

/** GET /admin/users?adminId=4&q=ali — рӯйхат бо ҷустуҷӯ */
router.get(
  '/users',
  asyncHandler(async (req, res) => {
    await service.requireAdmin(adminIdOf(req as never));
    const search = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    res.json(await service.listUsers(search || undefined));
  })
);

router.get(
  '/users/:id',
  asyncHandler(async (req, res) => {
    await service.requireAdmin(adminIdOf(req as never));
    res.json(await service.getUserDetail(service.requireId(req.params.id, 'id')));
  })
);

/** PATCH /admin/users/:id/ban — бастан ё кушодани корбар */
router.patch(
  '/users/:id/ban',
  asyncHandler(async (req, res) => {
    const adminId = adminIdOf(req as never);
    const targetId = service.requireId(req.params.id, 'id');
    // `banned` нафиристода шавад — маънояш бастан
    const banned = req.body?.banned !== false;
    res.json(await service.setBanned(adminId, targetId, banned, req.body?.reason));
  })
);

/** PATCH /admin/users/:id/role — танҳо SuperAdmin */
router.patch(
  '/users/:id/role',
  asyncHandler(async (req, res) => {
    const adminId = adminIdOf(req as never);
    const targetId = service.requireId(req.params.id, 'id');
    res.json(await service.setRole(adminId, targetId, String(req.body?.role ?? '')));
  })
);

/** DELETE /admin/users/:id — корбар ва ҳамаи чизҳояш */
router.delete(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const adminId = adminIdOf(req as never);
    const targetId = service.requireId(req.params.id, 'id');
    const deleted = await service.deleteUser(adminId, targetId);
    res.json({ message: 'Корбар нест карда шуд', deleted });
  })
);

// ── Сӯҳбатҳо ────────────────────────────────────────────────────────────

/** GET /admin/chats?adminId=4 — ҳамаи сӯҳбатҳои сомона */
router.get(
  '/chats',
  asyncHandler(async (req, res) => {
    await service.requireAdmin(adminIdOf(req as never));
    const limit = Number(req.query._limit) || 100;
    res.json(await service.listAllChats(limit));
  })
);

/** GET /admin/chats/:id/messages?adminId=4 — хондани ҳар сӯҳбат */
router.get(
  '/chats/:id/messages',
  asyncHandler(async (req, res) => {
    await service.requireAdmin(adminIdOf(req as never));
    const chatId = service.requireId(req.params.id, 'id');
    res.json(await service.readChat(chatId, Number(req.query._limit) || 200));
  })
);

/** DELETE /admin/chats/:id */
router.delete(
  '/chats/:id',
  asyncHandler(async (req, res) => {
    await service.requireAdmin(adminIdOf(req as never));
    await service.deleteChat(service.requireId(req.params.id, 'id'));
    res.json({ message: 'Сӯҳбат нест карда шуд' });
  })
);

export default router;
