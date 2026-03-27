/**
 * 游戏 E2E 测试辅助工具
 * 
 * 封装拖拽、等待状态变化、截图等通用操作，
 * 避免测试代码重复且保持选择器统一管理。
 */
import { Page, Locator, expect } from '@playwright/test';

// ═══════════════════════════════════════════
// 常量
// ═══════════════════════════════════════════

/** preview.html 路径 */
export const PREVIEW_URL = '/preview.html';

/** 自动跳转延时（ms） + 额外等待余量 */
export const DELAYS = {
  step1ToStep2a: 800 + 500,   // Step1 全对后 800ms → Step2a
  step2aToStep2b: 600 + 500,  // Step2a 清完后 600ms → Step2b
  roundTransition: 600 + 500, // 轮次切换 600ms
  animationBuffer: 300,       // 动画缓冲
};

/** Step2b 限时（秒） */
export const STEP2B_TIMEOUT = 120;

// ═══════════════════════════════════════════
// 选择器
// ═══════════════════════════════════════════

export const SEL = {
  // 通用
  startButton: '[data-testid="start-button"]',
  nextLevelBtn: '[data-testid="next-level-btn"]',
  countdownBar: '[data-testid="countdown-bar"]',
  starDisplay: '[data-testid="star-display"]',
  resultsPage: '[data-testid="results-page"]',

  // Step1
  taskTag: (id: string | number) => `[data-testid="task-tag-${id}"]`,
  taskListDrop: '[data-testid="task-list-drop"]',

  // Step2a
  deskItem: (id: string | number) => `[data-testid="desk-item-${id}"]`,
  trashBin: '[data-testid="trash-bin"]',

  // L1 Step2b — 卡片排序
  storyCard: (id: string | number) => `[data-testid="story-card-${id}"]`,
  cardSlot: (n: number) => `[data-testid="card-slot-${n}"]`,

  // L2 Step2b — 机器人分类
  robot: (id: string | number) => `[data-testid="robot-${id}"]`,
  groupA: '[data-testid="group-a"]',
  groupB: '[data-testid="group-b"]',

  // L3 Step2b — 找错字
  char: (row: number, col: number) => `[data-testid="char-${row}-${col}"]`,
  checkRowBtn: '[data-testid="check-row-btn"]',

  // Step3
  taskCheckbox: (n: number) => `[data-testid="task-checkbox-${n}"]`,
};

// ═══════════════════════════════════════════
// 页面导航
// ═══════════════════════════════════════════

/**
 * 导航到 preview.html 并等待游戏组件加载
 */
export async function navigateToGame(page: Page): Promise<void> {
  await page.goto(PREVIEW_URL);
  // 等待 React 组件渲染完成
  await page.waitForSelector('[data-testid="start-button"], [class*="startPage"], [class*="start"]', {
    timeout: 15_000,
  });
}

/**
 * 点击开始按钮进入游戏
 */
export async function clickStart(page: Page): Promise<void> {
  const startBtn = page.locator(SEL.startButton);
  // 如果没有 data-testid，尝试文本匹配
  if (await startBtn.count() === 0) {
    await page.getByText(/开始|START|开始游戏/).first().click();
  } else {
    await startBtn.click();
  }
  await page.waitForTimeout(DELAYS.animationBuffer);
}

// ═══════════════════════════════════════════
// 拖拽操作
// ═══════════════════════════════════════════

/**
 * 将元素拖拽到目标位置
 * 使用鼠标事件模拟真实拖拽，兼容 HTML5 Drag & Drop 和自定义拖拽
 */
export async function dragElementTo(
  page: Page,
  source: Locator | string,
  target: Locator | string,
  options?: { steps?: number }
): Promise<void> {
  const srcLocator = typeof source === 'string' ? page.locator(source) : source;
  const tgtLocator = typeof target === 'string' ? page.locator(target) : target;

  // 确保两个元素都可见
  await srcLocator.waitFor({ state: 'visible', timeout: 5_000 });
  await tgtLocator.waitFor({ state: 'visible', timeout: 5_000 });

  // 获取元素中心坐标
  const srcBox = await srcLocator.boundingBox();
  const tgtBox = await tgtLocator.boundingBox();

  if (!srcBox || !tgtBox) {
    throw new Error('Cannot get bounding box for drag source or target');
  }

  const srcCenter = {
    x: srcBox.x + srcBox.width / 2,
    y: srcBox.y + srcBox.height / 2,
  };
  const tgtCenter = {
    x: tgtBox.x + tgtBox.width / 2,
    y: tgtBox.y + tgtBox.height / 2,
  };

  // 执行拖拽
  await page.mouse.move(srcCenter.x, srcCenter.y);
  await page.mouse.down();
  await page.mouse.move(tgtCenter.x, tgtCenter.y, {
    steps: options?.steps ?? 10,
  });
  await page.mouse.up();

  await page.waitForTimeout(DELAYS.animationBuffer);
}

/**
 * 拖拽到目标（备选方案：使用 Playwright 原生 dragTo）
 */
export async function dragToNative(
  page: Page,
  source: Locator | string,
  target: Locator | string
): Promise<void> {
  const srcLocator = typeof source === 'string' ? page.locator(source) : source;
  const tgtLocator = typeof target === 'string' ? page.locator(target) : target;

  await srcLocator.dragTo(tgtLocator);
  await page.waitForTimeout(DELAYS.animationBuffer);
}

