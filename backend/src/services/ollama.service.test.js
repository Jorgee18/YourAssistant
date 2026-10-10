import assert from 'node:assert/strict';
import test from 'node:test';
import { listOllamaModels, processAssistantPrompt } from './ollama.service.js';

test('available models are read from Ollama tags', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({
    models: [{ name: 'qwen2.5:3b' }, { name: 'llama3.2:3b' }, {}]
  });

  try {
    assert.deepEqual(await listOllamaModels(), ['qwen2.5:3b', 'llama3.2:3b']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('assistant generation uses the active model from application settings', async () => {
  const originalFetch = globalThis.fetch;
  let requestBody;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return Response.json({
      response: JSON.stringify({
        action: 'UNKNOWN',
        reply: 'Hola.'
      })
    });
  };

  try {
    const result = await processAssistantPrompt('Hola', [], 'llama3.2:3b');
    assert.equal(requestBody.model, 'llama3.2:3b');
    assert.equal(result.reply, 'Hola.');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('assistant generation normalizes offset dates to UTC before validation', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({
    response: JSON.stringify({
      action: 'CREATE',
      data: {
        title: 'Llamar al médico',
        reminder_date: '2030-04-05T10:30:00-03:00'
      },
      reply: 'Creé el recordatorio.'
    })
  });

  try {
    const result = await processAssistantPrompt('Llamar al médico a las 10:30', [], 'qwen2.5:3b');
    assert.equal(result.data.reminder_date, '2030-04-05T13:30:00.000Z');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
