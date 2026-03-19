````skill
---
name: github-skill
description: 管理 GitHub 仓库操作：创建远程仓库、推送代码、拉取更新、分支管理、查看状态。当用户说"推送到github"、"push到github"、"创建github仓库"、"同步到远程"、"git push"、"github推送"、"上传到github"、"拉取代码"、"git pull"、"创建分支"时触发此技能。也适用于首次将本地项目推送到 GitHub、处理推送冲突、配置 SSH/HTTPS 认证等场景。
---

# GitHub Skill - GitHub 仓库管理

管理项目与 GitHub 远程仓库的同步，包括创建仓库、推送、拉取、分支管理。

## 前置条件检查

每次执行前，按顺序检查：

### 1. Git 初始化状态

```powershell
git rev-parse --is-inside-work-tree
```

如果返回 `fatal`，说明当前目录未初始化 git：

```powershell
git init
git add .
git commit -m "feat: initial commit"
```

### 2. GitHub CLI (gh) 检查

优先使用官方 GitHub CLI：

```powershell
# 检查是否安装了官方 gh CLI
gh --version
```

**如果未安装官方 gh CLI：**

推荐安装方式：
```powershell
# Windows - winget
winget install GitHub.cli

# Windows - scoop
scoop install gh

# Windows - choco
choco install gh
```

安装后认证：
```powershell
gh auth login
```

选择：
- GitHub.com
- HTTPS（推荐）或 SSH
- 浏览器登录（最简单）

### 3. Git 认证方式检查

```powershell
git config --global credential.helper
```

| 返回值 | 说明 | 推荐度 |
|--------|------|--------|
| `manager` | Git Credential Manager (GCM) | ✅ 推荐，Windows 默认 |
| `store` | 明文存储 | ⚠️ 不安全 |
| `cache` | 内存缓存，超时失效 | 一般 |
| 空 | 未配置 | 需要配置 |

**Windows 用户推荐使用 GCM（Git Credential Manager）：**
```powershell
git config --global credential.helper manager
```

## 操作流程

### 场景 A：首次推送到 GitHub（项目还没有远程仓库）

#### 方式 1：使用 gh CLI（推荐）

```powershell
# 创建远程仓库并推送（交互式）
gh repo create

# 或一步到位：创建私有仓库并推送
gh repo create <repo-name> --private --source=. --remote=origin --push
```

参数说明：
- `--private` / `--public`：仓库可见性
- `--source=.`：当前目录作为源
- `--remote=origin`：设置远程名称
- `--push`：创建后立即推送

#### 方式 2：手动操作（没有 gh CLI）

1. **在 GitHub 网页上创建仓库**
   - 打开 https://github.com/new
   - 输入仓库名称
   - 选择 Public 或 Private
   - **不要** 勾选 "Initialize this repository with a README"
   - 点击 "Create repository"

2. **添加远程并推送**
```powershell
# HTTPS 方式（推荐，GCM 自动管理凭据）
git remote add origin https://github.com/<用户名>/<仓库名>.git
git branch -M main
git push -u origin main
```

首次推送时，GCM 会弹出浏览器窗口要求登录 GitHub 授权。

#### 方式 3：SSH 方式

如果偏好 SSH：

```powershell
# 检查是否有 SSH key
Get-ChildItem ~/.ssh/id_*.pub

# 如果没有，生成一个
ssh-keygen -t ed25519 -C "your_email@example.com"

# 复制公钥
Get-Content ~/.ssh/id_ed25519.pub | clip

# 添加到 GitHub: Settings → SSH and GPG keys → New SSH key
```

```powershell
git remote add origin git@github.com:<用户名>/<仓库名>.git
git branch -M main
git push -u origin main
```

### 场景 B：日常推送

```powershell
git add .
git commit -m "feat: description of changes"
git push
```

### 场景 C：拉取远程更新

```powershell
git pull origin main
```

### 场景 D：分支管理

```powershell
# 创建并切换到新分支
git checkout -b feature/new-feature

# 推送新分支到远程
git push -u origin feature/new-feature

# 查看所有分支
git branch -a
```

## 常见问题排查

### 推送被拒绝（non-fast-forward）

```powershell
# 先拉取远程变更，再推送
git pull --rebase origin main
git push
```

### 认证失败

```powershell
# 清除缓存的凭据
git credential reject <<< "host=github.com`nprotocol=https"

# 重新推送时会弹出认证窗口
git push
```

### 中文路径/文件名问题

```powershell
# 避免中文路径被转义显示
git config --global core.quotepath false
```

### .gitignore 不生效（已跟踪的文件）

```powershell
# 从暂存区移除但保留本地文件
git rm -r --cached <file-or-dir>
git add .
git commit -m "chore: update .gitignore"
```

## 执行策略

1. 先检查前置条件（git 状态、认证状态）
2. 根据用户意图选择场景（A/B/C/D）
3. 如果缺少工具（gh CLI），引导安装或用手动方式
4. 推送前确认 `.gitignore` 已配置，避免泄露敏感文件（.env、node_modules）
5. 首次推送建议用 `--private`，后续用户可在 GitHub 上改为 public

## 红线规则

- ❌ 不暴露 `.claude/.env` 或任何含密钥的文件
- ❌ 不在命令行中明文传递 token 或密码
- ❌ 不使用 `git push --force` 除非用户明确要求并理解后果
- ⚠️ 推送前确认 `.gitignore` 已正确配置
````
