import { supabase, supabaseAnonKey, supabaseUrl } from '../config/supabase.js';

export const registerUser = ({ email, password, fullName, phone }) => supabase.auth.signUp({
  email,
  password,
  options: { data: { full_name: fullName, phone } }
});

export const signInUser = ({ email, password }) => supabase.auth.signInWithPassword({
  email,
  password
});

export const requestEmailChange = async (accessToken, email) => {
  let response;
  try {
    response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: email.trim() }),
      signal: AbortSignal.timeout(10000)
    });
  } catch {
    return { data: null, error: { status: 502, message: 'No se pudo conectar con Supabase Auth' } };
  }

  const user = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      data: null,
      error: {
        status: response.status,
        message: user.msg || user.message || user.error_description || 'No se pudo actualizar el correo'
      }
    };
  }

  return { data: { user }, error: null };
};
