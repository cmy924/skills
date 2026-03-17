---
name: asset-generate
description: 小游戏-素材生产库。通过 AI Hub 素材生产 API 生成游戏素材（图片和 TTS 语音）。支持单个生成和批量生产线模式。触发词包括"生成素材"、"生成语音"、"TTS"、"素材生产"、"素材生产线"、"批量生成"、"asset generate"、"pipeline"等素材生产相关请求。
---

# 小游戏-素材生产库 (Asset Production)

Generate game assets (images and TTS audio) using the "小游戏-素材生产库" API.

- **AI_HUB_X_APP_ID**: `e1b65227-ecf5-4b26-9bef-0f719f43e426`
- **Inputs**: `{ text, type }`

> ⚠️ This is a DIFFERENT API from image-generate. Do NOT confuse the two:
> - **image-generate**: `AI_HUB_X_APP_ID=99fc09bd-...`, inputs = `{query, width, height}` → 纯图片生成
> - **asset-generate**: `AI_HUB_X_APP_ID=e1b65227-...`, inputs = `{text, type}` → 素材生产（图片+语音）

## ⛔ 核心规则：禁止相对路径

**项目中禁止使用相对路径引用素材文件**。所有素材必须通过 API 返回的 CDN URL 使用。

```typescript
// ✅ 正确: 使用 CDN URL 映射
import { ASSET_URLS } from './asset-urls'
<img src={ASSET_URLS['厨房场景背景']} />

// ❌ 禁止: 相对路径
<img src="./assets/kitchen.jpg" />
import img from './assets/kitchen.jpg'
```

### 素材引用工作流

1. 编写 `assets.json`（name + prompt + size）
2. 运行素材生产线 → 生成 `asset-urls.ts`
3. 游戏代码 `import { ASSET_URLS } from './asset-urls'` 使用 CDN URL

## Type Options

| type | 名称 | text 参数格式 | 说明 |
|------|------|------------|------|
| 12 | pic 数组 | JSON 对象数组 `[{name,prompt,size}]` | Image array（已验证可用 ✅） |
| 21 | tts 数组 | JSON 字符串数组 `["文本"]` | TTS audio array（已验证可用 ✅） |

## Prerequisites

Required environment variables:
- `AI_HUB_KEY`: API key for AI Hub (required)
- `BTS_NAME`: BTS app name (required)
- `BTS_SECRET`: BTS app secret (required)

