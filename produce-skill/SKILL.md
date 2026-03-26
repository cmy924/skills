````skill
---
name: produce-skill
description: 一站式素材生产。包含提示词生成、批量素材生产线（图生图+文生图+TTS）两大能力。合并了原 prompt-skill、asset-generate 的全部职责。触发词：素材生产、生产素材、素材生产线、批量生成、Pipeline、生成提示词、写prompt、出prompt、生成图片、画一张、出图、generate image、文生图、图生图、TTS生产、语音生成、asset produce。
---

# Produce Skill — 一站式素材生产

将"提示词生成 → API 调用 → CDN URL 输出"全流程合一，支持两种模式：

| 模式 | 用途 | 入口 |
|------|------|------|
| **Pipeline 批量** | 读取 `public/asset-data.json` 批量生产图片+TTS | `asset-pipeline.js` |
| **单素材生产** | 按 type 11/12/21 调用素材生产 API | `asset-generate.js` |

> 本 skill 的提示词相关能力来自原 prompt-skill  
> 本 skill 的 Pipeline 和 API 能力来自原 asset-generate

---

## ⛔ 核心规则：type 11 仅限图生图场景

**type 11（图生图）只能在有原图 + 提示词的「图生图」场景下使用。** 其他任何场景都 **禁止** 使用 type 11：

| 场景 | 正确 type | 说明 |
|------|-----------|------|
| 有原图 + 提示词修改（如改表情、换背景） | **11** | 唯一允许使用 type 11 的场景 |
| 纯文字描述生成新图片 | **12** | 文生图，无原图 |
| 批量生成多张图片 | **12** | 文生图数组 |
| 生成语音/TTS | **21** | 文生语音 |

```
判断逻辑：
  有原图需要修改？ → type 11（图生图）
  没有原图，纯靠描述生成？ → type 12（文生图）
  生成语音？ → type 21（TTS）
```

> ❌ **错误示例**：用 type 11 + JSON 数组生成新素材（应该用 type 12）  
> ❌ **错误示例**：没有 `--image` 参数却使用 type 11  
> ✅ **正确示例**：`--type 11 --image ./原图.png --text "改成笑脸"`

---

## 前置条件

### .env 文件

`.claude/.env` 文件存放所有 API 密钥（与游戏功能文件分离，避免混淆）。运行脚本时必须通过 `--env-file` 显式指定路径，避免 cwd 不在项目根目录时丢失环境变量：

```bash
bun --env-file=<project-root>/.claude/.env run <script> [options]
```

> `<project-root>` 为当前工作区根目录绝对路径，如 `D:\架构设计\小游戏\62RBQU94w3xd7nh4Ho-cR7iK`

### 必须设置的环境变量（.claude/.env）

- `AI_HUB_KEY`：AI Hub API Key（必填）
- `BTS_NAME`：BTS 应用名（必填）
- `BTS_SECRET`：BTS 应用密钥（必填）

可选：
- `AI_HUB_HOST`：API 地址（默认 `https://ai-hub-api.aiae.ndhy.com`）
- `AI_HUB_BOT_ENV`：环境（默认 `prod`）

---

## ⛔ 核心规则：禁止相对路径引用素材

项目中**禁止**使用相对路径引用素材文件。所有素材必须通过 API 返回的 CDN URL 使用。

```typescript
// ✅ 正确: 使用 CDN URL 映射
import { ASSET_URLS } from './asset-urls'
<img src={ASSET_URLS['厨房场景背景']} />

// ❌ 禁止: 相对路径
<img src="./assets/kitchen.jpg" />
```

---

## 一、提示词生成（Prompt 能力）

当需要为素材编写文生图提示词时，遵循以下规范。

### Prompt 编写规范

每条 prompt 的结构（按顺序）：

```
[主体描述] + [风格修饰] + [色彩/氛围] + [背景要求] + [技术参数]
```

| 层次 | 说明 | 示例 |
|------|------|------|
| 主体描述 | 物品/场景核心内容 | A single cute cartoon spoon, silver metallic color |
| 风格修饰 | 画风、线条、比例 | Kawaii style, flat illustration style |
| 色彩/氛围 | 配色、光照、情绪 | Soft pastel colors, warm kitchen lighting |
| 背景要求 | 透明/纯色/场景 | Isolated on transparent background |
| 技术参数 | 尺寸引导 | 512x512 pixels |

### 分类规范

| 素材类别 | 背景要求 | 推荐尺寸 | 额外要点 |
|----------|----------|----------|----------|
| 场景背景 | 完整场景 | 1920x1080 | 写明视角，无角色 |
| 道具/物品 | transparent background | 512x512 | isolated、单个物品 |
| 角色/NPC | transparent background | 512x512 | 写明表情、服饰、姿态 |
| UI 元素 | transparent background | 256x256 | 写明用途 |

