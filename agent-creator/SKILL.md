---
name: agent-creator
description: 生成 .github/agents/game-dev.md（GitHub Copilot 自定义 Agent @game-dev）。触发词："生成 agent"、"创建agent"、"generate agent"、"导出开发者人设"、"agent prompt"。
---

# Agent Creator — 游戏开发 Agent 生成器

基于当前项目的技术栈和游戏设计经验，生成精简的 `.github/agents/game-dev.md`，在 VS Code 中通过 `@game-dev` 调用。

## 执行前提

**必须**读取以下文件：

| 优先级 | 文件 | 用途 |
|-------|------|------|
| 必须 | `.github/copilot-instructions.md` | 游戏摘要和工作协议 |
| 必须 | `.github/game-design.md` | 完整游戏规则 |
| 必须 | `index.tsx` | 主组件实现 |
| 必须 | `package.json` | 依赖和技术栈版本 |
| 推荐 | `vite.config.ts` | 构建配置 |

## 生成原则

1. **精简优先**：控制在 50-80 行，避免冗余展开
2. **模式压缩**：用"一行一条"格式传达核心模式，不写完整代码示例
3. **详细规则外置**：指向 `.github/game-design.md`，不在 agent 中重复
4. **从代码提取**：技术栈版本从 `package.json` 取，不硬编码

## 输出结构

生成 `.github/agents/game-dev.md`，包含 YAML frontmatter（name + description）：

```markdown
---
name: "game-dev"
description: "{一句话描述}"
---

# {角色标题}

{一句话定位}

## 技术栈
{一行列举核心技术}

## 组件接口
{ComponentProps 接口代码块}

## 核心模式
{状态机/关卡/计分/音频/布局/素材，每条一行}

## 构建约束
{5-6 条关键约束}

## 红线
{不删/不换/不优化/不加依赖 + 规则对照提示}
```

## 注意事项

- 不要在 agent 中重复 `game-design.md` 的详细规则
- 组件接口代码块保留（创建新组件的关键参考）
- 红线规则原样保留
- 中文说明，英文代码
