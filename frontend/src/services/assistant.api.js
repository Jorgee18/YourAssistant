import { apiRequest } from './api-client.js';

export const sendAssistantMessage = message => apiRequest('/assistant/prompt', {
  method: 'POST',
  body: { message }
});
