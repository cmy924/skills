---
name: playwright-skill
description: 基于 Playwright 的端到端自动化测试技能。为游戏/课件组件生成完整的 E2E 测试套件，覆盖游戏流程、拖拽交互、计时器、视觉回归、响应式布局、音频元素等。自动补全 check-skill 中 H 类"需人工验证"的检查项。触发词包括"自动化测试"、"E2E测试"、"端到端测试"、"Playwright"、"playwright"、"跑测试"、"运行测试"、"视觉回归"、"UI测试"、"截图对比"、"交互测试"、"run tests"、"e2e"。当用户修改了交互逻辑、UI布局、或需要验证游戏全流程时，务必使用此 skill。
---

# Playwright Skill — 端到端自动化测试

为游戏/课件组件生成并运行 Playwright E2E 测试，自动化验证游戏流程、拖拽交互、视觉回归和响应式布局。

## 核心价值

| check-skill H 类（原需人工） | Playwright 自动化能力 |
|------|------|
| H1 角色图片 URL 可访问 | ✅ 请求 URL 检查 HTTP 200 + 图片渲染 |
| H2 BGM URL 可正常播放 | ✅ 检查 `<audio>` 元素 src 可达 |
| H3 SVG 渐变视觉效果 | ✅ 截图对比基线 |
| H4 CSS 动画时长正确 | ✅ 等待动画类名变化 + 计时断言 |
| H5 移动端适配 | ✅ 多 viewport 截图对比 |
| H6 音频自动播放恢复 | ⚠️ 部分（可检测 audio.paused 状态） |
| H7 快速连续点击防抖 | ✅ 模拟高频操作，断言状态一致 |
| H8 视觉反馈体验 | ✅ 截图 + DOM 状态断言 |

## 执行前提

### 环境要求

- Node.js 18+
- 项目可通过 `aic dev` 或 `npx vite --port 3005` 在本地启动
- preview.html 可在 `http://localhost:3005/preview.html` 访问

### 首次安装

```bash
npm install -D @playwright/test
npx playwright install chromium
```

> 仅安装 chromium，不装 firefox/webkit，保持轻量。

## 文件结构

```
项目根/
├── playwright.config.ts          # Playwright 配置
├── tests/
│   ├── helpers/
│   │   └── game-helpers.ts       # 拖拽、等待、截图等通用工具
│   ├── game-flow.spec.ts         # 完整游戏流程测试
│   ├── visual-regression.spec.ts # 视觉回归截图对比
│   ├── interaction.spec.ts       # 交互细节（快速点击、边界）
│   └── responsive.spec.ts        # 多分辨率响应式测试
└── tests/screenshots/            # 基线截图（git 跟踪）
```

## 测试策略

### 1. 游戏流程测试（game-flow.spec.ts）

按 `start → L1(S1→S2a→S2b→S3) → L2 → L3 → results` 完整走一遍：

| 阶段 | 测试动作 | 断言 |
|------|---------|------|
| start | 点击开始按钮 | 进入 transition1 |
| L1-Step1 | 拖拽 2 个正确标签到清单 | 800ms 后自动进入 Step2a |
| L1-Step2a | 拖拽干扰物到垃圾桶 | 600ms 后进入 Step2b |
| L1-Step2b | 排序卡片 2 轮 | 计时器在运行，完成后进 Step3 |
| L1-Step3 | 点击复选框标记完成 | 出现"下一关"按钮 |
| L2/L3 | 同理 | 状态正确流转 |
| results | 验证星级显示 | totalErrors ≤ 2 → ⭐⭐⭐ |

### 2. 视觉回归测试（visual-regression.spec.ts）

对每个关键页面截图并与基线对比：

- start 页面
- 每关的 Step1/Step2a/Step2b/Step3 页面
- results 页面（1/2/3星各一张）
- 错误反馈状态（红框、晃动）
- 正确反馈状态（绿勾、锁定）

### 3. 交互测试（interaction.spec.ts）

| 测试场景 | 验证内容 |
|---------|---------|
| 错误拖拽 | 拖错标签 → 错误+1，标签不消失 |
| 快速连续点击 | 500ms 内点 10 次，状态不混乱 |
| 拖拽到非目标区域 | 物品回弹，无副作用 |
| 计时器归零 | 120s 超时 → overtime=true |
| 暂停/恢复 | 计时器冻结/继续 |

### 4. 响应式测试（responsive.spec.ts）

| 设备 | viewport |
|------|---------|
| 桌面 | 1920×1080 |
| 平板横屏 | 1024×768 |
| 平板竖屏 | 768×1024 |
| 手机竖屏 | 375×667 |

## 执行流程

### Step 1 — 检查环境

1. 检查 `package.json` 是否已有 `@playwright/test` 依赖
2. 检查 `playwright.config.ts` 是否存在
3. 检查 `tests/` 目录结构
4. 如缺失，从模板生成

### Step 2 — 分析游戏结构

1. 读取 `.github/copilot-instructions.md` 和 `.github/game-design.md` 获取游戏规则
2. 读取 `index.tsx` 分析：
   - 页面/步骤枚举（`GamePage` 类型）
   - 拖拽目标的 `data-testid` 或可用选择器
   - 各 step 的触发条件和自动跳转延时
3. 读取 `index.module.css` 分析动画类名
4. 读取 `asset-urls.ts` 获取资源 URL 列表

