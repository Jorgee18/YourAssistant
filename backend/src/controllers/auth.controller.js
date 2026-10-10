import {
  RegisterSchema,
  LoginSchema,
  UpdateEmailSchema,
  UpdateProfileSchema
} from '../models/schemas.js';
import { createAuthenticatedSupabaseClient } from '../config/supabase.js';
import { findProfileById, updateProfileById } from '../models/profile.model.js';
import { registerUser, requestEmailChange, signInUser } from '../services/auth.service.js';
import { z } from 'zod';

// 1. Registro de usuario
export const register = async (req, res) => {
  try {
    const validatedData = RegisterSchema.parse(req.body);

    const { data, error } = await registerUser(validatedData);

    if (error) {
      const status = error.status >= 500 ? 502 : 400;
      return res.status(status).json({
        error: status === 502 ? 'No se pudo completar el registro' : error.message
      });
    }

    // En register:
    return res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.user_metadata?.full_name,
        phone: data.user.user_metadata?.phone
      }
    });

  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues[0].message });
    }
    return res.status(500).json({ error: 'Error interno al registrar usuario' });
  }
};

// 2. Inicio de sesión
export const login = async (req, res) => {
  try {
    const validatedData = LoginSchema.parse(req.body);

    const { data, error } = await signInUser(validatedData);

    if (error) {
      const status = error.status >= 500 ? 502 : 401;
      return res.status(status).json({
        error: status === 502 ? 'No se pudo iniciar sesión' : 'Credenciales inválidas'
      });
    }

    let profile = null;
    try {
      profile = await findProfileById(
        createAuthenticatedSupabaseClient(data.session.access_token),
        data.user.id
      );
    } catch (profileError) {
      console.error('No se pudieron cargar los datos de perfil durante el inicio de sesión:', profileError);
    }

    return res.json({
      message: 'Sesión iniciada correctamente',
      token: data.session.access_token,
      user: {
          id: data.user.id,
          email: data.user.email,
          fullName: profile?.full_name || data.user.user_metadata?.full_name,
          phone: profile?.phone || data.user.user_metadata?.phone
        }    
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues[0].message });
    }
    return res.status(500).json({ error: 'Error interno al iniciar sesión' });
  }
};

// 3. Obtener perfil del usuario autenticado
export const getProfile = async (req, res) => {
  try {
    const profile = await findProfileById(req.supabase, req.user.id);
    if (!profile) {
      return res.status(404).json({ error: 'Perfil no encontrado' });
    }

    return res.json({
      profile,
      email: req.user.email,
      pendingEmail: req.user.new_email || null
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener el perfil' });
  }
};

export const changeEmail = async (req, res) => {
  const parsed = UpdateEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  if (parsed.data.email.toLowerCase() === req.user.email?.toLowerCase()) {
    return res.status(400).json({ error: 'El nuevo correo debe ser diferente al actual' });
  }

  try {
    const { data, error } = await requestEmailChange(req.accessToken, parsed.data.email);
    if (error) {
      const status = error.status >= 500 ? 502 : 400;
      return res.status(status).json({
        error: status === 502 ? 'No se pudo solicitar el cambio de correo' : error.message
      });
    }

    const currentEmail = data.user?.email || req.user.email;
    const pendingEmail = data.user?.new_email
      || (currentEmail.toLowerCase() === parsed.data.email.toLowerCase() ? null : parsed.data.email);
    return res.json({
      message: pendingEmail
        ? 'Solicitud enviada. Sigue las instrucciones de confirmación que te envíe Supabase.'
        : 'Correo actualizado.',
      currentEmail,
      pendingEmail
    });
  } catch (err) {
    return res.status(502).json({ error: 'No se pudo solicitar el cambio de correo' });
  }
};

// 4. Actualizar datos del perfil
export const updateProfile = async (req, res) => {
  try {
    const validatedData = UpdateProfileSchema.parse(req.body);

    const profile = await updateProfileById(req.supabase, req.user.id, validatedData);
    if (!profile) {
      return res.status(404).json({ error: 'Perfil no encontrado' });
    }

    return res.json({
      message: 'Perfil actualizado con éxito',
      profile
    });

  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues[0].message });
    }
    return res.status(500).json({ error: 'Error al actualizar el perfil' });
  }
};
