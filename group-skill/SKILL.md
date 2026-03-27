---
name: group-skill
description: Skill 分组编排器。当用户说"项目初始化"、"初始化下"、"执行初始化"、"run init"等触发词时，按顺序执行初始化组中的所有 skill。当用户说"发布前检查"、"预发布"、"pre-release"时，执行预发布组。当用户说"素材工作流"、"生成素材"、"work"、"跑素材"时，执行素材工作组。当用户说"道具工作流"、"处理道具"、"道具上传"、"props work"、"道具透明"时，执行道具工作组。当用户说"刷新"、"refresh"、"快速刷新"、"刷新素材"、"更新预览"时，执行快速刷新组。支持按分组批量调度 skill，避免逐个手动触发。
---

# Group Skill — Skill 分组编排器

按预定义的分组，批量调度执行多个 skill。

## ⚠️ 防覆盖规则

初始化组执行时，各子 skill 必须先检查 `index.tsx` 中的 `@custom-*` 标记，已标记的区域跳过覆盖：

| 标记 | 对应 Skill | 动作 |
|------|-----------|------|
| `@custom-dev-panel` | debug-skill | 跳过 Dev 面板 JSX 覆盖 |
| `@custom-characters` | roles-skill | 跳过 CHARACTERS 配置块写入 |
| `@custom-bgm` | bgm-skill | 跳过 BGM 配置块写入 |
| `@custom-sounds` | ai-sounds | 跳过音效代码注入 |

每个子 skill 的 SKILL.md 中已包含该规则。编排器仅负责调度，不负责绕过子 skill 的防护。

## 分组定义

### 初始化组（init）

> **触发词：** 项目初始化、初始化下、初始化项目、执行初始化、run init、init project

按以下顺序依次执行：

| 执行顺序 | Skill 名称 | 职责 | 说明 |
|---------|-----------|------|------|
| 1 | `copilot-instructions-skill` | 生成 `.github/copilot-instructions.md` | 分析源码，提取游戏规则/架构/实体等，生成协作指南 |
| 2 | `agent-creator` | 生成开发 Agent | 基于项目源码生成 `.github/agents/game-dev.md`（Copilot Agent，通过 `@game-dev` 调用） |
| 3 | `roles-skill` | 查询角色资源库 | 从角色库查询可用角色（小安/小瑞/小布），将 idle/speaking 图片 URL、主题色写入项目角色配置 |
| 4 | `ai-sounds` | 添加交互音效 | 使用 ai-sounds 库为游戏动作添加音效反馈（正确/错误点击、通关、按钮等） |
| 5 | `bgm-skill` | 添加背景音乐 | 提炼 BGM 配置并应用默认模版，实现场景切换与播放策略 |
| 6 | `debug-skill` | 添加 Debug 调试面板 | 为组件添加开发调试面板（URL 参数 `?dev=1` 或路径含 `/dev/` 激活） |
| 7 | `extract-skill` | 资源提炼（asset-urls + asset-data） | 从 index.tsx 提炼 URL 常量，输出 asset-urls.ts + public/asset-data.json |
| 8 | `preview-skill` | AI素材工坊技能 | 基于数据文件生成 preview.html，查看生产线仪表盘，按分类一键触发生产 |
| 9 | `check-skill` | 规则验证 | 逐条验证游戏规则、状态机、计时器、音频系统等，确保初始化后项目完整正确 |

---

## 执行规范

### 触发匹配

当用户的指令匹配到**某个分组的触发词**时，自动按该分组的定义顺序执行所有 skill。

### 执行流程

1. **识别分组**：根据用户指令匹配对应的分组（如"项目初始化" → 初始化组）
2. **依次执行**：按表格中的「执行顺序」，逐个读取对应 skill 的 SKILL.md 并执行
3. **上下文传递**：前一个 skill 的产出可作为后续 skill 的输入（如 copilot-instructions 生成的游戏规则信息可辅助 debug-skill 理解关卡结构）
4. **异常处理**：某个 skill 执行失败时，报告错误并继续执行下一个，最终汇总结果

### 执行步骤（初始化组详细）

**Step 1 — 执行 copilot-instructions-skill：**

1. 读取 `.claude/skills/copilot-instructions-skill/SKILL.md` 获取完整指令
2. 按指令要求读取项目所有核心文件（`index.tsx`、`package.json`、`vite.config.ts`、`tsconfig.json`、`README.md` 等）
3. 按 5 步分析流程提取信息
4. 生成 `.github/copilot-instructions.md`
5. 确认文件已写入

