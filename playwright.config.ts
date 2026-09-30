import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: process.env['PLAYWRIGHT_BASE_URL']?.startsWith('https://') ? 90_000 : 30_000,
  retries: 0,
  reporter: [
    ['list'],
    ['junit', { outputFile: process.env['PLAYWRIGHT_JUNIT_OUTPUT_FILE'] ?? 'test-results/playwright-junit.xml' }],
  ],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:4200',
    // Cloud traces can capture passwords, authentication cookies and document content.
    trace: process.env['PLAYWRIGHT_BASE_URL']?.startsWith('https://') ? 'off' : 'retain-on-failure',
  },
});
