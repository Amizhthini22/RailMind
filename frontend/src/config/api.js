// Dynamic API & WebSocket Configuration with Multi-Port Resilience

const DEFAULT_PORT = 8001;
const FALLBACK_PORT = 8000;

export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname || 'localhost';
    // Allow custom env variable if provided, otherwise default to port 8001 (fallback to 8000)
    return import.meta.env.VITE_API_URL || `http://${hostname}:${DEFAULT_PORT}`;
  }
  return `http://localhost:${DEFAULT_PORT}`;
};

export const getWsBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname || 'localhost';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return import.meta.env.VITE_WS_URL || `${protocol}//${hostname}:${DEFAULT_PORT}/ws`;
  }
  return `ws://localhost:${DEFAULT_PORT}/ws`;
};

// Resilient API fetcher with automatic port fallback (tries 8001, then 8000)
export async function apiFetch(endpoint, options = {}) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const base1 = getApiBaseUrl();
  
  try {
    const res = await fetch(`${base1}${cleanEndpoint}`, options);
    if (res.ok || res.status < 500) {
      return res;
    }
  } catch (err) {
    // Port 8001 failed, attempt fallback to port 8000
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const base2 = `http://${hostname}:${FALLBACK_PORT}`;
    try {
      return await fetch(`${base2}${cleanEndpoint}`, options);
    } catch (fallbackErr) {
      throw err;
    }
  }
  
  return fetch(`${base1}${cleanEndpoint}`, options);
}
