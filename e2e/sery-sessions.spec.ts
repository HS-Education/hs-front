import {test, expect} from '@playwright/test';

test('deleting all Sery sessions leaves one replacement and uses an accessible confirmation dialog', async ({page}) => {
  let sessions = [1, 2].map(id => ({id, courseId: null, userId: 42, sessionNumber: id}));
  let creations = 0;
  await page.addInitScript(() => localStorage.setItem('appLang', 'es'));
  await page.route('**/api/v1/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/v1', '');
    let body: unknown = [];
    if (path === '/auth/me') body = {id: 42, name: 'Synthetic Student', username: 'ST42', roles: ['STUDENT']};
    else if (path === '/auth/csrf') body = {token: 'synthetic-masked-token', headerName: 'X-XSRF-TOKEN'};
    else if (path === '/onboarding/status') body = {completed: true, quizzesCompleted: true, repositoryCompleted: true};
    else if (path === '/academic-years') body = [{id: 1, year: 2026, status: 'ACTIVE'}];
    else if (path.endsWith('/unread-count')) body = {count: 0};
    else if (path === '/chat/sessions') {
      if (request.method() === 'POST') {
        creations++;
        await new Promise(resolve => setTimeout(resolve, 350));
        const created = {id: 100 + creations, courseId: null, userId: 42, sessionNumber: 1};
        sessions.push(created);
        body = created;
      } else body = [...sessions];
    } else if (/^\/chat\/sessions\/\d+$/.test(path) && request.method() === 'DELETE') {
      sessions = sessions.filter(session => session.id !== Number(path.split('/').pop()));
      await route.fulfill({status: 204});
      return;
    }
    await route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(body)});
  });
  await page.goto('/home');
  await page.locator('#sery-bubble').click();
  const bubble = page.locator('app-sery-bubble');
  await bubble.locator('header button').first().click();
  const deletes = () => bubble.getByRole('button', {name: 'Eliminar sesión', exact: true});
  await expect(deletes()).toHaveCount(2);
  // A click inside the menu must leave it open.
  await bubble.getByText('Sesiones', {exact: true}).click();
  await expect(deletes()).toHaveCount(2);
  // A click elsewhere inside the chat closes the sessions menu.
  await bubble.locator('footer input').click();
  await expect(deletes()).toHaveCount(0);
  // The new-chat menu follows the same behavior, including clicks outside the chat.
  const newChat = bubble.getByRole('button', {name: 'Nueva sesión', exact: true});
  await newChat.click();
  const generalChat = bubble.getByRole('button', {name: 'Chat general', exact: true});
  await expect(generalChat).toBeVisible();
  await page.locator('body').click({position: {x: 5, y: 5}});
  await expect(generalChat).not.toBeVisible();
  await newChat.click();
  await expect(generalChat).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(generalChat).not.toBeVisible();
  expect(creations).toBe(0);
  await bubble.locator('header button').first().click();
  await deletes().first().click();
  const dialog = page.getByRole('dialog', {name: 'Eliminar Sesión', exact: true});
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Esta acción no se puede deshacer');
  await expect(dialog.getByRole('button', {name: 'Cancelar'})).toBeFocused();
  await page.screenshot({path: 'test-results/sery-delete-dialog.png'});
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await bubble.locator('header button').first().click();
  await deletes().first().click();
  await dialog.getByRole('button', {name: 'Eliminar Sesión', exact: true}).click();
  await expect(dialog).not.toBeVisible();
  await bubble.locator('header button').first().click();
  await expect(deletes()).toHaveCount(1);
  await deletes().first().click();
  await dialog.getByRole('button', {name: 'Eliminar Sesión', exact: true}).click();
  await expect(dialog).not.toBeVisible();
  await expect.poll(() => creations).toBe(1);
  await expect(bubble.getByText('Sesión #1', {exact: true}).first()).toBeVisible();
  await bubble.locator('header button').first().click();
  await expect(deletes()).toHaveCount(1);
  expect(creations).toBe(1);
});
