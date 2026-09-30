const groups = [
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '0123456789', '!@#$%^&*()-_=+'
];

function randomIndex(bound: number): number {
  const limit = Math.floor(0x100000000 / bound) * bound;
  const buffer = new Uint32Array(1);
  do { globalThis.crypto.getRandomValues(buffer); } while (buffer[0] >= limit);
  return buffer[0] % bound;
}

export function generateSecurePassword(length = 16): string {
  if (!Number.isInteger(length) || length < 8 || length > 128) throw new Error('Invalid password length');
  if (!globalThis.crypto?.getRandomValues) throw new Error('Secure random generation is unavailable');
  const chars = groups.map(group => group[randomIndex(group.length)]);
  const all = groups.join('');
  while (chars.length < length) chars.push(all[randomIndex(all.length)]);
  // Fisher-Yates and rejection sampling avoid biased character/shuffle selection.
  for (let index = chars.length - 1; index > 0; index--) {
    const swap = randomIndex(index + 1);
    [chars[index], chars[swap]] = [chars[swap], chars[index]];
  }
  return chars.join('');
}
