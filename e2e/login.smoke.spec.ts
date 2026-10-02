import { expect, test } from '@playwright/test';
import { csrfHeaders } from './csrf';

const api = process.env['PLAYWRIGHT_API_BASE_URL'] ?? 'http://localhost:8080/api/v1';

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
  await page.reload();
  await expect(page).toHaveURL(/\/(home|admin\/academic-years)(?:\?.*)?$/);

  // Capture the same session before either response clears its cookies.
  // Repeated requests must not fail when another request revoked the token.
  const headers = { ...await csrfHeaders(page.request, api), Origin: new URL(page.url()).origin };
  const logouts = await Promise.all(Array.from({length: 4}, () =>
    page.request.post(`${api}/auth/log-out`, {data: {}, headers})));
  for (const logout of logouts) expect(logout.status()).toBe(200);
  expect((await page.request.get(`${api}/auth/me`)).status()).toBe(401);
  await page.goto('/home');
  await expect(page).toHaveURL(/\/sign-in(?:\?.*)?$/);
});
