// Only this backend filter contract proves a write was rejected before its controller.
// Do not replay arbitrary 403s, server errors or interrupted AI streams.
export function isCsrfRejection(status: number, body: unknown): boolean {
  if (status !== 403 || !body || typeof body !== 'object') return false;
  const code = (body as { code?: unknown }).code;
  return code === 'CSRF_TOKEN_MISSING' || code === 'CSRF_TOKEN_INVALID';
}