### 风格一致性

同项目所有 prompt 必须遵守统一风格基线。从已有 prompt 提取风格关键词：

- **画风**: flat illustration / vector / hand-drawn / kawaii
- **受众**: suitable for children aged 5-7 / child-friendly
- **色调**: soft pastel / warm / bright
- **线条**: clean lines / rounded edges / soft shadows

### 质量检查清单

- [ ] **全英文**
- [ ] **单一主体**：每条 prompt 只描述一个素材
- [ ] **无歧义**：避免 "etc."、"various"、"some"
- [ ] **尺寸匹配**：与 `asset-data.json` 中 `size` 一致
- [ ] **背景正确**：道具用 transparent，场景不用
- [ ] **风格统一**：与已有 prompt 使用相同风格词
- [ ] **无文字**：场景类加 "No text, no characters"

### 常用风格词库

**画风**: flat illustration, vector art, cartoon, kawaii, hand-painted, watercolor  
**氛围**: warm and cozy, cheerful, playful, dreamy, magical  
**光照**: warm lighting, soft shadows, sunlight streaming in  
**色彩**: soft pastel, bright vivid, muted earth tones, candy colors  
**质感**: glossy, metallic shine, subtle highlight, slight 3D  
**受众**: child-friendly, suitable for children's educational game  
**构图**: isolated on transparent background, centered composition, top-down view  

---

## 二、Pipeline 批量生产线 🔥

**触发词：** "素材生产线"、"批量生成"、"Pipeline"

读取 `public/asset-data.json`（ASSETS 数组），逐个调用 API 获取 CDN URL，生成 TypeScript URL 映射文件。

### asset-data.json 格式（ASSETS 数组）

> **重要**：不同 type 的 API 参数格式不同：
> - **type 11**：⚠️ **仅限图生图**，text 是提示词字符串，image 是原图文件（multipart/form-data 上传）
> - **type 12**：text 是 JSON 对象数组字符串 `[{name, prompt, size}]`
> - **type 21**：text 是 JSON 对象数组字符串 `[{name, content, model, ref_audio, role_id}]`

#### type 11（图生图）— ⚠️ 必须有原图

- `text`：提示词字符串，描述对原图的修改要求
- `image`：原图文件（通过 multipart/form-data 上传，**必填**）
- **禁止在没有原图的情况下使用 type 11**

```
text: "Make the character smile happily, keep same style"
image: <本地文件 ./assets/character.png>
```

#### type 12（文生图·数组）

```json
[
  { "name": "勺子", "prompt": "A cute cartoon spoon, silver metallic... 512x512 pixels.", "size": "512x512" },
  { "name": "苹果", "prompt": "A cute cartoon red apple... 512x512 pixels.", "size": "512x512" }
]
```

#### type 21（文生语音·数组）

```json
[
  { "name": "L1_S1_04", "content": "如果你要完成这个任务，大概需要多长时间呢？一分钟，还是两分钟？", "model": 10139, "ref_audio": 10311, "role_id": "xx" },
  { "name": "L1_S1_01", "content": "小朋友你好，欢迎来到分类游戏", "model": 10139, "ref_audio": 10311, "role_id": "xx" }
]
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `name` | string | ✅ | 语音素材标识名 |
| `content` | string | ✅ | 要合成的文本内容 |
| `model` | number | ✅ | TTS 模型 ID |
| `ref_audio` | number | ✅ | 参考音频 ID |
| `role_id` | string | ✅ | 角色 ID |

### Pipeline 用法

- **AI_HUB_X_APP_ID**: `e1b65227-ecf5-4b26-9bef-0f719f43e426`

```bash
bun --env-file=<project-root>/.claude/.env run <skill-directory>/scripts/asset-pipeline.js --input ./public/asset-data.json --output ./asset-urls.ts [options]
```

| 参数 | 说明 |
|------|------|
| `--input, -i` | (必填) asset-data.json 路径 |
| `--output, -o` | (必填) 输出 .ts 文件路径 |
| `--type` | (可选) 默认 12（各素材可在 JSON 中单独指定） |
| `--skip-existing` | (可选) 跳过已有 URL 的素材 |
| `--dry-run` | (可选) 仅预览计划 |
| `--filter <name>` | (可选) 按名称过滤 |
| `--download-dir <path>` | (可选) 同时下载到本地备份 |

### Pipeline 输出

**asset-urls.ts**：
```typescript
export const ASSET_URLS: Record<string, string> = {
  '厨房场景背景': 'https://cdncs.101.com/v0.1/static/.../图片素材.jpg',
  '勺子': 'https://cdncs.101.com/v0.1/static/.../图片素材.jpg',
} as const

export type AssetName = keyof typeof ASSET_URLS

