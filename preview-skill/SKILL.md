```skill
---
name: preview-skill
description: AI素材工坊技能（原素材预览）。打开 素材库/preview.html 可视化查看所有素材状态（场景背景、道具、TTS 语音、角色、BGM），通过内置的「素材生产线」仪表盘按分类一键触发生产。左侧导航栏支持快速跳转和完成度指示。触发词包括"AI素材工坊"、"打开AI素材工坊"、"工坊页"、"preview"、"素材面板"、"生产面板"、"素材总览"、"查看素材"、"素材状态"。
---

# Preview Skill — AI素材工坊与生产控制面板

可视化查看项目所有素材的生产状态，并通过内置生产线面板按分类一键触发生产。

## 功能概览

| 功能 | 说明 |
|------|------|
| **左侧导航栏** | 固定侧边栏，分组导航（总览/场景/道具/音频），scroll-spy 高亮当前区块，状态圆点实时显示各区完成度，底部进度条 |
| **素材生产线仪表盘** | 环形进度圆环 × 3 分类（场景/道具/TTS），实时显示完成比例和总进度 |
| **分类一键生产** | 每个分类卡片内置 ▶ 生产按钮，点击自动复制完整 Copilot 指令到剪贴板 |
| **素材卡片预览** | 场景背景、道具 — 缩略图 + Prompt 可编辑展示 |
| **Prompt 编辑工具栏** | 展开后显示「📋 复制」+「🔄 重新生产」按钮，支持在线编辑 prompt 并触发重新生产流程 |
| **重新生产弹窗** | 输入修改需求 → 自动构建含旧 prompt + 需求 + 4步生产指令的完整 Copilot 指令，复制后跳转 VS Code |
| **角色形象预览** | idle / speaking 双状态对比 + 音色配置表 |
| **BGM 试听** | 主流程/游戏进行/暂停休息三轨在线试听 |
| **TTS 语音表** | 全量台词列表 + 在线试听 + 生产状态标签 |

## 页面布局

```
┌──────────┬──────────────────────────────────────┐
│ 左侧导航  │  主内容区                              │
│ 180px    │  padding-left: 204px                  │
│          │                                       │
│ 🎣 AI素材工坊│  🏭 素材生产线（环形进度 × 3）          │
│  [项目名]  │                                       │
│          │  📋 游戏关卡详情                         │
│ ─ 总览 ─  │                                       │
│ 📊 生产线 ●│  📸 场景类素材                          │
│ 🗺️ 关卡   │  🎭 道具类素材                          │
│ ─ 场景 ─  │                                       │
│ 🌊 背景图 ●│  👤 角色形象 + 音色配置                  │
│ ─ 道具 ─  │  🎵 BGM 试听                          │
│ [各道具] ● │  🎙️ TTS 语音表                        │
│ ─ 音频 ─  │                                       │
│ 🧑‍🎓 角色   │                                       │
│ 🎵 BGM   │                                       │
│ 🗣️ TTS   ●│                                       │
│ ▓▓▓░░ 60%│                                       │
│ [↑ 顶部]  │                                       │
└──────────┴──────────────────────────────────────┘
```

**导航栏特性：**
- 固定左侧 180px，深色背景 `#0a0e17`（与内容区 `#1a1a2e` 有明显对比），右侧投影
- 品牌区：渐变色圆角图标 + 项目名称 + 副标题
- 分组标签：总览 / 场景 / 道具 / 音频
- Scroll-spy：滚动时自动高亮当前区块，左侧绿色发光竖条指示器
- 状态圆点：🟢 全部完成 / 🟠 部分完成 / ⚫ 未完成
- 底部渐变进度条（green → gold）显示全局完成率

## 素材分类规则

preview.html 基于 `materials.json` 中的 `transparentBg` 字段自动将素材分为两大类：

| 分类 | `transparentBg` | 包含内容 | 生产流程 |
|------|:-----------:|---------|---------|
| 📸 场景类 | `false` | 背景图、场景图 | 文生图 → 完成 |
| 🎭 道具类 | `true` | 道具元素 | 文生图 → 下载 → 去背景 → 上传CS → 完成 |
| 🎙️ TTS | — | 语音台词 | 语音合成 → 完成 |

## 使用流程

### Step 1：打开AI素材工坊页

在浏览器中打开 `素材库/preview.html`：

```bash
# Windows
start 素材库/preview.html

# macOS
open 素材库/preview.html
```

> AI素材工坊页是纯静态 HTML，无需启动服务器，双击即可打开。

### Step 2：查看素材生产线

页面顶部「🏭 素材生产线」仪表盘显示三张卡片：

