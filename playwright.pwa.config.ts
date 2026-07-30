import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/pwa',
  outputDir: './e2e/pwa-results',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [['list']] : [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4174/Mangane/',
    serviceWorkers: 'allow',
    trace: 'retain-on-failure',
  },
  projects: [{
    name: 'pwa-chromium',
    use: {
      ...devices['Desktop Chrome'],
    },
  }],
  webServer: {
    command: 'node scripts/serve-pwa-fixture.js',
    port: 4174,
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      ...process.env,
      PWA_FIXTURE_ROOT: 'static/Mangane',
      PWA_FIXTURE_BASE_PATH: '/Mangane/',
      PWA_FIXTURE_PORT: '4174',
    },
  },
});