export function getAssetUrl(name: AssetName): string {
  return ASSET_URLS[name]
}
```

**asset-urls.json**：JSON 备份，供增量更新使用。

### Pipeline 示例

```bash
# 批量生成全部素材
bun --env-file=<project-root>/.claude/.env run <skill-directory>/scripts/asset-pipeline.js -i ./public/asset-data.json -o ./asset-urls.ts

# 预览计划
bun --env-file=<project-root>/.claude/.env run <skill-directory>/scripts/asset-pipeline.js -i ./public/asset-data.json -o ./asset-urls.ts --dry-run

# 只补充新增
bun --env-file=<project-root>/.claude/.env run <skill-directory>/scripts/asset-pipeline.js -i ./public/asset-data.json -o ./asset-urls.ts --skip-existing
```

---

## 三、单素材生产

- **AI_HUB_X_APP_ID**: `e1b65227-ecf5-4b26-9bef-0f719f43e426`

```bash
# type 11（图生图）—— --text 为提示词，--image 为原图文件
bun --env-file=<project-root>/.claude/.env run <skill-directory>/scripts/asset-generate.js --text "Make it smile, keep same style" --image ./assets/character.png --type 11 [options]

# type 12（文生图·数组）
bun --env-file=<project-root>/.claude/.env run <skill-directory>/scripts/asset-generate.js --text '[{"name":"勺子","prompt":"A cute cartoon spoon","size":"512x512"}]' --type 12 [options]

# type 21（文生语音·数组）
bun --env-file=<project-root>/.claude/.env run <skill-directory>/scripts/asset-generate.js --text '[{"name":"L1_S1_01","content":"你好","model":10139,"ref_audio":10311,"role_id":"xx"}]' --type 21 [options]
```

| 参数 | 说明 |
|------|------|
| `--text, -t` | (必填) type 11: 提示词字符串; type 12: JSON 对象数组; type 21: JSON 对象数组 `[{name,content,model,ref_audio,role_id}]` |
| `--type` | (必填) 11=图生图（⚠️仅限有原图场景）, 12=文生图, 21=文生语音 |
| `--image` | (type 11 **必填**) 原图文件路径，通过 multipart/form-data 上传。没有原图请用 type 12 |
| `--url-only` | 只输出 CDN URL |
| `--json` | 输出完整 API 响应 |
| `--outFile` | 下载到指定路径 |
| `--outDir` | 下载到指定目录 |

---

## ⚠️ 核心规则：生产后必须同步更新预览页

**每次调用 API 生产素材（无论单条还是批量），只要有新的 CDN URL 返回，必须立即执行以下同步操作：**

1. **更新数据源文件**：将对应素材的 URL 写入 `asset-urls.ts`（ASSET_URLS / TTS_URLS 对应键）
2. **重新生成 asset-data.json**：运行 `node .claude/skills/preview-skill/scripts/gen-asset-data.mjs`
3. **重新生成预览页**：运行 `node .claude/skills/preview-skill/scripts/generate-preview.cjs` 重新生成 `public/preview.html`

> 这确保预览页面始终反映最新的素材生产状态，用户可以随时试听/查看已生产的素材。

---

## 推荐工作流

### 批量生产素材（常规流程）

1. `extract-skill` 提炼 → 得到 `asset-urls.ts` + `public/asset-data.json`
2. 本 skill 的提示词能力 → 为 `public/asset-data.json` 中每个素材生成 prompt
3. 组装 `asset-data.json`（图片 + TTS 混合）
4. Pipeline 批量生产 → 输出 `asset-urls.ts`
5. **同步更新数据源文件 + 重新运行 `preview-skill` 生成预览页 + 更新 `produced-urls.json`**
6. 游戏代码 `import { ASSET_URLS } from './asset-urls'` 使用

---

## 与其他 Skill 的协作

| 上游 Skill | 提供数据 |
|-----------|---------|
| extract-skill | `public/asset-data.json`（素材数据含 URL） |

| 下游 Skill | 消费内容 |
|-----------|---------|
| preview-skill | 生产完成后重新运行生成器，刷新预览页素材状态 |
| 游戏代码 | 通过 `asset-urls.ts` 使用 CDN URL |
| check-skill | 验证素材引用完整性 |

---

## 脚本文件清单

| 脚本 | 来源 | 用途 |
|------|------|------|
| `scripts/asset-pipeline.js` | 原 asset-generate | Pipeline 批量生产 |
| `scripts/asset-generate.js` | 原 asset-generate | 单素材生产 API |

---

## Error Handling

- Missing env vars → 提示用户设置 `AI_HUB_KEY`、`BTS_NAME`、`BTS_SECRET`
- API errors → 输出 HTTP status 和 response body
- No URLs in output → 输出原始 API 响应供排查
- Pipeline 中某个素材失败 → 记录错误并继续其他素材

````
