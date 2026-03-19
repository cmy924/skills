---
name: check-skill
description: 根据项目的游戏规则和设计文档，对代码进行全面的自动化验证。核心目标是用 AI 代替人工走查，逐条检查游戏规则、状态机流转、计时器行为、音频系统、类型安全等。验证通过输出 ✅，失败则先修复 BUG 再记录事件。无法由 AI 验证的项目列表说明原因。触发词包括"验证项目"、"检查规则"、"check"、"validate"、"走查"、"自检"、"回归验证"、"规则校验"、"跑一遍检查"。当用户修改了代码、修完 BUG、或准备发布前，都应使用此 skill 来确保项目完整性。
---

# Check Skill — 项目规则验证器

根据 `.github/copilot-instructions.md` 中定义的游戏规则和设计约束，对项目源码进行逐条自动化验证。用 AI 阅读代码+推理来代替人工走查，最大限度减少手动测试。

## 核心理念

1. **规则即测试用例** — 从设计文档中提取每一条可验证的规则，转化为检查项
2. **能验则验** — AI 能通过阅读代码判定的规则，直接给出 PASS/FAIL
3. **不能验则标注** — 需要运行时环境、真实浏览器、或人工主观判断的，明确说明原因
4. **失败即修** — 发现 FAIL 不是记一笔就完，而是立即尝试修复，修复后记录到事件日志

## 执行前提

执行此 skill 前，**必须**完整读取以下文件：

| 优先级 | 文件 | 用途 |
|-------|------|------|
| **必须** | `.github/copilot-instructions.md` | 游戏规则的唯一真相源 |
| **必须** | `index.tsx`（全部行） | 主逻辑，验证的主要对象 |
| **必须** | `index.module.css` | 样式验证（布局、动画） |
| 推荐 | `package.json` | 依赖版本、构建脚本 |
| 推荐 | `tsconfig.json` | TypeScript 配置 |
| 推荐 | `vite.config.ts` | 构建输出格式 |

> 不要跳读或只读部分行。`index.tsx` 必须从第 1 行读到最后一行。

## 验证检查表

按以下分类逐项检查。每一项的判定方法已标注。

### A. 游戏数据正确性（AI 直接验证）

| ID | 检查项 | 验证方法 |
|----|-------|---------|
| A1 | 第1轮串珠模式为 `A B ? B A ? A B ? B`，答案 `A B A` | 对照 `LEVEL_1_DATA[0]`，`null` 位置和 `correctAnswer` 是否匹配 |
| A2 | 第2轮串珠模式为 `A B B ? B B A ? ?`，答案 `A B B` | 对照 `LEVEL_1_DATA[1]` |
| A3 | 拼图为 3×4=12 块 | 检查 `PUZZLE_GRID` 或相关常量 = `{ rows: 3, cols: 4 }` |
| A4 | 数字连线为 1-20 共 20 个数字 | 检查生成逻辑的循环范围 `1..20` |
| A5 | 数字位置坐标范围 x: 10%-90%, y: 10%-90% | 检查随机生成公式的 min/max |
| A6 | 三位角色配置完整（小安/小瑞/小布），各有 idle 和 speaking 图 | 检查 `CHARACTERS` 对象 |
| A7 | 三种 BGM URL 完整（main/progress/rest） | 检查 `BGM_URLS` 对象 |

### B. 核心规则逻辑（AI 直接验证 — 最关键）

| ID | 检查项 | 验证方法 |
|----|-------|---------|
| B1 | 串珠只能填充 `null` 空位，不能覆盖已有珠子 | 检查 `handleBeadPlace` 中是否有 `originalPattern[index] === null` 的 guard |
| B2 | 数字连线必须从 1 开始，严格递增，跳号无效 | 检查 `handleNumberClick`：(1) 第一次点击是否要求 `num === 1`；(2) 后续是否要求 `num === last + 1`；(3) 已连线的是否 `return` |
| B3 | 拼图放对保留，放错 500ms 弹回 | 检查 `handlePuzzleDrop`：正确时不还原、错误时 `setTimeout 500ms` 还原 |
| B4 | 串珠填充后即时反馈（"串对啦"/"没串对"），1 秒后消失 | 检查 `setLevel1Feedback` + `setTimeout 1000ms` 清空 |
| B5 | 拼图放置后即时反馈（"拼对啦"/"拼错啦"），1 秒后消失 | 检查 `setLevel3Feedback` + `setTimeout 1000ms` 清空 |
| B6 | 拼图碎片列表取第一个碎片放入点击的槽位 | 检查 `handlePuzzleDrop` 参数，是否始终用 `level3Pieces[0]` 或 `pieceIndex=0` |
| B7 | 拼图初始化使用 Fisher-Yates 洗牌 | 检查打乱逻辑是否为标准 Fisher-Yates（从后往前遍历 + `Math.floor(Math.random() * (i + 1))`） |

### C. 状态机流转（AI 直接验证 — 关键规则 #3）

