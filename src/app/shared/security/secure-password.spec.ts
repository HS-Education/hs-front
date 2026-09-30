import { generateSecurePassword } from './secure-password';

describe('secure password generation', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it('uses cryptographic randomness and includes every required character class', () => {
    const weakRandom = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Weak RNG'); });
    for (let index = 0; index < 20; index++) {
      const password = generateSecurePassword();
      expect(password).toHaveLength(16);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[0-9]/);
      expect(password).toMatch(/[!@#$%^&*()\-_=+]/);
    }
    expect(weakRandom).not.toHaveBeenCalled();
  });
  it('fails closed when Web Crypto is unavailable', () => {
    vi.stubGlobal('crypto', undefined);
    expect(() => generateSecurePassword()).toThrow('Secure random');
  });
  it('validates length before generation', () => {
    for (const length of [0, 7, 129, 8.5, NaN]) expect(() => generateSecurePassword(length)).toThrow('length');
    expect(generateSecurePassword(8)).toHaveLength(8);
  });
  it('rejects values outside the unbiased sampling range', () => {
    let calls = 0;
    vi.stubGlobal('crypto', { getRandomValues: (buffer: Uint32Array) => {
      buffer[0] = calls++ === 0 ? 0xffffffff : 0;
      return buffer;
    } });
    expect(generateSecurePassword()).toHaveLength(16);
    expect(calls).toBeGreaterThan(30);
  });
});