**Step 2 — 执行 agent-creator：**

1. 读取 `.claude/skills/agent-creator/SKILL.md` 获取完整指令
2. 读取项目所有核心文件（`.github/copilot-instructions.md`、`index.tsx`、`index.module.css`、`CLAUDE.md`、`package.json`、`vite.config.ts` 等）
3. 基于项目实际代码和模板生成 `.github/agents/game-dev.md`（GitHub Copilot 自定义 Agent）
4. 确认文件已写入，可通过 `@game-dev` 调用

**Step 3 — 执行 roles-skill：**

1. 读取 `.claude/skills/roles-skill/SKILL.md` 获取完整指令
2. 读取 `.claude/skills/roles-skill/roles-library.json` 获取角色资源数据
3. 根据项目需要的角色，将 idle/speaking 图片 URL、主题色等写入项目的角色配置
4. 确认角色资源已正确引入

**Step 4 — 执行 ai-sounds：**

1. 读取 `.claude/skills/ai-sounds/SKILL.md` 获取完整指令
2. 分析 `index.tsx` 中的交互动作（点击、通关、按钮等）
3. 为每个关键动作选择合适的音效 id 并添加 `playSE()` 调用
4. 确认修改已完成且构建通过

**Step 5 — 执行 bgm-skill：**

1. 读取 `.claude/skills/bgm-skill/SKILL.md` 获取完整指令
2. 分析游戏设计文档，确定 BGM 需求，如无自定义则使用默认 BGM 模版
3. 将 BGM 配置和场景切换逻辑应用到游戏组件中
4. 确认 BGM 播放功能正常

**Step 6 — 执行 debug-skill：**

1. 读取 `.claude/skills/debug-skill/SKILL.md` 获取完整指令
2. 分析 `index.tsx` 中的游戏状态机（GameState）和关卡结构
3. 按 debug-skill 的规范添加调试面板代码
4. 确认修改已完成

**Step 7 — 执行 extract-skill：**

1. 读取 `.claude/skills/extract-skill/SKILL.md` 获取完整指令
2. 分析游戏源码，提炼素材 CDN URL 常量
3. 输出 `asset-urls.ts` + 运行 `node .claude/skills/preview-skill/scripts/gen-asset-data.mjs` 生成 `public/asset-data.json`
4. 确认文件已写入

**Step 8 — 执行 preview-skill：**

1. 读取 `.claude/skills/preview-skill/SKILL.md` 获取完整指令
2. 运行 `node .claude/skills/preview-skill/scripts/generate-preview.cjs --open` 生成预览页
3. 在浏览器中打开 `public/preview.html`
4. 确认预览页已生成

**Step 9 — 执行 check-skill：**

1. 读取 `.claude/skills/check-skill/SKILL.md` 获取完整指令
2. 基于最新的 copilot-instructions.md 逐条验证游戏规则、状态机流转、计时器行为、音频系统、类型安全等
3. 发现问题立即修复，输出验证报告
4. 确认所有检查项通过

### 执行完成后

汇总报告所有 skill 的执行结果：

```
✅ 初始化组执行完成：
  1. copilot-instructions-skill — ✅ 已生成 .github/copilot-instructions.md
  2. agent-creator — ✅ 已生成 .github/agents/game-dev.md（@game-dev）
  3. roles-skill — ✅ 已引入角色资源（小安/小瑞/小布）
  4. ai-sounds — ✅ 已添加交互音效
  5. bgm-skill — ✅ 已添加背景音乐
  6. debug-skill — ✅ 已添加调试面板
  7. extract-skill — ✅ 已提炼 asset-urls.ts + asset-data.json
  8. preview-skill — ✅ 已生成 public/preview.html
  9. check-skill — ✅ 规则验证通过
```

如果有失败项：

```
⚠️ 初始化组执行完成（有异常）：
  1. copilot-instructions-skill — ✅ 已生成
  2. agent-creator — ✅ 已生成 @game-dev Agent
  3. roles-skill — ✅ 已引入角色资源
  4. ai-sounds — ✅ 已添加交互音效
  5. bgm-skill — ✅ 已添加背景音乐
  6. debug-skill — ❌ 失败：[具体原因]
  7. extract-skill — ✅ 已提炼资源
  8. preview-skill — ✅ 已生成预览页
  9. check-skill — ⚠️ 发现 N 项问题并已修复
```

---

## 扩展分组

