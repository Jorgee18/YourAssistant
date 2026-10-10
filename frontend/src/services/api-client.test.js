import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  apiRequest,
  clearSession,
  getStoredToken,
  storeSession
} from './api-client.js';

afterEach(() => {
  clearSession();
  vi.unstubAllGlobals();
});

describe('apiRequest authentication', () => {
  it('does not attach an old bearer token to public login requests', async () => {
    storeSession({ token: 'old-token', user: { email: 'user@example.test' } });
    let headers;
    vi.stubGlobal('fetch', async (_url, options) => {
      headers = new Headers(options.headers);
      return Response.json({ token: 'new-token' });
    });

    await apiRequest('/auth/login', {
      method: 'POST',
      token: null,
      body: { email: 'user@example.test', password: 'secret' }
    });

    expect(headers.has('authorization')).toBe(false);
  });

  it('clears a rejected access token and broadcasts session expiry', async () => {
    storeSession({ token: 'expired-token', user: { email: 'user@example.test' } });
    const expired = vi.fn();
    window.addEventListener('yourassistant:session-expired', expired);
    vi.stubGlobal('fetch', async () => Response.json({ error: 'Expired' }, { status: 401 }));

    await expect(apiRequest('/reminders?from=a&to=b')).rejects.toMatchObject({ status: 401 });

    expect(getStoredToken()).toBeNull();
    expect(expired).toHaveBeenCalledOnce();
    window.removeEventListener('yourassistant:session-expired', expired);
  });

  it('rejects successful responses that are not JSON objects', async () => {
    vi.stubGlobal('fetch', async () => new Response('<!doctype html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    }));

    await expect(apiRequest('/reminders')).rejects.toMatchObject({
      name: 'ApiError',
      status: 200,
      message: 'El servidor devolvió una respuesta no válida.'
    });
  });
});
