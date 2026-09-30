import { apiBaseUrl, loadRuntimeConfig, validateRuntimeConfig } from './runtime-config';

describe('public runtime configuration', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('supports same-origin and direct HTTPS API hosting', () => {
    expect(validateRuntimeConfig({ apiBaseUrl: '/api/v1' }).apiBaseUrl).toBe('/api/v1');
    expect(validateRuntimeConfig({ apiBaseUrl: 'https://api.example.org/api/v1' }).apiBaseUrl).toBe('https://api.example.org/api/v1');
  });
  it('rejects secrets and malformed URLs', () => {
    for (const config of [null, [], { apiBaseUrl: '/api/v1', key: 'secret' },
      { apiBaseUrl: 'http://api.example.org/api/v1' }, { apiBaseUrl: 'https://key@api.example.org/api/v1' },
      { apiBaseUrl: 'https://api.example.org/api/v1?key=secret' }]) {
      expect(() => validateRuntimeConfig(config)).toThrow();
    }
  });
  it('loads configuration before any service captures the API address', async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ apiBaseUrl: 'https://api.example.org/api/v1' })));
    vi.stubGlobal('fetch', request);
    await loadRuntimeConfig();
    expect(apiBaseUrl()).toBe('https://api.example.org/api/v1');
    expect(request).toHaveBeenCalledWith('/runtime-config.json', { cache: 'no-store', credentials: 'omit' });
  });
  it('does not silently fall back to localhost after a deployment error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));
    await expect(loadRuntimeConfig()).rejects.toThrow('Deployment configuration is unavailable.');
  });
});
