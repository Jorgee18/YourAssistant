import assert from 'node:assert/strict';
import test from 'node:test';

process.env.SUPABASE_URL ||= 'https://supabase.test';
process.env.SUPABASE_ANON_KEY ||= 'test-anon-key';

const { authenticateToken } = await import('./auth.middleware.js');

test('authenticated requests use the verified user JWT for database queries', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  const token = 'verified-user-token';
  let passedToNext = false;
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = {
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };

  globalThis.fetch = async (input, init) => {
    const url = new URL(input);
    requests.push({ url, headers: new Headers(init?.headers) });
    if (url.pathname.endsWith('/auth/v1/user')) {
      return Response.json({ id: 'user-1', email: 'user@example.test' });
    }
    return Response.json([{ id: 'reminder-1' }]);
  };

  try {
    await authenticateToken(req, res, () => { passedToNext = true; });
    assert.equal(passedToNext, true);
    assert.equal(req.user.id, 'user-1');
    assert.equal(req.accessToken, token);

    await req.supabase.from('reminders').select('id');
    const databaseRequest = requests.find(({ url }) => url.pathname.includes('/rest/v1/'));
    assert.ok(databaseRequest);
    assert.equal(databaseRequest.headers.get('authorization'), `Bearer ${token}`);
    assert.equal(databaseRequest.headers.get('apikey'), process.env.SUPABASE_ANON_KEY);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('authentication rejects a non-Bearer authorization scheme', async () => {
  const res = {
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  let passedToNext = false;

  await authenticateToken(
    { headers: { authorization: 'Basic some-token' } },
    res,
    () => { passedToNext = true; }
  );

  assert.equal(res.statusCode, 401);
  assert.equal(passedToNext, false);
});

test('authentication reports an expired token as unauthorized', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ message: 'Invalid JWT' }, { status: 401 });
  const res = {
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  let passedToNext = false;

  try {
    await authenticateToken(
      { headers: { authorization: 'Bearer expired-token' } },
      res,
      () => { passedToNext = true; }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(res.statusCode, 401);
  assert.equal(passedToNext, false);
});
