import { Router } from 'express';
import { asyncHandler } from '../../core/asyncHandler';
import * as service from './settings.service';

/**
 * `/settings` — саҳифаи танзимоти корбар.
 *
 * `userId` аз query ё ҷисми дархост меояд, чунки авторизатсия ҳанӯз нест
 * (README). Амалҳои муҳим — иваз кардани рақам, парол ва нест кардани ҳисоб —
 * ҳадди ақал паролро талаб мекунанд, то бо як ID-и тахминӣ ҳисоби каси
 * дигарро вайрон карда натавонанд.
 */

const router = Router();

function actorId(req: { query: Record<string, unknown>; body: Record<string, unknown> }): number {
  return service.requireUserId(req.query.userId ?? req.body?.userId);
}

/** Ҳамаи танзимот: GET /settings?userId=3 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await service.getSettings(actorId(req as never)));
  })
);

/** Маълумоти шахсӣ: PATCH /settings/profile */
router.patch(
  '/profile',
  asyncHandler(async (req, res) => {
    const userId = actorId(req as never);
    res.json(
      await service.updateProfile(userId, {
        userName: req.body?.userName,
        city: req.body?.city,
        age: req.body?.age,
        avatar: req.body?.avatar,
      })
    );
  })
);

/** Рақами телефон (логин): PATCH /settings/phone — паролро талаб мекунад */
router.patch(
  '/phone',
  asyncHandler(async (req, res) => {
    const userId = actorId(req as never);
    res.json(await service.updatePhone(userId, req.body?.userPhone, req.body?.password));
  })
);

/** Парол: PATCH /settings/password */
router.patch(
  '/password',
  asyncHandler(async (req, res) => {
    const userId = actorId(req as never);
    res.json(await service.changePassword(userId, req.body?.oldPassword, req.body?.newPassword));
  })
);

/** Забон / мавзӯъ / хабарномаҳо: PATCH /settings/preferences */
router.patch(
  '/preferences',
  asyncHandler(async (req, res) => {
    const userId = actorId(req as never);
    res.json(await service.updatePreferences(userId, req.body ?? {}));
  })
);

/** Нест кардани ҳисоб: DELETE /settings/account — паролро талаб мекунад */
router.delete(
  '/account',
  asyncHandler(async (req, res) => {
    const userId = actorId(req as never);
    const deleted = await service.deleteAccount(userId, req.body?.password);
    res.json({ message: 'Ҳисоб нест карда шуд', deleted });
  })
);

export default router;
