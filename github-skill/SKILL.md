````skill
---
name: github-skill
description: 管理 GitHub 仓库操作：创建远程仓库、推送代码、拉取更新、分支管理、查看状态。当用户说"推送到github"、"push到github"、"创建github仓库"、"同步到远程"、"git push"、"github推送"、"上传到github"、"拉取代码"、"git pull"、"创建分支"、"构建后自动推送"、"build后push"时触发此技能。也适用于首次将本地项目推送到 GitHub、处理推送冲突、配置 SSH/HTTPS 认证、配置构建后自动推送等场景。
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

## 场景 E：构建后自动推送（Vite 项目）

当用户希望每次 `aic build` / `vite build` 后自动推送代码到多个 GitHub 仓库时，在 `vite.config.ts` 中注入 `autoPushPlugin` 插件。

### 前置信息收集

执行前先确认：
- **SSH 别名**：运行 `ssh -T git@github-personal`，确认认证账号（如 `cmy924`）
- **远程仓库列表**：需要推送哪些目录 → 对应哪个 GitHub 仓库
- **SSH 配置**：`~/.ssh/config` 中的 Host 别名（如 `github-personal`）

### vite.config.ts 模板

在 `vite.config.ts` 顶部添加插件定义，并注入到 `plugins` 数组：

```typescript
import { execSync } from 'child_process'
import path from 'path'

/**
 * 构建后自动提交并推送到 GitHub
 * repos 数组：{ name: 显示名, dir: 本地绝对路径 }
 * 使用 SSH 别名（~/.ssh/config 中的 Host 条目）确保多账号正确认证
 */
function autoPushPlugin() {
  return {
    name: 'auto-push',
    closeBundle() {
      const repos = [
        { name: '<项目名>', dir: __dirname },
        { name: '<skills或其他>', dir: path.join(__dirname, '.claude', 'skills') },
        // 按需增减
      ]

      for (const { name, dir } of repos) {
        try {
          const run = (cmd: string) => execSync(cmd, { cwd: dir, stdio: 'pipe' }).toString().trim()

          // 有未提交变更则自动提交
          const status = run('git status --porcelain')
          if (status) {
            run('git add -A')
            run(`git commit -m "chore: auto-commit after build [${new Date().toISOString().slice(0, 10)}]"`)
          }

          // 有未推送提交则推送
          const ahead = run('git rev-list @{u}..HEAD --count 2>/dev/null || echo 1')
          if (ahead !== '0') {
            run('git push')
            console.log(`\x1b[32m✓ [auto-push] ${name} 推送成功\x1b[0m`)
          } else {
            console.log(`\x1b[90m· [auto-push] ${name} 无需推送\x1b[0m`)
          }
        } catch (e: any) {
          console.warn(`\x1b[33m⚠ [auto-push] ${name} 推送失败：${e.message}\x1b[0m`)
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    autoPushPlugin(), // ← 注入
  ],
  // ...其余配置
})
```

### 多账号 SSH 配置参考

如果本机有多个 GitHub 账号，`~/.ssh/config` 需要配置独立的 Host 别名：

```
Host github-personal
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes

Host github-work
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_rsa
  IdentitiesOnly yes
```

远程 URL 使用别名而非 `github.com`：
```powershell
git remote set-url origin git@github-personal:cmy924/repo-name.git
```

### 注意事项

- 插件仅在 `vite build`（生产构建）时触发，`vite dev` 不触发
- `closeBundle` 钩子在 bundle 写入磁盘后执行，失败不影响构建结果
- 自动 commit 的消息格式：`chore: auto-commit after build [YYYY-MM-DD]`
- 推送失败只打印警告，不抛出错误（`console.warn`）

---



- ❌ 不暴露 `.claude/.env` 或任何含密钥的文件
- ❌ 不在命令行中明文传递 token 或密码
- ❌ 不使用 `git push --force` 除非用户明确要求并理解后果
- ⚠️ 推送前确认 `.gitignore` 已正确配置
````
