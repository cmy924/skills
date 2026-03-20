````skill
---
name: extract-skill
description: 资源提炼（TTS + 素材）。从游戏源码中提取 TTS 语音和素材清单两大类数据，统一输出 JSON 文件。不包含角色图片/主题色等视觉资源（由 roles-skill 负责）。预览页生成由 preview-skill 负责。触发词：资源提炼、TTS 规划、素材规划、道具清单、语音提炼、素材提炼、素材清单、旁白JSON、extract。
---

# Extract Skill — 资源提炼（TTS + 素材）

从当前游戏组件中提取 TTS 语音和素材清单，输出 JSON 数据文件：

| 模块 | 输出文件 | 内容 |
|------|---------|------|
| 语音 | `素材库/tts.json` | 角色台词TTS、旁白TTS、UI语音 |
| 素材 | `素材库/materials.json` | 场景背景、道具清单、美术资源 |

> 📌 **预览页生成已独立为 `preview-skill`**：执行完本 skill 后，运行 `node .claude/skills/preview-skill/scripts/generate-preview.cjs --open` 即可生成 `素材库/preview.html`。

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

### 第四步：生成预览页（委托 preview-skill）

> **⚠️ 预览页生成已独立为 `preview-skill`，不再由 extract-skill 直接生成。**

完成第二步和第三步后，运行以下命令即可基于 `tts.json` + `materials.json` 自动生成预览页：

```bash
node .claude/skills/preview-skill/scripts/generate-preview.cjs --open
```

预览页功能包括：左侧导航栏、素材生产线仪表盘、场景/道具/角色/BGM/TTS 全览、Prompt 编辑器、一键生产按钮。详见 `preview-skill/SKILL.md`。

### 第五步：上传预览页并更新 Debug 面板

预览页生成、上传、更新 Debug 面板的完整流程已委托给 `preview-skill`。

运行以下命令生成并打开预览页：

```bash
node .claude/skills/preview-skill/scripts/generate-preview.cjs --open
```

上传到 CS 获取 CDN URL：

```bash
bun --env-file=.claude/.env run .claude/skills/upload-skill/scripts/upload.js "./素材库/preview.html" --json
```

从输出中提取 `downloadUrl`，更新到 `public/exampleParams.json` 的 `materialWorkshopUrl` 字段。

详见 `preview-skill/SKILL.md` 和 `debug-skill/SKILL.md`。

---

## 执行模式

### 全量提炼（默认）

一次性输出全部数据文件：`tts.json` + `materials.json`，然后自动调用 `preview-skill` 生成预览页。

### 单模块提炼

当用户只需要某一部分时，可以只执行对应步骤：
- “提炼 TTS” → 只执行第二步，输出 `tts.json`
- “提炼素材” → 只执行第三步，输出 `materials.json`
- “生成预览” → ⚠️ 指引用户使用 `preview-skill`
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
| preview-skill | 读取 `tts.json`、`materials.json` 生成可视化预览页 |
| produce-skill | 读取 `materials.json`、`tts.json` 进行素材生产 |
| roles-skill | 管理角色视觉资源（图片/主题色），与本 skill 独立 |
| bgm-skill | 独立处理 BGM，与本 skill 无数据依赖 |
| check-skill | 读取提炼结果做完整性校验 |

````
