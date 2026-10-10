import { Router } from 'express';
import {
  changeActiveModel,
  getAdminAccess,
  getModelSettings
} from '../controllers/admin.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireAdministrator } from '../middlewares/admin.middleware.js';

const router = Router();

router.get('/access', authenticateToken, getAdminAccess);
router.use(authenticateToken, requireAdministrator);
router.get('/models', getModelSettings);
router.put('/model', changeActiveModel);

export default router;
