import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  reporter: [
    ['list'],
    ['junit', { outputFile: process.env['PLAYWRIGHT_JUNIT_OUTPUT_FILE'] ?? 'test-results/playwright-junit.xml' }],
  ],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
  },
});