### 预发布组（pre-release）

> **触发词：** 发布前检查、预发布、pre-release、发布检查、上线前验证、跑一遍检查

按以下顺序依次执行：

| 执行顺序 | Skill 名称 | 职责 | 说明 |
|---------|-----------|------|------|
| 1 | `copilot-instructions-skill` | 更新 `.github/copilot-instructions.md` | 确保设计文档与代码同步 |
| 2 | `check-skill` | 规则验证 | 逐条验证游戏规则、状态机、计时器、音频系统等 |
| 3 | `playwright-skill` | E2E 自动化测试 | 运行 Playwright 测试覆盖游戏流程、视觉回归、交互边界、响应式布局 |

**执行步骤：**

**Step 1 — 执行 copilot-instructions-skill：**

1. 读取 `.claude/skills/copilot-instructions-skill/SKILL.md` 获取完整指令
2. 分析项目源码，更新 `.github/copilot-instructions.md`
3. 确认文件已写入

**Step 2 — 执行 check-skill：**

1. 读取 `.claude/skills/check-skill/SKILL.md` 获取完整指令
2. 基于最新的 copilot-instructions.md 进行逐项验证
3. 发现问题立即修复，输出验证报告

**Step 3 — 执行 playwright-skill：**

1. 读取 `.claude/skills/playwright-skill/SKILL.md` 获取完整指令
2. 确保 dev server 已启动（`npm run dev`）
3. 运行 `npx playwright test` 执行全量 E2E 测试
4. 输出测试报告，补充 check-skill H 类检查项的自动化验证结果

---

### 素材工作组（material-work）

> **触发词：** 素材工作流、生成素材、跑素材、work、run work、素材生产、素材流水线

提炼 TTS 和素材清单，生成带分类生产按钮的预览页，然后通过预览页按分类生产。

按以下顺序依次执行：

| 执行顺序 | Skill 名称 | 职责 | 说明 |
|---------|-----------|------|------|
| 1 | `extract-skill` | 资源提炼（asset-urls + asset-data） | 从 index.tsx 提炼 URL 常量，输出 asset-urls.ts + public/asset-data.json |
| 2 | `preview-skill` | AI素材工坊技能 | 基于数据文件生成 preview.html，查看生产线仪表盘，按分类一键触发生产 |
| 3 | `produce-skill` | 按分类生产 | 用预览页按钮或手动调用，场景类直接生产，道具类走全流程 |
| 4 | `check-skill` | 规则验证 | 逐条验证游戏规则、状态机、素材完整性等，确保整体正确 |

**素材分类规则（preview.html 已内置）：**

| 分类 | 包含内容 | 是否需要透明化 | 生产流程 |
|------|---------|:------------:|---------|
| 📸 场景类 | 背景图、场景图 | ❌ 不需要 | 文生图 → CDN URL → 完成 |
| 🎭 道具类 | 鱼类、工具、干扰物、特效、UI | ✅ 需要 | 文生图 → 下载 → 去背景 → 上传CS → CDN URL |
| 🎙️ TTS | 语音台词 | ❌ 不需要 | TTS合成 → CDN URL → 完成 |

> **💡 推荐工作方式：** 执行完 extract-skill 后，执行 preview-skill（运行 `node .claude/skills/preview-skill/scripts/generate-preview.cjs --open`）生成并打开 `public/preview.html`（AI素材工坊页），顶部有三个分类环形进度卡片（场景素材 / 道具+透明化 / TTS），点击卡片中的生产按钮会自动复制包含完整流程的 Copilot 指令到剪贴板。也可以按区块单独点击每个素材类别的生产按钮。

**执行步骤：**

**Step 1 — 执行 extract-skill：**

1. 读取 `.claude/skills/extract-skill/SKILL.md` 获取完整指令
2. 分析游戏源码，提炼涂材 CDN URL 常量
3. 输出 `asset-urls.ts` + 运行 `node .claude/skills/preview-skill/scripts/gen-asset-data.mjs` 生成 `public/asset-data.json`

**Step 2 — 执行 preview-skill（AI素材工坊技能）：**

1. 读取 `.claude/skills/preview-skill/SKILL.md` 获取完整指令
2. 运行 `node .claude/skills/preview-skill/scripts/generate-preview.cjs --open` 生成预览页
3. 在浏览器中打开 `public/preview.html`

**Step 3 — 按分类生产素材：**

用户可通过 preview.html 的按钮触发，或直接执行：

