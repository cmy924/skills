---
name: prompt-skill
description: 为游戏素材生成高质量文生图提示词（prompt）。根据游戏设计文档、关卡配置和素材清单，自动输出结构化的英文绘图 prompt，可直接用于 asset-generate 素材生产线或 image-generate 图片生成。触发词包括"生成提示词"、"写prompt"、"出prompt"、"文生图提示词"、"prompt生成"、"补充prompt"、"优化prompt"、"提示词优化"、"batch prompt"、"generate prompt"。当用户需要为素材清单编写、补充或优化 AI 绘图提示词时，务必使用此 skill。
---

# Prompt Skill — 文生图提示词生成

从游戏设计文档、关卡配置和素材需求中，生成可直接用于 AI 绘图 API 的高质量英文提示词。

## 适用场景

- 新建素材清单时，需要为每个素材编写文生图 prompt
- 已有素材名称/用途，需要批量补充 prompt
- 优化已有 prompt 以提升出图质量
- 为 `public/asset-data.json` 中 prompt 为空的条目补齐提示词
- 确保同一关卡/场景的素材风格一致

## 核心流程

1. **收集上下文** — 读取 `index.tsx`（游戏逻辑）、`public/asset-data.json` 的 ASSETS 数组（含 name/size/type/prompt）
2. **分析素材需求** — 确定每个素材的类别、用途、尺寸、背景要求
3. **生成 prompt** — 按规范输出英文提示词
4. **直接写入 asset-data.json** — 将 prompt 写入 `public/asset-data.json` 对应 ASSETS 条目的 `prompt` 字段（**唯一数据源，直接编辑**）

## Prompt 编写规范

### 结构模板

每条 prompt 应包含以下层次（按顺序）：

```
[主体描述] + [风格修饰] + [色彩/氛围] + [背景要求] + [技术参数]
```

| 层次 | 说明 | 示例 |
|------|------|------|
| 主体描述 | 物品/场景的核心内容，一句话说清"画什么" | A single cute cartoon spoon, silver metallic color with a slight shine |
| 风格修饰 | 画风、线条、比例等美术风格 | Kawaii style, slightly exaggerated proportions, flat illustration style |
| 色彩/氛围 | 配色方案、光照、情绪 | Soft pastel colors, warm kitchen lighting, child-friendly and inviting |
| 背景要求 | 透明/纯色/场景 | Isolated on transparent background |
| 技术参数 | 尺寸引导（追加到 prompt 末尾由 pipeline 处理） | 512x512 pixels |

### 风格一致性规则

同一项目的所有 prompt 必须遵守统一的风格基线。从已有 prompt 中提取风格关键词，确保新 prompt 保持一致：

- **画风**: flat illustration style / vector style / hand-drawn style
- **受众**: suitable for children aged 5-7 / child-friendly
- **色调**: soft pastel colors / warm colors / bright colors
- **线条**: clean lines / rounded edges / soft shadows

如果项目中已有 prompt，先分析现有风格并保持一致；如果是全新项目，与用户确认风格基调。

### 分类规范

| 素材类别 | 背景要求 | 推荐尺寸 | 额外要点 |
|----------|----------|----------|----------|
| 场景背景 | 完整场景 | 1920x1080 | 写明视角（top-down / slightly elevated）、无角色 |
| 道具/物品 | transparent background | 512x512 或 256x256 | 写明 isolated、单个物品、适合游戏交互 |
| 角色/NPC | transparent background | 512x512 | 写明表情、服饰、姿态、适合儿童 |
| UI 元素 | transparent background | 256x256 | 写明用途（按钮/图标/反馈特效） |
| 关卡场景 | 完整场景 | 1920x1080 | 体现关卡主题物品的散布效果 |

### 质量检查清单

生成 prompt 后，逐条核对：

- [ ] **英文**：prompt 必须全英文
- [ ] **单一主体**：每条 prompt 只描述一个素材（除非是组合资源如"三颗星"）
- [ ] **无歧义**：避免 "etc."、"various"、"some" 等模糊词
- [ ] **尺寸匹配**：与 `public/asset-data.json` ASSETS 中的 `size` 字段对应
- [ ] **背景正确**：道具/角色用 transparent，场景不用
- [ ] **风格统一**：与项目已有 prompt 使用相同的风格关键词
- [ ] **无文字**：场景类 prompt 加 "No text, no characters"
- [ ] **不含 negative prompt**：正向描述即可，不写 "no ugly, no blurry" 类 negative

### 常用风格词库

便于快速组合 prompt：

**画风**: flat illustration, vector art, cartoon style, kawaii style, hand-painted, watercolor, pixel art
**氛围**: warm and cozy, cheerful, playful, dreamy, magical, serene
**光照**: warm lighting, soft shadows, sunlight streaming in, golden hour glow
**色彩**: soft pastel colors, bright vivid colors, muted earth tones, candy colors
**质感**: glossy, metallic shine, subtle highlight, slight 3D raised effect
**受众**: child-friendly, suitable for children's educational game, suitable for children's mobile game
**构图**: isolated on transparent background, centered composition, top-down view, slightly elevated angle

## 输出格式

### 单条 prompt 输出

直接输出英文 prompt 文本，用户可直接复制使用。

### 批量输出（推荐）

输出为兼容 `public/asset-data.json` ASSETS 数组的格式，可直接写入对应条目：

```json
[
  {
    "name": "素材中文名",
    "prompt": "A single cute cartoon ...",
    "size": "512x512"
  }
]
```

### 更新 素材提示词.md

如果用户要求，也可以按 `素材库/素材提示词.md` 的现有格式追加：

```markdown
### N. 素材名称

​```
English prompt text here...
​```
```

## 与其他 Skill 的协作

| 上游 Skill | 提供信息 | 本 Skill 产出 |
|-----------|---------|--------------|
| material-skill | 素材规划 JSON（name、category、usage） | 为每个素材补充 prompt |
| role-skill | 角色信息（外观、服饰、表情） | 为角色素材生成 prompt |

| 下游 Skill | 消费内容 |
|-----------|---------|
| asset-generate | 读取 `public/asset-data.json` 中的 prompt 进行批量生图 |
| image-generate | 直接使用单条 prompt 调用 API |

> **注意**：`public/asset-data.json` 是 ASSETS 元数据的唯一来源，直接编辑即可。若同时更新了 `asset-urls.ts` 的 URL，可选择性运行 `node .claude/skills/preview-skill/scripts/gen-asset-data.mjs` 同步 url 字段。

## 示例

### 输入

用户："帮我给这些素材写 prompt：碗、筷子、盘子，是一个儿童厨房分类游戏"

### 输出

```json
[
  {
    "name": "碗",
    "prompt": "A single cute cartoon bowl, white ceramic with a light blue rim, rounded and child-friendly design, simple and clean shape. Isolated on transparent background, flat illustration style with soft shadows, suitable for a children's mobile game.",
    "size": "512x512"
  },
  {
    "name": "筷子",
    "prompt": "A single pair of cute cartoon chopsticks, light wooden color with a slight shine, rounded tips, simple and clean parallel arrangement. Isolated on transparent background, flat illustration style with soft shadows, suitable for a children's mobile game.",
    "size": "512x512"
  },
  {
    "name": "盘子",
    "prompt": "A single cute cartoon plate, white ceramic with a subtle pastel border pattern, flat circular shape viewed from slightly above, clean and simple design. Isolated on transparent background, flat illustration style with soft shadows, suitable for a children's mobile game.",
    "size": "512x512"
  }
]
```
