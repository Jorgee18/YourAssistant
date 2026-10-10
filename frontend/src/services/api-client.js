const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const TOKEN_KEY = 'yourassistant.access-token';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const getStoredToken = () => sessionStorage.getItem(TOKEN_KEY);

export const storeSession = session => {
  sessionStorage.setItem(TOKEN_KEY, session.token);
  sessionStorage.setItem('yourassistant.user', JSON.stringify(session.user));
};

export const clearSession = () => {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem('yourassistant.user');
};

export const readStoredUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem('yourassistant.user') || 'null');
  } catch {
    return null;
  }
};

export const apiRequest = async (path, options = {}) => {
  const { token: explicitToken, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers);
  const token = explicitToken === undefined ? getStoredToken() : explicitToken;
  if (fetchOptions.body !== undefined) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      headers,
      body: fetchOptions.body === undefined ? undefined : JSON.stringify(fetchOptions.body)
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Comprueba tu conexión.', 0);
  }

  if (response.status === 401 && token) {
    clearSession();
    window.dispatchEvent(new Event('yourassistant:session-expired'));
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError('El servidor devolvió una respuesta no válida.', response.status);
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ApiError('El servidor devolvió una respuesta no válida.', response.status);
  }

  if (!response.ok) {
    throw new ApiError(payload.error || 'Ocurrió un error al procesar la solicitud.', response.status);
  }
  return payload;
};
