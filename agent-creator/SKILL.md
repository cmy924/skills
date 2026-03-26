````skill
---
name: agent-creator
description: 生成 .github/agents/game-dev.md（GitHub Copilot 自定义 Agent @game-dev）。触发词："生成 agent"、"创建agent"、"generate agent"、"导出开发者人设"、"agent prompt"。
---

# Agent Creator

读取 `.github/copilot-instructions.md`、`package.json`、`index.tsx`，生成 `.github/agents/game-dev.md`（50-80 行）。

## 输出结构

```markdown
---
name: "game-dev"
description: "{一句话描述}"
---

# {角色标题}

## 技术栈
{一行列举}

## 组件接口
{ComponentProps 代码块}

## 核心模式
{状态机/关卡/计分/音频/素材，每条一行}

## 红线
{不删/不换/不优化/不加依赖，详细规则见 .github/game-design.md}
```

> 版本从 `package.json` 提取，不重复 `game-design.md` 中的详细规则。

````