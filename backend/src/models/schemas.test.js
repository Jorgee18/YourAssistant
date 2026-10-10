import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ActiveModelSchema,
  AssistantRequestSchema,
  NotificationOffsetSchema,
  PushEndpointSchema,
  PushSubscriptionSchema,
  UpdateEmailSchema,
  LLMResponseSchema,
  ReminderRangeSchema,
  UpdateReminderStatusSchema
} from './schemas.js';

test('assistant requests require a bounded, non-empty message', () => {
  assert.deepEqual(AssistantRequestSchema.parse({ message: '  Ver mis pendientes  ' }), {
    message: 'Ver mis pendientes'
  });
  assert.equal(AssistantRequestSchema.safeParse({ message: '  ' }).success, false);
  assert.equal(AssistantRequestSchema.safeParse({ message: 12 }).success, false);
  assert.equal(AssistantRequestSchema.safeParse({ message: 'x'.repeat(2001) }).success, false);
});

test('LLM create and update actions require safe, actionable data', () => {
  const createResult = {
    action: 'CREATE',
    data: { title: 'Llamar al médico', reminder_date: '2030-02-01T12:00:00Z' },
    reply: 'Recordatorio creado.'
  };
  assert.equal(LLMResponseSchema.safeParse(createResult).success, true);
  assert.equal(LLMResponseSchema.safeParse({
    ...createResult,
    data: { ...createResult.data, reminder_date: 'mañana' }
  }).success, false);
  assert.equal(LLMResponseSchema.safeParse({
    action: 'CREATE',
    data: { title: 'Llamar al médico' },
    reply: 'Recordatorio creado.'
  }).success, false);

  const updateResult = {
    action: 'UPDATE',
    data: { reminder_id: '3b241101-e2bb-4255-8caf-4136c566a962', title: 'Llamar a la clínica' },
    reply: 'Recordatorio actualizado.'
  };
  assert.equal(LLMResponseSchema.safeParse(updateResult).success, true);
  assert.equal(LLMResponseSchema.safeParse({
    ...updateResult,
    data: { reminder_id: updateResult.data.reminder_id }
  }).success, false);
});

test('LLM delete actions require a UUID reminder id', () => {
  assert.equal(LLMResponseSchema.safeParse({
    action: 'DELETE',
    data: { reminder_id: '3b241101-e2bb-4255-8caf-4136c566a962' },
    reply: 'Recordatorio eliminado.'
  }).success, true);
  assert.equal(LLMResponseSchema.safeParse({
    action: 'DELETE',
    data: {},
    reply: 'Recordatorio eliminado.'
  }).success, false);
});

test('reminder query ranges require valid, increasing ISO dates', () => {
  assert.equal(ReminderRangeSchema.safeParse({
    from: '2030-04-01T00:00:00Z',
    to: '2030-05-01T00:00:00Z'
  }).success, true);
  assert.equal(ReminderRangeSchema.safeParse({
    from: '2030-05-01T00:00:00Z',
    to: '2030-04-01T00:00:00Z'
  }).success, false);
  assert.equal(ReminderRangeSchema.safeParse({
    from: '2028-01-01T00:00:00Z',
    to: '2030-01-01T00:00:00Z'
  }).success, false);
});

test('reminder status and model request accept only supported values', () => {
  assert.equal(UpdateReminderStatusSchema.safeParse({ status: 'cancelled' }).success, true);
  assert.equal(UpdateReminderStatusSchema.safeParse({ status: 'cancelado' }).success, false);
  assert.equal(ActiveModelSchema.safeParse({ model: 'qwen2.5:3b' }).success, true);
  assert.equal(ActiveModelSchema.safeParse({ model: '  ' }).success, false);
});

test('email change requests require a valid email and trim whitespace', () => {
  assert.deepEqual(UpdateEmailSchema.parse({ email: '  next@example.test  ' }), {
    email: 'next@example.test'
  });
  assert.equal(UpdateEmailSchema.safeParse({ email: 'not-an-email' }).success, false);
});

test('push offsets are bounded and subscription endpoints use supported push services', () => {
  assert.equal(NotificationOffsetSchema.safeParse(0).success, true);
  assert.equal(NotificationOffsetSchema.safeParse(10080).success, true);
  assert.equal(NotificationOffsetSchema.safeParse(525600).success, true);
  assert.equal(NotificationOffsetSchema.safeParse(525601).success, false);

  const subscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/opaque',
    expirationTime: null,
    keys: { p256dh: '01234567890123456789', auth: 'secret-auth-key' }
  };
  assert.equal(PushSubscriptionSchema.safeParse(subscription).success, true);
  assert.equal(PushEndpointSchema.safeParse({ endpoint: 'http://127.0.0.1/private' }).success, false);
});