| ID | 检查项 | 验证方法 |
|----|-------|---------|
| C1 | GameState 枚举完整覆盖所有阶段 | 检查 `type GameState` 是否包含所有 `START_SCREEN`, `LEVEL_N_*`, `GAME_COMPLETE` |
| C2 | 流转顺序固定：第一关(含2轮) → 第二关 → 第三关 → 完成 | 追踪所有 `setGameState` 调用链，确认不存在跳跃（如 LEVEL_1 直接到 LEVEL_3） |
| C3 | `onStatusChange` 依次输出 0→1→2→3→4，不跳跃不重复 | 追踪所有 `onStatusChange(n)` 调用点，验证：初始化=0, 第一关=1, 第二关=2, 第三关=3, 完成=4 |
| C4 | 第一关含 2 轮，第 1 轮完成后在 REVIEW 中判断是否进入第 2 轮 | 检查 `handleReview` 中 `LEVEL_1_REVIEW` 分支的 round 判断 |
| C5 | 三关全部完成后 2 秒调用 `onExit()` | 检查 `GAME_COMPLETE` 状态的 `setTimeout(onExit, 2000)` |
| C6 | `GAME_COMPLETE` 后不再有状态变更 | 确认 `GAME_COMPLETE` 状态下没有 `setGameState` 调用 |

### D. 计时系统（AI 直接验证 — 关键规则 #2）

| ID | 检查项 | 验证方法 |
|----|-------|---------|
| D1 | 时间选项为 60 秒或 120 秒 | 检查 `selectTime` 参数类型 `60 \| 120` |
| D2 | 倒计时 3-2-1 后开始 | 检查 `startCountdown` 是否 setCountdown(3→2→1→null)，间隔 1s |
| D3 | 暂停时计时器冻结（`isPaused=true` 时 `setInterval` 不执行） | 检查计时器 `useEffect` 的条件：`isTimerActive && timeRemaining > 0 && !isPaused` |
| D4 | 恢复后继续倒计时（而非重置） | 确认 `togglePause` 只翻转 `isPaused`，不修改 `timeRemaining` |
| D5 | 时间到自动进入 REVIEW | 检查计时器到 0 时调用 `handleTimeUp`，内部 `setGameState('LEVEL_N_REVIEW')` |
| D6 | 倒计时完成后切换到 progress BGM | 检查 `startCountdown` 末尾 `playBGM('progress')` |

### E. 音频系统（AI 直接验证）

| ID | 检查项 | 验证方法 |
|----|-------|---------|
| E1 | BGM 循环播放 | 检查 `playBGM` 中 `audio.loop = true` |
| E2 | 角色说话时 BGM 音量压低至 30% | 检查 `speak` 中 `bgmRef.current.volume = 0.3` |
| E3 | 角色说完话后 BGM 音量恢复至 100% | 检查 `speak` 回调中 `bgmRef.current.volume = 1.0` |
| E4 | 不同 BGM 切换时旧音频先停止 | 检查 `playBGM` 开头 `bgmRef.current.pause()` |
| E5 | 暂停时切换到休息 BGM | 检查 `togglePause` 中暂停时 `playBGM('rest')` |
| E6 | `audio.play()` 有 `.catch()` 容错 | 检查 `playBGM` 中 `.play().catch(...)` |
| E7 | 组件卸载时清理音频资源 | 检查 `useEffect` return 中 `pause + null` |

### F. 类型安全与代码质量（AI 直接验证）

| ID | 检查项 | 验证方法 |
|----|-------|---------|
| F1 | 无 `any` 类型逃逸 | 全文搜索 `: any`、`as any`、`<any>` |
| F2 | Props 接口正确：`{ params, onStatusChange, onExit }` | 检查 `ComponentProps` 定义 |
| F3 | `default export` 组件 | 检查文件末尾 `export default Component` |
| F4 | 使用 CSS Modules 避免样式冲突 | 检查 import style 和 className 使用方式 |

### G. 构建与平台约束（AI 直接验证）

| ID | 检查项 | 验证方法 |
|----|-------|---------|
| G1 | Vite 输出 CJS 格式 | 检查 `vite.config.ts` 中 `formats: ['cjs']` |
| G2 | React 设为 external | 检查 `vite.config.ts` 中 `external: ['react', 'react-dom']` |
| G3 | TypeScript target ES6 | 检查 `tsconfig.json` 中 `target` |
| G4 | JSX 模式 react-jsx | 检查 `tsconfig.json` 中 `jsx: 'react-jsx'` |

### H. 需人工验证项（AI 无法验证）

| ID | 检查项 | 无法自动验证的原因 | 建议人工验证方法 |
|----|-------|--------------------|-----------------|
| H1 | 角色图片 URL 可访问、显示正确 | 需要 HTTP 请求+图片渲染，AI 无法发起 | 浏览器打开 URL 检查 |
| H2 | BGM URL 可正常播放 | 需要音频解码环境 | 浏览器播放测试 |
| H3 | SVG 渐变色连线视觉效果正确 | 需要 SVG 渲染引擎 | 浏览器运行第二关查看 |
| H4 | CSS 动画和过渡时长符合预期 | 需要实际渲染+计时 | 浏览器运行各关卡观察 |
| H5 | 移动端适配（vmin 单位）表现 | 需要多设备测试 | 用 Chrome DevTools 模拟不同屏幕 |
| H6 | 浏览器自动播放策略下音频恢复 | 依赖浏览器策略差异 | 在 Safari/Chrome 上分别测试 |
| H7 | 快速连续点击的防抖与状态一致性 | 需要真实用户操作速率 | 手动快速操作各关卡 |
| H8 | 拼图/串珠的视觉反馈用户体验 | 主观判断 | 人工体验并评价 |

