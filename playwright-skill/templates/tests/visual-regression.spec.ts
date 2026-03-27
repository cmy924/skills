/**
 * 视觉回归测试
 *
 * 对游戏各关键页面截图，与基线对比，检测视觉偏差。
 *
 * 首次运行：npx playwright test visual-regression --update-snapshots
 * 后续运行：npx playwright test visual-regression
 */
import { test, expect } from '@playwright/test';
import {
  navigateToGame,
  clickStart,
  screenshotGameArea,
  verifyAllImagesLoaded,
  verifyUrlAccessible,
  PREVIEW_URL,
} from './helpers/game-helpers';

test.describe('视觉回归 — 关键页面截图', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGame(page);
  });

  test('开始页面', async ({ page }) => {
    await expect(page).toHaveScreenshot('start-page.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
    });
  });

  test('关卡过渡页', async ({ page }) => {
    await clickStart(page);
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('transition-1.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
    });
  });

  // __REPLACE__: 为每个关卡的每个步骤添加截图测试
  // L1-Step1, L1-Step2a, L1-Step2b, L1-Step3
  // L2-Step1, L2-Step2a, L2-Step2b, L2-Step3
  // L3-Step1, L3-Step2a, L3-Step2b, L3-Step3
  // results-1star, results-2star, results-3star
});

test.describe('资源可访问性验证', () => {
  test('所有角色图片加载成功 (check-skill H1)', async ({ page }) => {
    await navigateToGame(page);
    await clickStart(page);
    await page.waitForTimeout(2000);

    const result = await verifyAllImagesLoaded(page);
    expect(result.failed).toEqual([]);
    expect(result.loaded).toBeGreaterThan(0);
  });

  test('CDN 素材 URL 可达', async ({ page }) => {
    // __REPLACE__: 从 asset-urls.ts 读取所有 URL 进行验证
    const assetUrls: string[] = [
      // 填入 ASSET_URLS 中的实际 URL
    ];

    for (const url of assetUrls) {
      const accessible = await verifyUrlAccessible(page, url);
      expect(accessible, `URL 不可达: ${url}`).toBe(true);
    }
  });
});
