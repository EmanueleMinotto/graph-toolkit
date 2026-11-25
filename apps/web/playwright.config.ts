/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  // Pointer-drag tests are occasionally dropped by WebKit on CI runners; a retry settles it.
  retries: process.env.CI === undefined ? 0 : 2,
  reporter: [['list']],
  // Baselines depend on the OS fonts, so each platform keeps its own.
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}-{platform}{ext}',
  use: { baseURL: 'http://127.0.0.1:4173' },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        // Headless Firefox on CI has no GPU: let it fall back to software WebGL.
        launchOptions: {
          firefoxUserPrefs: { 'webgl.force-enabled': true, 'webgl.disabled': false },
        },
      },
    },
    { name: 'webkit', use: devices['Desktop Safari'] },
  ],
  webServer: {
    command: 'pnpm exec vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
  },
});