// ═══════════════════════════════════════════
// 状态等待
// ═══════════════════════════════════════════

/**
 * 等待页面中包含指定 data-testid 的元素出现
 */
export async function waitForTestId(
  page: Page,
  testId: string,
  timeout = 10_000
): Promise<Locator> {
  const locator = page.locator(`[data-testid="${testId}"]`);
  await locator.waitFor({ state: 'visible', timeout });
  return locator;
}

/**
 * 等待游戏状态变化（通过检测 DOM 变化推断）
 */
export async function waitForStepChange(
  page: Page,
  expectedStepIndicator: string | RegExp,
  timeout = 10_000
): Promise<void> {
  await page.waitForFunction(
    (indicator) => {
      const body = document.body.innerHTML;
      if (typeof indicator === 'string') {
        return body.includes(indicator);
      }
      return new RegExp(indicator).test(body);
    },
    typeof expectedStepIndicator === 'string'
      ? expectedStepIndicator
      : expectedStepIndicator.source,
    { timeout }
  );
}

/**
 * 等待特定的 className 出现在元素上（用于验证动画/状态变化）
 */
export async function waitForClass(
  locator: Locator,
  className: string,
  timeout = 5_000
): Promise<void> {
  await locator.evaluate(
    (el, cls) => {
      return new Promise<void>((resolve) => {
        if (el.classList.contains(cls)) {
          resolve();
          return;
        }
        const observer = new MutationObserver(() => {
          if (el.classList.contains(cls)) {
            observer.disconnect();
            resolve();
          }
        });
        observer.observe(el, { attributes: true, attributeFilter: ['class'] });
      });
    },
    className,
    { timeout }
  );
}

// ═══════════════════════════════════════════
// 资源验证
// ═══════════════════════════════════════════

/**
 * 检查页面中所有图片是否加载成功
 */
export async function verifyAllImagesLoaded(page: Page): Promise<{
  total: number;
  loaded: number;
  failed: string[];
}> {
  return await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('img'));
    const failed: string[] = [];
    let loaded = 0;

    for (const img of images) {
      if (img.complete && img.naturalHeight > 0) {
        loaded++;
      } else {
        failed.push(img.src || img.getAttribute('data-src') || 'unknown');
      }
    }

    return { total: images.length, loaded, failed };
  });
}

/**
 * 检查指定 URL 是否可访问（HTTP HEAD 请求）
 */
export async function verifyUrlAccessible(
  page: Page,
  url: string
): Promise<boolean> {
  try {
    const response = await page.request.head(url);
    return response.ok();
  } catch {
    return false;
  }
}

/**
 * 检查页面中所有 audio 元素的 src 是否可访问
 */
export async function verifyAudioSources(page: Page): Promise<{
  total: number;
  accessible: number;
  failed: string[];
}> {
  const audioSrcs = await page.evaluate(() => {
    const audios = Array.from(document.querySelectorAll('audio'));
    return audios.map((a) => a.src).filter(Boolean);
  });

  const failed: string[] = [];
  let accessible = 0;

  for (const src of audioSrcs) {
    if (await verifyUrlAccessible(page, src)) {
      accessible++;
    } else {
      failed.push(src);
    }
  }

  return { total: audioSrcs.length, accessible, failed };
}

// ═══════════════════════════════════════════
// 截图工具
// ═══════════════════════════════════════════

/**
 * 对游戏区域截图（排除 DevPanel 等调试元素）
 */
export async function screenshotGameArea(
  page: Page,
  name: string
): Promise<Buffer> {
  // 隐藏 DevPanel（如果有）
  await page.evaluate(() => {
    const devPanel = document.querySelector('[class*="devPanel"]') as HTMLElement;
    if (devPanel) devPanel.style.display = 'none';
  });

  const screenshot = await page.screenshot({
    fullPage: false,
    animations: 'disabled',
  });

  // 恢复 DevPanel
  await page.evaluate(() => {
    const devPanel = document.querySelector('[class*="devPanel"]') as HTMLElement;
    if (devPanel) devPanel.style.display = '';
  });

  return screenshot;
}

// ═══════════════════════════════════════════
// 错误计数
// ═══════════════════════════════════════════

/**
 * 获取当前全局错误计数（通过 React DevTools 或 DOM 推断）
 */
export async function getTotalErrors(page: Page): Promise<number> {
  // 尝试从 DevPanel 读取（如果 ?dev=1 模式）
  const devErrors = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="total-errors"]');
    return el ? parseInt(el.textContent || '0', 10) : null;
  });

  if (devErrors !== null) return devErrors;

  // 备选：通过 window 暴露的状态
  return await page.evaluate(() => {
    return (window as any).__gameState?.totalErrors ?? 0;
  });
}

/**
 * 快速连续点击测试（防抖验证）
 */
export async function rapidClicks(
  page: Page,
  selector: string,
  count: number,
  intervalMs = 50
): Promise<void> {
  const locator = page.locator(selector);
  for (let i = 0; i < count; i++) {
    await locator.click({ force: true, delay: 0 });
    if (intervalMs > 0) await page.waitForTimeout(intervalMs);
  }
}
