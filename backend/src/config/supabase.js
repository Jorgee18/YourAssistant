import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

export const supabaseUrl = process.env.SUPABASE_URL;
export const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase en el archivo .env');
}

const serverAuthOptions = {
  autoRefreshToken: false,
  persistSession: false,
  detectSessionInUrl: false
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: serverAuthOptions
});

export const createAuthenticatedSupabaseClient = accessToken => createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: serverAuthOptions,
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  }
);

export const createServiceRoleSupabaseClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY para ejecutar tareas push del servidor');
  }

  return createClient(supabaseUrl, serviceRoleKey, { auth: serverAuthOptions });
};
