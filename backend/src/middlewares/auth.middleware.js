import { createAuthenticatedSupabaseClient, supabase } from '../config/supabase.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = /^Bearer\s+(\S+)$/i.exec(authHeader || '')?.[1];

    if (!token) {
      return res.status(401).json({ 
        error: 'Acceso no autorizado: Token no provisto.' 
      });
    }

    // Validar el token con Supabase
    const { data, error } = await supabase.auth.getUser(token);
    const user = data?.user;

    if (error || !user) {
      return res.status(401).json({ 
        error: 'Token inválido o expirado.' 
      });
    }

    // Guardar los datos del usuario autenticado en la petición
    req.user = user;
    req.accessToken = token;
    req.supabase = createAuthenticatedSupabaseClient(token);
    next();
  } catch (err) {
    return res.status(500).json({ 
      error: 'Error interno en la autenticación.' 
    });
  }
};
