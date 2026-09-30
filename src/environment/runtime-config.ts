export interface RuntimeConfig { apiBaseUrl: string; }

let config: RuntimeConfig = { apiBaseUrl: '/api/v1' };

export function validateRuntimeConfig(value: unknown): RuntimeConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid deployment configuration.');
  const entries = Object.keys(value);
  const apiBaseUrl = (value as Record<string, unknown>)['apiBaseUrl'];
  if (entries.length !== 1 || entries[0] !== 'apiBaseUrl' || typeof apiBaseUrl !== 'string') {
    throw new Error('Only a public API URL is allowed in deployment configuration.');
  }
  if (apiBaseUrl === '/api/v1') return { apiBaseUrl };
  const url = new URL(apiBaseUrl);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash
      || url.pathname !== '/api/v1' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('An HTTPS API URL ending in /api/v1 is required.');
  }
  return { apiBaseUrl: url.href };
}

export async function loadRuntimeConfig(): Promise<void> {
  const response = await fetch('/runtime-config.json', { cache: 'no-store', credentials: 'omit' });
  if (!response.ok) throw new Error('Deployment configuration is unavailable.');
  config = validateRuntimeConfig(await response.json());
}

export function apiBaseUrl(): string { return config.apiBaseUrl; }
