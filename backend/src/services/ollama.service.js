import { LLMResponseSchema } from '../models/schemas.js';

export const listOllamaModels = async () => {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  const response = await fetch(`${ollamaUrl}/api/tags`, {
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) throw new Error('Error al consultar los modelos de Ollama');

  const result = await response.json();
  return Array.isArray(result.models)
    ? result.models.map(model => model.name).filter(Boolean)
    : [];
};

export const processAssistantPrompt = async (userPrompt, existingReminders = [], model) => {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  const currentDate = new Date().toISOString();

  const systemPrompt = `
Eres la secretaria virtual del usuario. Tu trabajo es interpretar su solicitud sobre recordatorios y responder EXCLUSIVAMENTE en formato JSON valido.

FECHA ACTUAL: ${currentDate}

RECORDATORIOS EXISTENTES DEL USUARIO:
${JSON.stringify(existingReminders, null, 2)}

ACCIONES POSIBLES:
- "CREATE": si el usuario quiere crear un recordatorio.
- "READ": si el usuario pregunta por sus recordatorios.
- "UPDATE": si el usuario pide modificar un recordatorio existente; incluye su reminder_id y solo los campos que cambian.
- "DELETE": si el usuario pide eliminar uno; incluye su reminder_id.
- "UNKNOWN": si es una conversación general o no tiene relación con recordatorios.

DEBES RESPONDER UNICAMENTE CON ESTE FORMATO JSON (sin texto adicional, sin bloques de codigo markdown):
{
  "action": "CREATE" | "READ" | "UPDATE" | "DELETE" | "UNKNOWN",
  "data": {
    "title": "Titulo del recordatorio",
    "description": "Detalle opcional",
    "reminder_date": "Fecha UTC ISO 8601 terminada en Z, por ejemplo 2030-04-05T13:30:00.000Z",
  "reminder_id": "UUID si aplica para UPDATE o DELETE"
  },
  "reply": "Respuesta amable y concisa para el usuario en español"
}
Si una fecha no aplica, omite reminder_date; no uses null. Las fechas deben estar en UTC y terminar en Z, nunca uses un offset local.
`;

  const response = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt: `${systemPrompt}\n\nMENSAJE DEL USUARIO:\n${JSON.stringify(userPrompt)}`,
      stream: false,
      format: 'json'
    })
  });

  if (!response.ok) {
    throw new Error('Error al comunicarse con Ollama');
  }

  const result = await response.json();
  const parsedJson = JSON.parse(result.response);

  const reminderDate = parsedJson?.data?.reminder_date;
  if (typeof reminderDate === 'string') {
    const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(reminderDate);
    const dateValue = reminderDate.includes('T') && !hasTimezone
      ? `${reminderDate}Z`
      : reminderDate;
    const normalizedDate = new Date(dateValue);
    if (!Number.isNaN(normalizedDate.getTime())) {
      parsedJson.data.reminder_date = normalizedDate.toISOString();
    }
  }
  
  // Validar la respuesta del LLM con Zod
  return LLMResponseSchema.parse(parsedJson);
};
