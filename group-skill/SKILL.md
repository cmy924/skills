---
name: group-skill
description: Skill 分组编排器。当用户说"项目初始化"、"初始化下"、"执行初始化"、"run init"等触发词时，按顺序执行初始化组中的所有 skill。当用户说"发布前检查"、"预发布"、"pre-release"时，执行预发布组。支持按分组批量调度 skill，避免逐个手动触发。
---

# Group Skill — Skill 分组编排器

按预定义的分组，批量调度执行多个 skill。

## 分组定义

### 初始化组（init）

> **触发词：** 项目初始化、初始化下、初始化项目、执行初始化、run init、init project

按以下顺序依次执行：

| 执行顺序 | Skill 名称 | 职责 | 说明 |
|---------|-----------|------|------|
| 1 | `copilot-instructions-skill` | 生成 `.github/copilot-instructions.md` | 分析源码，提取游戏规则/架构/实体等，生成协作指南 |
| 2 | `debug-skill` | 添加 Debug 调试面板 | 为组件添加开发调试面板（URL 参数 `?dev=1` 或路径含 `/dev/` 激活） |
| 3 | `ai-sounds` | 添加交互音效 | 使用 ai-sounds 库为游戏动作添加音效反馈（正确/错误点击、通关、按钮等） |
| 4 | `check-skill` | 规则验证 | 逐条验证游戏规则、状态机、计时器、音频系统等，确保初始化后项目完整正确 |

---

## 执行规范

### 触发匹配

当用户的指令匹配到**某个分组的触发词**时，自动按该分组的定义顺序执行所有 skill。

### 执行流程

1. **识别分组**：根据用户指令匹配对应的分组（如"项目初始化" → 初始化组）
2. **依次执行**：按表格中的「执行顺序」，逐个读取对应 skill 的 SKILL.md 并执行
3. **上下文传递**：前一个 skill 的产出可作为后续 skill 的输入（如 copilot-instructions 生成的游戏规则信息可辅助 debug-skill 理解关卡结构）
4. **异常处理**：某个 skill 执行失败时，报告错误并继续执行下一个，最终汇总结果

### 执行步骤（初始化组详细）

**Step 1 — 执行 copilot-instructions-skill：**

1. 读取 `.claude/skills/copilot-instructions-skill/SKILL.md` 获取完整指令
2. 按指令要求读取项目所有核心文件（`index.tsx`、`package.json`、`vite.config.ts`、`tsconfig.json`、`README.md` 等）
3. 按 5 步分析流程提取信息
4. 生成 `.github/copilot-instructions.md`
5. 确认文件已写入

**Step 2 — 执行 debug-skill：**

1. 读取 `.claude/skills/debug-skill/SKILL.md` 获取完整指令
2. 分析 `index.tsx` 中的游戏状态机（GameState）和关卡结构
3. 按 debug-skill 的规范添加调试面板代码
4. 确认修改已完成

**Step 3 — 执行 ai-sounds：**

1. 读取 `.claude/skills/ai-sounds/SKILL.md` 获取完整指令
2. 分析 `index.tsx` 中的交互动作（点击、通关、按钮等）
3. 为每个关键动作选择合适的音效 id 并添加 `playSE()` 调用
4. 确认修改已完成且构建通过

**Step 4 — 执行 check-skill：**

1. 读取 `.claude/skills/check-skill/SKILL.md` 获取完整指令
2. 基于最新的 copilot-instructions.md 逐条验证游戏规则、状态机流转、计时器行为、音频系统、类型安全等
3. 发现问题立即修复，输出验证报告
4. 确认所有检查项通过

### 执行完成后

汇总报告所有 skill 的执行结果：

```
✅ 初始化组执行完成：
  1. copilot-instructions-skill — ✅ 已生成 .github/copilot-instructions.md
  2. debug-skill — ✅ 已添加调试面板
  3. ai-sounds — ✅ 已添加交互音效
  4. check-skill — ✅ 规则验证通过
```

如果有失败项：

```
⚠️ 初始化组执行完成（有异常）：
  1. copilot-instructions-skill — ✅ 已生成
  2. debug-skill — ❌ 失败：[具体原因]
  3. ai-sounds — ✅ 已添加交互音效
  4. check-skill — ⚠️ 发现 N 项问题并已修复
```

---

## 扩展分组

### 预发布组（pre-release）

> **触发词：** 发布前检查、预发布、pre-release、发布检查、上线前验证、跑一遍检查

按以下顺序依次执行：

| 执行顺序 | Skill 名称 | 职责 | 说明 |
|---------|-----------|------|------|
| 1 | `copilot-instructions-skill` | 更新 `.github/copilot-instructions.md` | 确保设计文档与代码同步 |
| 2 | `check-skill` | 规则验证 | 逐条验证游戏规则、状态机、计时器、音频系统等 |

**执行步骤：**

**Step 1 — 执行 copilot-instructions-skill：**

1. 读取 `.claude/skills/copilot-instructions-skill/SKILL.md` 获取完整指令
2. 分析项目源码，更新 `.github/copilot-instructions.md`
3. 确认文件已写入

**Step 2 — 执行 check-skill：**

1. 读取 `.claude/skills/check-skill/SKILL.md` 获取完整指令
2. 基于最新的 copilot-instructions.md 进行逐项验证
3. 发现问题立即修复，输出验证报告

---

如需添加新的分组，按以下格式追加：

```markdown
### {分组名}（{英文标识}）

> **触发词：** {触发词1}、{触发词2}、...

| 执行顺序 | Skill 名称 | 职责 | 说明 |
|---------|-----------|------|------|
| 1 | `{skill-name}` | {职责} | {说明} |
| 2 | `{skill-name}` | {职责} | {说明} |
```

如需在初始化组中追加新 skill，在表格末尾添加新行，按顺序递增即可。
