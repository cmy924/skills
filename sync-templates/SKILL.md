---
name: sync-templates
description: 将项目根目录中修改过的模板文件同步回 .claude/skills 模板目录，防止模板漂移。当项目文件与模板不一致时，由用户选择同步方向（项目→模板 或 模板→项目）。触发词包括"同步模板"、"sync templates"、"模板同步"、"更新模板"、"模板漂移"、"sync back"。
---

# Sync Templates Skill — 模板同步器

检测项目根目录文件与 `.claude/skills/**/templates/` 下模板源文件的差异，按用户选择的方向同步，防止模板漂移。

## 问题场景

开发过程中经常出现：
1. 在项目文件（如 `DevPanel.tsx`）上做了改进，忘记同步回模板
2. 模板被其他项目更新了，但当前项目还是旧版本
3. 不确定哪边是最新的

## 模板映射表

自动扫描 `.claude/skills/**/templates/` 目录，建立映射关系：

| 模板源（唯一真实源） | 项目文件 |
|---------------------|---------|
| `.claude/skills/debug-skill/templates/DevPanel.tsx` | `DevPanel.tsx` |
| `.claude/skills/debug-skill/templates/DevPanel.module.css` | `DevPanel.module.css` |
| `.claude/skills/level-select-homepage/templates/LevelSelectPage.tsx` | `LevelSelectPage.tsx` |
| `.claude/skills/level-select-homepage/templates/LevelSelectPage.module.css` | `LevelSelectPage.module.css` |

> 映射规则：模板文件名 → 项目根目录同名文件。如果项目根目录不存在该文件，跳过。

## 执行流程

### 第一步：扫描差异

1. 用 `file_search` 扫描 `.claude/skills/**/templates/**` 获取所有模板文件
2. 对每个模板文件，检查项目根目录是否存在同名文件
3. 如果存在，用 `read_file` 读取两边内容并比较
4. 输出差异报告

### 第二步：输出差异报告

```
📋 模板同步检查报告

✅ 一致  DevPanel.module.css
⚠️ 不同  DevPanel.tsx（项目文件较新：项目有 3 处改动）
⏭️ 跳过  LevelSelectPage.tsx（项目根目录不存在）

需要同步的文件：1 个
```

### 第三步：选择同步方向

对每个有差异的文件，询问用户：

```
DevPanel.tsx 存在差异，选择同步方向：
  1. 项目 → 模板（将项目改动同步回模板，推荐：项目文件较新时）
  2. 模板 → 项目（用模板覆盖项目文件，适用：模板被其他项目更新时）
  3. 跳过
```

如果用户说"全部同步到模板"或"sync all to templates"，则所有差异文件都按 项目→模板 方向同步，无需逐个确认。

### 第四步：执行同步

根据用户选择：

- **项目 → 模板**：读取项目文件内容，用 `create_file` 覆盖写入模板文件
- **模板 → 项目**：读取模板文件内容，用 `create_file` 覆盖写入项目文件

### 第五步：输出结果

```
✅ 同步完成：
  DevPanel.tsx — 项目 → 模板 ✅
```

## SKILL.md 中的代码参考也需更新

⚠️ 注意：如果同步方向是 **项目 → 模板**，还需要检查对应 skill 的 `SKILL.md` 中是否有内联代码参考（如 `<details>` 折叠块中的源码）。如果有，提醒用户这些内联代码块可能也需要更新，但不自动修改（因为 SKILL.md 中的代码仅供参考，模板文件才是唯一真实源）。

## 注意事项

1. **模板文件是唯一真实源** — 默认推荐方向是 项目→模板（因为开发者通常在项目中改代码）
2. **不自动覆盖** — 必须先展示差异，让用户确认方向
3. **preview-template.html 特殊处理** — 这个文件是由脚本生成的，不参与同步
4. **只同步 templates/ 下的文件** — scripts/、data/ 等其他子目录不在同步范围内