- **📸 场景素材** — 环形进度显示完成比例，步骤链：`文生图 → 完成`
- **🎭 道具素材** — 环形进度显示完成比例，步骤链：`文生图 → 下载 → 去背景 → 上传CS → 完成`
- **🎙️ TTS 语音** — 环形进度显示完成比例，步骤链：`语音合成 → 完成`

底部总进度条显示全局完成率。

### Step 3：使用左侧导航

- 点击导航项平滑滚动到对应区块
- 观察状态圆点了解各区完成情况
- 底部进度条查看全局完成比例
- 点击「↑ 回到顶部」快速返回

### Step 4：按分类生产

点击卡片中的 **▶ 生产** 按钮：

1. 按钮自动生成包含完整生产流程的 Copilot 指令
2. 指令被同步复制到剪贴板（`execCommand('copy')` + clipboard API fallback）
3. 弹出模态弹窗，显示「⚡ 打开 VS Code」按钮（`<a href="vscode://file/...">` 链接）
4. 用户点击按钮，浏览器弹出协议确认框并打开 VS Code
5. 在 Copilot 聊天框粘贴执行

**各分类生产指令内容：**

| 按钮 | 生成的指令包含 |
|------|-------------|
| 📸 场景生产 | 读取 assets.json → produce-skill 文生图 → 更新 URL |
| 🎭 道具生产 | 读取 assets.json → produce-skill 文生图 → 下载 → transparent-bg-skill 去背景 → upload-skill 上传 → 更新 URL |
| 🎙️ TTS 生产 | 读取 assets.json → produce-skill TTS 合成 → 更新 URL |
| 🚀 一键全部 | 按分类分别执行上述全部流程 |

### Step 5：单素材 Prompt 编辑与重新生产

每个素材卡片的 Prompt 区域支持可编辑的工作流：

**展开 Prompt 工具栏：**
```
▼ 编辑 Prompt              📋 复制  🔄 重新生产
┌─────────────────────────────────────────────┐
│ prompt 文本（固定 100px 高度，可滚动编辑）     │
└─────────────────────────────────────────────┘
```

- **📋 复制** — 复制当前 textarea 中的 prompt 原文到剪贴板
- **🔄 重新生产** — 弹出「重置提示词」弹窗：
  1. 显示当前旧提示词（只读）
  2. 用户输入修改需求（如"改为俯视角度"、"增加荷叶元素"等）
  3. 点击「确定并复制到 Copilot」后自动构建完整指令：
     - **第一步**：基于旧 prompt + 用户需求生成新英文提示词
     - **第二步**：将新 prompt 同步写入 preview.html 和 materials.json
     - **第三步**：使用新 prompt 生产素材（场景直接生产/道具需透明化）
     - **第四步**：输出新 prompt、新 URL、变更文件列表
  4. 指令复制到剪贴板，弹出 VS Code 跳转弹窗

**Prompt 编辑特性：**
- textarea 固定 100px 高度，超出内容可滚动
- 编辑后 textarea 边框变为橙色提示已修改
- 展开时按钮才显示，收起时按钮隐藏
- 按钮带 emoji 图标，复制在左、重新生产在右（渐变金橙色醒目按钮）

### Step 6：查看素材详情

向下滚动查看各区块：
- **场景背景** — 大尺寸缩略图卡片，含 Prompt 可编辑工具栏（📋 复制 / 🔄 重新生产）
- **道具素材** — 道具缩略图，含状态标签（已部署/待制作），Prompt 可编辑
- **角色形象** — idle/speaking 双状态 + 音色配置
- **BGM 音轨** — 在线播放器
- **TTS 语音** — 完整台词表 + 试听

### Step 7：上传AI素材工坊页并更新 Debug 面板

> 每次 `preview.html` 被生成或更新后必须执行。

**6a. 上传到 CS 获取 CDN URL：**

```bash
bun --env-file=.claude/.env run .claude/skills/upload-skill/scripts/upload.js "./素材库/preview.html" --json
```

从输出中提取 `downloadUrl`。

**6b. 更新 `index.tsx` 中 Debug 面板的AI素材工坊链接：**

找到 `{/* AI素材工坊 */}` 区域的链接按钮，将 `href` 或存储 URL 更新为新的 CDN URL。示例：

```tsx
href="https://gcdncs.101.com/v0.1/download?dentryId=新的ID"
```

> ⚠️ 不执行这两步，Debug 面板的「打开AI素材工坊」按钮将指向旧版地址。

## 文件位置

| 文件 | 说明 |
|------|------|
| `素材库/preview.html` | 预览页主文件（纯静态 HTML，由 extract-skill 生成） |
| `素材库/materials.json` | 素材清单数据源（含 transparentBg 分类标记） |
| `素材库/tts.json` | TTS 语音数据源 |
| `素材库/assets.json` | Prompt 和生产配置 |

