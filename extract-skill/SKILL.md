`````skill
````skill
---
name: extract-skill
description: 资源提炼（asset-urls + asset-data）。从游戏源码 index.tsx 中提取所有 CDN URL 常量，输出 asset-urls.ts；再运行 gen-asset-data.mjs 将最新 URL 同步回 public/asset-data.json。asset-data.json 是素材元数据（prompt/size/type）的唯一来源，由 AI 直接维护。触发词：资源提炼、素材提炼、提炼URL、提炼素材、extract、生成asset-urls、生成asset-data。
---

# Extract Skill  资源提炼（asset-urls.ts + asset-data.json）

从当前游戏组件中提取素材 URL 并生成统一数据文件：

| 输出文件 | 内容 | 用途 |
|---------|------|------|
| `asset-urls.ts` | 所有 CDN URL 常量（ASSET_URLS、CHARACTERS、BGM_URLS、TTS_URLS） | index.tsx 编译期 import |
| `public/asset-data.json` | 统一运行时数据（URL + prompt + size + type + 角色/BGM/TTS） | preview.html 运行时 fetch |

>  **不负责角色视觉资源**（由 `roles-skill` 管理）  
> 不负责 BGM 配置（由 `bgm-skill` 处理）  
> 不调用生产 API（由 `produce-skill` 处理）

---

## 适用场景

- 新项目首次从 index.tsx 提炼全部 URL 常量
- 素材生产后更新 CDN URL，同步到 asset-urls.ts
- 素材变更后重新生成 asset-data.json

---

## 执行流程

### 第一步：读取源码

必须读取的文件：
1. `index.tsx`  主组件（**必须**），提取所有 CDN URL 使用
2. `public/asset-data.json`  现有 ASSETS 元数据（增量更新时保留 prompt/size/type 等字段）
3. `asset-urls.ts`  已有文件（增量更新时保留未变更条目）

### 第二步：提炼 URL 常量  `asset-urls.ts`

从 `index.tsx` 中提取所有硬编码 CDN URL，归类为以下四个常量：

```typescript
// asset-urls.ts  自动提炼，CDN URL 唯一来源
//  此文件由 extract-skill 维护，素材 URL 变更在此处更新

export const ASSET_URLS: Record<string, string> = {
  // 场景背景
  "开始页背景": "https://cdncs.101.com/...",
  "关卡1背景": "https://cdncs.101.com/...",
  // 道具
  "手机": "https://cdncs.101.com/...",
  // 待生产的留空
  "新道具": "",
};

export const CHARACTERS = [
  {
    name: "小安",
    idleUrl: "https://...",
    speakingUrl: "https://...",
    color: "#4ecdc4",
    gender: "female"
  }
];

export const BGM_URLS: Record<string, string> = {
  "主流程": "https://...",
};

export const TTS_URLS: Record<string, string> = {
  "narrator_welcome": "https://...",
};
```

**提炼规则：**
1. 扫描 index.tsx 中所有 CDN URL（`https://cdncs.101.com` 或 `https://gcdncs.101.com`）
2. 按语义归类：背景图  `ASSET_URLS`，角色图  `CHARACTERS`，音乐  `BGM_URLS`，语音  `TTS_URLS`
3. 已有 `asset-urls.ts` 时做增量合并：保留已有 URL，仅新增/更新变更项
4. 待生产素材（`素材库/assets.json` 中有定义但无 URL 的）以空字符串占位

### 第三步：同步 URL 到  `public/asset-data.json`

`asset-data.json` 是 ASSETS 元数据（prompt/size/type/materialId）的**唯一来源**，由 AI 直接维护，无需 `素材库/assets.json`。

提炼完 `asset-urls.ts` 后，运行以下命令将 URL 同步回 asset-data.json：

```bash
node .claude/skills/preview-skill/scripts/gen-asset-data.mjs
```

脚本读取：
- `public/asset-data.json`  现有 ASSETS 元数据（保留 prompt/size/type 等字段）
- `asset-urls.ts`  ASSET_URLS、CHARACTERS、BGM_URLS、TTS_URLS（刷新 url 字段）

输出 `public/asset-data.json`：

```json
{
  "_meta": {
    "generatedAt": "...",
    "sources": ["素材库/assets.json", "asset-urls.ts"]
  },
  "ASSET_URLS": { "开始页背景": "https://..." },
  "ASSETS": [
    {
      "materialId": "scene_start_bg",
      "name": "开始页背景",
      "prompt": "...",
      "size": "1920x1080",
      "type": 12,
      "url": "https://..."
    }
  ],
  "CHARACTERS": [],
  "BGM_URLS": {},
  "TTS_URLS": {}
}
```

### 第四步：生成预览页（委托 preview-skill）

```bash
node .claude/skills/preview-skill/scripts/generate-preview.cjs --open
```

preview-skill 读取 `素材库/assets.json`（元数据）+ `asset-urls.ts`（URL）生成可视化预览页。
详见 `preview-skill/SKILL.md`。

---

## 执行模式

### 全量提炼（默认）

```bash
# 1. AI 完成 asset-urls.ts 提炼（对话操作）

# 2. 生成 asset-data.json
node .claude/skills/preview-skill/scripts/gen-asset-data.mjs

# 3. 生成预览页（可选）
node .claude/skills/preview-skill/scripts/generate-preview.cjs --open
```

### 增量更新（素材生产后）

素材生产完成、拿到新 CDN URL 后：
1. 更新 `asset-urls.ts` 中对应键值
2. 重新生成 `public/asset-data.json`：`node .claude/skills/preview-skill/scripts/gen-asset-data.mjs`
3. 重新生成 `public/preview.html`：`node .claude/skills/preview-skill/scripts/generate-preview.cjs`

---

## 数据文件说明

| 文件 | 维护方式 | 说明 |
|------|---------|------|
| `asset-urls.ts` | extract-skill 提炼 / 素材生产后手动更新 | CDN URL 唯一来源，index.tsx import |
| `public/asset-data.json` | AI 直接编辑（ASSETS 元数据）；gen-asset-data.mjs 同步 URL 字段 | 素材元数据唯一来源，prompt/size/type 在此直接维护 |

---

## 结果要求

- `asset-urls.ts` 中所有键名与 index.tsx 中使用的变量名完全对应
- 未生产的素材 URL 留空字符串 `""`，不填占位符
- `asset-data.json` 由脚本自动生成，不手动修改
- 不包含角色视觉资源（由 `roles-skill` 负责）
- 不混入 BGM 配置（由 `bgm-skill` 负责）

---

## 与其他 Skill 的协作

| 关系 | Skill | 说明 |
|------|-------|------|
| **下游** | `preview-skill` | 读取 `素材库/assets.json` + `asset-urls.ts` 生成可视化预览页 |
| **下游** | `produce-skill` | 读取 `素材库/assets.json` 进行素材生产，生产后更新 `asset-urls.ts` |
| **独立** | `roles-skill` | 管理角色视觉资源，与本 skill 独立 |
| **独立** | `bgm-skill` | 独立处理 BGM |
| **下游** | `check-skill` | 读取提炼结果做完整性校验 |
````
`````