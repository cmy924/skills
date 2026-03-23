```skill
---
name: level-select-homepage
description: 为 React 小游戏/课件组件生成糖果色关卡选择首页。展示多关卡卡片（场景预览图+角色头像+关卡名称），支持锁定/解锁状态切换、每张卡片独立主题色、角色立绘定位、渐入动画。适配 vmin 布局，CSS Modules 输出。触发词包括"首页关卡"、"关卡选择"、"level select"、"关卡展示"、"start page"、"开始页面"、"生成首页"、"关卡卡片"、"game homepage"、"关卡入口"。当用户需要创建游戏首页、关卡选择界面、关卡入口展示时使用此 skill，即使没有明确说"关卡选择"但描述了类似的多关卡入口 UI 也应触发。
---

# Level Select Homepage Skill — 糖果色关卡选择首页

为 React 游戏/课件组件生成**糖果色多关卡选择首页**，风格参考：圆角卡片 + 柔和渐变背景 + 场景预览 + 角色立绘 + 锁定遮罩。面向 5-7 岁儿童的温暖可爱视觉风格。

## 视觉风格规范

### 整体氛围
- **色调**：柔和糖果色（粉、薄荷绿、鹅黄），避免高饱和刺眼色
- **圆角**：统一使用 `2~3vmin` 圆角，营造柔软手感
- **阴影**：多层柔和阴影（`box-shadow` 叠加），增加卡片悬浮感
- **背景**：半透明毛玻璃效果（`backdrop-filter: blur`）
- **字体**：粗体 + 文字阴影，保证可读性

### 卡片设计
每张关卡卡片包含以下层次（从上到下）：

```
┌──────────────────────────┐
│  [场景预览图]             │ ← 圆角裁切，saturate 微调
│                          │
│     🔒 (锁定遮罩)        │ ← 半透明深色圆形，居中覆盖
│                          │
├──────────────────────────┤
│  [角色立绘]  关卡名称     │ ← 水平排列，角色带 drop-shadow
└──────────────────────────┘
```

### 三张卡片配色方案

| 卡片 | 背景渐变 | 边框色 | 语义 |
|------|---------|--------|------|
| A（粉色系） | `rgba(255,231,236,0.82)` → `rgba(255,208,220,0.7)` | `rgba(255,186,205,0.8)` | 温暖、食物、家 |
| B（薄荷系） | `rgba(224,252,242,0.82)` → `rgba(193,244,230,0.72)` | `rgba(132,227,204,0.8)` | 清新、分类、整理 |
| C（鹅黄系） | `rgba(255,247,213,0.86)` → `rgba(255,226,170,0.74)` | `rgba(255,210,118,0.82)` | 学习、专注、书房 |

> 如需更多卡片，可在此色盘基础上扩展：薰衣草紫 `rgba(230,220,255,0.82)` / 天蓝 `rgba(220,240,255,0.82)`

### 锁定状态
- 场景图 + 角色立绘 + 文字降低透明度（`opacity: 0.72`）
- 场景图额外 `filter: saturate(0.82) brightness(0.9)`
- 覆盖圆形锁图标：半透明深色底 + 🔒 emoji

### 交互
- hover 时卡片微上浮 + 放大：`transform: translateY(-0.5vmin) scale(1.04)`
- 所有过渡 `transition: 0.2s`

## 架构设计

```
.claude/skills/level-select-homepage/
├── SKILL.md                              ← 技能说明（你正在看的）
└── templates/
    ├── LevelSelectPage.tsx               ← 关卡选择页组件模板
    └── LevelSelectPage.module.css        ← 关卡选择页样式模板
```

**使用方式**：读取 templates/ 下的文件，根据项目实际关卡配置修改后写入项目。

## 执行流程

### 步骤 1：收集项目信息

在生成前，从项目中获取以下信息（通过读取 `index.tsx`、`asset-urls.ts`、roles-skill 等）：

1. **关卡数量与名称**：如 `关卡1·吃饭任务`、`关卡2·机器人分类`、`关卡3·找错字`
2. **场景预览图 URL**：每关的背景图（从 `asset-urls.ts` 的 `关卡N背景` 获取）
3. **角色立绘 URL**：每关引导角色的 idle 态图片（从 roles-skill 或 CHARACTERS 配置获取）
4. **锁定状态逻辑**：默认仅第一关解锁，其余锁定
5. **"开始游戏"按钮的跳转目标**：如 `goTo('level1_step1')`

### 步骤 2：读取模板

```
read_file: .claude/skills/level-select-homepage/templates/LevelSelectPage.tsx
read_file: .claude/skills/level-select-homepage/templates/LevelSelectPage.module.css
```

### 步骤 3：适配项目

根据收集的信息，对模板进行以下替换/修改：

- 替换关卡配置数组 `LEVEL_CARDS` 中的名称、图片 URL、角色 URL
- 替换卡片配色（如果项目需要不同主题色）
- 替换按钮点击事件
- 根据关卡数量增减卡片（模板默认 3 张）

### 步骤 4：写入项目

两种集成方式（根据项目结构选择）：

**方式 A：内联到 index.tsx（推荐）**
- 将模板中的 JSX 和样式直接合并到 `index.tsx` 的 `renderStart()` 函数和 `index.module.css`
- 适合单文件组件架构

**方式 B：独立组件**
- 将 `LevelSelectPage.tsx` 和 `LevelSelectPage.module.css` 作为独立文件放入项目
- 在 `index.tsx` 中 import 使用
- 适合多文件组件架构

## ⚠️ 注意事项

- 所有尺寸使用 **vmin** 单位，不使用 px/rem/em
- 图片使用 `object-fit: cover`（场景图）或 `object-fit: contain`（角色立绘）
- 角色立绘需要 `drop-shadow` 增加存在感
- 锁定卡片的 `pointerEvents` 不需要设为 none（锁定只是视觉状态，不阻止点击）
- 渐入动画使用 `@keyframes fadeInUp` + `animation-delay` 错开每张卡片
- 模板中的 emoji 锁图标（🔒）可替换为 SVG/图片

## 扩展卡片数量

增加第 4、5 张卡片时：

1. 在 `LEVEL_CARDS` 数组追加配置
2. 新增对应的 `.characterCardD`、`.characterCardE` 样式类
3. 推荐配色：
   - D（薰衣草紫）：`rgba(230,220,255,0.82)` → `rgba(210,195,245,0.72)`，边框 `rgba(185,160,230,0.8)`
   - E（天蓝）：`rgba(220,240,255,0.82)` → `rgba(190,225,250,0.72)`，边框 `rgba(150,205,240,0.8)`

## 自定义标记

如果项目已有自定义首页实现，在 `index.tsx` 中添加注释标记：

```tsx
// @custom-start-page
```

检测到此标记时，**跳过首页生成**，仅检查样式是否齐备。
```
