---
name: port-cleanup
description: 清理 3000-3009 端口占用的进程（node、esbuild 等），解决 aic dev 启动失败的端口冲突问题。同时处理 IPv4 和 IPv6 绑定差异，确保服务可被浏览器正常访问。触发词包括"端口被占用"、"3000端口"、"清理端口"、"port cleanup"、"aic dev 启动失败"、"页面打不开"、"未连接"、"EADDRINUSE"。
---

# Port Cleanup - 端口清理与 aic dev 启动修复

清理 300x 端口占用，解决 `aic dev` 启动失败和页面无法访问的问题。

## 背景知识

### Windows 上的 IPv4 / IPv6 问题

Windows 系统中 `localhost` 的解析行为：

| 场景 | 解析结果 | 说明 |
|------|---------|------|
| hosts 文件有 `127.0.0.1 localhost` | IPv4 `127.0.0.1` | 优先 IPv4 |
| hosts 文件无 localhost 条目（默认） | IPv6 `::1` | Windows DNS 默认行为 |
| 使用 `0.0.0.0` 绑定 | 所有 IPv4 接口 | 最通用 |
| 使用 `127.0.0.1` 绑定 | 仅 IPv4 回环 | 推荐用于本地开发 |

**核心问题：** `aic dev` 默认 `--host localhost`，在 Windows 上绑定到 `[::1]:3000`（IPv6）。浏览器中的 aic-view 页面用 JS 请求 `http://localhost:3000` 时可能走 IPv4 `127.0.0.1`，导致连接被拒绝。

### 常见残留进程

| 进程 | 来源 | 说明 |
|------|------|------|
| `node` | `aic dev` 主进程 | HTTP 服务器 + 文件监控 |
| `esbuild` | Vite 构建的子进程 | 常驻内存做增量构建，`aic dev` 异常退出后不会自动清理 |

`netstat` 可能看不到 esbuild 占用端口，因为它是通过 IPC/pipe 与 node 通信，但 `aic dev` 的 `isPortAvailable()` 检测时会因为 esbuild 残留的 server.listen 竞争失败。

## 诊断流程

按以下顺序逐步排查：

### Step 1: 检查端口监听状态

```powershell
# 查看 3000-3009 端口的所有监听进程
netstat -ano | Select-String "LISTENING" | Select-String "300[0-9]"
```

**注意区分：**
- `TCP    0.0.0.0:3000` → IPv4 绑定 ✅ 浏览器可访问
- `TCP    [::1]:3000` → IPv6 绑定 ⚠️ 浏览器可能无法访问
- 无输出 → 端口空闲，但仍可能有 esbuild 残留

### Step 2: 检查 node/esbuild 残留进程

```powershell
# 列出所有 node 和 esbuild 进程
Get-Process | Where-Object { $_.ProcessName -match 'node|esbuild' } | Format-Table Id, ProcessName, StartTime -AutoSize
```

### Step 3: 用 Node.js 直接测试端口绑定

这与 `aic dev` 内部的检测方式完全相同：

```powershell
# 测试端口是否可绑定（和 aic 的 isPortAvailable 逻辑一致）
node -e "var s=require('net').createServer();s.listen(3000,function(){console.log('PORT 3000 FREE');s.close()});s.on('error',function(e){console.log('PORT 3000 BUSY '+e.code)})"
```

### Step 4: 分别测试 IPv4 和 IPv6 连通性

```powershell
# 测试 IPv4
node -e "require('http').get('http://127.0.0.1:3000/',r=>{console.log('IPv4 OK:',r.statusCode);process.exit()}).on('error',e=>console.log('IPv4 FAIL:',e.code))"

# 测试 IPv6
node -e "require('http').get('http://[::1]:3000/',r=>{console.log('IPv6 OK:',r.statusCode);process.exit()}).on('error',e=>console.log('IPv6 FAIL:',e.code))"
```

## 清理操作

### 方案 A: 精准清理（推荐）

只杀占用 300x 端口的特定进程：

```powershell
# 找到占用 3000 端口的 PID 并杀掉
$lines = netstat -ano | Select-String "LISTENING" | Select-String ":300[0-9]\s"
foreach ($line in $lines) {
    $pid = ($line -split '\s+')[-1]
    $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
    if ($proc) {
        Write-Host "Killing $($proc.ProcessName) PID $pid on port match"
        Stop-Process -Id $pid -Force
    }
}
```

### 方案 B: 全面清理

杀掉所有 node 和 esbuild 进程（适用于反复失败时）：

```powershell
Get-Process | Where-Object { $_.ProcessName -match 'node|esbuild' } | ForEach-Object {
    Write-Host "Killing $($_.ProcessName) PID $($_.Id)"
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 2
Write-Host "All node/esbuild processes cleaned"
```

### 方案 C: 一键清理 + 启动

```powershell
# 清理 → 等待 → 用 IPv4 启动
Get-Process | Where-Object { $_.ProcessName -match 'node|esbuild' } | ForEach-Object {
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 3
aic dev --host 127.0.0.1
```

## 启动 aic dev 的正确方式

### 推荐命令（IPv4 绑定）

```powershell
aic dev --host 127.0.0.1
```

这样服务绑定 IPv4 `127.0.0.1:3000`，浏览器一定能访问。

### 对应浏览器地址

```
https://aic-view.sdp.101.com/dev/?id=<组件ID>&host=localhost&port=3000
```

> URL 参数中的 `host=localhost` 不需要改——这是告诉 aic-view 页面 JS 去连 `localhost:3000`，浏览器会解析为 IPv4 来连接已绑定 127.0.0.1 的服务。

### 端口被占时换端口

```powershell
aic dev --host 127.0.0.1 --port 3001
```

浏览器地址也要同步改 `port=3001`。

## 常见问题速查

| 现象 | 原因 | 解决 |
|------|------|------|
| `端口 3000 已被占用` | 残留 node/esbuild 进程 | 方案 B 全面清理后重启 |
| 服务启动成功但页面显示"未连接" | 绑定了 IPv6 `[::1]` | 加 `--host 127.0.0.1` |
| netstat 看不到占用但 aic 报占用 | esbuild 残留 | 方案 B 杀 esbuild 进程 |
| 页面空白无内容 | dist 目录构建产物有问题 | 重新 `aic dev`（会自动 rebuild） |
| aic dev 在 Copilot 终端中秒关 | Copilot 的前台终端超时退出 | 在 VS Code 终端中手动运行 |

## 注意事项

- **不要通过 Copilot 工具运行 `aic dev`**——前台终端会超时关闭，后台终端无法持久保持。应在 VS Code 终端中手动执行。
- **清理后等待 2-3 秒**再启动，给 OS 时间释放端口。
- **esbuild 是隐藏杀手**——它是 Vite 的子进程，`aic dev` 异常退出时不会被清理，`netstat` 也不一定看得到它，但它会阻止新的 server.listen。
