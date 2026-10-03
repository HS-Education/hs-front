import {expect, Page, test} from '@playwright/test';

// UI regressions use synthetic API fixtures: no users or academic data are
// created, and no requests are sent to Azure or an AI provider.
async function mockApi(page: Page, options: {authenticated?: boolean; student?: boolean; planned?: boolean} = {}) {
  let authenticated = options.authenticated ?? false;
  let completed = false;
  let completions = 0;
  const profile = {id: 42, name: 'María Torres', username: '20260042', roles: [options.student ? 'STUDENT' : 'ADMIN']};
  await page.addInitScript(() => {
    localStorage.setItem('appLang', 'es');
    localStorage.setItem('hs-theme', 'light');
  });
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    let status = 200;
    let body: unknown = [];
    if (path === '/auth/csrf') body = {token: 'synthetic-masked-token', headerName: 'X-XSRF-TOKEN'};
    else if (path === '/auth/sign-in') {authenticated = true; body = profile;}
    else if (path === '/auth/me') {status = authenticated ? 200 : 401; body = authenticated ? profile : {};}
    else if (path === '/auth/refresh-token') {status = 401; body = {};}
    else if (path === '/auth/log-out') {authenticated = false; body = {};}
    else if (path === '/onboarding/status') body = {completed, quizzesCompleted: false, repositoryCompleted: false};
    else if (path === '/onboarding/complete') {
      completions++;
      status = completions === 1 ? 503 : 200;
      completed = completions > 1;
      body = {};
    } else if (path === '/academic-years') {
      body = [{id: 1, year: 2026, status: options.planned ? 'PLANNED' : 'ACTIVE'}];
    } else if (path.endsWith('/unread-count')) body = {count: 0};
    await route.fulfill({status, contentType: 'application/json', body: JSON.stringify(body)});
  });
  return {completions: () => completions};
}

test('sign-in shows and hides the password without submitting it', async ({page}) => {
  await mockApi(page);
  await page.goto('/sign-in');
  await page.locator('#password').fill('Synthetic-secret!');
  await expect(page.locator('#password')).toHaveAttribute('type', 'password');
  await page.getByRole('button', {name: 'Mostrar contraseña', exact: true}).click();
  await expect(page.locator('#password')).toHaveAttribute('type', 'text');
  await expect(page.getByRole('button', {name: 'Ocultar contraseña', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', {name: 'Ocultar contraseña', exact: true}).click();
  await expect(page.locator('#password')).toHaveValue('Synthetic-secret!');
  await expect(page.locator('#password')).toHaveAttribute('type', 'password');
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', 'brand/hs-education.svg');
});

test('password-update fields have independent accessible visibility controls', async ({page}) => {
  await mockApi(page);
  await page.goto('/update-password?username=20260042');
  for (const field of ['oldPassword', 'newPassword', 'confirmPassword']) {
    await page.locator(`#${field}`).fill('Synthetic-secret!');
    await page.locator(`button[aria-controls="${field}"]`).click();
    await expect(page.locator(`#${field}`)).toHaveAttribute('type', 'text');
    await page.locator(`button[aria-controls="${field}"]`).click();
    await expect(page.locator(`#${field}`)).toHaveAttribute('type', 'password');
  }
});

test('admin uses name initials and can copy a generated password', async ({page}) => {
  await mockApi(page, {authenticated: true});
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {
      writeText: async (value: string) => { (window as any).__clipboardFixture = value; },
    }});
  });
  await page.goto('/admin/users');
  await expect(page.locator('app-navbar').getByText('MT', {exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Nuevo Usuario', exact: true}).click();
  const copy = page.getByRole('button', {name: 'Copiar contraseña', exact: true});
  await expect(copy).toBeDisabled();
  await page.getByTitle('Generar contraseña segura', {exact: true}).click();
  await expect(copy).toBeEnabled();
  const generated = await page.locator('app-modal input[readonly]').inputValue();
  await copy.click();
  expect(await page.evaluate(() => (window as any).__clipboardFixture)).toBe(generated);
  await expect(page.getByText('Contraseña copiada', {exact: true})).toBeVisible();
});

test('logout blocks repeated clicks while pending and permits retry after failure', async ({page}) => {
  await mockApi(page, {authenticated: true});
  let calls = 0;
  let release!: () => void;
  const pending = new Promise<void>(resolve => {release = resolve;});
  await page.route('**/api/v1/auth/log-out', async route => {
    calls++;
    if (calls === 1) {
      await pending;
      await route.fulfill({status: 500, contentType: 'application/json', body: '{}'});
    } else {
      await route.fulfill({status: 200, contentType: 'application/json', body: '{}'});
    }
  });
  await page.goto('/admin/users');
  const logout = page.getByTitle('Cerrar sesión', {exact: true});
  await logout.evaluate(element => {
    (element as HTMLButtonElement).click();
    (element as HTMLButtonElement).click();
  });
  await expect(logout).toBeDisabled();
  await expect(logout).toHaveAttribute('aria-busy', 'true');
  await expect.poll(() => calls).toBe(1);
  release();
  await expect(logout).toBeEnabled();
  await logout.click();
  await expect(page).toHaveURL(/\/sign-in$/);
  expect(calls).toBe(2);
});

test('classroom planning message is translated and generation note respects both themes', async ({page}) => {
  await mockApi(page, {authenticated: true});
  await page.goto('/admin/classrooms');
  await expect(page.getByText(/solo está disponible cuando el año académico actual está en planificación/)).toBeVisible();
  await expect(page.locator('app-classrooms-management')).not.toContainText('PLANNED');
  await mockApi(page, {authenticated: true, planned: true});
  await page.reload();
  await page.getByRole('button', {name: 'Generar Aulas del Año', exact: true}).click();
  const note = page.locator('.admin-classrooms-info').first();
  await expect(note).toBeVisible();
  for (const dark of [false, true]) {
    await page.evaluate(value => document.documentElement.classList.toggle('dark', value), dark);
    await expect.poll(() => note.evaluate(element => {
      const root = getComputedStyle(document.documentElement);
      const background = getComputedStyle(element).backgroundColor;
      const text = getComputedStyle(element.querySelector('p')!).color;
      const probe = document.createElement('span');
      probe.style.backgroundColor = root.getPropertyValue('--color-info-soft');
      probe.style.color = root.getPropertyValue('--text-primary');
      document.body.append(probe);
      const expected = getComputedStyle(probe);
      const matches = background === expected.backgroundColor && text === expected.color;
      probe.remove();
      return matches;
    })).toBe(true);
  }
});

test('tutorial remains open on save failure, retries, and stays completed after reload', async ({page}) => {
  const api = await mockApi(page, {authenticated: true, student: true});
  await page.goto('/home');
  const tutorial = page.locator('app-onboarding-modal');
  await expect(tutorial.getByRole('heading')).toBeVisible();
  for (let i = 0; i < 3; i++) await tutorial.getByRole('button', {name: 'Siguiente', exact: true}).click();
  await tutorial.getByRole('button', {name: 'Comenzar', exact: true}).click();
  await expect(tutorial.getByRole('alert')).toContainText('No se pudo guardar el tutorial');
  await expect(tutorial.getByRole('heading')).toBeVisible();
  await tutorial.getByRole('button', {name: 'Comenzar', exact: true}).click();
  await expect(tutorial).toHaveCount(0);
  expect(api.completions()).toBe(2);
  await page.reload();
  await expect(page.locator('app-home')).toBeVisible();
  await expect(page.locator('app-onboarding-modal')).toHaveCount(0);
});
