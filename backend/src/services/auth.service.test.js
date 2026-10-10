import assert from 'node:assert/strict';
import test from 'node:test';

process.env.SUPABASE_URL ||= 'https://supabase.test';
process.env.SUPABASE_ANON_KEY ||= 'test-anon-key';

const { requestEmailChange } = await import('./auth.service.js');

test('email change delegates the validated address to the authenticated Supabase client', async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url: new URL(url), options };
    return Response.json({ email: 'old@example.test', new_email: 'person@example.test' });
  };

  try {
    const result = await requestEmailChange('verified-user-token', 'person@example.test');
    assert.equal(request.url.pathname, '/auth/v1/user');
    assert.equal(request.options.method, 'PUT');
    assert.equal(request.options.headers.Authorization, 'Bearer verified-user-token');
    assert.deepEqual(JSON.parse(request.options.body), { email: 'person@example.test' });
    assert.equal(result.data.user.new_email, 'person@example.test');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
