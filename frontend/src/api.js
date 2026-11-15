const localHost = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
const defaultApi = localHost ? `http://${window.location.hostname}:8010/api` : '/api';
const configuredApi = process.env.REACT_APP_API_URL?.trim() || defaultApi;

/** Usa el backend configurado y, si esa dirección falla, prueba el proxy /api. */
export async function apiFetch(path, options = {}) {
  const route = `/${String(path).replace(/^\/+/, '')}`;
  const primary = `${configuredApi.replace(/\/+$/, '')}${route}`;

  if (configuredApi === defaultApi) return fetch(primary, options);

  try {
    const response = await fetch(primary, options);
    if (response.ok || options.signal?.aborted) return response;
  } catch (error) {
    if (options.signal?.aborted) throw error;
  }

  return fetch(`${defaultApi}${route}`, options);
}
