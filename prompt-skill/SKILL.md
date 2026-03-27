---
name: prompt-skill
description: ⚠️ 已合并到 produce-skill。本 skill 的全部能力（文生图提示词生成、风格一致性、质量检查、批量 prompt 输出）已整合到 produce-skill 的"一、提示词生成"章节。当用户说"生成提示词"、"写prompt"、"出prompt"、"文生图提示词"、"prompt生成"、"补充prompt"、"优化prompt"时，请直接使用 produce-skill。
---

# Prompt Skill — 已合并到 produce-skill

> **⚠️ DEPRECATED** — 本 skill 的全部能力已合并到 `produce-skill` 的「一、提示词生成（Prompt 能力）」章节。
>
> 请直接使用 **produce-skill**，它包含了本 skill 的完整功能并增加了 Pipeline 批量生产和 API 调用能力。

## 重定向

当触发到本 skill 时，请按以下步骤操作：

1. 读取 `.claude/skills/produce-skill/SKILL.md`
2. 跳转到「一、提示词生成（Prompt 能力）」章节
3. 按照 produce-skill 的规范执行提示词生成

## 原有能力对照

| 原 prompt-skill 功能 | produce-skill 对应位置 |
|---------------------|----------------------|
| Prompt 编写规范（结构模板） | 一、提示词生成 → Prompt 编写规范 |
| 分类规范（场景/道具/角色/UI） | 一、提示词生成 → 分类规范 |
| 风格一致性规则 | 一、提示词生成 → 风格一致性 |
| 质量检查清单 | 一、提示词生成 → 质量检查清单 |
| 常用风格词库 | 一、提示词生成 → 常用风格词库 |
| 批量输出为 asset-data.json 格式 | 二、Pipeline 批量生产线 |
| 单条 prompt 输出 | 三、单素材生产（type 12） |
