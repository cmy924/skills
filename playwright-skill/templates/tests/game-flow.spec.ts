/**
 * 游戏完整流程测试
 *
 * 按 start → L1(S1→S2a→S2b→S3) → L2(S1→S2a→S2b→S3) → L3(S1→S2a→S2b→S3) → results
 * 走完整个游戏流程，验证状态流转正确。
 *
 * ⚠️ 此为模板文件，skill 执行时会根据游戏实际配置替换占位数据。
 *    标记 /* __REPLACE__ */ 的地方需根据 index.tsx 实际数据填充。
 */
import { test, expect } from '@playwright/test';
import {
  navigateToGame,
  clickStart,
  dragElementTo,
  SEL,
  DELAYS,
  waitForTestId,
  verifyAllImagesLoaded,
} from './helpers/game-helpers';

test.describe('游戏完整流程', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGame(page);
  });

  // ──────────────────────────────────
  // 开始页面
  // ──────────────────────────────────

  test('开始页面正确渲染', async ({ page }) => {
    // 开始按钮可见
    await expect(page.locator(SEL.startButton)).toBeVisible();
    // 所有图片加载成功
    const imgResult = await verifyAllImagesLoaded(page);
    expect(imgResult.failed).toEqual([]);
  });

  test('点击开始进入关卡1', async ({ page }) => {
    await clickStart(page);
    // 应进入 transition1 或直接进入 L1-Step1
    await page.waitForTimeout(2000);
    // 验证不再停留在 start 页面
    const startBtn = page.locator(SEL.startButton);
    await expect(startBtn).not.toBeVisible({ timeout: 5000 });
  });

  // ──────────────────────────────────
  // 关卡1 — Step1: 拖拽任务标签
  // ──────────────────────────────────

  test('L1-Step1: 正确标签拖入清单后自动进入Step2a', async ({ page }) => {
    await clickStart(page);
    await page.waitForTimeout(2000); // 等过渡动画

    // __REPLACE__: 替换为实际的正确标签 ID
    // L1 有 5 个标签，2 个 isCorrect: true（看书、整理卡片）
    const correctTags = ['tag-correct-1', 'tag-correct-2'];

    for (const tagId of correctTags) {
      await dragElementTo(page, SEL.taskTag(tagId), SEL.taskListDrop);
    }

    // 800ms 后应自动进入 Step2a
    await page.waitForTimeout(DELAYS.step1ToStep2a);

    // 验证进入 Step2a：垃圾桶可见
    await expect(page.locator(SEL.trashBin)).toBeVisible({ timeout: 5000 });
  });

  test('L1-Step1: 错误标签拖入清单触发错误反馈', async ({ page }) => {
    await clickStart(page);
    await page.waitForTimeout(2000);

    // __REPLACE__: 替换为实际的错误标签 ID
    const wrongTag = 'tag-wrong-1';
    await dragElementTo(page, SEL.taskTag(wrongTag), SEL.taskListDrop);

    // 标签应仍然可见（不消失）
    await expect(page.locator(SEL.taskTag(wrongTag))).toBeVisible();
  });

  // ──────────────────────────────────
  // 关卡1 — Step2a: 清除干扰物
  // ──────────────────────────────────

  test('L1-Step2a: 移走干扰物后自动进入Step2b', async ({ page }) => {
    // 快速通过 Step1
    await clickStart(page);
    await page.waitForTimeout(2000);

    const correctTags = ['tag-correct-1', 'tag-correct-2']; // __REPLACE__
    for (const tagId of correctTags) {
      await dragElementTo(page, SEL.taskTag(tagId), SEL.taskListDrop);
    }
    await page.waitForTimeout(DELAYS.step1ToStep2a);

    // __REPLACE__: 替换为实际的干扰物 ID（手机、玩具熊）
    const distractors = ['desk-distractor-1', 'desk-distractor-2'];

    for (const itemId of distractors) {
      await dragElementTo(page, SEL.deskItem(itemId), SEL.trashBin);
    }

    // 600ms 后应自动进入 Step2b
    await page.waitForTimeout(DELAYS.step2aToStep2b);

    // 验证计时器出现（Step2b 特征）
    await expect(page.locator(SEL.countdownBar)).toBeVisible({ timeout: 5000 });
  });

  test('L1-Step2a: 非干扰物拖入垃圾桶触发错误', async ({ page }) => {
    // 快进到 Step2a（省略详细步骤）
    await clickStart(page);
    await page.waitForTimeout(2000);

    const correctTags = ['tag-correct-1', 'tag-correct-2']; // __REPLACE__
    for (const tagId of correctTags) {
      await dragElementTo(page, SEL.taskTag(tagId), SEL.taskListDrop);
    }
    await page.waitForTimeout(DELAYS.step1ToStep2a);

    // __REPLACE__: 替换为非干扰物 ID（故事书/字典/书签）
    const keepItem = 'desk-keep-1';
    await dragElementTo(page, SEL.deskItem(keepItem), SEL.trashBin);

    // 物品应仍然可见（不消失）
    await expect(page.locator(SEL.deskItem(keepItem))).toBeVisible();
  });

  // ──────────────────────────────────
  // 关卡1 — Step2b: 卡片排序
  // ──────────────────────────────────

  test('L1-Step2b: 正确排序卡片后进入Step3', async ({ page }) => {
    test.setTimeout(60_000); // 此测试需要更多时间

    // 快进到 Step2b（省略重复的导航步骤）
    // ... 实际实现中会封装为 navigateToStep() helper

    // __REPLACE__: 根据实际卡片顺序
    // 第1轮：天亮了(1) → 起床(2) → 刷牙(3) → 背书包(4)
    const round1Cards = [
      { cardId: 'sunrise', slot: 1 },
      { cardId: 'wake-up', slot: 2 },
      { cardId: 'brush', slot: 3 },
      { cardId: 'backpack', slot: 4 },
    ];

    for (const { cardId, slot } of round1Cards) {
      await dragElementTo(page, SEL.storyCard(cardId), SEL.cardSlot(slot));
    }

    // 等待轮次切换
    await page.waitForTimeout(DELAYS.roundTransition);

    // 第2轮：挖坑(1) → 放种子(2) → 浇水(3) → 开花了(4)
    const round2Cards = [
      { cardId: 'dig', slot: 1 },
      { cardId: 'seed', slot: 2 },
      { cardId: 'water', slot: 3 },
      { cardId: 'flower', slot: 4 },
    ];

    for (const { cardId, slot } of round2Cards) {
      await dragElementTo(page, SEL.storyCard(cardId), SEL.cardSlot(slot));
    }

    // 完成后计时器应停止，进入 Step3
    await page.waitForTimeout(2000);

    // 验证 Step3 特征：复选框可见
    await expect(page.locator(SEL.taskCheckbox(1))).toBeVisible({ timeout: 5000 });
  });

  // ──────────────────────────────────
  // 关卡1 — Step3: 标记完成
  // ──────────────────────────────────

  test('L1-Step3: 标记所有任务后出现下一关按钮', async ({ page }) => {
    test.setTimeout(60_000);

    // ... 快进到 Step3

    // L1 需标记 2 个任务
    await page.locator(SEL.taskCheckbox(1)).click();
    await page.locator(SEL.taskCheckbox(2)).click();

    // 应出现"下一关"按钮
    await expect(page.locator(SEL.nextLevelBtn)).toBeVisible({ timeout: 5000 });
  });

  // ──────────────────────────────────
  // 结果页
  // ──────────────────────────────────

  test('无错误完成全流程获得三星', async ({ page }) => {
    test.setTimeout(180_000); // 完整流程需要较长时间

    // ... 完整走完三关（零错误）

    // 验证结果页面
    await expect(page.locator(SEL.resultsPage)).toBeVisible({ timeout: 10_000 });

    // 验证三星（totalErrors ≤ 2 且未超时）
    await expect(page.locator(SEL.starDisplay)).toBeVisible();
    // __REPLACE__: 根据实际星级 DOM 结构断言
  });
});

test.describe('评分规则验证', () => {
  test('总错误 ≤ 2 且未超时 → 三星', async ({ page }) => {
    // 通过 DevPanel 或注入设定状态来验证评分
    await navigateToGame(page);
    // __REPLACE__: 根据实际评分组件结构验证
  });

  test('总错误 ≤ 5 → 两星', async ({ page }) => {
    await navigateToGame(page);
    // __REPLACE__
  });

  test('总错误 > 5 → 一星', async ({ page }) => {
    await navigateToGame(page);
    // __REPLACE__
  });
});
