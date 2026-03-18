````skill
---
name: extract-skill
description: 一站式资源提炼。从游戏源码中提取角色信息、TTS 语音、素材清单三大类数据，统一输出 JSON 和可视化预览页。合并了原 role-skill、tts-skill、material-skill 的全部职责。触发词：资源提炼、角色信息、TTS 规划、素材规划、道具清单、角色提炼、语音提炼、素材提炼、素材清单、角色tts、旁白JSON、preview、预览页、extract。
---

# Extract Skill — 一站式资源提炼

从当前游戏组件中一次性提取全部资源信息，分三大模块输出：

| 模块 | 输出文件 | 内容 |
|------|---------|------|
| 角色 | `素材库/roles.json` | 角色基础信息、角色状态、角色关系 |
| 语音 | `素材库/tts.json` | 角色台词TTS、旁白TTS、UI语音 |
| 素材 | `素材库/materials.json` | 场景背景、道具清单、美术资源 |
| 预览 | `素材库/preview.html` | 可视化素材总览页（含缩略图、音频试听、状态标签） |

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

### 第二步：提炼角色信息 → `素材库/roles.json`

```json
{
  "version": "1.0.0",
  "source": "index.tsx",
  "roles": [
    {
      "roleId": "xiao_an",
      "name": "小安",
      "level": 1,
      "themeColor": "#FF6B6B",
      "task": "帮小安串珠子",
      "idleImage": "https://...",
      "speakingImage": "https://..."
    }
  ],
  "roleStates": {
    "xiao_an": {
      "runtime": ["intro", "select", "sort", "action", "complete"],
      "interaction": ["isAudioPlaying", "isCharacterArmed", "showCharacterClap"],
      "result": ["stars_1", "stars_2", "stars_3"]
    }
  },
  "relations": [
    {
      "role": "xiao_an",
      "level": 1,
      "statusCodes": { "start": 0, "complete": 1 },
      "keyActions": ["点击角色", "选择时间", "开始行动", "完成"]
    }
  ]
}
```

**抽取规则：**
1. 从 `CHARACTERS` 常量提取角色名、颜色、任务文案
2. 角色与关卡一一对应：1→小安，2→小瑞，3→小布
3. 运行状态：`intro/select/sort/action/complete`
4. 交互状态：`isAudioPlaying/isCharacterArmed/isPaused/showCharacterClap/showTimeout`
5. 结果状态：星级（1~3）、关卡开始/完成状态码

### 第三步：提炼 TTS 语音 → `素材库/tts.json`

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

### 第四步：提炼素材清单 → `素材库/materials.json`

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

### 第五步：生成预览页 → `素材库/preview.html`

自动生成独立 HTML 页面，浏览器直接打开即可预览：

| 分区 | 内容 | 数据来源 |
|------|------|---------|
| 统计卡片 | 已部署数 / 待制作数 / 角色数 / 音频数 | 汇总计算 |
| 场景背景 | 全局 + 各关卡背景（卡片式，cover 模式） | materials.json |
| 各关卡道具 | 按关卡分组展示道具卡片 | materials.json |
| 反馈图标 | 正确✓ / 错误✗ 等通用图标 | materials.json |
| 角色形象 | idle + speaking 双态并排对比 | roles.json |
| 音频资源 | BGM 列表 + `<audio>` 播放器可试听 | `BGM_URLS` 常量 |

**预览页样式：**
- 暗色主题：背景 `#0f0f1a`，卡片半透明玻璃效果
- 标题渐变色：`#ff6b6b → #f5a623 → #4ecdc4`
- 背景图片容器 200px 高、cover 模式
- 道具图片容器 160px 高、contain 模式 + 棋盘格透明底
- 角色双态容器 220px 高，底部标注 idle / speaking
- 卡片 hover 上浮 + 阴影变化
- 响应式网格布局
- 音频行含 `<audio controls>` 播放器

### 第六步：打开预览

```bash
Start-Process "素材库/preview.html"
```

---

## 执行模式

### 全量提炼（默认）

一次性输出全部文件：`roles.json` + `tts.json` + `materials.json` + `preview.html`

### 单模块提炼

当用户只需要某一部分时，可以只执行对应步骤：
- "提炼角色" → 只执行第二步，输出 `roles.json`
- "提炼 TTS" → 只执行第三步，输出 `tts.json`
- "提炼素材" → 只执行第四步，输出 `materials.json`
- "生成预览" → 基于已有 JSON 输出 `preview.html`

---

## 结果要求

- 不丢字段，不生成虚构角色或素材
- 中文文案保留原句（标点统一全角）
- URL 原样保留，未生成的留空字符串
- 不混入 BGM 配置（由 `bgm-skill` 负责）
- 不生成文生图 prompt（由 `produce-skill` 负责）
- 三个 JSON 文件互不重复，各自聚焦自己的领域
- 允许附带 `tags`、`notes`、`priority` 等扩展字段

## 与其他 Skill 的协作

| 下游 Skill | 消费内容 |
|-----------|---------|
| produce-skill | 读取 `materials.json`、`tts.json` 进行素材生产 |
| bgm-skill | 独立处理 BGM，与本 skill 无数据依赖 |
| check-skill | 读取提炼结果做完整性校验 |

````
