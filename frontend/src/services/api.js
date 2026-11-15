import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_URL?.trim();

if (!apiBaseUrl) {
  throw new Error('VITE_API_URL is not configured. Set it in frontend/.env.');
}

const tokenStorageKey = 'queuepilot.jwt';
export const authUnauthorizedEvent = 'queuepilot:unauthorized';

export function getStoredToken() {
  return window.localStorage.getItem(tokenStorageKey);
}

export function storeToken(token) {
  window.localStorage.setItem(tokenStorageKey, token);
}

export function clearStoredToken() {
  window.localStorage.removeItem(tokenStorageKey);
}

function isCredentialRequest(url = '') {
  return /\/api\/auth\/(?:login|register)(?:\?|$)/.test(url);
}

const api = axios.create({
  baseURL: apiBaseUrl.replace(/\/+$/, ''),
});

api.interceptors.request.use((config) => {
  if (!isCredentialRequest(config.url)) {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !isCredentialRequest(error.config?.url)
    ) {
      clearStoredToken();
      window.dispatchEvent(new Event(authUnauthorizedEvent));
    }
    return Promise.reject(error);
  },
);

export default api;
