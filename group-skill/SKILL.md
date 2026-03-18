---
name: group-skill
description: Skill 分组编排器。当用户说"项目初始化"、"初始化下"、"执行初始化"、"run init"等触发词时，按顺序执行初始化组中的所有 skill。当用户说"发布前检查"、"预发布"、"pre-release"时，执行预发布组。当用户说"素材工作流"、"生成素材"、"work"、"跑素材"时，执行素材工作组。当用户说"道具工作流"、"处理道具"、"道具上传"、"props work"、"道具透明"时，执行道具工作组。支持按分组批量调度 skill，避免逐个手动触发。
---

# Group Skill — Skill 分组编排器

按预定义的分组，批量调度执行多个 skill。

## 分组定义

### 初始化组（init）

> **触发词：** 项目初始化、初始化下、初始化项目、执行初始化、run init、init project

按以下顺序依次执行：

| 执行顺序 | Skill 名称 | 职责 | 说明 |
|---------|-----------|------|------|
| 1 | `copilot-instructions-skill` | 生成 `.github/copilot-instructions.md` | 分析源码，提取游戏规则/架构/实体等，生成协作指南 |
| 2 | `debug-skill` | 添加 Debug 调试面板 | 为组件添加开发调试面板（URL 参数 `?dev=1` 或路径含 `/dev/` 激活） |
| 3 | `ai-sounds` | 添加交互音效 | 使用 ai-sounds 库为游戏动作添加音效反馈（正确/错误点击、通关、按钮等） |
| 4 | `bgm-skill` | 添加背景音乐 | 提炼 BGM 配置并应用默认模版，实现场景切换与播放策略 |
| 5 | `check-skill` | 规则验证 | 逐条验证游戏规则、状态机、计时器、音频系统等，确保初始化后项目完整正确 |

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

**Step 2 — 执行 debug-skill：**

1. 读取 `.claude/skills/debug-skill/SKILL.md` 获取完整指令
2. 分析 `index.tsx` 中的游戏状态机（GameState）和关卡结构
3. 按 debug-skill 的规范添加调试面板代码
4. 确认修改已完成

**Step 3 — 执行 ai-sounds：**

1. 读取 `.claude/skills/ai-sounds/SKILL.md` 获取完整指令
2. 分析 `index.tsx` 中的交互动作（点击、通关、按钮等）
3. 为每个关键动作选择合适的音效 id 并添加 `playSE()` 调用
4. 确认修改已完成且构建通过

**Step 4 — 执行 bgm-skill：**

1. 读取 `.claude/skills/bgm-skill/SKILL.md` 获取完整指令
2. 分析游戏设计文档，确定 BGM 需求，如无自定义则使用默认 BGM 模版
3. 将 BGM 配置和场景切换逻辑应用到游戏组件中
4. 确认 BGM 播放功能正常

**Step 5 — 执行 check-skill：**

1. 读取 `.claude/skills/check-skill/SKILL.md` 获取完整指令
2. 基于最新的 copilot-instructions.md 逐条验证游戏规则、状态机流转、计时器行为、音频系统、类型安全等
3. 发现问题立即修复，输出验证报告
4. 确认所有检查项通过

### 执行完成后

汇总报告所有 skill 的执行结果：

```
✅ 初始化组执行完成：
  1. copilot-instructions-skill — ✅ 已生成 .github/copilot-instructions.md
  2. debug-skill — ✅ 已添加调试面板
  3. ai-sounds — ✅ 已添加交互音效
  4. bgm-skill — ✅ 已添加背景音乐
  5. check-skill — ✅ 规则验证通过
```

如果有失败项：

```
⚠️ 初始化组执行完成（有异常）：
  1. copilot-instructions-skill — ✅ 已生成
  2. debug-skill — ❌ 失败：[具体原因]
  3. ai-sounds — ✅ 已添加交互音效
  4. bgm-skill — ✅ 已添加背景音乐
  5. check-skill — ⚠️ 发现 N 项问题并已修复
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

**执行步骤：**

**Step 1 — 执行 copilot-instructions-skill：**

1. 读取 `.claude/skills/copilot-instructions-skill/SKILL.md` 获取完整指令
2. 分析项目源码，更新 `.github/copilot-instructions.md`
3. 确认文件已写入

**Step 2 — 执行 check-skill：**

1. 读取 `.claude/skills/check-skill/SKILL.md` 获取完整指令
2. 基于最新的 copilot-instructions.md 进行逐项验证
3. 发现问题立即修复，输出验证报告

---

### 素材工作组（material-work）

> **触发词：** 素材工作流、生成素材、跑素材、work、run work、素材生产、素材流水线

通过一站式提炼全部资源数据，再一站式生产素材，最后检查整个游戏。

按以下顺序依次执行：

| 执行顺序 | Skill 名称 | 职责 | 说明 |
|---------|-----------|------|------|
| 1 | `bgm-skill` | 提炼 BGM 规划 | 提炼背景音乐配置、场景切换规则与播放策略，输出 BGM 规划 JSON |
| 2 | `extract-skill` | 一站式资源提炼 | 提炼角色信息、TTS 语音、素材清单，输出 roles.json + tts.json + materials.json + preview.html |
| 3 | `produce-skill` | 一站式素材生产 | 为素材生成 prompt，调用 API 批量生产图片和 TTS，输出 asset-urls.ts |
| 4 | `check-skill` | 规则验证 | 逐条验证游戏规则、状态机、素材完整性等，确保整体正确 |

**执行步骤：**

**Step 1 — 执行 bgm-skill：**

1. 读取 `.claude/skills/bgm-skill/SKILL.md` 获取完整指令
2. 分析游戏设计文档和源码，提炼 BGM 配置、场景切换规则与播放策略
3. 如无自定义 BGM 需求，使用默认 BGM 模版
4. 输出 BGM 规划 JSON

**Step 2 — 执行 extract-skill：**

1. 读取 `.claude/skills/extract-skill/SKILL.md` 获取完整指令
2. 分析游戏源码，一次性提炼角色信息、TTS 语音数据、素材清单
3. 输出 `素材库/roles.json` + `素材库/tts.json` + `素材库/materials.json` + `素材库/preview.html`

**Step 3 — 执行 produce-skill：**

1. 读取 `.claude/skills/produce-skill/SKILL.md` 获取完整指令
2. 基于 Step 2 输出的素材清单和 TTS 数据，为每个素材生成文生图提示词
3. 组装 `assets.json`，调用 Pipeline 批量生产图片和 TTS
4. 更新 `asset-urls.ts` 和 `asset-urls.json`，将素材应用到游戏中

**Step 4 — 执行 check-skill：**

1. 读取 `.claude/skills/check-skill/SKILL.md` 获取完整指令
2. 逐条验证游戏规则、状态机流转、素材引用完整性等
3. 发现问题立即修复，输出验证报告

---

### 道具工作组（props-work）

> **触发词：** 道具工作流、处理道具、道具上传、props work、道具透明、道具处理

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
python "{skill_dir}/scripts/remove-bg.py" "素材库/download/叉子.png" -o "素材库/download/叉子_transparent.png"
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
