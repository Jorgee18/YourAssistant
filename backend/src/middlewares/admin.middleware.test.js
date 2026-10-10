import assert from 'node:assert/strict';
import test from 'node:test';
import { requireAdministrator } from './admin.middleware.js';

const response = () => ({
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; }
});

test('non-administrator users are rejected before admin handlers run', async () => {
  let selectedTable;
  let continued = false;
  const req = {
    user: { id: 'user-1' },
    supabase: {
      from(table) {
        selectedTable = table;
        return {
          select() { return this; },
          eq() { return this; },
          maybeSingle: async () => ({ data: null, error: null })
        };
      }
    }
  };
  const res = response();

  await requireAdministrator(req, res, () => { continued = true; });

  assert.equal(selectedTable, 'administrators');
  assert.equal(res.statusCode, 403);
  assert.equal(continued, false);
});

test('administrator lookup failures fail closed', async () => {
  const originalConsoleError = console.error;
  console.error = () => {};
  const res = response();
  try {
    await requireAdministrator({
      user: { id: 'user-1' },
      supabase: {
        from: () => ({
          select() { return this; },
          eq() { return this; },
          maybeSingle: async () => ({ data: null, error: new Error('database unavailable') })
        })
      }
    }, res, () => assert.fail('must not continue when admin lookup fails'));
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(res.statusCode, 500);
});
