import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 配置 — 游戏/课件组件 E2E 测试
 * 
 * 使用前确保 dev server 已启动：npm run dev
 * preview.html 可在 http://localhost:3005/preview.html 访问
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,            // 游戏测试需顺序执行
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,                      // 单 worker，避免端口竞争
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: 'http://localhost:3005',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  /* 仅使用 Chromium，保持轻量 */
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'tablet-landscape',
      use: {
        viewport: { width: 1024, height: 768 },
        isMobile: false,
      },
    },
    {
      name: 'tablet-portrait',
      use: {
        viewport: { width: 768, height: 1024 },
        isMobile: true,
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
      },
    },
  ],

  /* 快照配置 */
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,     // 允许 1% 像素差异
      animations: 'disabled',      // 截图时禁用动画
    },
  },

  /* Dev server — 如需自动启动 */
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3005/preview.html',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 30_000,
  // },
});
