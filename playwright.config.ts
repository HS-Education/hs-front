import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
  },
});
