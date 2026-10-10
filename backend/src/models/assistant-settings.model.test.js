import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findAssistantSettings,
  updateActiveModel
} from './assistant-settings.model.js';

const createClient = response => {
  const calls = [];
  const query = {
    select(value) { calls.push(['select', value]); return this; },
    eq(field, value) { calls.push(['eq', field, value]); return this; },
    update(value) { calls.push(['update', value]); return this; },
    maybeSingle() { return Promise.resolve(response); },
    single() { return Promise.resolve(response); }
  };

  return {
    calls,
    client: { from(table) { calls.push(['from', table]); return query; } }
  };
};

test('assistant settings read the singleton active model', async () => {
  const settings = { id: 1, active_model: 'qwen2.5:3b' };
  const { client, calls } = createClient({ data: settings, error: null });

  assert.deepEqual(await findAssistantSettings(client), settings);
  assert.ok(calls.some(call => JSON.stringify(call) === JSON.stringify(['eq', 'id', 1])));
});

test('model changes record the administrator who made them', async () => {
  const settings = { id: 1, active_model: 'llama3.2:3b', updated_by: 'admin-1' };
  const { client, calls } = createClient({ data: settings, error: null });

  assert.deepEqual(await updateActiveModel(client, 'llama3.2:3b', 'admin-1'), settings);
  const update = calls.find(([name]) => name === 'update');
  assert.equal(update[1].active_model, 'llama3.2:3b');
  assert.equal(update[1].updated_by, 'admin-1');
});
