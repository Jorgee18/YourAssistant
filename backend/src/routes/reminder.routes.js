import { Router } from 'express';
import {
  changeReminderStatus,
  changeReminderNotificationOffset,
  listReminders
} from '../controllers/reminder.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken);
router.get('/', listReminders);
router.patch('/:id/status', changeReminderStatus);
router.patch('/:id/notification-offset', changeReminderNotificationOffset);

export default router;
