import { expect, test } from '@playwright/test';
import { csrfHeaders } from './csrf';

const api = process.env['PLAYWRIGHT_API_BASE_URL'] ?? 'http://localhost:8080/api/v1';

test('unknown routes, absent assets and disabled Swagger return safe 404 responses', async ({ request }) => {
  for (const path of ['/homeaaa', '/swagger-ui.html', '/swagger-ui/index.html', '/v3/api-docs',
    '/assets/hs-diagnostic-missing.svg', '/hs-diagnostic-missing.js']) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
    expect(response.headers()['content-type']).toContain('application/json');
    const body = await response.json();
    expect(body.status).toBe(404);
    expect(body.error).toBe('Not Found');
    expect(body.message).toBe('The requested resource was not found.');
    expect(typeof body.timestamp).toBe('string');
    expect(JSON.stringify(body)).not.toContain(path);
  }
});

test('anonymous visitors are redirected from protected application routes', async ({ page }) => {
  for (const route of ['/home', '/classrooms', '/repository', '/metrics', '/admin/users']) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/sign-in(?:\?.*)?$/);
    await expect(page.locator('#username')).toBeVisible();
  }
});

test('anonymous API requests cannot read an authenticated profile', async ({ request }) => {
  expect((await request.get(`${api}/auth/me`)).status()).toBe(401);
});

test('cold start permits login, secures cookies, restores a guarded route and logs out', async ({ page }) => {
  const username = process.env['SMOKE_USERNAME'];
  const password = process.env['SMOKE_PASSWORD'];
  if (!username || !password) throw new Error('SMOKE_USERNAME and SMOKE_PASSWORD are required');

  await page.goto('/sign-in');
  await expect(page.locator('#username')).toBeVisible();
  await page.locator('#username').fill(username);
  await page.locator('#password').fill(`${password}-invalid`);
  const invalidResponse = page.waitForResponse(response => response.url().endsWith('/auth/sign-in'));
  await page.locator('button[type="submit"]').click();
  expect((await invalidResponse).status()).toBe(401);

  await page.locator('#password').fill(password);
  const validResponse = page.waitForResponse(response => response.url().endsWith('/auth/sign-in'));
  await page.locator('button[type="submit"]').click();
  expect((await validResponse).status()).toBe(200);
  await expect(page).toHaveURL(/\/(home|admin\/academic-years)(?:\?.*)?$/);

  const tokenCookie = (await page.context().cookies()).find(cookie => cookie.name === 'JWT_TOKEN');
  expect(tokenCookie?.httpOnly).toBe(true);
  expect(tokenCookie?.sameSite).toBe('Strict');
  if (process.env['PLAYWRIGHT_BASE_URL']?.startsWith('https://')) {
    expect(tokenCookie?.secure).toBe(true);
  }
  expect(await page.evaluate(() => document.cookie)).not.toContain('JWT_TOKEN');

  const me = await page.request.get(`${api}/auth/me`);
  expect(me.status()).toBe(200);
  expect((await me.json()).username).toBe(username);
  // A missing authenticated API must be 404, not an Angular fallback or a 500.
  const missingApi = await page.request.get(`${api}/hs-diagnostic-missing`);
  expect(missingApi.status()).toBe(404);
  expect((await missingApi.json()).status).toBe(404);
  await page.reload();
  await expect(page).toHaveURL(/\/(home|admin\/academic-years)(?:\?.*)?$/);

  // Capture the same session before either response clears its cookies.
  // Repeated requests must not fail when another request revoked the token.
  const headers = { ...await csrfHeaders(page.request, api), Origin: new URL(page.url()).origin };
  // POST on this GET-only endpoint exercises CSRF without changing any cloud data.
  // Keep the same cookie/token across writes: fresh bootstrap per write hid the regression.
  for (let turn = 0; turn < 3; turn++) {
    const rejectedMethod = await page.request.post(`${api}/auth/csrf`, {data: {}, headers});
    expect(rejectedMethod.status()).toBe(405);
    expect((await rejectedMethod.json()).status).toBe(405);
  }
  const logouts = await Promise.all(Array.from({length: 4}, () =>
    page.request.post(`${api}/auth/log-out`, {data: {}, headers})));
  for (const logout of logouts) expect(logout.status()).toBe(200);
  expect((await page.request.get(`${api}/auth/me`)).status()).toBe(401);
  await page.goto('/home');
  await expect(page).toHaveURL(/\/sign-in(?:\?.*)?$/);
});
