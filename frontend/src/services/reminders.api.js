import { ApiError, apiRequest } from './api-client.js';

export const getReminders = async (from, to) => {
  const result = await apiRequest(
    `/reminders?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
  if (!Array.isArray(result.reminders)) {
    throw new ApiError('La respuesta del servidor no contiene una lista válida de recordatorios.', 502);
  }
  return result;
};

export const setReminderStatus = (id, status) => apiRequest(
  `/reminders/${encodeURIComponent(id)}/status`,
  { method: 'PATCH', body: { status } }
);

export const setReminderNotificationOffset = (id, notificationOffsetMinutes) => apiRequest(
  `/reminders/${encodeURIComponent(id)}/notification-offset`,
  { method: 'PATCH', body: { notificationOffsetMinutes } }
);
