---
name: roles-skill
description: 角色资源库。管理角色视觉资源（idle/speaking 图片 CDN 地址、主题色、性别、角色定位）和 TTS 音色默认配置（model、ref_audio）。当新游戏项目需要复用这些角色时，通过此 skill 查询并引入对应角色资源和音色配置，无需重复配置。触发词包括“查询角色”、“角色库”、“用小安”、“用小瑞”、“用小布”、“引入角色”、“roles”、“character library”、“复用角色”、“角色音色”、“TTS配置”。
---

# Roles Skill — 角色资源库

集中管理小安、小瑞、小布三个角色的**视觉资源**和**TTS 音色配置**，供跨项目复用。

## ⚠️ 防覆盖规则

执行前检查 `index.tsx` 中是否存在 `@custom-characters` 标记。

- 如果找到 `@custom-characters` → **跳过 CHARACTERS 配置块的写入**，表示项目已有完整的角色配置，不需要重新生成
- 如果未找到 → 按下方角色资源正常写入 CHARACTERS 块

## 角色总览

| 角色 ID | 名称 | 主题色 | idle 状态 | speaking 状态 |
|---------|------|--------|----------|--------------|
| `xiao_an` | 小安 | `#ff6b6b` | ✅ CDN | ✅ CDN |
| `xiao_rui` | 小瑞 | `#4ecdc4` | ✅ CDN | ✅ CDN |
| `xiao_bu` | 小布 | `#ffa502` | ✅ CDN | ✅ CDN |

> ✅ 所有角色的 idle 和 speaking 态均已上传 CDN，可直接引用。

## TTS 音色默认配置

每个角色（含旁白）均有默认 TTS 音色配置，新项目引入角色时自动带入，无需手动查找 model/ref_audio。

| 角色 ID | 名称 | model | ref_audio | 音色描述 |
|---------|------|-------|-----------|----------|
| `xiao_an` | 小安 | `10139` | `10311` | 活泼男孩声 |
| `xiao_rui` | 小瑞 | `10138` | `10310` | 温柔女孩声 |
| `xiao_bu` | 小布 | `10141` | `10313` | 憨厚男孩声 |
| `narrator` | 旁白 | `10112` | `10284` | 清晰成年女声 |

> 💡 **使用方式：** 当 extract-skill 提炼 TTS 数据时，根据角色 ID 自动从此表查找 model/ref_audio 填入 assets.json，无需用户手动指定。

---

## 角色资源详情

### 小安 (xiao_an)

- **名称：** 小安
- **主题色：** `#ff6b6b`（暖红色）
- **角色定位：** 第一关引导角色，性别男

**图片资源：**

| 状态 | URL | 格式 | 备注 |
|------|-----|------|------|
| idle | `https://gcdncs.101.com/v0.1/download?attachment=true&dentryId=c71763e8-0bf1-4d63-bf9c-b06e707ec9b6` | PNG（透明背景） | 已上传 CDN |
| speaking | `https://gcdncs.101.com/v0.1/download?attachment=true&dentryId=e29896a1-3079-42bf-bc1a-8ff7c8e37f48` | PNG（透明背景） | 已上传 CDN |

---

### 小瑞 (xiao_rui)

- **名称：** 小瑞
- **主题色：** `#4ecdc4`（薄荷绿）
- **角色定位：** 第二关引导角色，性别女

**图片资源：**

| 状态 | URL | 格式 | 备注 |
|------|-----|------|------|
| idle | `https://gcdncs.101.com/v0.1/download?attachment=true&dentryId=5ffa0c1a-d60c-4d19-99ed-26312b6081e9` | PNG（透明背景） | 已上传 CDN |
| speaking | `https://gcdncs.101.com/v0.1/download?attachment=true&dentryId=78d7aab5-8996-48e6-8474-651e00f448ba` | PNG（透明背景） | 已上传 CDN |

---

### 小布 (xiao_bu)

- **名称：** 小布
- **主题色：** `#ffa502`（橙黄色）
- **角色定位：** 第三关引导角色，性别男

**图片资源：**

