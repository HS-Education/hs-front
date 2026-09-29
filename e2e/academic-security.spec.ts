import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

// These scenarios run only against the gate's disposable database and users.
const api = 'http://localhost:8080/api/v1';

function credentials(prefix: string) {
  const username = process.env[`${prefix}_USERNAME`];
  const password = process.env[`${prefix}_PASSWORD`];
  if (!username || !password) throw new Error(`Missing isolated ${prefix} fixture`);
  return { username, password };
}

async function apiSignIn(context: APIRequestContext, prefix: string) {
  const response = await context.post(`${api}/auth/sign-in`, { data: credentials(prefix) });
  expect(response.status()).toBe(200);
}

async function uiSignIn(page: Page, prefix: string) {
  await page.goto('/sign-in');
  const account = credentials(prefix);
  await page.locator('#username').fill(account.username);
  await page.locator('#password').fill(account.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/(home|admin\/academic-years)$/);
}

test('admin-created area and course appear in the management UI; student cannot mutate them',
  async ({ request, page, browser }) => {
    await apiSignIn(request, 'ADMIN');
    const users = await request.get(`${api}/users`);
    expect(users.status()).toBe(200);
    const coordinator = (await users.json() as Array<{ id: number; username: string }>).find(
      user => user.username === credentials('COORDINATOR2').username);
    expect(coordinator).toBeTruthy();
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const areaName = `QA AREA ${suffix}`;
    const courseName = `QA COURSE ${suffix}`;
    const area = await request.post(`${api}/areas`, {
      data: { name: areaName, coordinatorId: coordinator!.id },
    });
    expect(area.status()).toBe(201);
    const areaId = (await area.json()).id as number;
    const course = await request.post(`${api}/courses`, { data: { name: courseName, areaId } });
    expect(course.status()).toBe(201);
    const courseId = (await course.json()).id as number;

    const studentContext = await browser.newContext();
    try {
      await apiSignIn(studentContext.request, 'SMOKE');
      expect((await studentContext.request.post(`${api}/areas`, {
        data: { name: `UNAUTHORIZED ${suffix}`, coordinatorId: null },
      })).status()).toBe(403);
      expect((await studentContext.request.delete(`${api}/courses/${courseId}`)).status()).toBe(403);

      await uiSignIn(page, 'ADMIN');
      await page.goto('/admin/courses');
      await expect(page.getByText(areaName, { exact: true }).first()).toBeVisible();
      await page.getByText(areaName, { exact: true }).first().click();
      await expect(page.getByText(courseName, { exact: true }).first()).toBeVisible();
      const courses = await request.get(`${api}/courses?areaId=${areaId}`);
      expect(courses.status()).toBe(200);
      expect(await courses.json()).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: courseId }),
      ]));
      const malformedFilter = await request.get(`${api}/courses?areaId=1%20OR%201%3D1`);
      expect(malformedFilter.status()).toBe(400);
      expect(await malformedFilter.text()).not.toMatch(/SQLSTATE|PSQLException|syntax error at/i);
    } finally {
      await studentContext.close();
      await request.delete(`${api}/courses/${courseId}`);
      await request.delete(`${api}/areas/${areaId}`);
    }
  });

test('corrupt PDF upload is rejected and does not create a document', async ({ request, playwright }) => {
  await apiSignIn(request, 'ADMIN');
  const users = await request.get(`${api}/users`);
  expect(users.status()).toBe(200);
  const coordinator = (await users.json() as Array<{ id: number; username: string }>).find(
    user => user.username === credentials('COORDINATOR').username);
  expect(coordinator).toBeTruthy();

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const area = await request.post(`${api}/areas`, {
    data: { name: `QA DOCUMENT AREA ${suffix}`, coordinatorId: coordinator!.id },
  });
  expect(area.status()).toBe(201);
  const areaId = (await area.json()).id as number;
  const course = await request.post(`${api}/courses`, {
    data: { name: `QA DOCUMENT COURSE ${suffix}`, areaId },
  });
  expect(course.status()).toBe(201);
  const courseId = (await course.json()).id as number;

  const yearList = await request.get(`${api}/academic-years`);
  const years = yearList.status() === 200 ? await yearList.json() as Array<{ id: number }> : [];
  if (years.length === 0) {
    const created = await request.post(`${api}/academic-years`);
    expect(created.status()).toBe(201);
    years.push(await created.json());
  }
  const periods = await request.get(`${api}/academic-years/${years[0].id}/grading-periods`);
  expect(periods.status()).toBe(200);
  const firstPeriod = (await periods.json() as Array<{ id: number; bimester: string }>).find(
    period => period.bimester === 'FIRST');
  expect(firstPeriod).toBeTruthy();

  const coordinatorContext = await playwright.request.newContext();
  try {
    await apiSignIn(coordinatorContext, 'COORDINATOR');
    const topic = await coordinatorContext.post(`${api}/courses/${courseId}/topics`, {
      data: { gradingPeriodId: firstPeriod!.id, name: `QA TOPIC ${suffix}` },
    });
    expect(topic.status()).toBe(201);
    const topics = await coordinatorContext.get(`${api}/courses/${courseId}/topics`);
    expect(topics.status()).toBe(200);
    const topicId = (await topics.json() as Array<{ id: number }>)[0].id;

    const before = await coordinatorContext.get(`${api}/courses/${courseId}/documents`);
    expect(before.status()).toBe(200);
    const beforeCount = (await before.json() as unknown[]).length;
    const response = await coordinatorContext.post(`${api}/courses/${courseId}/documents/bulk`, {
      multipart: {
        files: { name: 'corrupt.pdf', mimeType: 'application/pdf',
          buffer: Buffer.from('%PDF-1.7\ntruncated synthetic document') },
        data: JSON.stringify({ bimester: 'FIRST', documents: [{
          fileName: 'corrupt.pdf', title: 'Corrupt synthetic test', topicId,
          educationLevel: 'SECONDARY', gradeLevels: ['SECOND'],
        }] }),
      },
    });
    expect(response.status()).toBe(400);
    expect(await response.text()).not.toMatch(/PSQLException|SQLSTATE|truncated synthetic document/i);
    const after = await coordinatorContext.get(`${api}/courses/${courseId}/documents`);
    expect(after.status()).toBe(200);
    expect((await after.json() as unknown[]).length).toBe(beforeCount);
  } finally {
    await coordinatorContext.dispose();
    await request.delete(`${api}/courses/${courseId}`);
    await request.delete(`${api}/areas/${areaId}`);
  }
});