## 与其他 Skill 的协作

| 关系 | Skill | 说明 |
|------|-------|------|
| **上游** | `extract-skill` | 生成 preview.html、materials.json、tts.json |
| **协作** | `upload-skill` | 上传 preview.html 到 CS 获取 CDN URL |
| **协作** | `debug-skill` | 更新 index.tsx 中 Debug 面板的AI素材工坊链接 |
| **下游** | `produce-skill` | 接收生产指令，执行文生图/TTS |
| **下游** | `transparent-bg-skill` | 道具类素材去背景 |
| **下游** | `upload-skill` | 透明化后上传 CS |
| **下游** | `check-skill` | 生产完成后验证素材完整性 |

## 迁移到其他项目

preview.html 由 `extract-skill` 自动生成，**整体是项目专属的**。但 skill 本身（SKILL.md）和页面的框架结构（CSS/JS）是通用的。

### 无需修改（通用部分）

| 部分 | 说明 |
|------|------|
| 侧栏导航 CSS/JS | 布局、scroll-spy、状态圆点、进度条 — 完全通用 |
| VS Code 跳转弹窗 | 模态弹窗 + `<a href="vscode://">` 链接按钮 — 完全通用 |
| 重置提示词弹窗 | 输入修改需求 → 构建 4 步 Copilot 指令 — 完全通用 |
| Prompt 工具栏 | `togglePrompt()` / `copyPrompt()` / `openResetPromptModal()` — 完全通用 |
| 环形进度仪表盘 | `renderPipeline()` — 数据驱动，自动适配任意分区数量 |
| 素材卡片渲染函数 | `renderScenes()` / `renderPropGrid()` — 模板函数通用 |
| TTS 表格渲染 | `renderTTS()` — 通用 |
| 角色/BGM 渲染 | `renderChars()` / `renderBGM()` — 通用 |
| 生产指令系统 | `buildCopilotPrompt()` / `produceSection()` / `copyAndFocus()` / `closeVscodeModal()` — 通用 |
| SECTION_DATA 结构 | 分类逻辑（scene/prop/tts）— 通用 |
| SKILL.md | 本文件 — 完全通用，无项目专属内容 |

### 需要修改（项目专属 — 由 extract-skill 自动生成）

| 部分 | 位置 | 当前项目示例 |
|------|------|------------|
| **页面标题** | `<title>` / `<h1>` | `金色渔夫游戏` |
| **侧栏品牌副标题** | `.nav-brand-sub` | `金色渔夫` |
| **侧栏导航项名称/数量** | `.nav-item` | `🐟 鱼类` — 其他项目可能是棋子、单词等 |
| **关卡数据 HTML** | `#sec-levels` 区块 | 3 个关卡（小溪初钓/激流挑战/瀑布捕鱼） |
| **素材数据数组** | `SCENES` / `FISH` / `TOOLS` 等 | 各素材的 name、prompt、url、icon |
| **角色数据** | `CHARACTERS` | idle/speaking CDN URL |
| **BGM 数据** | `BGMS` | mp3 URL |
| **TTS 数据** | `TTS` | 台词内容和音频 URL |
| **SECTION_DATA 分区 key** | `scenes/fish/tools/fx/ui/tts` | 与上面的数据数组一一对应 |

### 迁移结论

> **preview.html 不需要手工迁移修改**。它由 `extract-skill` 根据 `materials.json` + `tts.json` + `assets.json` 自动生成。迁移到新项目时，只需：
> 1. 复制 `preview-skill/SKILL.md`（本文件）到新项目的 `.claude/skills/preview-skill/`
> 2. 复制 `extract-skill` 到新项目
> 3. 在新项目中运行 `extract-skill`，它会根据新项目的素材数据重新生成 preview.html
>
> **唯一前提**：`extract-skill` 的模板需要包含最新的侧栏导航 + 仪表盘 CSS/JS 框架。

## 注意事项

- preview.html 是**静态快照**，生产素材后需刷新页面（或由 produce-skill 自动更新 HTML 中的 URL）
- **每次更新 preview.html 后必须执行：**上传 CS（`upload-skill`）+ 更新 `index.tsx` Debug 面板中的预览链接 `href`，否则线上 Debug 按钮指向旧版
- 生产按钮通过模态弹窗展示 `<a href="vscode://...">` 链接按钮，确保用户主动点击触发协议跳转（`window.location.href` 在 Simple Browser 等环境中会被静默拦截）
- 剪贴板复制使用同步 `execCommand('copy')` 优先，async clipboard API 作为 fallback
- 页面中的 CDN URL 直接引用线上资源，需要网络连接才能正常预览图片和音频
```
