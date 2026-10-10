import { apiRequest } from './api-client.js';

export const getAdminAccess = () => apiRequest('/admin/access');
export const getModelSettings = () => apiRequest('/admin/models');
export const setActiveModel = model => apiRequest('/admin/model', {
  method: 'PUT',
  body: { model }
});
