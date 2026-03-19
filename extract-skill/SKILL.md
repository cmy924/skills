````skill
---
name: extract-skill
description: 资源提炼（TTS + 素材）。从游戏源码中提取 TTS 语音和素材清单两大类数据，统一输出 JSON 和可视化预览页。不包含角色图片/主题色等视觉资源（由 roles-skill 负责）。触发词：资源提炼、TTS 规划、素材规划、道具清单、语音提炼、素材提炼、素材清单、旁白JSON、preview、预览页、extract。
---

# Extract Skill — 资源提炼（TTS + 素材）

从当前游戏组件中提取 TTS 语音和素材清单，输出 JSON 和可视化预览页：

| 模块 | 输出文件 | 内容 |
|------|---------|------|
| 语音 | `素材库/tts.json` | 角色台词TTS、旁白TTS、UI语音 |
| 素材 | `素材库/materials.json` | 场景背景、道具清单、美术资源 |
| 预览 | `素材库/preview.html` | 可视化素材总览页（含缩略图、音频试听、状态标签） |

> ⛔ **不负责角色视觉资源**（idle/speaking 图片、主题色等，由 `roles-skill` 管理）  
> 不负责 BGM 配置（由 `bgm-skill` 处理）  
> 不负责效果音 SE（由 `ai-sounds` 处理）  
> 不生成文生图 prompt（由 `produce-skill` 处理）  
> 不调用生产 API（由 `produce-skill` 处理）

---

## 适用场景

- 新项目首次提炼全部资源清单
- 项目改动后同步更新资源数据
- 需要导出角色/语音/素材列表给外部系统
- 需要可视化查看所有素材的状态和效果

## 执行流程

### 第一步：读取源码

必须读取的文件：
1. `index.tsx` — 主组件（**必须**）
2. `素材库/` 目录下已有文件（增量更新时参考）

从源码中提取的关键常量：
- `CHARACTERS` — 角色定义
- `TTS_AUDIO_MAP` — TTS 音频映射
- `ASSET_URLS` / `asset-urls.ts` — 已部署素材 CDN URL
- `BGM_URLS` — BGM 地址（仅用于 preview.html 展示，不写入 roles/tts/materials）
- `GameState` 枚举 — 关联素材使用场景

### 第二步：提炼 TTS 语音 → `素材库/tts.json`

> **注意：** 角色视觉资源（idle/speaking 图片、主题色）由 `roles-skill` 集中管理，本 skill 不再提炼角色信息到 `roles.json`。

```json
{
  "audioType": "tts",
  "version": "1.0.0",
  "source": "index.tsx",
  "roleTTS": [
    {
      "role": "小安",
      "lines": [
        {
          "id": "role_xiaoan_task",
          "text": "帮我串珠子送给妈妈吧！",
          "scene": "LEVEL_1_INTRO",
          "trigger": "点击角色",
          "url": "https://..."
        }
      ]
    }
  ],
  "narratorTTS": [
    {
      "id": "narrator_welcome",
      "text": "为什么收拾书包这种小事...",
      "scene": "START_SCREEN",
      "trigger": "自动播放",
      "url": ""
    }
  ],
  "uiTTS": [
    {
      "id": "ui_start_btn",
      "text": "开始游戏",
      "scene": "START_SCREEN",
      "trigger": "按钮点击",
      "url": ""
    }
  ]
}
```

**抽取规则：**
1. **角色台词**：从 `character.task`、`getSelectQuestion()` 等提取
2. **旁白**：非角色专属的引导语、步骤说明、结算语
3. **UI 语音**：按钮点击语音、状态切换提示
4. **URL 映射**：优先从 `TTS_AUDIO_MAP`、`ASSET_URLS` 提取已有 URL，未生成的标记 `url: ""`
5. 与 `ai-sounds` 效果音（SE）区分：TTS 是人声语音，SE 是非语言效果音

### 第三步：提炼素材清单 → `素材库/materials.json`

```json
{
  "meta": {
    "project": "按规律找东西",
    "version": "1.0.0",
    "generatedAt": "2025-01-01T00:00:00Z",
    "sourceFile": "index.tsx"
  },
  "materialProfile": {
    "globalScenes": [],
    "levelScenes": [],
    "levelProps": {
      "level1_beads": [],
      "level2_numbers": [],
      "level3_puzzle": []
    },
    "feedbackProps": []
  },
  "artChecklist": {
    "deployed": { "count": 0, "items": [] },
    "planned": { "count": 0, "items": [] },
    "uiFromManifest": { "count": 0, "items": [] }
  }
}
```

