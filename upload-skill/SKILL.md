````skill
---
name: upload-skill
description: 将本地图片/音频文件上传到 CS (Content Service)，获取 CDN URL。支持单文件和批量目录上传，支持 dentry 和 static 两种模式，可自动更新 asset-urls.ts。触发词：上传素材、上传图片、上传到CS、upload、CDN上传、本地上传、上传文件。
---

# Upload Skill — CS 文件上传

将本地文件（图片、音频等）上传到 CS (Content Service)，返回 CDN URL，可选自动更新 `asset-urls.ts`。

## 适用场景

- 本地有现成图片/音频，需要上传到 CDN 获取在线 URL
- 手动调整过的素材（如 PS 修图后）需要重新上传
- 从外部获取的素材文件需要传到项目 CDN
- 批量上传 `素材库/download/` 目录下的所有文件

## 前置条件

环境变量文件位于 `.claude/.env`（与 produce-skill 共享），运行脚本时需通过 `--env-file` 显式指定：

```bash
bun --env-file=<project-root>/.claude/.env run <script> [options]
```

必需环境变量：
- `BTS_NAME`: BTS 应用名称
- `BTS_SECRET`: BTS 应用密钥

可选环境变量：
- `UPLOAD_API`: 上传接口地址（默认: `https://aic-service.sdp.101.com/v1.0/cs/actions/upload_to_cs`）
- `CDN_HOST`: CDN 地址（默认: `https://gcdncs.101.com`）

## 上传接口

使用 aic-service 封装的 CS 上传接口：
- **URL**: `POST https://aic-service.sdp.101.com/v1.0/cs/actions/upload_to_cs`
- **参数**: `multipart/form-data`，字段名 `file`
- **认证**: BTS Token（`@AicAuth`）
- **返回**: Dentry 对象，包含 `dentry_id`
- **CDN URL**: `https://gcdncs.101.com/v0.1/download?attachment=true&dentryId={dentry_id}`

## 用法

```bash
# 上传单个文件
bun --env-file=<project-root>/.claude/.env run <skill-directory>/scripts/upload.js ./素材库/download/西红柿.jpg

# 上传整个目录（自动过滤图片/音频文件）
bun --env-file=<project-root>/.claude/.env run <skill-directory>/scripts/upload.js ./素材库/download/

# 上传并自动更新 asset-urls.ts
bun --env-file=<project-root>/.claude/.env run <skill-directory>/scripts/upload.js ./素材库/download/ --update-urls

# 输出 JSON 格式结果
bun --env-file=<project-root>/.claude/.env run <skill-directory>/scripts/upload.js ./素材库/download/西红柿.jpg --json

# 带素材名称映射
bun --env-file=<project-root>/.claude/.env run <skill-directory>/scripts/upload.js ./素材库/download/ --update-urls --name-map '{"西红柿":"西红柿","spoon":"勺子"}'
```

## 参数

| 参数 | 说明 |
|------|------|
| `<file-or-dir>` | (必填) 本地文件路径或目录路径 |
| `--update-urls` | (可选) 上传后自动更新 asset-urls.ts 和 asset-urls.json |
| `--urls-ts <path>` | (可选, 默认: ./asset-urls.ts) asset-urls.ts 文件路径 |
| `--urls-json <path>` | (可选, 默认: ./asset-urls.json) asset-urls.json 文件路径 |
| `--name-map <json>` | (可选) 文件名到素材名的 JSON 映射 |
| `--json` | (可选) 以 JSON 格式输出结果 |

## 支持的文件类型

| 类型 | 扩展名 |
|------|--------|
| 图片 | `.png` `.jpg` `.jpeg` `.gif` `.webp` `.svg` |
| 音频 | `.mp3` `.wav` `.ogg` |
| 视频 | `.mp4` |

上传目录时自动过滤上述类型文件，忽略其他文件。

## 典型工作流

### 1. 上传本地素材并更新代码引用

```bash
# 将 download 目录下所有素材上传到 CS 并更新 URL 映射
bun --env-file=<project-root>/.claude/.env run <skill-directory>/scripts/upload.js ./素材库/download/ --update-urls --name-map '{"厨房场景":"厨房场景背景"}'
```

### 2. 上传 BGM 到固定路径

```bash
bun --env-file=<project-root>/.claude/.env run <skill-directory>/scripts/upload.js ./素材库/download/厨房场景.jpg --mode static --remote-path game/main_bgm.mp3
```

### 3. 配合 produce-skill 使用

```bash
# 1. produce-skill 生成素材并下载到本地
bun run <produce-skill>/scripts/asset-pipeline.js -i ./素材库/assets.json -o ./asset-urls.ts --download-dir ./素材库/download

# 2. 手动调整本地素材（如 PS 修图）

# 3. 重新上传修改后的素材
bun --env-file=<project-root>/.claude/.env run <skill-directory>/scripts/upload.js ./素材库/download/ --update-urls
```

## 输出

### 控制台输出

```
[upload] Mode: dentry, Service: aic_service_scontent
[upload] Input: ./素材库/download/
[upload] Found 3 file(s) to upload
[upload] Uploading: kitchen.png (245.3 KB)
[upload] ✅ kitchen.png → https://gcdncs.101.com/v0.1/download?attachment=true&dentryId=xxx
[upload] Uploading: spoon.png (32.1 KB)
[upload] ✅ spoon.png → https://gcdncs.101.com/v0.1/download?attachment=true&dentryId=yyy

─── Upload Results ───
✅ kitchen.png → https://gcdncs.101.com/v0.1/download?attachment=true&dentryId=xxx
✅ spoon.png → https://gcdncs.101.com/v0.1/download?attachment=true&dentryId=yyy

Total: 2 success, 0 failed
```

### JSON 输出（--json）

```json
[
  {
    "file": "kitchen.png",
    "dentryId": "xxx",
    "cdnUrl": "https://gcdncs.101.com/v0.1/download?attachment=true&dentryId=xxx",
    "fileName": "kitchen.png",
    "status": "ok"
  }
]
```

## 错误处理

- 缺少环境变量 → 退出并提示
- 文件不存在 → 退出并提示
- 上传失败 → 记录错误，继续上传其他文件
- 批量上传部分失败 → 汇总报告，退出码 1

````
