import { apiRequest } from './api-client.js';

export const login = credentials => apiRequest('/auth/login', {
  method: 'POST',
  token: null,
  body: credentials
});

export const register = details => apiRequest('/auth/register', {
  method: 'POST',
  token: null,
  body: details
});

export const getProfile = () => apiRequest('/auth/profile');

export const updateProfile = details => apiRequest('/auth/profile', {
  method: 'PUT',
  body: details
});

export const requestEmailChange = email => apiRequest('/auth/profile/email', {
  method: 'PATCH',
  body: { email }
});