### Step 3 — 生成/更新测试文件

根据分析结果，生成针对当前游戏逻辑的测试代码。生成规则：

1. **选择器优先级：** `data-testid` > `role` > `text content` > CSS class
2. **不硬编码延时：** 用 `waitForSelector` / `waitForFunction` 替代固定 sleep
3. **拖拽使用 helpers：** 统一调用 `dragTo()` 工具函数
4. **每个 test 独立：** 不依赖其他 test 的状态
5. **错误截图：** 失败时自动保存截图到 `test-results/`

### Step 4 — 添加 data-testid

在 `index.tsx` 中为关键交互元素添加 `data-testid` 属性（如果缺失）：

```tsx
// 必须有 data-testid 的元素
<div data-testid="start-button" ...>          // 开始按钮
<div data-testid="task-tag-{id}" ...>         // 任务标签
<div data-testid="task-list-drop" ...>        // 清单放置区
<div data-testid="desk-item-{id}" ...>        // 桌面物品
<div data-testid="trash-bin" ...>             // 垃圾桶
<div data-testid="card-slot-{n}" ...>         // 卡片空位
<div data-testid="story-card-{id}" ...>       // 故事卡片
<div data-testid="robot-{id}" ...>            // 机器人
<div data-testid="group-a" ...>               // 分组A
<div data-testid="group-b" ...>               // 分组B
<div data-testid="char-{row}-{col}" ...>      // 找错字字符
<div data-testid="check-row-btn" ...>         // 确认行按钮
<div data-testid="task-checkbox-{n}" ...>     // Step3 复选框
<div data-testid="next-level-btn" ...>        // 下一关按钮
<div data-testid="countdown-bar" ...>         // 倒计时条
<div data-testid="star-display" ...>          // 星级展示
<div data-testid="results-page" ...>          // 结果页
```

> ⚠️ 添加 `data-testid` 是最小化变更，不影响运行时行为。

### Step 5 — 运行测试

```bash
# 确保 dev server 在运行
npm run dev &

# 运行全部测试
npx playwright test

# 仅跑流程测试
npx playwright test game-flow

# 仅跑视觉回归
npx playwright test visual-regression

# 更新基线截图
npx playwright test visual-regression --update-snapshots

# 查看测试报告
npx playwright show-report
```

### Step 6 — 输出报告

```
🎭 Playwright 测试报告
📅 日期：{当前日期}
⏱️ 耗时：{总时长}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 总结：{通过}/{总数} 通过 | {失败} 失败 | {跳过} 跳过
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ game-flow.spec.ts        — 完整流程测试
✅ visual-regression.spec.ts — 视觉回归截图
✅ interaction.spec.ts       — 交互边界测试
✅ responsive.spec.ts        — 响应式适配

📸 新增/更新基线截图：{N} 张
📂 报告路径：playwright-report/index.html
```

## 模板文件参考

生成测试时，从以下模板目录加载：

| 文件 | 用途 |
|------|------|
| `templates/playwright.config.ts` | Playwright 配置模板 |
| `templates/tests/helpers/game-helpers.ts` | 拖拽/等待/截图工具函数 |
| `templates/tests/game-flow.spec.ts` | 完整流程测试模板 |
| `templates/tests/visual-regression.spec.ts` | 视觉回归测试模板 |
| `templates/tests/interaction.spec.ts` | 交互测试模板 |
| `templates/tests/responsive.spec.ts` | 响应式测试模板 |

读取模板后，根据当前游戏的 **实际数据**（关卡配置、步骤枚举、元素选择器）替换模板中的占位符。

## 与 check-skill 的协作

Playwright 测试覆盖了 check-skill 中 H 类「需人工验证」的大部分项目。跑完 Playwright 后可更新 check-skill 报告：

```markdown
| ID | 检查项 | 原结果 | Playwright 结果 | 说明 |
|----|-------|--------|----------------|------|
| H1 | 角色图片可访问 | 👤 MANUAL | ✅ PASS | 所有图片 URL HTTP 200 |
| H4 | CSS 动画时长 | 👤 MANUAL | ✅ PASS | 截图对比通过 |
| H5 | 移动端适配 | 👤 MANUAL | ✅ PASS | 4种 viewport 截图正常 |
| H7 | 快速点击防抖 | 👤 MANUAL | ✅ PASS | 500ms内10次点击状态一致 |
```

## 注意事项

1. **不增加生产依赖** — `@playwright/test` 仅加入 `devDependencies`
2. **测试代码不打包** — `tests/` 目录被 vite 构建忽略
3. **基线截图需 git 跟踪** — `tests/screenshots/` 提交到仓库，用于 CI 对比
4. **首次运行生成基线** — 第一次 `--update-snapshots` 建立基准，后续对比
5. **preview.html 是测试入口** — 测试通过 `http://localhost:3005/preview.html` 加载组件
6. **拖拽测试需真实坐标** — Playwright 的 `dragTo()` 基于像素坐标，helpers 封装了元素中心点计算

## 红线

- ❌ 不修改游戏业务逻辑（只添加 `data-testid`）
- ❌ 不在生产代码中引入测试库
- ❌ 不在 CI 上截图对比时使用主观判断（像素阈值 maxDiffPixelRatio: 0.01）
- ⚠️ 视觉回归基线更新后需人工确认截图是否符合预期
