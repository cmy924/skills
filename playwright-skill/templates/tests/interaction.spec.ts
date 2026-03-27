/**
 * 交互边界测试
 *
 * 验证快速点击防抖、错误反馈、计时器行为等边界场景。
 * 覆盖 check-skill 中 H7（快速连续点击）和 H4（CSS 动画时长）。
 */
import { test, expect } from '@playwright/test';
import {
  navigateToGame,
  clickStart,
  dragElementTo,
  rapidClicks,
  SEL,
  DELAYS,
  STEP2B_TIMEOUT,
} from './helpers/game-helpers';

test.describe('快速点击防抖 (check-skill H7)', () => {
  test('Step1: 快速拖拽同一标签多次不产生重复效果', async ({ page }) => {
    await navigateToGame(page);
    await clickStart(page);
    await page.waitForTimeout(2000);

    // __REPLACE__: 用实际的正确标签 ID
    const tagId = 'tag-correct-1';

    // 快速拖拽同一标签 3 次
    for (let i = 0; i < 3; i++) {
      await dragElementTo(page, SEL.taskTag(tagId), SEL.taskListDrop);
      await page.waitForTimeout(50);
    }

    // 标签应只被放置一次
    // __REPLACE__: 根据实际 DOM 结构断言
  });

  test('Step3: 快速点击复选框不导致状态混乱', async ({ page }) => {
    // ... 快进到 Step3

    // 快速点击同一个复选框 10 次
    await rapidClicks(page, SEL.taskCheckbox(1), 10, 30);

    // 复选框最终状态应该是确定的（选中或未选中）
    // __REPLACE__: 验证最终状态
  });
});

test.describe('计时器行为', () => {
  test('Step2b: 计时器从 120 秒开始倒计时', async ({ page }) => {
    test.setTimeout(30_000);
    // ... 快进到 Step2b

    // 验证计时器可见且初始值接近 120
    const countdown = page.locator(SEL.countdownBar);
    await expect(countdown).toBeVisible();

    // __REPLACE__: 读取计时器显示值
  });

  test('Step2b: 计时器归零触发超时状态', async ({ page }) => {
    test.setTimeout(150_000); // 需要等 120+ 秒
    // ... 快进到 Step2b

    // 等待计时器归零（不做任何操作）
    await page.waitForTimeout(STEP2B_TIMEOUT * 1000 + 3000);

    // __REPLACE__: 验证超时状态
    // 应触发 overtime = true
  });
});

test.describe('错误反馈动画 (check-skill H4 & H8)', () => {
  test('错误拖拽时元素出现晃动动画', async ({ page }) => {
    // ... 快进到某个 Step
    // 执行错误操作

    // __REPLACE__: 检查目标元素是否有 shake/error 相关 CSS class
    // await expect(element).toHaveClass(/shake|error|wrong/);
  });

  test('正确操作时元素出现确认动画', async ({ page }) => {
    // ... 执行正确操作

    // __REPLACE__: 检查元素是否有 success/correct/locked 相关 CSS class
    // await expect(element).toHaveClass(/success|correct|locked/);
  });
});

test.describe('拖拽回弹', () => {
  test('拖拽到非目标区域时元素回到原位', async ({ page }) => {
    // ... 快进到有拖拽的步骤

    // 记录元素原始位置
    // __REPLACE__: 获取拖拽元素初始位置

    // 拖拽到空白区域
    // dragElementTo(page, source, 空白区域)

    // 元素应回归原位
    // __REPLACE__: 断言元素位置未变
  });
});
