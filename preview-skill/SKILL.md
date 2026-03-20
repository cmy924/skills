```skill
---
name: preview-skill
description: AI素材工坊技能。基于通用模板自动生成 素材库/preview.html 可视化预览页，展示所有素材状态（场景背景、道具、TTS 语音、角色、BGM），含内置「素材生产线」仪表盘、左侧导航栏、Prompt 编辑器、重新生产弹窗。支持一键迁移到其他小游戏项目。触发词包括"AI素材工坊"、"打开AI素材工坊"、"preview"、"素材面板"、"生产面板"、"素材总览"、"查看素材"、"素材状态"、"生成预览页"、"更新预览页"。
---

# Preview Skill — AI素材工坊 · 模板化生成器

基于通用 HTML 模板 + 项目数据文件，自动生成 `素材库/preview.html` 可视化预览页。

## 文件结构

```
preview-skill/
├── SKILL.md                        # 本文件
├── templates/
│   └── preview-template.html       # 通用 HTML 模板（CSS + JS 框架）
└── scripts/
    └── generate-preview.cjs        # 生成器脚本（读数据 → 注入模板 → 输出）
```

## 功能概览

| 功能 | 说明 |
|------|------|
| **通用模板** | CSS/JS 框架完全通用，支持任意小游戏项目 |
| **数据驱动** | 读取 materials.json + tts.json + assets.json + index.tsx 自动生成 |
| **左侧导航栏** | 固定侧边栏，scroll-spy 高亮，状态圆点，进度条 |
| **素材生产线仪表盘** | 环形进度 × 3 分类（场景/道具/TTS）|
| **Prompt 编辑工具栏** | 展开/编辑/复制/重新生产 一站式工作流 |
| **重新生产弹窗** | 输入修改需求 → 构建 4 步 Copilot 指令 → 跳转 VS Code |
| **角色形象预览** | idle / speaking 双状态对比 + 音色配置表 |
| **BGM 试听** | 主流程/游戏进行/暂停休息三轨在线试听 |
| **TTS 语音表** | 全量台词列表 + 在线试听 + 生产状态标签 |
| **一键迁移** | 复制 preview-skill 目录到新项目即可使用 |

## 使用方法

### 方式一：运行生成器脚本（推荐）

```bash
node .claude/skills/preview-skill/scripts/generate-preview.cjs --open
```

生成器自动完成：
1. 读取 `素材库/materials.json` → 提取场景/道具分组
2. 读取 `素材库/tts.json` + `素材库/assets.json` → 提取 TTS 数据
3. 读取 `index.tsx` → 提取角色 CHARACTERS 和 BGM_URLS
4. 注入通用 HTML 模板 → 输出 `素材库/preview.html`

**参数说明：**
| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--project-dir` | 自动检测（向上查找含 素材库/ 的目录）| 项目根目录 |
| `--output` | `素材库/preview.html` | 输出路径 |
| `--open` | false | 生成后自动打开浏览器 |

### 方式二：AI 对话触发

当用户说"生成预览页"、"更新预览页"、"preview"时：
1. 运行生成器脚本
2. 执行上传 + 更新 Debug 面板链接

## 页面布局

```
┌──────────┬──────────────────────────────────────┐
│ 左侧导航  │  主内容区                              │
│ 180px    │  padding-left: 204px                  │
│ #0a0e17  │  #1a1a2e                              │
│          │                                       │
│ 🎣 AI素材工坊│  🏭 素材生产线（环形进度 × 3 卡片）     │
│  [项目名]  │  ────────────────────────────────     │
│          │  📋 游戏关卡详情                         │
│ ─ 总览 ─  │  ────────────────────────────────     │
│ 📊 生产线 ●│  📸 场景类 banner                      │
│ 🗺️ 关卡   │    场景背景卡片网格                      │
│ ─ 场景 ─  │  ────────────────────────────────     │
│ 🌊 背景图 ●│  🎭 道具类 banner                      │
│ ─ 道具 ─  │    道具分组卡片网格（动态生成）            │
│ [各道具] ● │  ────────────────────────────────     │
│ ─ 音频 ─  │  👤 角色形象 + 音色配置                  │
│ 🧑‍🎓 角色   │  🎵 BGM 试听                          │
│ 🎵 BGM   │  🎙️ TTS 语音表                        │
│ 🗣️ TTS   ●│                                       │
│ ▓▓▓░░ 60%│                                       │
│ [↑ 顶部]  │                                       │
└──────────┴──────────────────────────────────────┘
```

## 素材分类规则

基于 `materials.json` 中的 `transparentBg` 字段自动分类：

| 分类 | `transparentBg` | 包含内容 | 生产流程 |
|------|:-----------:|---------|---------|
| 📸 场景类 | `false` | 背景图、场景图 | 文生图 → 完成 |
| 🎭 道具类 | `true` | 道具元素 | 文生图 → 下载 → 去背景 → 上传CS → 完成 |
| 🎙️ TTS | — | 语音台词 | 语音合成 → 完成 |

## 模板占位符

模板 `templates/preview-template.html` 使用 `{{PLACEHOLDER}}` 占位符：

