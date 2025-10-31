import { Router } from 'express';
import { appleConnect, googleAuthorize, googleCallback, listAccounts, triggerAccountSync, triggerUserSync } from '../controllers/calendarController';

const router = Router();

router.post('/google/authorize', googleAuthorize);
router.post('/google/callback', googleCallback);
router.post('/apple/connect', appleConnect);
router.get('/accounts', listAccounts);
router.post('/accounts/sync', triggerAccountSync);
router.post('/sync', triggerUserSync);

export default router;