## 执行流程

### 第一步：读取所有必需文件

按「执行前提」表逐个读取文件内容，**全部完成后**再开始验证。`index.tsx` 必须读完所有行。

### 第二步：逐项验证

按 A → B → C → D → E → F → G → H 的顺序逐项检查。对于每一项：

1. **定位代码**：找到与该检查项相关的代码段
2. **判定结果**：
   - ✅ **PASS** — 代码逻辑完全符合规则
   - ❌ **FAIL** — 代码逻辑违反规则（附上具体代码位置和原因）
   - ⚠️ **WARN** — 代码基本符合但存在隐患（附上风险说明）
   - 👤 **MANUAL** — 需要人工验证（仅 H 类）
3. **记录证据**：引用具体代码行号或代码片段作为判定依据

### 第三步：修复发现的 BUG

如果某项验证结果为 ❌ FAIL：

1. **先修复再继续** — 不要跳过，立即按 Bug 修复协议修复
2. **修复后重新验证该项** — 确认已变为 PASS
3. **记录到 BUG 事件日志**（见下方模板）
4. **检查修复是否影响其他项** — 如有关联，重新验证关联项

修复时严格遵守红线规则：
- 最小化变更，只改必须改的
- 用 `// FIX: [原因]` 注释标注改动
- 不做"顺便优化"

### 第四步：输出验证报告

## 输出模板

### 验证总结

```
🔍 验证报告 — {项目名称}
📅 日期：{当前日期}
📁 验证文件：index.tsx ({行数}行), index.module.css, ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 总结：{PASS数}/{ 总数} 通过 | {FAIL数} 失败 | {WARN数} 警告 | {MANUAL数} 需人工
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{如果全部 PASS（除 MANUAL 外）}
✅ 验证通过 — 所有 AI 可验证项均符合设计规则

{如果有 FAIL}
❌ 验证未通过 — 发现 {N} 个问题，已修复 {M} 个
```

### 验证明细表

```markdown
| ID | 检查项 | 结果 | 证据/说明 |
|----|-------|------|----------|
| A1 | 第1轮串珠模式正确 | ✅ | LEVEL_1_DATA[0].pattern 匹配 |
| B2 | 数字连线严格递增 | ❌→✅ | 原代码缺少边界检查，已修复（见BUG-001） |
| H1 | 角色图片可访问 | 👤 | 需浏览器验证 |
```

### BUG 事件日志

仅在发现 FAIL 并修复时填写：

```markdown
| BUG ID | 关联检查项 | 问题描述 | 根因分析 | 修复方案 | 修改文件:行号 | 修复状态 |
|--------|-----------|---------|---------|---------|-------------|---------|
| BUG-001 | B2 | 数字连线允许跳号 | handleNumberClick 缺少 num === last+1 检查 | 添加递增条件判断 | index.tsx:L280 | ✅ 已修复并验证 |
```

如果没有 BUG，输出：

```
🎉 本次验证未发现 BUG
```

### 人工验证清单

始终输出此表，方便人工后续逐项确认：

```markdown
| ID | 检查项 | 原因 | 建议验证方法 | 人工结果 |
|----|-------|------|------------|---------|
| H1 | 角色图片可访问 | 需 HTTP 请求 | 浏览器打开 URL | ⬜ 待验证 |
```

## 扩展规则

如果项目的 `.github/copilot-instructions.md` 被更新（新增了规则或修改了规则），此 skill 的检查表也应同步更新。具体做法：

1. 读取最新的 `copilot-instructions.md`
2. 对比当前检查表，识别新增/变更的规则
3. 为新规则创建检查项，分配 ID，归入合适的分类
4. 在验证报告中标注 `[NEW]` 标记

## 与其他 skill 的关系

| Skill | 关系 |
|-------|------|
| `copilot-instructions-skill` | check-skill 的数据源 — 规则文档由它生成 |
| `debug-skill` | check-skill 不验证 dev 面板逻辑（非生产代码） |
| `group-skill` | 可将 check-skill 加入某个分组（如 `pre-release` 组） |

## 注意事项

1. **这是一个分析+验证+修复任务**，不是纯文档生成任务
2. 验证过程中如需修复代码，严格遵守 `copilot-instructions.md` 中的「Bug 修复协议」
3. 不要为了让验证通过而放松规则标准——如果真有问题，就标 FAIL 并修
4. `index.tsx` 必须完整阅读，不能遗漏任何函数
5. 对照检查时，代码的行为要与规则的**语义**一致，不只是表面相似
6. 每次验证的完整报告应直接输出到对话中，不创建额外文件（除非用户要求）
