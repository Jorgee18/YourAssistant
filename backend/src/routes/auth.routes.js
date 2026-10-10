import { Router } from 'express';
import { 
  register, 
  login, 
  changeEmail,
  getProfile, 
  updateProfile 
} from '../controllers/auth.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Rutas públicas
router.post('/register', register);
router.post('/login', login);

// Rutas protegidas por JWT
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.patch('/profile/email', authenticateToken, changeEmail);

export default router;
