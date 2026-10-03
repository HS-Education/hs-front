import {expect, Page, test} from '@playwright/test';

// Synthetic API only: exercise the real Angular interceptor, fetch stream and UI.
// No backend/cloud accounts, document data or AI provider traffic.
async function fixture(page: Page, options: {streamRejections?: number; serverFailure?: boolean; logoutRejection?: boolean} = {}) {
  let authenticated = true;
  let bootstraps = 0;
  let attempts = 0;
  let generations = 0;
  let logouts = 0;
  let created = 0;
  const streamTokens: string[] = [];
  const logoutTokens: string[] = [];
  const sessions = [{id: 42, courseId: null, userId: 7, sessionNumber: 1}];
  const profile = {id: 7, name: 'Synthetic Coordinator', username: 'fixture', roles: ['COORDINATOR']};
  await page.addInitScript(() => localStorage.setItem('appLang', 'es'));
  await page.route('**/api/v1/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/v1', '');
    let status = 200;
    let body: unknown = [];
    if (path === '/auth/me') {status = authenticated ? 200 : 401; body = authenticated ? profile : {};}
    else if (path === '/auth/refresh-token') {status = 401; body = {};}
    else if (path === '/auth/csrf') {
      bootstraps++;
      body = {token: bootstraps === 1 ? 'old-masked-token-fixture' : 'fresh-masked-token-fixture', headerName: 'X-XSRF-TOKEN'};
    } else if (path === '/auth/log-out') {
      logouts++;
      logoutTokens.push(request.headers()['x-xsrf-token']);
      if (options.logoutRejection && logouts === 1) {status = 403; body = {code: 'CSRF_TOKEN_INVALID'};}
      else {authenticated = false; body = {};}
    } else if (path === '/onboarding/status') body = {completed: true, quizzesCompleted: true, repositoryCompleted: true};
    else if (path.endsWith('/unread-count')) body = {count: 0};
    else if (path === '/chat/sessions') {
      if (request.method() === 'POST') {
        created++;
        const session = {id: 42 + created, courseId: null, userId: 7, sessionNumber: sessions.length + 1};
        sessions.push(session);
        status = 201;
        body = session;
      } else body = sessions;
    } else if (/\/chat\/sessions\/\d+\/stream$/.test(path)) {
      attempts++;
      streamTokens.push(request.headers()['x-xsrf-token']);
      if (attempts <= (options.streamRejections ?? 0)) {status = 403; body = {code: 'CSRF_TOKEN_INVALID'};}
      else if (options.serverFailure) {status = 500; body = {};}
      else {
        generations++;
        await route.fulfill({status: 200, contentType: 'text/event-stream', body:
          `event: token\ndata: {"text":"Respuesta sintética ${generations}"}\n\nevent: done\ndata: {}\n\n`});
        return;
      }
    }
    await route.fulfill({status, contentType: 'application/json', body: JSON.stringify(body)});
  });
  return {
    counts: () => ({bootstraps, attempts, generations, logouts, created}),
    streamTokens: () => [...streamTokens],
    logoutTokens: () => [...logoutTokens],
  };
}

async function openBubble(page: Page) {
  await page.goto('/home');
  await page.locator('#sery-bubble').click();
  const bubble = page.locator('app-sery-bubble');
  await expect(bubble.getByRole('textbox')).toBeVisible();
  return bubble;
}

test('new session, three consecutive answers, one safe CSRF recovery and UI logout', async ({page}) => {
  const api = await fixture(page, {streamRejections: 1});
  const bubble = await openBubble(page);
  await bubble.getByTitle('Nueva sesión', {exact: true}).click();
  await bubble.getByRole('button', {name: 'Chat general', exact: true}).click();
  for (let turn = 1; turn <= 3; turn++) {
    await bubble.getByRole('textbox').fill(`Saludo sintético ${turn}`);
    await bubble.locator('button[type="submit"]').click();
    await expect(bubble.getByText(`Respuesta sintética ${turn}`, {exact: true})).toBeVisible();
    await expect(bubble.locator('button[type="submit"]')).toBeDisabled();
  }
  await expect(bubble).not.toContainText('La respuesta se interrumpió');
  await page.getByTitle('Cerrar sesión', {exact: true}).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  expect(api.counts()).toEqual({bootstraps: 2, attempts: 4, generations: 3, logouts: 1, created: 1});
  expect(api.streamTokens()).toEqual(['old-masked-token-fixture', ...Array(3).fill('fresh-masked-token-fixture')]);
  expect(api.logoutTokens()).toEqual(['fresh-masked-token-fixture']);
});

test('server failure before streaming is reported accurately and never replayed', async ({page}) => {
  const api = await fixture(page, {serverFailure: true});
  const bubble = await openBubble(page);
  await bubble.getByRole('textbox').fill('Saludo sintético');
  await bubble.locator('button[type="submit"]').click();
  await expect(bubble).toContainText('El servidor no pudo iniciar la respuesta de Sery');
  await expect(bubble).not.toContainText('La respuesta se interrumpió');
  await expect(bubble.getByRole('textbox')).toHaveValue('Saludo sintético');
  expect(api.counts().attempts).toBe(1);
  expect(api.counts().generations).toBe(0);
});

test('repeated CSRF rejection stops after one recovery without generating an AI answer', async ({page}) => {
  const api = await fixture(page, {streamRejections: 10});
  const bubble = await openBubble(page);
  await bubble.getByRole('textbox').fill('Saludo sintético');
  await bubble.locator('button[type="submit"]').click();
  await expect(bubble).toContainText('No se pudo autorizar la consulta');
  expect(api.counts().attempts).toBe(2);
  expect(api.counts().generations).toBe(0);
});

test('Angular logout renews a stale CSRF token once and finishes through the real control', async ({page}) => {
  const api = await fixture(page, {logoutRejection: true});
  await page.goto('/home');
  await page.getByTitle('Cerrar sesión', {exact: true}).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  expect(api.counts().bootstraps).toBe(2);
  expect(api.counts().logouts).toBe(2);
  expect(api.logoutTokens()).toEqual(['old-masked-token-fixture', 'fresh-masked-token-fixture']);
});
