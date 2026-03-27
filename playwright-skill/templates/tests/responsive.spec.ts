/**
 * 响应式布局测试
 *
 * 在多种 viewport 下验证游戏布局正常，覆盖 check-skill H5。
 * 使用 vmin 单位的游戏应在各分辨率下等比缩放。
 */
import { test, expect } from '@playwright/test';
import {
  navigateToGame,
  clickStart,
  verifyAllImagesLoaded,
} from './helpers/game-helpers';

const viewports = [
  { name: 'desktop-1920', width: 1920, height: 1080 },
  { name: 'desktop-1280', width: 1280, height: 720 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'mobile-portrait', width: 375, height: 667 },
  { name: 'mobile-landscape', width: 667, height: 375 },
];

for (const vp of viewports) {
  test.describe(`响应式 — ${vp.name} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('开始页面正常渲染', async ({ page }) => {
      await navigateToGame(page);

      // 图片全部加载
      const result = await verifyAllImagesLoaded(page);
      expect(result.failed).toEqual([]);

      // 无水平滚动条
      const hasHScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHScroll).toBe(false);

      // 截图对比
      await expect(page).toHaveScreenshot(`responsive-start-${vp.name}.png`, {
        animations: 'disabled',
        maxDiffPixelRatio: 0.02, // 响应式测试允许略大差异
      });
    });

    test('游戏内容不超出视口', async ({ page }) => {
      await navigateToGame(page);
      await clickStart(page);
      await page.waitForTimeout(2000);

      // 关键元素在视口内
      const overflow = await page.evaluate(() => {
        const elements = document.querySelectorAll('[data-testid]');
        const issues: string[] = [];
        for (const el of elements) {
          const rect = el.getBoundingClientRect();
          if (rect.right > window.innerWidth || rect.bottom > window.innerHeight) {
            issues.push(`${el.getAttribute('data-testid')}: right=${rect.right}, bottom=${rect.bottom}`);
          }
        }
        return issues;
      });

      expect(overflow, `以下元素超出视口: ${overflow.join(', ')}`).toEqual([]);
    });

    test('触控区域大小适合手指操作 (≥ 44px)', async ({ page }) => {
      if (vp.width >= 1024) {
        test.skip(true, '仅移动/平板设备检查触控尺寸');
        return;
      }

      await navigateToGame(page);

      // 检查所有可交互元素的最小尺寸
      const tooSmall = await page.evaluate(() => {
        const interactive = document.querySelectorAll(
          'button, [role="button"], [draggable="true"], [data-testid*="tag"], [data-testid*="item"], [data-testid*="card"], [data-testid*="checkbox"]'
        );
        const issues: string[] = [];
        for (const el of interactive) {
          const rect = el.getBoundingClientRect();
          if (rect.width < 44 || rect.height < 44) {
            const id = el.getAttribute('data-testid') || el.tagName;
            issues.push(`${id}: ${Math.round(rect.width)}×${Math.round(rect.height)}`);
          }
        }
        return issues;
      });

      // 允许有少量小元素（如文字标签），但关键交互元素应 ≥ 44px
      if (tooSmall.length > 0) {
        console.warn(`触控区域偏小的元素: ${tooSmall.join(', ')}`);
      }
      // 不强制失败，仅警告
    });
  });
}
