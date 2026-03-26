```skill
---
name: preview-skill
description: AI素材工坊技能。先运行 gen-asset-data.mjs 更新 asset-data.json，再判断是否需要重新生成 public/preview.html，最后用系统浏览器打开预览页。页面展示所有素材状态（场景背景、道具、TTS 语音、角色、BGM），含内置「素材生产线」仪表盘、左侧导航栏、Prompt 编辑器、重新生产弹窗。支持一键迁移到其他小游戏项目。触发词包括"素材预览"、"AI素材工坊"、"打开AI素材工坊"、"preview"、"素材面板"、"生产面板"、"素材总览"、"查看素材"、"素材状态"、"生成预览页"、"更新预览页"。
---

# Preview Skill — AI素材工坊 · 模板化生成器

基于通用 HTML 模板 + 项目数据文件，自动生成 `public/preview.html` 可视化预览页。

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
| **交互音效区块** | 自动扫描 index.tsx 中的 ai-sounds 使用情况，显示音效 ID/名称/描述/使用次数，支持在线试听 |
| **一键迁移** | 复制 preview-skill 目录到新项目即可使用 |

## 使用方法

### 方式一：运行生成器脚本（推荐）

```bash
node .claude/skills/preview-skill/scripts/generate-preview.cjs --open
```

生成器自动完成：
1. 读取 `public/asset-data.json` → 提取 ASSETS 素材元数据（prompt/size/type）、ASSET_URLS、角色、BGM、TTS URL
2. 读取 `index.tsx` → 提取 ai-sounds 音效使用
3. 读取 `ai-sounds/references/sounds.md` → 音效名称/描述查询
4. 注入通用 HTML 模板 → 输出 `public/preview.html`

**参数说明：**
| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--project-dir` | 自动检测（向上查找含 `public/asset-data.json` 的目录）| 项目根目录 |
| `--output` | `public/preview.html` | 输出路径 |
| `--open` | false | 生成后自动打开浏览器 |

### 方式二：AI 对话触发

当用户说"素材预览"、"生成预览页"、"更新预览页"、"preview"等触发词时，按以下顺序执行：

**Step 1：运行 extract-skill，更新 asset-data.json**

```bash
node .claude/skills/preview-skill/scripts/gen-asset-data.mjs
```

**Step 2：判断是否需要重新生成 preview.html**

比较 `public/asset-data.json` 与 `public/preview.html` 的修改时间：
- `asset-data.json` 更新时间 > `preview.html` 更新时间 → **需要重新生成**
- `preview.html` 不存在 → **需要生成**
- 否则 → **跳过生成**，直接打开

**Step 3：生成 preview.html（仅在需要时）**

```bash
node .claude/skills/preview-skill/scripts/generate-preview.cjs
```

**Step 4：打开预览页**

```bash
# 用系统默认浏览器打开（避免 VS Code 内置浏览器缓存问题）
Invoke-Item "public/preview.html"
```

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
│ 📊 生产线 ●│  � 角色形象 + 音色配置                  │
│ 🗺️ 关卡   │  ────────────────────────────────     │
│ ─ 角色 ─  │  📸 场景类 banner                      │
│ 🧑‍🎓 角色   │    场景背景卡片网格                      │
│ ─ 场景 ─  │  ────────────────────────────────     │
│ 🌊 背景图 ●│  🎭 道具类 banner                      │
│ ─ 道具 ─  │    道具分组卡片网格（动态生成）            │
│ 关卡1     │  ────────────────────────────────     │
│ [各道具] ● │  🗣️ TTS 语音表                         │
│ 关卡2     │  ────────────────────────────────     │
│ [各道具] ● │  🎵 BGM 试听                           │
│ 关卡3     │  ────────────────────────────────     │
│ [各道具] ● │  🔊 交互音效                            │
│ ─ 音频 ─  │                                       │
│ 🗣️ TTS   ●│                                       │
│ 🎵 BGM   │                                       │
│ 🔊 音效   │                                       │
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

## 道具分组排序规则

`buildPropGroups()` 在过滤掉场景类后，对道具分组按**关卡序号升序**排列，生成顺序同步应用于主内容区和左侧导航栏。

### 关卡序号提取（`extractLevelNum(section)`）

按优先级依次尝试：