| 状态 | URL | 格式 | 备注 |
|------|-----|------|------|
| idle | `https://gcdncs.101.com/v0.1/download?attachment=true&dentryId=d3c591b2-06c9-42eb-a8e1-9295a32a519e` | PNG（透明背景） | 已上传 CDN |
| speaking | `https://gcdncs.101.com/v0.1/download?attachment=true&dentryId=04ed3618-378c-474f-a3e8-c2d1dec7ff1b` | PNG（透明背景） | 已上传 CDN |

---

---

## 使用方式

### 场景 1：新游戏项目引入角色

当用户说"这个游戏也用小安/小瑞/小布"或"引入角色库中的角色"时：

1. **读取本 SKILL.md** 获取角色资源信息
2. **读取角色数据文件** `.claude/skills/roles-skill/roles-library.json` 获取结构化数据
3. 根据用户指定的角色，将对应的图片 URL、主题色写入目标项目的角色配置中

**代码模板（TypeScript）：**

```typescript
// 角色配置 — 从角色资源库引入
const CHARACTERS = {
  xiao_an: {
    id: 'xiao_an',
    name: '小安',
    idle: 'https://gcdncs.101.com/v0.1/download?attachment=true&dentryId=c71763e8-0bf1-4d63-bf9c-b06e707ec9b6',
    speaking: 'https://gcdncs.101.com/v0.1/download?attachment=true&dentryId=e29896a1-3079-42bf-bc1a-8ff7c8e37f48'
  },
  xiao_rui: {
    id: 'xiao_rui',
    name: '小瑞',
    idle: 'https://gcdncs.101.com/v0.1/download?attachment=true&dentryId=5ffa0c1a-d60c-4d19-99ed-26312b6081e9',
    speaking: 'https://gcdncs.101.com/v0.1/download?attachment=true&dentryId=78d7aab5-8996-48e6-8474-651e00f448ba'
  },
  xiao_bu: {
    id: 'xiao_bu',
    name: '小布',
    idle: 'https://gcdncs.101.com/v0.1/download?attachment=true&dentryId=d3c591b2-06c9-42eb-a8e1-9295a32a519e',
    speaking: 'https://gcdncs.101.com/v0.1/download?attachment=true&dentryId=04ed3618-378c-474f-a3e8-c2d1dec7ff1b'
  }
}
```

### 场景 2：查询某个角色的信息

当用户说"小瑞的 idle 图是什么"或"查下小安的主题色"时：

1. 读取本 SKILL.md 或 `roles-library.json`
2. 返回对应角色的图片 URL、主题色等视觉资源

> 若用户查询某个角色的 TTS 音色，可从本 skill 的 `roles-library.json` 中读取 `tts.model` 和 `tts.ref_audio` 字段。

### 场景 3：更新角色资源

当角色资源有更新（如 speaking 态图片上传到 CDN 后）：

1. 更新 `roles-library.json` 中对应角色的 URL
2. 同步更新本 SKILL.md 中的资源表格
3. 更新 `lastUpdated` 时间戳

---

## 角色展示规范

基于 `character-asset-standard.md` 标准：

- **画布比例：** 统一 4:3（推荐 2304×1728）
- **主体占比：** 角色高度占画布高度 85%-95%
- **底部对齐：** 角色脚部紧贴画布底边（偏移 ≤ 3%）
- **透明背景：** 所有角色图片必须为透明 PNG
- **idle ↔ speaking 一致性：** 同一角色的两态尺寸差异 ≤ 5%

**CSS 展示建议：**

```css
.character {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center bottom;
  filter: drop-shadow(0 0.5vmin 1vmin rgba(0, 0, 0, 0.2));
}
```

---

## 数据文件

角色的结构化数据存储在 `.claude/skills/roles-skill/roles-library.json`，包含完整的角色 ID、名称、主题色、图片 URL、TTS 配置等信息，方便程序化读取。

---

## 维护规则

1. **新角色上线时**：在 `roles-library.json` 追加角色条目，更新本 SKILL.md 总览表
2. **资源 URL 变更时**：同步更新 `roles-library.json` 和本 SKILL.md
3. **角色下线时**：标记为 `deprecated`，不直接删除，保留历史记录
4. **跨项目使用时**：通过本 skill 查询，不要硬编码 URL