- **场景类素材**（直接生产）：
  1. 从 `素材库/assets.json` 提取场景类素材 prompt
  2. 使用 produce-skill 的 `asset-generate.js --type 12` 生产
  3. 更新 `asset-urls.ts`，重新运行 `preview-skill` 生成预览页

- **道具类素材**（生产 + 透明化全流程）：
  1. 从 `素材库/assets.json` 提取道具类素材 prompt
  2. 使用 produce-skill 的 `asset-generate.js --type 12` 生产
  3. 将生成图片下载到 `素材库/download/`
  4. 使用 transparent-bg-skill 去背景透明化
  5. 使用 upload-skill 上传到 CS 获取 CDN URL
  6. 更新 `asset-urls.ts`，重新运行 `preview-skill` 生成预览页

- **TTS 语音**：
  1. 从 `素材库/assets.json` 提取 TTS 数据
  2. 使用 produce-skill 的 `asset-generate.js --type 21` 生产
  3. 更新 `asset-urls.ts`，重新运行 `preview-skill` 生成预览页

**Step 4 — 执行 check-skill：**

1. 读取 `.claude/skills/check-skill/SKILL.md` 获取完整指令
2. 逐条验证游戏规则、状态机流转、素材引用完整性等
3. 发现问题立即修复，输出验证报告

---

### 道具补充处理组（props-work）

> **触发词：** 道具工作流、处理道具、道具上传、props work、道具透明、道具处理

> **⚠️ 注意：** 如果是新素材的完整生产流程，推荐使用「素材工作组」或 preview.html 的分类按钮。本组适用于**已有道具图片需要单独做透明化处理**的场景（如手动获取的图片、外部素材、需要重新处理的道具）。

将指定道具图片下载到素材库，进行去背景透明化处理，上传到 CS 获取 CDN URL，替换代码中原有的道具地址，最后做规则验证。

按以下顺序依次执行：

| 执行顺序 | Skill 名称 | 职责 | 说明 |
|---------|-----------|------|------|
| 1 | `list-props` | 罗列道具清单 | 从 `asset-urls.ts` 和游戏代码中提取所有道具，展示清单供用户勾选 |
| 2 | `download` | 下载道具图片 | 将用户指定的道具 URL 下载到 `素材库/download/` 目录 |
| 3 | `transparent-bg-skill` | 去背景透明化 | 使用 AI 模式去除道具图片背景，输出透明 PNG |
| 4 | `upload-skill` | 上传到 CS | 将透明化后的道具图片上传到 CS，获取 CDN URL |
| 5 | `replace-urls` | 替换道具地址 | 用新的 CDN URL 替换 `asset-urls.ts` 和 `asset-urls.json` 中对应的旧地址 |
| 6 | `check-skill` | 规则验证 | 逐条验证游戏规则、素材引用完整性等，确保替换后项目正确 |

**执行步骤：**

**Step 1 — 罗列道具清单（等待用户选择）：**

1. 读取 `asset-urls.ts` 和 `asset-urls.json`，提取所有道具类型的素材（如叉子、勺子、苹果、西红柿等）
2. 结合游戏代码中的关卡配置，识别哪些是道具素材
3. 展示道具清单（序号 + 名称 + 当前 CDN URL），让用户勾选需要处理的道具
4. **等待用户确认选择后**，再继续执行后续步骤

示例输出：
```
📝 道具清单（共 6 个）：
  1. 叉子  → https://gcdncs.101.com/v0.1/download?...&dentryId=0a4dda51-...
  2. 勺子  → https://gcdncs.101.com/v0.1/download?...&dentryId=ee8c91fb-...
  3. 苹果  → https://gcdncs.101.com/v0.1/download?...&dentryId=74a4ae1a-...
  4. 西红柿 → https://gcdncs.101.com/v0.1/download?...&dentryId=ac4f1680-...
  5. 红豆  → https://gcdncs.101.com/v0.1/download?...&dentryId=4710ea3b-...
  6. 绿豆  → https://gcdncs.101.com/v0.1/download?...&dentryId=e0ce9937-...

请选择需要处理的道具（输入序号，如 1,3,5 或 all）：
```

**Step 2 — 下载道具图片（自动执行）：**

1. 确认用户指定的道具名称和对应的图片 URL（从 `asset-urls.ts` 或 `asset-urls.json` 中获取当前地址）
2. 使用终端命令将图片下载到 `素材库/download/` 目录
3. 确认文件已下载且可正常打开

