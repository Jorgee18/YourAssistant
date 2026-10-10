import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deleteReminder,
  findPendingReminders,
  updateReminder,
  updateReminderNotificationOffset
} from './reminder.model.js';

const createClient = response => {
  const calls = [];
  const query = {
    select(value) { calls.push(['select', value]); return this; },
    eq(field, value) { calls.push(['eq', field, value]); return this; },
    gte(field, value) { calls.push(['gte', field, value]); return this; },
    lt(field, value) { calls.push(['lt', field, value]); return this; },
    order(field, value) { calls.push(['order', field, value]); return this; },
    update(value) { calls.push(['update', value]); return this; },
    delete() { calls.push(['delete']); return this; },
    maybeSingle() { return Promise.resolve(response); },
    then(resolve, reject) { return Promise.resolve(response).then(resolve, reject); }
  };

  return {
    calls,
    client: { from(table) { calls.push(['from', table]); return query; } }
  };
};

test('pending reminder lookup is scoped to the authenticated user', async () => {
  const reminders = [{ id: 'reminder-1' }];
  const { client, calls } = createClient({ data: reminders, error: null });

  assert.deepEqual(await findPendingReminders(client, 'user-1'), reminders);
  assert.deepEqual(calls.filter(([name]) => name === 'eq'), [
    ['eq', 'user_id', 'user-1'],
    ['eq', 'status', 'pending']
  ]);
});

test('delete is scoped by both reminder id and owner and propagates database errors', async () => {
  const databaseError = new Error('database unavailable');
  const { client, calls } = createClient({ data: null, error: databaseError });

  await assert.rejects(deleteReminder(client, 'user-1', 'reminder-1'), databaseError);
  assert.deepEqual(calls.filter(([name]) => name === 'eq'), [
    ['eq', 'id', 'reminder-1'],
    ['eq', 'user_id', 'user-1']
  ]);
});

test('update is scoped by owner and only writes provided fields', async () => {
  const updated = { id: 'reminder-1', title: 'Nuevo título' };
  const { client, calls } = createClient({ data: updated, error: null });

  assert.deepEqual(await updateReminder(client, 'user-1', {
    reminder_id: 'reminder-1',
    title: 'Nuevo título',
    description: undefined
  }), updated);
  assert.deepEqual(calls.find(([name]) => name === 'update'), [
    'update',
    { title: 'Nuevo título' }
  ]);
  assert.deepEqual(calls.filter(([name]) => name === 'eq'), [
    ['eq', 'id', 'reminder-1'],
    ['eq', 'user_id', 'user-1']
  ]);
});

test('date-range reminder lookup is owner-scoped and ordered', async () => {
  const { client, calls } = createClient({ data: [], error: null });
  const { findRemindersInRange } = await import('./reminder.model.js');

  await findRemindersInRange(
    client,
    'user-1',
    '2030-04-01T00:00:00Z',
    '2030-05-01T00:00:00Z'
  );

  assert.deepEqual(calls.filter(([name]) => ['eq', 'gte', 'lt', 'order'].includes(name)), [
    ['eq', 'user_id', 'user-1'],
    ['gte', 'reminder_date', '2030-04-01T00:00:00Z'],
    ['lt', 'reminder_date', '2030-05-01T00:00:00Z'],
    ['order', 'reminder_date', { ascending: true }]
  ]);
});

test('status updates are scoped by both reminder id and owner', async () => {
  const reminder = { id: 'reminder-1', status: 'cancelled' };
  const { client, calls } = createClient({ data: reminder, error: null });
  const { updateReminderStatus } = await import('./reminder.model.js');

  assert.deepEqual(
    await updateReminderStatus(client, 'user-1', 'reminder-1', 'cancelled'),
    reminder
  );
  assert.deepEqual(calls.find(([name]) => name === 'update'), ['update', { status: 'cancelled' }]);
  assert.deepEqual(calls.filter(([name]) => name === 'eq'), [
    ['eq', 'id', 'reminder-1'],
    ['eq', 'user_id', 'user-1']
  ]);
});

test('notification offset changes are scoped by both reminder id and owner', async () => {
  const reminder = { id: 'reminder-1', notification_offset_minutes: 10080 };
  const { client, calls } = createClient({ data: reminder, error: null });

  assert.deepEqual(
    await updateReminderNotificationOffset(client, 'user-1', 'reminder-1', 10080),
    reminder
  );
  assert.deepEqual(calls.find(([name]) => name === 'update'), [
    'update',
    { notification_offset_minutes: 10080 }
  ]);
  assert.deepEqual(calls.filter(([name]) => name === 'eq'), [
    ['eq', 'id', 'reminder-1'],
    ['eq', 'user_id', 'user-1']
  ]);
});
