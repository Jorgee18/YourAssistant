import assert from 'node:assert/strict';
import test from 'node:test';
import {
  handleAssistantMessage,
  ReminderNotFoundError
} from './assistant.service.js';

const createClient = ({ pending = [], inserted = null, deleted = null } = {}) => ({
  from(table) {
    let operation = 'select';
    let result = pending;
    const query = {
      select() { return this; },
      eq() { return this; },
      insert() { operation = 'insert'; result = inserted; return this; },
      delete() { operation = 'delete'; result = deleted; return this; },
      single() { return Promise.resolve({ data: result, error: null }); },
      maybeSingle() {
        return Promise.resolve({
          data: table === 'assistant_settings' ? { active_model: 'qwen2.5:3b' } : result,
          error: null
        });
      },
      then(resolve, reject) {
        return Promise.resolve({ data: operation === 'select' ? pending : result, error: null })
          .then(resolve, reject);
      }
    };
    return query;
  }
});

test('create response contains the confirmed inserted reminder, not the pre-insert list', async () => {
  const originalFetch = globalThis.fetch;
  let requestBody;
  const inserted = {
    id: 'reminder-new',
    title: 'Enviar informe',
    reminder_date: '2030-02-01T12:00:00Z',
    status: 'pending'
  };
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return Response.json({ response: JSON.stringify({
      action: 'CREATE',
      data: { title: inserted.title, reminder_date: inserted.reminder_date },
      reply: 'Recordatorio creado.'
    }) });
  };

  try {
    const response = await handleAssistantMessage(
      createClient({ pending: [], inserted }),
      'user-1',
      'Recuérdame enviar el informe'
    );
    assert.equal(requestBody.model, 'qwen2.5:3b');
    assert.deepEqual(response.reminder, inserted);
    assert.deepEqual(response.updatedReminders, [inserted]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('delete of a nonexistent or non-owned reminder is not reported as successful', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({
    response: JSON.stringify({
      action: 'DELETE',
      data: { reminder_id: '3b241101-e2bb-4255-8caf-4136c566a962' },
      reply: 'Recordatorio eliminado.'
    })
  });

  try {
    await assert.rejects(
      handleAssistantMessage(createClient(), 'user-1', 'Elimina ese recordatorio'),
      ReminderNotFoundError
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
