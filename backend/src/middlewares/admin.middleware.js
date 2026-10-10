import { findAdministrator } from '../models/administrator.model.js';

export const requireAdministrator = async (req, res, next) => {
  try {
    const administrator = await findAdministrator(req.supabase, req.user.id);
    if (!administrator) {
      return res.status(403).json({ error: 'Se requieren permisos de administrador' });
    }
    return next();
  } catch (err) {
    console.error('Error al validar administrador:', err);
    return res.status(500).json({ error: 'No se pudieron comprobar los permisos' });
  }
};