Optional:
- `AI_HUB_HOST`: API endpoint (default: https://ai-hub-api.aiae.ndhy.com)
- `AI_HUB_BOT_ENV`: Environment name (default: prod)

---

## 一、素材生产线（Pipeline 批量模式）🔥

**当用户说"素材生产线"、"批量生成素材"时，使用此模式。**

读取 `assets.json`，逐个调用 API 获取 CDN URL，生成 TypeScript URL 映射文件。

### assets.json 模板格式

> **重要**: type 12 和 type 21 的 API text 参数格式不同：
> - **type 12**: text 是 **JSON 对象数组字符串**，每个对象含 `name`、`prompt`、`size` 三个字段
> - **type 21**: text 是 **JSON 字符串数组**（如 `["你好","欢迎"]`）
>
> Pipeline 会自动将同组素材按对应格式组装，一次性调用 API 批量生成。

#### type 12（图片）素材定义

```json
[
  { "name": "勺子", "prompt": "A cute cartoon spoon, silver metallic... 512x512 pixels.", "size": "512x512" },
  { "name": "苹果", "prompt": "A cute cartoon red apple... 512x512 pixels.", "size": "512x512" }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 素材名称，用作 URL 映射的 key |
| `prompt` | string | AI 绘图提示词 |
| `size` | string | 图片尺寸（如 `512x512`），追加到 prompt 末尾 |

#### type 21（语音）素材定义

```json
[
  { "name": "欢迎词", "prompt": "小朋友你好，欢迎来到分类游戏", "type": 21 },
  { "name": "开始提示", "prompt": "请找出所有的勺子", "type": 21 }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 素材名称，用作 URL 映射的 key |
| `prompt` | string | TTS 文本内容 |
| `type` | number | 必须为 21 |

Pipeline 会自动将同组 type 21 素材的 prompt 收集成字符串数组，一次性调用 API 批量生成多个语音 URL。

#### 混合示例（图片 + 语音）

Pipeline 分组处理：type 12 素材归为一组批量调用，type 21 素材归为另一组批量调用。

```json
[
  { "name": "勺子", "prompt": "A cute cartoon spoon...", "size": "512x512" },
  { "name": "欢迎词", "prompt": "小朋友你好", "type": 21 },
  { "name": "开始提示", "prompt": "请找出所有的勺子", "type": 21 }
]
```

### Pipeline 用法

```bash
bun run <skill-directory>/scripts/asset-pipeline.js --input ./素材库/assets.json --output ./asset-urls.ts [options]
```

### Pipeline 参数

| 参数 | 说明 |
|------|------|
| `--input, -i` | (必填) assets.json 路径 |
| `--output, -o` | (必填) 输出 .ts 文件路径 |
| `--type` | (可选) 生成类型，默认 12（各素材可在 assets.json 中单独指定 type 覆盖） |
| `--skip-existing` | (可选) 跳过已有 URL 的素材 |
| `--dry-run` | (可选) 仅打印计划，不实际生成 |
| `--filter <name>` | (可选) 按名称过滤 |
| `--download-dir <path>` | (可选) 同时下载到本地目录（备份用） |

### Pipeline 示例

```bash
# 批量生成全部素材，输出 URL 映射
bun run <skill-directory>/scripts/asset-pipeline.js -i ./素材库/assets.json -o ./asset-urls.ts

# 预览计划
bun run <skill-directory>/scripts/asset-pipeline.js -i ./素材库/assets.json -o ./asset-urls.ts --dry-run

# 跳过已有的，只补充新增
bun run <skill-directory>/scripts/asset-pipeline.js -i ./素材库/assets.json -o ./asset-urls.ts --skip-existing

# 同时下载本地备份
bun run <skill-directory>/scripts/asset-pipeline.js -i ./素材库/assets.json -o ./asset-urls.ts --download-dir ./素材库/download
```

### Pipeline 输出

自动生成两个文件：

**asset-urls.ts** — 游戏代码中 import 使用：
```typescript
export const ASSET_URLS: Record<string, string> = {
  '厨房场景背景': 'https://cdncs.101.com/v0.1/static/.../图片素材.jpg',
  '勺子': 'https://cdncs.101.com/v0.1/static/.../图片素材.jpg',
  // ...
} as const

export type AssetName = keyof typeof ASSET_URLS

export function getAssetUrl(name: AssetName): string {
  return ASSET_URLS[name]
}
```

**asset-urls.json** — JSON 备份，供增量更新使用

### 游戏代码使用方式

```typescript
import { ASSET_URLS, getAssetUrl } from './asset-urls'

// 直接使用
<img src={ASSET_URLS['厨房场景背景']} />

// 带类型检查
<img src={getAssetUrl('勺子')} />
```

---

## 二、单个素材生成

text 参数格式根据 type 不同：
- type 12: JSON 对象数组 `[{"name":"xx","prompt":"xx","size":"512x512"}]`
- type 21: JSON 字符串数组 `["文本1","文本2"]`

```bash
# type 12（图片）
bun run <skill-directory>/scripts/asset-generate.js --text '[{"name":"勺子","prompt":"A cute cartoon spoon","size":"512x512"}]' --type 12 [options]

# type 21（语音）
bun run <skill-directory>/scripts/asset-generate.js --text '["你好","欢迎"]' --type 21 [options]
```

### 参数

| 参数 | 说明 |
|------|------|
| `--text, -t` | (必填) type 12: JSON对象数组; type 21: JSON字符串数组 |
| `--type` | (必填) 12=图片, 21=语音 |
| `--url-only` | 只输出 CDN URL，不下载文件 |
| `--json` | 输出完整 API 响应 JSON |
| `--outFile` | 下载到指定路径 |
| `--outDir` | 下载到指定目录 |

### 示例

```bash
# 只获取 URL（图片，推荐）
bun run <skill-directory>/scripts/asset-generate.js --text '[{"name":"勺子","prompt":"A cute cartoon spoon","size":"512x512"}]' --type 12 --url-only

# 批量 TTS 语音
bun run <skill-directory>/scripts/asset-generate.js --text '["你好","欢迎"]' --type 21 --url-only

# 下载文件
bun run <skill-directory>/scripts/asset-generate.js --text '[{"name":"勺子","prompt":"A cute cartoon spoon","size":"512x512"}]' --type 12 --outDir ./output

# 查看原始输出
bun run <skill-directory>/scripts/asset-generate.js --text '[{"name":"test","prompt":"test","size":"512x512"}]' --type 12 --json
```

---

## Error Handling

- Missing args → exits with clear error message
- API errors → prints HTTP status and response body
- No URLs in output → prints raw outputs for debugging

## Workflow

1. **素材生产线**: `assets.json` → API → CDN URLs → `asset-urls.ts` → 游戏 import
2. **单个生成**: `--text` + `--type` + `--url-only` → CDN URL