**每个素材条目必须包含：**
- `materialId`：唯一标识（如 `SCENE_START_BG`、`PROP_L1_BEAD_A`）
- `name`：中文名称
- `category`：`background` | `prop` | `ui` | `feedback`
- `usage`：用途说明（标注在哪个 GameState 使用）
- `codeRef`：对应代码中的变量名（如 `ASSET_URLS.startBg`）
- `spec`：`{ format, size, generateSize?, transparentBg? }`
- `status`：`deployed`（已上线）| `planned`（待制作）
- `remoteUrl`（已部署时）或 `manifestId`（待制作时）
- `priority`：`P0` | `P1` | `P2`

**抽取规则：**
1. 提取各关卡场景定义，区分全局场景与关卡专属场景
2. 提取每关主任务道具、通用交互道具、通用 UI 容器
3. 为每个素材生成唯一 `materialId`，标注 `category`、`usage`、`spec`
4. 从 `ASSET_URLS` 提取已部署素材的 CDN URL
5. 从 `素材库/materials.json` 已有条目补充待制作素材信息

**注意：** materials.json 不包含文生图 prompt（由 `produce-skill` 负责）。

### 第四步：生成预览页 → `素材库/preview.html`

自动生成独立 HTML 页面，浏览器直接打开即可预览：

#### 页面整体布局

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
│ [背景图] ● │  🎭 道具类 banner                      │
│ ─ 道具 ─  │    鱼类/工具/特效/UI 卡片网格             │
│ [各道具] ● │  ────────────────────────────────     │
│ ─ 音频 ─  │  👤 角色形象 + 音色配置                  │
│ [角色]    │  🎵 BGM 试听                          │
│ [BGM]    │  🎙️ TTS 语音表                        │
│ [TTS]   ●│                                       │
│ ▓▓▓░░ 60%│                                       │
│ [↑ 顶部]  │                                       │
└──────────┴──────────────────────────────────────┘
```

#### 左侧导航栏（固定 180px）

必须包含以下结构：

```html
<nav class="nav-sidebar" id="navBar">
  <!-- 品牌区：渐变色圆角图标 + 项目名 + 副标题 -->
  <div class="nav-brand">
    <div class="nav-brand-icon">[游戏emoji]</div>
    <div>
      <div class="nav-brand-text">AI素材工坊</div>
      <div class="nav-brand-sub">[项目名称]</div>
    </div>
  </div>
  <!-- 分组：总览 / 场景 / 道具 / 音频 -->
  <div class="nav-group-label">总览</div>
  <div class="nav-items">
    <button class="nav-item" onclick="navTo('sec-pipeline')">
      <span class="nav-icon">📊</span>生产线<span class="nav-dot empty"></span>
    </button>
    <button class="nav-item" onclick="navTo('sec-levels')">
      <span class="nav-icon">🗺️</span>关卡设计
    </button>
  </div>
  <!-- ...场景/道具/音频分组，根据 materials.json 动态生成 -->
  <!-- 底部进度条 + 回到顶部按钮 -->
  <div class="nav-progress" id="navProgress">
    <div class="nav-progress-fill" style="width:0%"></div>
  </div>
  <div class="nav-footer">
    <button class="nav-scroll-top">↑ 回到顶部</button>
  </div>
</nav>
```

**导航栏要求：**
- 背景 `#0a0e17`，与内容区 `#1a1a2e` 有明显对比，右侧 `box-shadow`
- 每个素材分区一个 `nav-item`，含 `nav-icon` 和 `nav-dot`（状态圆点）
- Scroll-spy JS：滚动时自动高亮当前区块（`.active` 类 + 左侧绿色竖条 `::before`）
- 状态圆点：🟢 done（全完成）/ 🟠 partial（部分）/ ⚫ empty（未完成），基于该分区素材 URL 是否存在
- 底部渐变进度条（green → gold）显示全局完成率

#### 素材生产线仪表盘

页面顶部（`#sec-pipeline`），3 张卡片网格，每张含：

| 卡片 | 内容 |
|------|------|
| 📸 场景素材 | SVG 环形进度圆环 + 完成比 + 步骤链 `文生图 → 完成` + ▶ 生产按钮 |
| 🎭 道具素材 | SVG 环形进度圆环 + 完成比 + 步骤链 `文生图 → 下载 → 去背景 → 上传CS → 完成` + ▶ 生产按钮 |
| 🎙️ TTS 语音 | SVG 环形进度圆环 + 完成比 + 步骤链 `语音合成 → 完成` + ▶ 生产按钮 |

底部总进度条。
分类由 `materials.json` 的 `transparentBg` 字段决定：`false` = 场景，`true` = 道具。

#### 内容分区

