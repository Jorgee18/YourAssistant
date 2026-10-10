import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearSession } from './api-client.js';
import { getReminders } from './reminders.api.js';

afterEach(() => {
  clearSession();
  vi.unstubAllGlobals();
});

describe('getReminders response contract', () => {
  it('rejects a successful response without a reminders array', async () => {
    vi.stubGlobal('fetch', async () => Response.json({}));

    await expect(getReminders('2030-04-01T00:00:00Z', '2030-05-01T00:00:00Z'))
      .rejects.toMatchObject({
        name: 'ApiError',
        status: 502,
        message: 'La respuesta del servidor no contiene una lista válida de recordatorios.'
      });
  });

  it('returns a valid reminders array', async () => {
    const reminders = [{ id: 'reminder-1', title: 'Llamar al médico' }];
    vi.stubGlobal('fetch', async () => Response.json({ reminders }));

    await expect(getReminders('2030-04-01T00:00:00Z', '2030-05-01T00:00:00Z'))
      .resolves.toEqual({ reminders });
  });
});