1. **`key` 字段前缀**：`L1_desk` → `1`，`L2_robot` → `2`，`L3_task_tag` → `3`
2. **`label` 字段中的汉字**：`关卡1·桌面物品` → `1`，`关卡3·任务标签` → `3`
3. **无法匹配**：返回 `99`，排到末尾（用于通用/跨关卡分组）

### 排序行为

- **跨关卡**：关卡1全部分组 → 关卡2全部分组 → 关卡3全部分组
- **同关卡内**：保持 `asset-data.json` → `SECTIONS` 数组中的原始定义顺序（JS stable sort）
- **通用分组**：序号 99，排在所有有编号关卡之后

### 导航栏联动

`buildNavItems()` 遍历排序后的 `propGroups`，在每次切换关卡序号时插入子分组标签 `<div class="nav-sub-label">关卡N</div>`，nav item 显示 `label` 中 `·` 后面的具体类型名（如 `桌面物品`、`故事卡片`），不重复显示"关卡N"前缀。

### ⚠️ 扩展注意事项

新增道具分组时，`SECTIONS` 中的 `key` 命名必须遵循 `L{N}_xxx` 格式（如 `L1_items`），或在 `label` 字段中包含"关卡N"（如 `关卡1·新道具`），否则排序会将其归入通用组（序号 99）排在末尾。

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
| `{{SOUND_EFFECTS_DATA}}` | 音效使用数组 JSON | index.tsx 中 soundLibrary.play() + ai-sounds/references/sounds.md |
| `{{NAV_ITEMS}}` | 导航栏 HTML | 按道具分组动态生成 |
| `{{LEVELS_HTML}}` | 关卡设计 HTML | 从现有 preview 继承或自动生成 |
| `{{SECTIONS_HTML}}` | 内容区 HTML | 按道具分组动态生成 |

## 详细流程

### Step 1：打开AI素材工坊页