```bash
# 自动执行：下载道具图片
curl -L -o "素材库/download/叉子.png" "<原图片URL>"
```

**Step 2 — 执行 transparent-bg-skill：**

1. 读取 `.claude/skills/transparent-bg-skill/SKILL.md` 获取完整指令
2. 对下载的道具图片执行去背景处理（推荐 AI 模式）
3. 输出透明背景 PNG 到 `素材库/download/` 目录

```bash
# 示例：AI 模式去背景
node "{skill_dir}/scripts/remove-bg.mjs" "素材库/download/叉子.png" -o "素材库/download/叉子_transparent.png"
```

4. 验证结果，如有问题可调整参数重试

**Step 3 — 执行 upload-skill：**

1. 读取 `.claude/skills/upload-skill/SKILL.md` 获取完整指令
2. 将透明化后的道具图片上传到 CS
3. 记录返回的 CDN URL

```bash
# 示例：上传单个道具
bun run <upload-skill-dir>/scripts/upload.js "素材库/download/叉子_transparent.png" --json
```

4. 确认上传成功，记录新的 CDN URL

**Step 4 — 替换道具地址（自动执行）：**

1. 用 Step 3 获得的新 CDN URL 替换 `asset-urls.ts` 中对应道具的旧 URL
2. 同步更新 `asset-urls.json` 中对应道具的旧 URL
3. 确认所有引用该道具的地方都已更新

**Step 5 — 执行 check-skill：**

1. 读取 `.claude/skills/check-skill/SKILL.md` 获取完整指令
2. 逐条验证游戏规则、状态机流转、素材引用完整性等
3. 发现问题立即修复，输出验证报告

### 执行完成后汇总

```
✅ 道具工作组执行完成：
  1. list-props — ✅ 已罗列 N 个道具，用户选择了 M 个
  2. download — ✅ 已下载 M 个道具到素材库/download/
  3. transparent-bg-skill — ✅ 已完成去背景处理
  4. upload-skill — ✅ 已上传到 CS，获得新 CDN URL
  5. replace-urls — ✅ 已更新 asset-urls.ts 和 asset-urls.json
  6. check-skill — ✅ 规则验证通过
```

---

### 快速刷新组（refresh）

> **触发词：** 刷新、refresh、快速刷新、刷新素材、更新预览

改完代码后快速更新素材清单和预览页，不做全量初始化。

| 执行顺序 | Skill 名称 | 职责 | 说明 |
|---------|-----------|------|------|
| 1 | `extract-skill` | 资源提炼 | 从 index.tsx 提炼 URL 常量，更新 asset-urls.ts + asset-data.json |
| 2 | `preview-skill` | 更新预览页 | 重新生成 preview.html |
| 3 | `check-skill` | 规则验证 | 快速验证规则完整性 |

**执行步骤：**

**Step 1 — 执行 extract-skill：**

1. 读取 `.claude/skills/extract-skill/SKILL.md` 获取完整指令
2. 分析游戏源码，提炼素材 CDN URL 常量
3. 输出 `asset-urls.ts` + 运行 `node .claude/skills/preview-skill/scripts/gen-asset-data.mjs` 生成 `public/asset-data.json`

**Step 2 — 执行 preview-skill：**

1. 读取 `.claude/skills/preview-skill/SKILL.md` 获取完整指令
2. 运行 `node .claude/skills/preview-skill/scripts/generate-preview.cjs --open` 生成预览页
3. 在浏览器中打开 `public/preview.html`

**Step 3 — 执行 check-skill：**

1. 读取 `.claude/skills/check-skill/SKILL.md` 获取完整指令
2. 逐条验证游戏规则、状态机流转、素材引用完整性等
3. 发现问题立即修复，输出验证报告

### 执行完成后汇总

```
✅ 快速刷新组执行完成：
  1. extract-skill — ✅ 已更新 asset-urls.ts + asset-data.json
  2. preview-skill — ✅ 已重新生成 preview.html
  3. check-skill — ✅ 规则验证通过
```

---

如需添加新的分组，按以下格式追加：

```markdown
### {分组名}（{英文标识}）

> **触发词：** {触发词1}、{触发词2}、...

| 执行顺序 | Skill 名称 | 职责 | 说明 |
|---------|-----------|------|------|
| 1 | `{skill-name}` | {职责} | {说明} |
| 2 | `{skill-name}` | {职责} | {说明} |
```

如需在初始化组中追加新 skill，在表格末尾添加新行，按顺序递增即可。
