# Skills 功能清单

面向 AI 编程助手的 Skill 集合，用于 React + TypeScript 小游戏/课件组件的全流程开发辅助。

## 📋 Skill 列表（共 17 个）

| Skill | 说明 | 触发词示例 |
|-------|------|-----------|
| **ai-sounds** | 使用 ai-sounds 库播放音效，增强交互体验。支持反馈音、错误提示音、进度音、确认音等 | 播放音效、音效反馈、play sound |
| **asset-generate** | 通过 AI Hub API 生成游戏素材（图片和 TTS 语音），支持单个生成和批量生产线模式 | 生成素材、TTS、素材生产线、批量生成 |
| **bgm-skill** | BGM 库，获取匹配的背景音乐，按游戏阶段播放不同 BGM（主流程/行动进行中/暂停休息） | BGM规划、背景音乐、播放策略 |
| **check-skill** | 根据游戏设计文档对代码进行全面自动化验证，逐条检查规则、状态机、计时器、类型安全等 | 验证项目、check、走查、自检 |
| **copilot-instructions-skill** | 分析项目源码，自动生成 `.github/copilot-instructions.md` 协作指南 | 生成 copilot-instructions、更新协作指南 |
| **debug-skill** | 为 React 游戏组件添加可拖拽调试面板，支持关卡跳转、状态监控，通过 `?dev=1` 激活 | debug模式、调试面板、跳关 |
| **group-skill** | Skill 分组编排器，按预定义分组批量调度执行多个 skill（初始化组、预发布组、素材工作组、道具工作组） | 项目初始化、发布前检查、素材工作流、道具工作流 |
| **image-generate** | 通过 AI Hub 图片生成 API，根据文字描述生成图片 | generate an image、create a picture |
| **material-skill** | 提炼游戏中的场景、道具、美术资源，输出素材规划 JSON | 素材规划、道具清单、美术清单 |
| **port-cleanup** | 清理 3000-3009 端口占用进程，解决 `aic dev` 启动失败和端口冲突问题 | 端口被占用、清理端口、EADDRINUSE |
| **prompt-skill** | 为游戏素材生成高质量文生图提示词（prompt），可直接用于素材生产线 | 写prompt、文生图提示词、prompt生成 |
| **role-skill** | 提炼游戏中的角色信息，输出角色 TTS、旁白 TTS、角色状态及关系的结构化 JSON | 角色信息提炼、角色tts、旁白JSON |
| **skill-creator** | 创建新 skill、修改和优化现有 skill、运行评估测试和基准性能分析 | 创建skill、优化skill、skill评估 |
| **themed-react-components** | 集成 ai-courseware 主题组件库，提供中古风、蒸汽朋克、猫咪风等主题 UI 组件 | 中古风、复古、蒸汽朋克、课件组件 |
| **transparent-bg-skill** | 图片去背景透明化，支持 AI 抠图和颜色替换两种模式 | 去背景、透明底图、抠图、remove background |
| **tts-skill** | 提炼 TTS 语音数据（角色台词、旁白、按钮语音），输出 TTS 规划 JSON | TTS规划、语音提炼、台词提取 |
| **upload-skill** | 将本地文件上传到 CS 获取 CDN URL，支持单文件和批量目录上传 | 上传素材、upload、CDN上传 |

## 🔗 分类总览

### 素材生产
- `asset-generate` — 素材批量生产（图片 + TTS）
- `image-generate` — 纯图片生成
- `prompt-skill` — 文生图提示词编写
- `transparent-bg-skill` — 图片去背景透明化
- `upload-skill` — 本地文件上传到 CS / CDN

### 设计提炼
- `role-skill` — 角色信息提炼
- `material-skill` — 场景/道具素材规划
- `bgm-skill` — BGM 库，按游戏阶段匹配背景音乐
- `tts-skill` — TTS 语音数据提炼

### 开发辅助
- `ai-sounds` — 音效播放
- `debug-skill` — 调试面板
- `themed-react-components` — 主题 UI 组件库
- `port-cleanup` — 端口清理

### 质量保障
- `check-skill` — 项目规则自动验证
- `copilot-instructions-skill` — 协作指南生成

### 工程化
- `group-skill` — Skill 分组编排
- `skill-creator` — Skill 创建与优化

## 🚀 工作组（Group Skill）

通过 `group-skill` 可按分组批量调度多个 skill，避免逐个手动触发。

### 初始化组（init）
> 触发词：项目初始化、初始化下、run init

| 顺序 | Skill | 职责 |
|------|-------|------|
| 1 | `copilot-instructions-skill` | 生成协作指南 |
| 2 | `debug-skill` | 添加调试面板 |
| 3 | `ai-sounds` | 添加交互音效 |
| 4 | `bgm-skill` | 添加背景音乐 |
| 5 | `check-skill` | 规则验证 |

### 预发布组（pre-release）
> 触发词：发布前检查、预发布、pre-release

| 顺序 | Skill | 职责 |
|------|-------|------|
| 1 | `copilot-instructions-skill` | 更新协作指南 |
| 2 | `check-skill` | 规则验证 |

### 素材工作组（material-work）
> 触发词：素材工作流、生成素材、跑素材、work

| 顺序 | Skill | 职责 |
|------|-------|------|
| 1 | `bgm-skill` | 提炼 BGM 规划 |
| 2 | `tts-skill` | 提炼 TTS 语音 |
| 3 | `material-skill` | 提炼素材规划 |
| 4 | `prompt-skill` | 生成文生图提示词 |
| 5 | `asset-generate` | 批量生产素材 |
| 6 | `check-skill` | 规则验证 |

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

## 📁 目录结构

每个 skill 目录包含：
- `SKILL.md` — Skill 定义文件（name、description、指令）
- `scripts/` — 可选的辅助脚本
- `references/` — 可选的参考文档
- `*.json` — 可选的输出产物/配置
