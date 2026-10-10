import { apiRequest } from './api-client.js';

export const getPushConfig = () => apiRequest('/push/config');

export const savePushSubscription = subscription => apiRequest('/push/subscription', {
  method: 'PUT',
  body: subscription
});

export const removePushSubscription = endpoint => apiRequest('/push/subscription', {
  method: 'DELETE',
  body: { endpoint }
});