| 占位符 | 注入内容 | 数据来源 |
|--------|---------|---------|
| `{{PROJECT_NAME}}` | 项目全名 | materials.json → meta.project |
| `{{PROJECT_SHORT_NAME}}` | 简称（≤6字符）| 截取自全名 |
| `{{PROJECT_ICON}}` | 品牌 emoji | 从现有 preview 继承或默认 🎮 |
| `{{SCENES_DATA}}` | 场景数组 JSON | materials.json |
| `{{PROP_GROUPS_DATA}}` | 道具分组数组 JSON | materials.json |
| `{{CHARACTERS_DATA}}` | 角色数组 JSON | index.tsx |
| `{{TTS_DATA}}` | TTS 数组 JSON | tts.json + assets.json |
| `{{NAV_ITEMS}}` | 导航栏 HTML | 按道具分组动态生成 |
| `{{LEVELS_HTML}}` | 关卡设计 HTML | 从现有 preview 继承或自动生成 |
| `{{SECTIONS_HTML}}` | 内容区 HTML | 按道具分组动态生成 |

## 详细流程

### Step 1：打开AI素材工坊页

```bash
# Windows
start 素材库/preview.html

# macOS
open 素材库/preview.html
```

> 纯静态 HTML，双击即可打开，无需服务器。

### Step 2：查看素材生产线

页面顶部「🏭 素材生产线」仪表盘 3 张卡片 + 总进度条。

### Step 3：使用左侧导航

- 点击导航项平滑滚动到对应区块
- 观察状态圆点了解各区完成情况
- 底部进度条查看全局完成比例
- 点击「↑ 回到顶部」快速返回

### Step 4：按分类生产

点击卡片中的 **▶ 生产** 按钮：

1. 按钮自动生成包含完整生产流程的 Copilot 指令
2. 指令被同步复制到剪贴板
3. 弹出模态弹窗，显示「⚡ 打开 VS Code」按钮
4. 用户点击按钮打开 VS Code，在 Copilot 聊天框粘贴执行

| 按钮 | 生成的指令包含 |
|------|-------------|
| 📸 场景生产 | produce-skill 文生图 → 更新 URL |
| 🎭 道具生产 | produce-skill 文生图 → transparent-bg-skill 去背景 → upload-skill 上传 → 更新 URL |
| 🎙️ TTS 生产 | produce-skill TTS 合成 → 更新 URL |
| 🚀 一键全部 | 按分类分别执行上述全部流程 |

### Step 5：Prompt 编辑与重新生产

每个素材卡片支持 Prompt 编辑 + 重新生产工作流：
- 展开 → 编辑 → 📋 复制 / 🔄 重新生产
- 重新生产弹窗：输入修改需求 → 构建 4 步 Copilot 指令 → 跳转 VS Code

### Step 6：生成后上传

> 每次 preview.html 被生成或更新后必须执行。

```bash
# 上传到 CS
bun --env-file=.claude/.env run .claude/skills/upload-skill/scripts/upload.js "./素材库/preview.html" --json

# 更新 Debug 面板链接
# 找到 index.tsx 中 {/* AI素材工坊 */} 区域，更新 href
```

## 数据文件

| 文件 | 说明 |
|------|------|
| `素材库/preview.html` | 输出文件（由生成器自动生成） |
| `素材库/materials.json` | 素材清单数据源 |
| `素材库/tts.json` | TTS 语音数据源 |
| `素材库/assets.json` | Prompt 和生产配置 |
| `index.tsx` | 角色/BGM 数据来源 |

## 与其他 Skill 的协作

| 关系 | Skill | 说明 |
|------|-------|------|
| **上游** | `extract-skill` | 生成 materials.json、tts.json 数据 |
| **协作** | `upload-skill` | 上传 preview.html 到 CS |
| **协作** | `debug-skill` | 更新 Debug 面板中的AI素材工坊链接 |
| **下游** | `produce-skill` | 接收生产指令 |
| **下游** | `transparent-bg-skill` | 道具类去背景 |
| **下游** | `check-skill` | 验证素材完整性 |

## 迁移到其他项目

### 迁移步骤

1. 复制 `.claude/skills/preview-skill/` 整个目录到新项目
2. 确保新项目已有 `素材库/materials.json` 和 `素材库/tts.json`（由 extract-skill 生成）
3. 运行生成器：`node .claude/skills/preview-skill/scripts/generate-preview.cjs --open`

### 通用部分（模板内置，无需修改）

| 部分 | 说明 |
|------|------|
| CSS 暗色主题 | 完整的 dark theme 样式系统 |
| 侧栏导航 | 布局、scroll-spy、状态圆点、进度条 |
| VS Code 跳转弹窗 | 模态弹窗 + vscode:// 协议链接 |
| 重置提示词弹窗 | 输入修改需求 → 4 步 Copilot 指令 |
| 环形进度仪表盘 | 数据驱动，自动适配任意分区数量 |
| 渲染函数 | renderScenes / renderPropGrid / renderChars / renderBGM / renderTTS |
| 生产指令系统 | buildCopilotPrompt / produceSection / copyAndFocus |

### 项目专属部分（由生成器自动注入）

| 部分 | 说明 |
|------|------|
| 项目名称/图标 | 从 materials.json meta 读取 |
| 导航栏项目 | 根据道具分组动态生成 |
| 关卡设计 HTML | 从现有 preview.html 继承或自动生成 |
| 数据数组 | SCENES / PROP_GROUPS / CHARACTERS / BGMS / TTS |

> **核心优势：** 模板 + 生成器完全解耦，所有项目专属数据由生成器自动提取注入。迁移零手工修改。

## 注意事项

- preview.html 是**静态快照**，生产素材后需重新生成或刷新
- **每次更新后必须执行：** 上传 CS + 更新 Debug 面板链接
- 剪贴板复制使用 `execCommand('copy')` 优先，async clipboard API fallback
- CDN URL 引用线上资源，需网络连接
```
