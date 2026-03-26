```skill
---
name: transparent-bg-skill
description: 图片去背景透明化工具。将图片底图变成透明图，支持 AI 抠图和颜色替换两种模式。适用于游戏素材去白底、商品图去背景、图标透明化等场景。触发词包括"去背景"、"透明底图"、"透明背景"、"去白底"、"抠图"、"remove background"、"transparent"、"去底色"、"PNG透明"、"素材透明化"。当用户提到任何与图片背景去除、透明化相关的需求时，务必使用此 skill。
---

# 透明底图 Skill — 图片去背景透明化

将图片底色去除，输出透明背景的 PNG 图片。

## 能力概览

| 模式 | 说明 | 适用场景 | 依赖 |
|------|------|---------|------|
| **AI 模式**（默认） | 使用 @imgly/background-removal-node AI 抠图 | 复杂背景、渐变、阴影 | `npm i -g @imgly/background-removal-node` |
| **颜色模式** | 基于背景色 flood-fill 替换 | 纯色背景（白底、单色底） | `npm i -g sharp` |

## 使用流程

### Step 1：确认输入

向用户确认：
1. **待处理图片路径**（支持单张或批量 `*.png`）
2. **去背景模式**：默认推荐 AI 模式，纯色背景可用颜色模式
3. **输出路径**：默认同目录生成 `_transparent.png` 后缀文件

### Step 2：执行脚本

脚本位置：`{skill_dir}/scripts/remove-bg.mjs`

#### AI 模式（推荐，效果最好）

```bash
node "{skill_dir}/scripts/remove-bg.mjs" "输入图片.png"
```

#### 颜色模式（纯色背景，更快）

```bash
node "{skill_dir}/scripts/remove-bg.mjs" "输入图片.png" --mode color
```

#### 完整参数

```bash
node "{skill_dir}/scripts/remove-bg.mjs" <input...> [options]

位置参数:
  input                 输入图片路径（支持多个和通配符）

可选参数:
  -o, --output PATH     输出路径（单文件=文件名，多文件=目录）
  --mode {ai,color}     去背景模式（默认 ai）
  --tolerance N         颜色模式容差 0-255（默认 30）
  --bg-color #RRGGBB   颜色模式指定背景色（默认自动检测）
  --feather N           边缘羽化半径像素（默认 0，推荐 1-3）
  --preview             处理后打开图片预览
```

### Step 3：验证结果

处理完成后：
1. 告知用户输出文件路径和大小
2. 如需微调，可调整 `--tolerance`（颜色模式）或 `--feather`（边缘柔化）

## 常用场景示例

### 场景 1：游戏素材去白底

```bash
# 素材库中的图片去白底
node remove-bg.mjs "素材库/download/红豆.png" -o "素材库/download/红豆_transparent.png"
```

### 场景 2：批量处理目录下所有图片

```bash
# 处理所有 PNG 图片，输出到 transparent/ 目录
node remove-bg.mjs "素材库/download/*.png" -o "素材库/download/transparent/"
```

### 场景 3：纯白底图，用颜色模式更快

```bash
# 颜色模式，自动检测背景色
node remove-bg.mjs icon.png --mode color --tolerance 25

# 指定背景色为纯白
node remove-bg.mjs icon.png --mode color --bg-color "#FFFFFF" --tolerance 20
```

### 场景 4：边缘有锯齿，加羽化

```bash
node remove-bg.mjs sprite.png --feather 2
```

## 模式选择指南

```
用户需要去背景 → 背景复杂吗？
  ├─ 是（渐变/阴影/纹理）→ AI 模式（默认）
  └─ 否（纯色/白底）→ 颜色模式 --mode color
       └─ 边缘有残留？→ 调大 --tolerance
       └─ 去多了前景？→ 调小 --tolerance
```

## 注意事项

1. **AI 模式首次使用**会下载模型（约 50MB 缓存到用户目录），后续使用直接调用
2. **输出格式**固定为 PNG（支持透明通道），即使输入是 JPG
3. **颜色模式**使用 flood-fill 算法从边缘开始去除，不会误删图片内部相同颜色的区域
4. **依赖全局安装**（不污染项目）：`npm i -g @imgly/background-removal-node` 和 `npm i -g sharp`
5. 无需 Python 环境，纯 Node.js 实现

## 故障排除

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| AI 模式不可用 | 未全局安装包 | `npm i -g @imgly/background-removal-node` 后重试，或改用 `--mode color` |
| 颜色模式去除不干净 | 容差太低 | 增大 `--tolerance`（试 40-60） |
| 颜色模式前景被误删 | 容差太高 | 降低 `--tolerance`（试 15-20） |
| 边缘有白色锯齿 | 抗锯齿残留 | 添加 `--feather 1` 或 `--feather 2` |
| 输出文件太大 | PNG 无损压缩 | 后续可用其他工具转 WebP |
```
