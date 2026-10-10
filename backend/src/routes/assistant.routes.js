import { Router } from 'express';
import { handleAssistantQuery } from '../controllers/assistant.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Endpoint del asistente protegido por JWT
router.post('/prompt', authenticateToken, handleAssistantQuery);

export default router;
