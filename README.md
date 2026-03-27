# Skills 功能清单

面向 AI 编程助手的 Skill 集合，用于 React + TypeScript 小游戏/课件组件的全流程开发辅助。

## 📋 Skill 列表（共 21 个，含 1 个 deprecated）

| Skill | 说明 | 触发词示例 |
|-------|------|-----------|
| **agent-creator** | 基于项目源码生成 `.github/agents/game-dev.md`（Copilot 自定义 Agent），通过 `@game-dev` 调用 | 生成 agent、创建 agent、agent prompt |
| **ai-sounds** | 音效资源库，仅负责游戏内音效（SE）播放。支持反馈音、错误提示音、进度音、确认音等 | 播放音效、音效反馈、play sound |
| **bgm-skill** | BGM 库，获取匹配的背景音乐，按游戏阶段播放不同 BGM（主流程/行动进行中/暂停休息） | BGM规划、背景音乐、播放策略 |
| **check-skill** | 根据游戏设计文档对代码进行全面自动化验证，逐条检查规则、状态机、计时器、类型安全等 | 验证项目、check、走查、自检 |
| **copilot-instructions-skill** | 分析项目源码，自动生成 `.github/copilot-instructions.md` 协作指南 | 生成 copilot-instructions、更新协作指南 |
| **debug-skill** | 为 React 游戏组件添加可拖拽调试面板，支持关卡跳转、状态监控、边界限制、Ctrl+\` 快捷键、重置按钮，通过 `?dev=1` 激活 | debug模式、调试面板、跳关 |
| **extract-skill** | 资源提炼（TTS + 素材），生成 JSON 数据和带左侧导航栏 + 生产线仪表盘的预览页 | 资源提炼、TTS规划、素材清单 |
| **github-skill** | 管理 GitHub 仓库操作：创建远程仓库、推送代码、拉取更新、分支管理、查看状态 | 推送到github、git push、创建分支 |
| **group-skill** | Skill 分组编排器，按预定义分组批量调度执行多个 skill | 项目初始化、发布前检查、素材工作流 |
| **level-select-homepage** | 为 React 小游戏/课件组件生成糖果色关卡选择首页，支持锁定/解锁状态、独立主题色、角色立绘、渐入动画 | 首页关卡、关卡选择、level select |
| **playwright-skill** | 基于 Playwright 的端到端自动化测试，覆盖游戏流程、拖拽交互、计时器、视觉回归等 | 自动化测试、E2E测试、跑测试 |
| **port-cleanup** | 清理 3000-3009 端口占用进程，解决 `aic dev` 启动失败和端口冲突问题 | 端口被占用、清理端口、EADDRINUSE |
| **preview-skill** | AI素材工坊技能（原素材预览），左侧导航栏 + 环形进度仪表盘 + 分类一键生产 | AI素材工坊、打开AI素材工坊、preview |
| **produce-skill** | 一站式素材生产：文生图提示词、批量素材生产线（图片+TTS）、单图快速生成 | 素材生产、批量生成、生成图片、TTS生产 |
| **prompt-skill** | ⚠️ 已合并到 produce-skill。触发时自动重定向到 produce-skill 的提示词生成章节 | 生成提示词、写prompt → produce-skill |
| **roles-skill** | 角色资源库，仅负责角色视觉资源（idle/speaking 图片、主题色），不含 TTS | 查询角色、角色库、用小安、引入角色 |
| **skill-creator** | 创建新 skill、修改和优化现有 skill、运行评估测试和基准性能分析 | 创建skill、优化skill、skill评估 |
| **sync-templates** | 将项目根目录中修改过的模板文件同步回 skill 模板目录，防止模板漂移 | 同步模板、sync templates、模板漂移 |
| **themed-react-components** | 集成 ai-courseware 主题组件库，提供中古风、蒸汽朋克、猫咪风等主题 UI 组件 | 中古风、复古、蒸汽朋克、课件组件 |
| **transparent-bg-skill** | 图片去背景透明化，支持 AI 抠图和颜色替换两种模式 | 去背景、透明底图、抠图、remove background |
| **upload-skill** | 将本地文件上传到 CS 获取 CDN URL，支持单文件和批量目录上传 | 上传素材、upload、CDN上传 |

## 🔗 分类总览

### 素材生产
- `produce-skill` — 一站式素材生产（提示词 + 图片 + TTS，已合并原 prompt-skill）
- `preview-skill` — AI素材工坊技能（环形进度 + 分类生产）
- `transparent-bg-skill` — 图片去背景透明化
- `upload-skill` — 本地文件上传到 CS / CDN

### 设计提炼
- `extract-skill` — 资源提炼（TTS + 素材清单，不含角色）
- `bgm-skill` — BGM 库，按游戏阶段匹配背景音乐
- `roles-skill` — 角色视觉资源库（图片/主题色，不含 TTS）

### 开发辅助
- `ai-sounds` — 音效资源库（仅 SE，不含 TTS/BGM）
- `debug-skill` — 调试面板（拖拽/缩放/快捷键/重置/边界限制）
- `level-select-homepage` — 关卡选择首页生成
- `themed-react-components` — 主题 UI 组件库
- `port-cleanup` — 端口清理

### 质量保障
- `check-skill` — 项目规则自动验证
- `playwright-skill` — E2E 自动化测试
- `copilot-instructions-skill` — 协作指南生成

### 工程化
- `agent-creator` — 生成 Copilot 自定义 Agent（`.github/agents/game-dev.md`）
- `github-skill` — GitHub 仓库管理（推送/拉取/分支）
- `group-skill` — Skill 分组编排
- `skill-creator` — Skill 创建与优化
- `sync-templates` — 模板同步防漂移

## 🚀 工作组（Group Skill）

通过 `group-skill` 可按分组批量调度多个 skill，避免逐个手动触发。

### 初始化组（init）
> 触发词：项目初始化、初始化下、run init

| 顺序 | Skill | 职责 |
|------|-------|------|
| 1 | `copilot-instructions-skill` | 生成协作指南 |
| 2 | `agent-creator` | 生成开发 Agent |
| 3 | `roles-skill` | 查询角色资源库 |
| 4 | `ai-sounds` | 添加交互音效 |
| 5 | `bgm-skill` | 添加背景音乐 |
| 6 | `debug-skill` | 添加调试面板 |
| 7 | `extract-skill` | 提炼资源 |
| 8 | `preview-skill` | 打开AI素材工坊 |
| 9 | `check-skill` | 规则验证 |

### 预发布组（pre-release）
> 触发词：发布前检查、预发布、pre-release

| 顺序 | Skill | 职责 |
|------|-------|------|
| 1 | `copilot-instructions-skill` | 更新协作指南 |
| 2 | `check-skill` | 规则验证 |
| 3 | `playwright-skill` | E2E 自动化测试 |

### 素材工作组（material-work）
> 触发词：素材工作流、生成素材、跑素材、work

| 顺序 | Skill | 职责 |
|------|-------|------|
| 1 | `extract-skill` | 提炼资源（TTS + 素材） |
| 2 | `preview-skill` | 打开AI素材工坊页，查看生产线仪表盘 |
| 3 | `produce-skill` | 按分类生产素材（场景/道具/TTS） |
| 4 | `check-skill` | 规则验证 |

### 道具工作组（props-work）
> 触发词：道具工作流、处理道具、props work

| 顺序 | Skill | 职责 |
|------|-------|------|
| 1 | `list-props` | 罗列道具清单，等待用户勾选 |
| 2 | `download` | 下载道具图片到 `素材库/download/` |
| 3 | `transparent-bg-skill` | 去背景透明化 |
| 4 | `upload-skill` | 上传到 CS，获取 CDN URL |
| 5 | `replace-urls` | 替换 `asset-urls.ts` 中的旧地址 |
| 6 | `check-skill` | 规则验证 |

### 快速刷新组（refresh）
> 触发词：刷新、refresh、快速刷新、刷新素材

| 顺序 | Skill | 职责 |
|------|-------|------|
| 1 | `extract-skill` | 提炼资源 |
| 2 | `preview-skill` | 刷新AI素材工坊 |
| 3 | `check-skill` | 规则验证 |

## 📁 目录结构

每个 skill 目录包含：
- `SKILL.md` — Skill 定义文件（name、description、指令）
- `templates/` — 可选的模板文件（通过 sync-templates 同步）
- `scripts/` — 可选的辅助脚本
- `references/` — 可选的参考文档
- `*.json` — 可选的输出产物/配置
