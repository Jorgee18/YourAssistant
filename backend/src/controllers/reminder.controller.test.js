import assert from 'node:assert/strict';
import test from 'node:test';
import { changeReminderNotificationOffset } from './reminder.controller.js';

const response = () => ({
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
  json(body) { this.body = body; return this; }
});

const createClient = dueDate => {
  const calls = [];
  const client = {
    from(table) {
      let updating = false;
      const query = {
        select(fields) { calls.push(['select', fields]); return this; },
        eq(field, value) { calls.push(['eq', field, value]); return this; },
        update(value) { updating = true; calls.push(['update', value]); return this; },
        maybeSingle: async () => ({
          data: updating
            ? { id: 'reminder-1', notification_offset_minutes: 60 }
            : { id: 'reminder-1', reminder_date: dueDate },
          error: null
        })
      };
      calls.push(['from', table]);
      return query;
    }
  };
  return { client, calls };
};

test('notification offset cannot be set to a time that has already passed', async () => {
  const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const { client, calls } = createClient(dueDate);
  const res = response();

  await changeReminderNotificationOffset({
    params: { id: '3b241101-e2bb-4255-8caf-4136c566a962' },
    body: { notificationOffsetMinutes: 10080 },
    user: { id: 'user-1' },
    supabase: client
  }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(calls.some(([name]) => name === 'update'), false);
});

test('valid notification offsets update only the authenticated user reminder', async () => {
  const dueDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const { client, calls } = createClient(dueDate);
  const res = response();

  await changeReminderNotificationOffset({
    params: { id: '3b241101-e2bb-4255-8caf-4136c566a962' },
    body: { notificationOffsetMinutes: 60 },
    user: { id: 'user-1' },
    supabase: client
  }, res);

  assert.equal(res.statusCode, undefined);
  assert.deepEqual(calls.find(([name]) => name === 'update'), [
    'update',
    { notification_offset_minutes: 60 }
  ]);
  assert.ok(calls.some(([name, field, value]) => name === 'eq' && field === 'user_id' && value === 'user-1'));
});
