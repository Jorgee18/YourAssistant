import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deletePushSubscription,
  savePushSubscription
} from './push-subscription.model.js';

const createClient = response => {
  const calls = [];
  const query = {
    upsert(value, options) { calls.push(['upsert', value, options]); return this; },
    delete() { calls.push(['delete']); return this; },
    eq(field, value) { calls.push(['eq', field, value]); return this; },
    select(value) { calls.push(['select', value]); return this; },
    single() { return Promise.resolve(response); },
    maybeSingle() { return Promise.resolve(response); }
  };
  return {
    calls,
    client: { from(table) { calls.push(['from', table]); return query; } }
  };
};

test('push subscriptions are upserted with their authenticated owner', async () => {
  const { client, calls } = createClient({ data: { id: 'sub-1' }, error: null });
  const expirationTime = Date.UTC(2030, 0, 1);
  await savePushSubscription(client, 'user-1', {
    endpoint: 'https://fcm.googleapis.com/fcm/send/opaque',
    expirationTime,
    keys: { p256dh: 'public-key', auth: 'auth-key' }
  }, 'test browser');

  const [, row, options] = calls.find(([name]) => name === 'upsert');
  assert.equal(row.user_id, 'user-1');
  assert.equal(row.expiration_time, new Date(expirationTime).toISOString());
  assert.equal(row.user_agent, 'test browser');
  assert.deepEqual(options, { onConflict: 'endpoint' });
});

test('push unsubscribe deletes only this user’s endpoint', async () => {
  const { client, calls } = createClient({ data: { id: 'sub-1' }, error: null });
  await deletePushSubscription(client, 'user-1', 'https://fcm.googleapis.com/fcm/send/opaque');

  assert.deepEqual(calls.filter(([name]) => name === 'eq'), [
    ['eq', 'user_id', 'user-1'],
    ['eq', 'endpoint', 'https://fcm.googleapis.com/fcm/send/opaque']
  ]);
});
