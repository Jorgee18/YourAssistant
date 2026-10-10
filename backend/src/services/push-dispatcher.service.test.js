import assert from 'node:assert/strict';
import test from 'node:test';
import {
  notificationSchedule,
  runPushDispatchCycle
} from './push-dispatcher.service.js';

const now = new Date('2030-05-01T12:00:00.000Z');
const dueDate = new Date(now.getTime() + 10 * 60_000).toISOString();
const job = {
  id: 'delivery-1',
  reminder_id: 'reminder-1',
  user_id: 'user-1',
  subscription_id: 'subscription-1',
  reminder_date: dueDate,
  notification_offset_minutes: 10,
  delivery_at: now.toISOString(),
  attempt_count: 1
};
const reminder = {
  id: 'reminder-1',
  title: 'Entregar informe',
  reminder_date: dueDate,
  notification_offset_minutes: 10,
  status: 'pending'
};
const subscription = {
  id: 'subscription-1',
  endpoint: 'https://fcm.googleapis.com/fcm/send/opaque',
  p256dh: 'public-key',
  auth: 'auth-key'
};

const createRepository = ({ jobRecord = job, reminderRecord = reminder, subscriptionRecord = subscription } = {}) => {
  const updates = [];
  const removed = [];
  return {
    updates,
    removed,
    repository: {
      requeueExpiredPushDeliveries: async () => 0,
      enqueueDuePushDeliveries: async () => 1,
      claimDuePushDeliveries: async () => [jobRecord],
      findPushDeliveryContext: async () => ({ reminder: reminderRecord, subscription: subscriptionRecord }),
      updatePushDelivery: async (_client, id, update) => { updates.push({ id, update }); },
      removePushSubscription: async (_client, id) => { removed.push(id); }
    }
  };
};

test('notification time is computed from the per-reminder offset', () => {
  assert.equal(notificationSchedule(reminder).toISOString(), now.toISOString());
});

test('due pending reminders send a generic push and persist sent status', async () => {
  const { repository, updates } = createRepository();
  const sent = [];

  const result = await runPushDispatchCycle({}, now, repository, async (target, payload) => {
    sent.push({ target, payload });
  });

  assert.equal(result.sent, 1);
  assert.equal(sent[0].target.endpoint, subscription.endpoint);
  assert.equal(sent[0].payload.body, 'Tienes un recordatorio 10 minutos antes.');
  assert.equal(sent[0].payload.data.url, '/?section=tasks&at=' + encodeURIComponent(dueDate) + '&reminderId=reminder-1');
  assert.equal(updates[0].update.status, 'sent');
});

test('completed reminders do not send and their delivery is cancelled', async () => {
  const { repository, updates } = createRepository({
    reminderRecord: { ...reminder, status: 'completed' }
  });
  let sendCount = 0;

  const result = await runPushDispatchCycle({}, now, repository, async () => { sendCount += 1; });

  assert.equal(sendCount, 0);
  assert.equal(result.cancelled, 1);
  assert.equal(updates[0].update.status, 'cancelled');
});

test('a changed lead time reschedules instead of sending at the old time', async () => {
  const { repository, updates } = createRepository({
    reminderRecord: { ...reminder, notification_offset_minutes: 60 }
  });
  let sendCount = 0;

  await runPushDispatchCycle({}, now, repository, async () => { sendCount += 1; });

  assert.equal(sendCount, 0);
  assert.equal(updates[0].update.status, 'pending');
  assert.equal(updates[0].update.notification_offset_minutes, 60);
  assert.equal(updates[0].update.delivery_at, new Date(now.getTime() - 50 * 60_000).toISOString());
});

test('transient push failures are scheduled for retry', async () => {
  const { repository, updates } = createRepository();
  const originalConsoleError = console.error;
  console.error = () => {};
  let result;
  try {
    result = await runPushDispatchCycle({}, now, repository, async () => {
      const error = new Error('temporary push gateway failure');
      error.statusCode = 503;
      throw error;
    });
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(result.retried, 1);
  assert.equal(updates[0].update.status, 'retry');
  assert.equal(updates[0].update.next_attempt_at, new Date(now.getTime() + 60_000).toISOString());
});
