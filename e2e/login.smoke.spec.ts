import { expect, test } from '@playwright/test';

test('cold start permits login, issues HttpOnly JWT and opens a guarded route', async ({ page }) => {
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
  expect(await page.evaluate(() => document.cookie)).not.toContain('JWT_TOKEN');

  const me = await page.request.get('http://localhost:8080/api/v1/auth/me');
  expect(me.status()).toBe(200);
  expect((await me.json()).username).toBe(username);
});
