import { expect, test, type APIRequestContext } from '@playwright/test';
import { csrfHeaders } from './csrf';

const api = 'http://localhost:8080/api/v1';

function credentials(prefix: string) {
  const username = process.env[`${prefix}_USERNAME`];
  const password = process.env[`${prefix}_PASSWORD`];
  if (!username || !password) throw new Error(`Missing isolated ${prefix} fixture`);
  return { username, password };
}

async function apiSignIn(context: APIRequestContext, prefix: string) {
  const response = await context.post(`${api}/auth/sign-in`, {
    data: credentials(prefix), headers: await csrfHeaders(context, api)
  });
  expect(response.status()).toBe(200);
}

test('every authenticated Angular route redirects anonymous visitors to sign-in', async ({ page }) => {
  const protectedRoutes = [
    '/',
    '/home',
    '/classrooms',
    '/classrooms/999999',
    '/classrooms/999999/quizzes/999999',
    '/repository',
    '/metrics',
    '/help',
    '/chat',
    '/admin/academic-years',
    '/admin/users',
    '/admin/courses',
    '/admin/classrooms',
  ];

  for (const route of protectedRoutes) {
    await page.goto(route);
    await expect(page, `${route} must require a session`).toHaveURL(/\/sign-in$/);
    await expect(page.locator('#username')).toBeVisible();
  }
});

test('role checks block unauthorized assessment actions and student cannot read a foreign instance',
  async ({ browser }) => {
    const teacherContext = await browser.newContext();
    const studentContext = await browser.newContext();
    try {
      await apiSignIn(teacherContext.request, 'TEACHER');
      const remedial = await teacherContext.request.post(`${api}/assessments/questionnaires/generate-remedial`, {
        headers: await csrfHeaders(teacherContext.request, api),
        data: {
          studentId: 1,
          courseId: 1,
          gradingPeriodId: 1,
          weekNumber: 1,
          topicId: 1,
          numQuestions: 1,
        },
      });
      expect(remedial.status()).toBe(403);

      await apiSignIn(studentContext.request, 'SMOKE');
      const generate = await studentContext.request.post(`${api}/assessments/questionnaires/generate`, {
        headers: await csrfHeaders(studentContext.request, api),
        data: {
          courseId: 1,
          gradingPeriodId: 1,
          weekNumber: 1,
          allowedAttempts: 1,
          questionsPerAttempt: 1,
        },
      });
      expect(generate.status()).toBe(403);

      const questions = await studentContext.request.get(
        `${api}/assessments/questionnaires/999999999/questions`);
      expect(questions.status()).toBe(403);
      expect(await questions.text()).not.toMatch(/SQLSTATE|PSQLException|stack trace/i);

      const results = await studentContext.request.get(
        `${api}/assessments/questionnaires/999999999/results`);
      expect(results.status()).toBe(404);
      expect(await results.text()).not.toMatch(/SQLSTATE|PSQLException|stack trace/i);
    } finally {
      await teacherContext.close();
      await studentContext.close();
    }
  });

test('numeric filters reject SQL-shaped input without database diagnostics', async ({ request }) => {
  await apiSignIn(request, 'ADMIN');
  const attacks = [
    `${api}/classrooms?userId=1%20OR%201%3D1`,
    `${api}/courses?areaId=1%20OR%201%3D1`,
    `${api}/courses/1%20OR%201%3D1/topics`,
  ];

  for (const url of attacks) {
    const response = await request.get(url);
    expect(response.status(), url).toBe(400);
    expect(await response.text()).not.toMatch(/SQLSTATE|PSQLException|syntax error at|select .* from/i);
  }
});