```bash
# Windows
start public/preview.html

# macOS
open public/preview.html
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

## 数据文件

| 文件 | 说明 |
|------|------|
| `public/preview.html` | 输出文件（由生成器自动生成） |
| `public/asset-data.json` | 唯一数据源（ASSETS 元数据 + URL，由 AI 直接维护） |
| `asset-urls.ts` | CDN URL 来源（index.tsx 编译期 import） |
| `index.tsx` | ai-sounds 音效使用来源 |

## 与其他 Skill 的协作

| 关系 | Skill | 说明 |
|------|-------|------|
| **上游** | `extract-skill` | 生成 asset-urls.ts 数据 |
| **触发** | 素材变更 | 任何素材新增/删除/修改后，需重新运行生成器更新 preview.html |
| **下游** | `produce-skill` | 接收生产指令 |
| **下游** | `transparent-bg-skill` | 道具类去背景 |
| **下游** | `check-skill` | 验证素材完整性 |

## 迁移到其他项目

### 场景 A：已有 `asset-data.json` 的项目（迁移/复用）

1. 复制 `.claude/skills/preview-skill/` 整个目录到新项目
2. 确保新项目已有 `asset-urls.ts`
3. 运行同步 + 生成：
   ```bash
   node .claude/skills/preview-skill/scripts/gen-asset-data.mjs
   node .claude/skills/preview-skill/scripts/generate-preview.cjs
   Invoke-Item public/preview.html
   ```

### 场景 B：全新项目，无 `asset-data.json`（引导初始化）

**唯一前提：`asset-urls.ts` 已存在**（其中的 `ASSET_URLS` 对象是素材 URL 的来源）。

#### Step 1 — 生成空壳 asset-data.json

```bash
node .claude/skills/preview-skill/scripts/gen-asset-data.mjs
```

此时产出：
- `ASSET_URLS` / `CHARACTERS` / `BGM_URLS` ✅（从 asset-urls.ts 读取）
- `ASSETS[]` = `[]` ❌（无元数据，无 prompt/size/type）
- `SECTIONS[]` = `[]` ❌（从 ASSETS 推导，ASSETS 空则也为空）

#### Step 2 — AI 填充 ASSETS 元数据

打开 `public/asset-data.json`，在 `"ASSETS": []` 中为每个素材补充结构：

```json
{
  "materialId": "SCENE_L1_BG",
  "name": "关卡1背景",
  "type": 11,
  "size": "1920x1080",
  "transparentBg": false,
  "prompt": "..."
}
```

| 字段 | 说明 |
|------|------|
| `materialId` | 唯一 ID，对应 `asset-urls.ts` 中 `ASSET_URLS` 的 key |
| `name` | 素材中文名，必须与 `ASSET_URLS` 的 key 完全一致（用于 URL 同步） |
| `type` | `11` = 场景类，`12` = 道具类 |
| `size` | 规格如 `1920x1080`，`800x800` |
| `transparentBg` | 道具类是否需要去背景 |
| `prompt` | 文生图提示词 |

**可让 AI 以 `asset-urls.ts` 的 key 列表为脚手架批量生成初始 ASSETS 结构。**

#### Step 3 — 重新同步 URL

```bash
node .claude/skills/preview-skill/scripts/gen-asset-data.mjs
```

此时 `ASSETS[].url` 将从 `asset-urls.ts` 补入，`SECTIONS` 也会从 `ASSETS` 自动推导分组。

#### Step 4 — 生成 preview.html

```bash
node .claude/skills/preview-skill/scripts/generate-preview.cjs
Invoke-Item public/preview.html
```

#### ⚠️ 重要：asset-data.json 不是构建产物

`asset-data.json` 等同于源码，应纳入 Git 版本管理：

```bash
git add public/asset-data.json
git commit -m "chore: 初始化素材元数据"
```

`preview.html` 是纯生成产物，建议加入 `.gitignore`。

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

## 关卡步骤关键字高亮

生成器脚本中的 `highlightStep()` 函数对 `asset-data.json` → `LEVELS[].steps[]` 的文本进行关键字染色。

### 高亮规则（按执行顺序）

| 顺序 | 匹配内容 | 效果 | 示例 |
|:---:|---------|------|------|
| 1 | `（物品A、物品B）` 括号内含顿号的列表 | 每项转为红色小芯片 | `（手机、玩具熊）` |
| 2 | `限时N秒`（可含括号） | 橙色强调框 + ⏱ | `限时120秒` |
| 3 | `N选N` | 青色粗体 | `5选2` |
| 4 | 数字 + 量词（轮/张/行/步/个/关/种/次/题） | 青色 | `2 轮` `4 张` |
| 5 | 核心动词（拖拽/移走/点击/排序/分类/识别/标记/找出/区分） | 淡绿色 | `拖拽` `移走` |
| 6 | `需全部正确` / `全部正确` / `需全部` | 橙色边框提示 | `需全部正确` |
| 7 | 剩余全角括号内容 `（...）` | 灰色 | `（限时120秒）` |
| 8 | `Step\d+[a-z]*：` 前缀 | 青色标签徽章 | `Step2a：` |

### ⚠️ 关键设计规则：Step 前缀必须最后执行

**Step 前缀规则不能提前执行**，原因是它向文本注入含 `rgba(78,205,196,0.15)` 等 CSS 颜色值的 `<span style="...">` 标签。

若 `Step` 前缀替换在规则 1（括号物品列表）之前执行，规则 1 的正则 `[（(]([^）)]*[、，,][^）)]*)[）)]` 会将 CSS 中的 ASCII 括号 `(...)` 与逗号 `,` 误匹配，把 `rgba(78,205,196,0.15)` 里的数字 `78`、`205`、`196`、`0.15` 分别转成红色芯片，造成 HTML 严重损坏。

**同理，规则 7（剩余括号）只能匹配全角括号 `（）`，不能同时匹配 ASCII 括号 `()`**，否则会破坏规则 1 之后已注入的 `var(--muted)` CSS 变量中的括号。

### 扩展高亮规则

在 `generate-preview.cjs` 的 `highlightStep()` 函数中添加新规则时，遵循以下原则：

1. **纯文本处理规则**（不含 HTML）可放在任意位置（1-7）
2. **注入含括号/逗号的 HTML** 的规则必须放在规则 1 之后（否则规则 1 会误匹配 CSS 属性值）
3. **Step 前缀规则始终放最后**（第 8 步），因为它注入的 `rgba()` CSS 值含括号和逗号

## 注意事项

- preview.html 是**静态快照**，以下情况需重新运行生成器：
  - 素材新增或删除（materials.json / assets.json / tts.json 变更）
  - 素材 URL 更新（生产完成后）
  - Prompt 修改
  - 角色/BGM 变更（index.tsx 变更）
  ```bash
  node .claude/skills/preview-skill/scripts/generate-preview.cjs
  ```
- 剪贴板复制使用 `execCommand('copy')` 优先，async clipboard API fallback
- CDN URL 引用线上资源，需网络连接
```
