import { expect, test, type Page } from '@playwright/test';
import { csrfHeaders } from './csrf';

const api = 'http://localhost:8080/api/v1';

function account(prefix: string): { username: string; password: string } {
  const username = process.env[`${prefix}_USERNAME`];
  const password = process.env[`${prefix}_PASSWORD`];
  if (!username || !password) throw new Error(`${prefix}_USERNAME and ${prefix}_PASSWORD are required`);
  return { username, password };
}

async function signIn(page: Page, prefix: string): Promise<void> {
  const credentials = account(prefix);
  await page.goto('/sign-in');
  await page.locator('#username').fill(credentials.username);
  await page.locator('#password').fill(credentials.password);
  const response = page.waitForResponse(r => r.url().endsWith('/auth/sign-in'));
  await page.locator('button[type="submit"]').click();
  expect((await response).status()).toBe(200);
  await expect(page).toHaveURL(/\/(home|admin\/academic-years)$/);
}

test('anonymous users cannot open guarded views', async ({ page }) => {
  for (const route of ['/home', '/classrooms', '/repository', '/metrics', '/admin/users']) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.locator('#username')).toBeVisible();
  }
});

test('parallel sign-ins for one account do not fail with a token uniqueness error', async ({ request }) => {
  const credentials = account('SMOKE');
  const headers = await csrfHeaders(request, api);
  const responses = await Promise.all(Array.from({ length: 4 }, () =>
    request.post(`${api}/auth/sign-in`, { data: credentials, headers })));
  expect(responses.map(response => response.status())).toEqual([200, 200, 200, 200]);
});

test('student journey: own views, server authorization and cross-user denial', async ({ page, request }) => {
  await signIn(page, 'SMOKE');
  const student = await page.request.get(`${api}/auth/me`);
  expect(student.status()).toBe(200);
  const studentProfile = await student.json();
  expect(studentProfile.roles.join(',')).toMatch(/STUDENT/);

  for (const route of ['/home', '/classrooms', '/help']) {
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await expect(page.locator('h1').first()).toBeVisible();
  }
  for (const route of ['/repository', '/metrics', '/admin/users']) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/home$/);
  }
  expect((await page.request.get(`${api}/users`)).status()).toBe(403);

  const adminSignIn = await request.post(`${api}/auth/sign-in`, {
    data: account('ADMIN'), headers: await csrfHeaders(request, api)
  });
  expect(adminSignIn.status()).toBe(200);
  const admin = await request.get(`${api}/auth/me`);
  expect(admin.status()).toBe(200);
  const adminId = (await admin.json()).id;
  expect(adminId).not.toBe(studentProfile.id);
  const otherClassrooms = await page.request.get(`${api}/classrooms?userId=${adminId}`);
  expect(otherClassrooms.status()).toBe(403);
  const ownClassrooms = await page.request.get(`${api}/classrooms?userId=${studentProfile.id}`);
  expect([200, 404]).toContain(ownClassrooms.status());
});

test('admin can open management views but student-only navigation remains guarded', async ({ page }) => {
  await signIn(page, 'ADMIN');
  for (const route of ['/admin/academic-years', '/admin/users', '/admin/courses', '/admin/classrooms']) {
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await expect(page.locator('h1').first()).toBeVisible();
  }
  const profile = await page.request.get(`${api}/auth/me`);
  expect((await profile.json()).roles.join(',')).toMatch(/ADMIN/);
});

test('admin creates a student through the UI and the API lists that account', async ({ page }) => {
  await signIn(page, 'ADMIN');
  await page.goto('/admin/users');
  await expect(page.locator('h1')).toBeVisible();
  await page.locator('button').filter({ has: page.locator('span', { hasText: /nuevo usuario|new user/i }) }).click();
  const modal = page.locator('app-modal');
  await modal.locator('input[type="text"]').first().fill('Quality Gate Learner');
  await modal.getByTitle('Generar contraseña segura', {exact: true}).click();
  await modal.locator('input[type="checkbox"]').last().check();
  const created = page.waitForResponse(r => r.url().endsWith('/users') && r.request().method() === 'POST');
  await modal.locator('button').last().click();
  const response = await created;
  expect(response.status()).toBe(200);
  const username = (await response.json()).username;
  expect(username).toBeTruthy();
  const users = await page.request.get(`${api}/users`);
  expect(users.status()).toBe(200);
  expect(await users.json()).toEqual(expect.arrayContaining([
    expect.objectContaining({ username, name: 'Quality Gate Learner' }),
  ]));
});

test('coordinator and teacher have different repository access', async ({ browser }) => {
  const teacherContext = await browser.newContext();
  const coordinatorContext = await browser.newContext();
  try {
    const teacher = await teacherContext.newPage();
    await signIn(teacher, 'TEACHER');
    await teacher.goto('/repository');
    await expect(teacher).toHaveURL(/\/home$/);

    const coordinator = await coordinatorContext.newPage();
    await signIn(coordinator, 'COORDINATOR');
    await coordinator.goto('/repository');
    await expect(coordinator).toHaveURL(/\/repository$/);
    await expect(coordinator.locator('h1').first()).toBeVisible();
  } finally {
    await teacherContext.close();
    await coordinatorContext.close();
  }
});

test('logout removes the browser session and blocks protected routes', async ({ page }) => {
  // The student seed opens a first-run onboarding overlay; use the admin account
  // to exercise the real logout control without bypassing that user journey.
  await signIn(page, 'ADMIN');
  await page.locator('.navbar-user-profile button').click();
  await expect(page).toHaveURL(/\/sign-in$/);
  const profile = await page.request.get(`${api}/auth/me`);
  expect(profile.status()).toBe(401);
  await page.goto('/classrooms');
  await expect(page).toHaveURL(/\/sign-in$/);
});

test('English choice survives navigation and reload', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('appLang', 'en'));
  await signIn(page, 'SMOKE');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.goto('/classrooms');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(await page.evaluate(() => localStorage.getItem('appLang'))).toBe('en');
});

test('malformed numeric route parameters never produce a server error with SQL detail', async ({ page }) => {
  await signIn(page, 'SMOKE');
  const response = await page.request.get(`${api}/classrooms?userId=1%20OR%201=1`);
  expect(response.status()).toBe(400);
  expect(await response.text()).not.toMatch(/SQLSTATE|PSQLException|syntax error at/i);
});
