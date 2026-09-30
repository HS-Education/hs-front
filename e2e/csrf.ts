import { expect, type APIRequestContext } from '@playwright/test';

export async function csrfHeaders(context: APIRequestContext, api: string): Promise<Record<string, string>> {
  const response = await context.get(`${api}/auth/csrf`);
  expect(response.status()).toBe(200);
  const resource = await response.json();
  expect(resource.headerName).toBe('X-XSRF-TOKEN');
  expect(typeof resource.token).toBe('string');
  return { 'X-XSRF-TOKEN': resource.token };
}
