import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.e2e.js',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL,
    viewport: { width: 1280, height: 720 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: ['**/phase11_touch.e2e.js', '**/phase12_release_smoke.e2e.js'],
    },
    {
      name: 'chromium-touch',
      testMatch: '**/phase11_touch.e2e.js',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
    {
      name: 'chromium-release',
      testMatch: '**/phase12_release_smoke.e2e.js',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox-release',
      testMatch: '**/phase12_release_smoke.e2e.js',
      use: { browserName: 'firefox' },
    },
    {
      name: 'webkit-release',
      testMatch: '**/phase12_release_smoke.e2e.js',
      use: { browserName: 'webkit' },
    },
  ],
  webServer: {
    command: 'npm run build:e2e && npm run preview -- --host 127.0.0.1 --outDir dist-e2e',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