| 分区 | 内容 | 数据来源 |
|------|------|---------|
| 分类 banner | 📸 场景类 / 🎭 道具类 分割横幅，含一键生产按钮 | materials.json `transparentBg` |
| 场景背景 | 大卡片 cover 模式 + Prompt 折叠 + 状态标签 | materials.json |
| 各道具分组 | 道具缩略图 contain + 棋盘格透明底 + Prompt 折叠 | materials.json |
| 角色形象 | idle/speaking 双态对比 + 音色配置表 | roles-skill 数据 |
| BGM 音轨 | `<audio controls>` 在线试听 | `BGM_URLS` 常量 |
| TTS 语音 | 全量台词表 + 试听 + 生产状态标签 | tts.json |

每个素材分区的 section 标题必须包含**生产按钮**和**刷新按钮**。

#### 生产指令系统

每个 ▶ 生产按钮点击后调用 `buildCopilotPrompt(key)` 生成完整 Copilot 指令，复制到剪贴板，并跳转 VS Code：

```javascript
const SECTION_DATA = {
  scenes: { label:'场景背景', count: () => SCENES.filter(i=>!i.url).length,
            type:'图片', transparentBg: false, category: 'scene' },
  // ... 其他分区根据 materials.json 动态生成
};
```

- 场景类指令：`produce-skill 文生图 → 更新 URL`
- 道具类指令：`produce-skill 文生图 → 下载 → transparent-bg-skill 去背景 → upload-skill 上传 → 更新 URL`
- TTS 指令：`produce-skill TTS 合成 → 更新 URL`

#### 预览页样式要求

```css
:root {
  --bg: #1a1a2e;      /* 内容区背景 */
  --card: #16213e;     /* 卡片背景 */
  --text: #e4e4e4;
  --muted: #8b8b9e;
  --green: #4ecdc4;
  --red: #ff6b6b;
  --orange: #ffa502;
  --gold: #f5a623;
  --border: #2a2a4a;
}
```

- 侧栏背景 `#0a0e17`，`box-shadow: 4px 0 24px rgba(0,0,0,0.4)`
- 标题渐变色：`var(--red) → var(--gold) → var(--green)`
- 背景图片容器 200px 高、cover 模式
- 道具图片容器 160px 高、contain 模式 + 棋盘格透明底
- 角色双态容器 220px 高
- 卡片 hover 上浮 + 阴影变化
- 响应式网格布局
- `html { scroll-behavior: smooth }` + section `scroll-margin-top: 16px`
- SVG 环形进度：radius 45, circumference ≈ 282.7, `stroke-dasharray`/`stroke-dashoffset`

### 第五步：上传预览页并更新 Debug 面板

每次生成或更新 `素材库/preview.html` 后，必须执行以下步骤：

**5a. 上传到 CS 获取 CDN URL：**

```bash
bun --env-file=.claude/.env run .claude/skills/upload-skill/scripts/upload.js "./素材库/preview.html" --json
```

从输出中提取 `downloadUrl`（格式如 `https://gcdncs.101.com/v0.1/download?dentryId=xxx`）。

**5b. 更新 `index.tsx` 中 Debug 面板的AI素材工坊链接：**

找到 `{/* AI素材工坊 */}` 区域的按钮或存储 URL 逻辑，将地址更新为新的 CDN URL。

> ⚠️ 这两步是必须的，否则 Debug 面板的「打开AI素材工坊」按钮会指向过期地址。

**5c. 打开预览：**

```bash
Start-Process "素材库/preview.html"
```

---

## 执行模式

### 全量提炼（默认）

一次性输出全部文件：`tts.json` + `materials.json` + `preview.html`

### 单模块提炼

当用户只需要某一部分时，可以只执行对应步骤：
- "提炼 TTS" → 只执行第二步，输出 `tts.json`
- "提炼素材" → 只执行第三步，输出 `materials.json`
- "生成预览" → 基于已有 JSON 输出 `preview.html`
- "提炼角色" → ⚠️ 指引用户使用 `roles-skill`

---

## 结果要求

- 不丢字段，不生成虚构角色或素材
- 中文文案保留原句（标点统一全角）
- URL 原样保留，未生成的留空字符串
- 不包含角色视觉资源（由 `roles-skill` 负责）
- 不混入 BGM 配置（由 `bgm-skill` 负责）
- 不生成文生图 prompt（由 `produce-skill` 负责）
- 两个 JSON 文件互不重复，各自聚焦自己的领域
- 允许附带 `tags`、`notes`、`priority` 等扩展字段

## 与其他 Skill 的协作

| 下游 Skill | 消费内容 |
|-----------|---------|
| produce-skill | 读取 `materials.json`、`tts.json` 进行素材生产 || roles-skill | 管理角色视觉资源（图片/主题色），与本 skill 独立 || bgm-skill | 独立处理 BGM，与本 skill 无数据依赖 |
| check-skill | 读取提炼结果做完整性校验 |

````
