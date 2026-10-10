import { Router } from 'express';
import {
  getPushConfig,
  registerPushSubscription,
  removePushSubscription
} from '../controllers/push.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken);
router.get('/config', getPushConfig);
router.put('/subscription', registerPushSubscription);
router.delete('/subscription', removePushSubscription);

export default router;
