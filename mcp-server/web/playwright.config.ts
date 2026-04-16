/**
 * Playwright E2E Configuration — PRISM Web
 * S4-MS1 P0-U01: E2E Test Suite
 *
 * Usage:
 *   npx playwright test              # run all E2E tests
 *   npx playwright test --ui         # interactive UI mode
 *   npx playwright test --headed     # show browser
 *   npx playwright test --project=chromium  # single browser
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.PORT || 3100;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: '.',
  testMatch: ['e2e/**/*.spec.ts', 'tests/**/*.spec.ts'],
  outputDir: './test-results/e2e',

  // Keep browser verification stable on the large APPW surface.
  fullyParallel: false,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // APPW page-sweep stability matters more than local max throughput.
  workers: 1,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'test-results/e2e-report' }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    baseURL: BASE_URL,

    // Collect trace on failure
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'on-first-retry',

    // Default navigation timeout
    navigationTimeout: 30000,

    // Default action timeout
    actionTimeout: 15000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Firefox and WebKit for broader coverage (commented for speed)
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Run local dev server before starting tests
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
