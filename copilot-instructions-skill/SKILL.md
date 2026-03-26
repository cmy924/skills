---
name: copilot-instructions-skill
description: 分析项目源码，生成精简版 .github/copilot-instructions.md 和详细版 .github/game-design.md。触发词："生成 copilot-instructions"、"更新协作指南"、"生成 copilot 指引"、"分析代码生成文档"。
---

# Copilot Instructions 生成器

分析项目源码，生成两个文件：
- `.github/copilot-instructions.md` — 精简摘要（~40行），每次对话自动加载
- `.github/game-design.md` — 完整游戏规则，修改核心逻辑时按需读取

## 设计理念

copilot-instructions.md 每次对话都会全量提交，必须尽量精简以节省 token。详细规则外置到 game-design.md，通过引用指向。

## 需要读取的文件

| 优先级 | 文件 | 用途 |
|-------|------|------|
| 必须 | `index.tsx`（全部） | 主组件，提取游戏逻辑和规则 |
| 必须 | `package.json` | 依赖和技术栈 |

## copilot-instructions.md 模板

```markdown
# Copilot 协作指南

## 角色

React + TypeScript 游戏组件开发专家，维护基于 Vite 构建的课件/小游戏组件。

核心原则：最小化变更，不做无关重构；修复后检查关联模块。

---

## 游戏摘要

**{游戏名称}** — {一句话描述}

- **流程：** {箭头表示的精简流程}
- {每步骤一行压缩描述}
- **计分：** {星级条件，| 分隔}
- **全局状态：** {关键全局变量}

> 详细规则见 `.github/game-design.md`，修改核心逻辑时必须阅读对照。

---

## 技术栈

- {核心技术和外部依赖}
- 宿主接口：`ComponentProps`（`onStatusChange(1|2)`、`onExit()`）

---

## 素材规范

- 所有素材 CDN URL **唯一来源**：`asset-urls.ts` 的 `ASSET_URLS`
- 新增或修改素材后，必须更新 `asset-urls.ts`，再运行 `gen-asset-data.mjs` 同步 `asset-data.json`
- 禁止在代码中硬编码 CDN URL，禁止使用相对路径引用图片/音频

---

## 工作协议

1. **定位** — 找到根因，引用游戏规则相关条目
2. **方案** — 说明改哪里，列出影响范围
3. **实施** — 只改必须改的，注释标注 `// FIX: [原因]`
4. **自检** — 规则未违反、状态流转正确、边界已处理、类型无 any

---

## 红线

- ❌ 不删功能代码、不换技术方案、不做顺便优化、不加新依赖
- ❌ 不在代码中硬编码素材 URL，新增素材必须写入 `asset-urls.ts`
- ⚠️ 涉及计分/关卡流转，必须对照 `.github/game-design.md`
```

## game-design.md 模板

包含以下章节，从代码中完整提取：

1. **游戏概述** — 名称、玩法、教学目标
2. **通用规则** — 关卡顺序、步骤流程、自动推进、全局状态
3. **各步骤/关卡详细规则** — 从条件判断逻辑中提取
4. **评分规则** — 星级条件表格
5. **组件架构** — 状态管理、核心状态变量
6. **已知约束** — 平台、构建、外部依赖

## 注意事项

1. copilot-instructions.md 控制在 **50 行以内**，工作协议和红线原样保留
2. game-design.md 规则尽量完整，宁多勿少
3. 所有内容从代码提取，无法确定的标注 `[待补充]`
4. 如果文件已存在，覆盖写入
