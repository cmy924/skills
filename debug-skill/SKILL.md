---
name: debug-skill
description: 为 React 小游戏/课件组件添加通用开发调试面板（debug 模式）。通过 URL 参数 dev=1 激活，内置拖拽移动、缩放、BGM 控制、音效测试、AI素材工坊（本地预览/上传/打开），游戏专属区块（关卡/步骤/状态）通过 sections 配置传入。所有标签使用中文。触发词：debug模式、调试面板、dev模式、开发模式、debug panel、调试工具、跳关、跳步骤。
---

# Debug Skill — 通用开发调试面板

为任意 React 游戏/课件组件添加悬浮调试面板。面板分两层：**通用内置**（拖拽/缩放/BGM/音效/素材工坊）和**游戏专属**（通过 `sections` prop 配置传入）。

## 架构设计

```
.claude/skills/debug-skill/
├── SKILL.md                          ← 技能说明（你正在看的）
└── templates/
    ├── DevPanel.tsx                   ← 通用组件模板（复制到项目根目录）
    └── DevPanel.module.css            ← 通用样式模板（复制到项目根目录）

项目根目录/
├── DevPanel.tsx                       ← 从 templates/ 复制，不改
├── DevPanel.module.css                ← 从 templates/ 复制，不改
└── index.tsx                          ← 游戏主组件，传入 sections 配置游戏专属区块
```

**核心原则**：
- `templates/` 下的两个文件是**唯一真实源**，SKILL.md 中的代码块仅供参考
- 执行 skill 时用 `read_file` 读取模板 → `create_file` 写入项目根目录
- 跨项目零修改复用，所有游戏差异通过 `sections` prop 注入

## ⚠️ 防覆盖规则

**执行前必须检查** `index.tsx` 中是否存在 `@custom-dev-panel` 标记注释。

- 如果找到 `@custom-dev-panel` → **跳过面板生成**，只检查 DevPanel.tsx 和 DevPanel.module.css 是否存在
- 如果未找到 → 按下方模板正常生成

## 激活方式

以下任一条件满足即激活，生产环境不显示：

1. URL 参数 `?dev=1`
2. URL 路径匹配 `**/dev/**`
3. URL 路径匹配 `**/preview/**`

## 第一步：复制 DevPanel.tsx

从模板目录读取并复制到项目根目录，**无需任何修改**：

```
源文件：.claude/skills/debug-skill/templates/DevPanel.tsx
目标：项目根目录/DevPanel.tsx
```

使用 `read_file` 读取模板文件完整内容，然后用 `create_file` 写入项目根目录。

> 如果项目根目录已存在 DevPanel.tsx，**跳过此步**，不要覆盖。

<details>
<summary>DevPanel.tsx 源码参考（点击展开，实际执行时从模板文件读取）</summary>

```tsx
import { useState, useRef, useCallback, type ReactNode } from 'react'
import soundLibrary from 'ai-sounds'
import styles from './DevPanel.module.css'

// ─── 通用配置类型 ───
type BgmKey = 'main' | 'progress' | 'rest'

/** 按钮组区块：显示一组可点击按钮 */
export interface DevButtonSection {
  type: 'buttons'
  label: string
  buttons: { label: string; active?: boolean; action: () => void }[]
}

/** 状态显示区块：显示键值对状态信息 */
export interface DevStateSection {
  type: 'state'
  label: string
  entries: { key: string; value: string | number }[]
}

/** 自定义渲染区块 */
export interface DevCustomSection {
  type: 'custom'
  label: string
  render: (scale: number, baseFontSize: number) => ReactNode
}

export type DevSection = DevButtonSection | DevStateSection | DevCustomSection

export interface DevPanelProps {
  /** 游戏专属区块，按顺序渲染在 BGM/音效/素材工坊 之前 */
  sections?: DevSection[]
  /** BGM 控制 */
  bgmKey: BgmKey | null
  playBGM: (key: BgmKey) => void
  stopBGM: () => void
  /** 已上传的 AI素材工坊 URL（从 params.materialWorkshopUrl 传入） */
  materialWorkshopUrl?: string
}

export default function DevPanel({
  sections = [], bgmKey, playBGM, stopBGM, materialWorkshopUrl
}: DevPanelProps) {
  // ─── 面板内部状态 ───
  const [devPanelOpen, setDevPanelOpen] = useState(true)
  const [devPos, setDevPos] = useState({ x: 8, y: 8 })
  const [devSize, setDevSize] = useState({ w: 420, h: 0 })
  const devDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const devResizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null)
  const devPanelRef = useRef<HTMLDivElement>(null)

  // ─── 拖拽 ───
  const onDevDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    devDragRef.current = { startX: e.clientX, startY: e.clientY, origX: devPos.x, origY: devPos.y }
    const onMove = (ev: MouseEvent) => {
      if (!devDragRef.current) return
      setDevPos({
        x: Math.max(0, devDragRef.current.origX - (ev.clientX - devDragRef.current.startX)),
        y: Math.max(0, devDragRef.current.origY + ev.clientY - devDragRef.current.startY)
      })
    }
    const onUp = () => {
      devDragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ─── 缩放 ───
  const onDevResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const el = devPanelRef.current
    const currentH = el ? el.getBoundingClientRect().height : 200
    devResizeRef.current = { startX: e.clientX, startY: e.clientY, origW: devSize.w, origH: devSize.h || currentH }
    const onMove = (ev: MouseEvent) => {
      if (!devResizeRef.current) return
      setDevSize({
        w: Math.max(180, devResizeRef.current.origW + ev.clientX - devResizeRef.current.startX),
        h: Math.max(100, devResizeRef.current.origH + ev.clientY - devResizeRef.current.startY)
      })
    }
    const onUp = () => {
      devResizeRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ─── AI素材工坊 ───
  const UPLOAD_API = 'https://aic-service.sdp.101.com/v1.0/cs/actions/upload_to_cs'
  const CDN_HOST = 'https://gcdncs.101.com'
  const [workshopUploading, setWorkshopUploading] = useState(false)

  const openInBrowser = useCallback((url: string) => {
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.click()
  }, [])

  const openRemoteWorkshop = useCallback(() => {
    if (!materialWorkshopUrl) {
      alert('materialWorkshopUrl 未配置，请先点击「制作并上传」生成')
      return
    }
    openInBrowser(materialWorkshopUrl)
  }, [openInBrowser, materialWorkshopUrl])

  const uploadWorkshop = useCallback(async () => {
    if (workshopUploading) return
    setWorkshopUploading(true)
    try {
      const localUrl = `${window.location.origin}${encodeURI('/素材库/preview.html')}`
      const resp = await fetch(localUrl)
      if (!resp.ok) throw new Error(`获取 preview.html 失败: ${resp.status}`)
      const htmlBlob = await resp.blob()

      const formData = new FormData()
      formData.append('file', new File([htmlBlob], 'preview.html', { type: 'text/html' }))

      const uploadResp = await fetch(UPLOAD_API, {
        method: 'POST',
        headers: {
          'Authorization': 'AIC',
          'Sdp-App-Id': 'b4fb92a0-af7f-49c2-b270-8f62afac1133'
        },
        body: formData
      })

      if (!uploadResp.ok) throw new Error(`上传失败: ${uploadResp.status}`)
      const dentry = await uploadResp.json()
      const dentryId = dentry.dentry_id || dentry.dentryId || dentry.id
      if (!dentryId) throw new Error('未获取到 dentryId')

      const url = `${CDN_HOST}/v0.1/download?dentryId=${dentryId}`
      await navigator.clipboard.writeText(url)
      alert(`✅ AI素材工坊已上传！\n\nURL已复制到剪贴板:\n${url}\n\n请更新 exampleParams.json 中的 materialWorkshopUrl`)
    } catch (err) {
      const cmd = [
        '$r = bun --env-file=".claude\\.env" run ".claude\\skills\\upload-skill\\scripts\\upload.js" "素材库\\preview.html" --json | ConvertFrom-Json;',
        '$dentryId = $r[0].dentryId;',
        '$url = "https://gcdncs.101.com/v0.1/download?dentryId=$dentryId";',
        '$p = Get-Content "public\\exampleParams.json" -Raw | ConvertFrom-Json;',
        '$p.materialWorkshopUrl = $url;',
        '$p | ConvertTo-Json -Depth 10 | Set-Content "public\\exampleParams.json" -Encoding UTF8;',
        'Write-Host "✅ materialWorkshopUrl updated: $url"'
      ].join(' ')
      await navigator.clipboard.writeText(cmd).catch(() => {})
      const reason = err instanceof Error ? err.message : String(err)
      alert(`浏览器直传失败（${reason}）\n\n已复制终端命令到剪贴板，请在项目根目录终端执行`)
    } finally {
      setWorkshopUploading(false)
    }
  }, [workshopUploading])

  // ─── 区块渲染器 ───
  const scale = devSize.w / 220
  const baseFontSize = 12 * scale
  const btnStyle = { fontSize: `${baseFontSize * 0.92}px`, padding: `${3 * scale}px ${8 * scale}px` }
  const labelStyle = { fontSize: `${baseFontSize * 0.83}px` }
  const gapStyle = { gap: `${4 * scale}px` }

  const renderSection = (section: DevSection, index: number) => {
    switch (section.type) {
      case 'buttons':
        return (
          <div key={index} className={styles.devSection}>
            <span className={styles.devLabel} style={labelStyle}>{section.label}</span>
            <div className={styles.devBtnGroup} style={gapStyle}>
              {section.buttons.map(({ label, active, action }) => (
                <button
                  key={label}
                  className={`${styles.devBtn} ${active ? styles.devBtnActive : ''}`}
                  onClick={action}
                  style={btnStyle}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )
      case 'state':
        return (
          <div key={index} className={styles.devSection}>
            <span className={styles.devLabel} style={labelStyle}>{section.label}</span>
            <div className={styles.devState} style={labelStyle}>
              {section.entries.map(({ key, value }, i) => (
                <span key={key}>
                  {key}: <span className={styles.devStateVal}>{value}</span>
                  {i < section.entries.length - 1 ? ' | ' : ''}
                </span>
              ))}
            </div>
          </div>
        )
      case 'custom':
        return (
          <div key={index} className={styles.devSection}>
            <span className={styles.devLabel} style={labelStyle}>{section.label}</span>
            {section.render(scale, baseFontSize)}
          </div>
        )
    }
  }

  // ─── 渲染 ───
  return (
    <div
      ref={devPanelRef}
      className={styles.devPanel}
      style={{
        right: devPos.x,
        top: devPos.y,
        width: devPanelOpen ? devSize.w : undefined,
        height: devPanelOpen && devSize.h ? devSize.h : undefined,
        fontSize: devPanelOpen ? baseFontSize : undefined
      }}
    >
      <div className={styles.devHeader} onMouseDown={onDevDragStart}>
        <button
          className={styles.devToggle}
          onClick={() => setDevPanelOpen(p => !p)}
          style={{ fontSize: devPanelOpen ? `${baseFontSize * 0.92}px` : undefined }}
        >
          🛠 DEV {devPanelOpen ? '▼' : '▶'}
        </button>
        <span className={styles.devDragHint} style={{ fontSize: devPanelOpen ? `${baseFontSize * 1.2}px` : undefined }}>⠿</span>
      </div>
      {devPanelOpen && (
        <div className={styles.devBody}>
          {/* 游戏专属区块 */}
          {sections.map(renderSection)}
          {/* 背景音乐（通用） */}
          <div className={styles.devSection}>
            <span className={styles.devLabel} style={labelStyle}>背景音乐</span>
            <div className={styles.devBtnGroup} style={gapStyle}>
              {([
                { key: 'main' as const, label: '主流程' },
                { key: 'progress' as const, label: '行动中' },
                { key: 'rest' as const, label: '暂停' }
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  className={`${styles.devBtn} ${bgmKey === key ? styles.devBtnActive : ''}`}
                  onClick={() => playBGM(key)}
                  style={btnStyle}
                >
                  {label}
                </button>
              ))}
              <button className={styles.devBtn} onClick={stopBGM} style={btnStyle}>
                停止
              </button>
            </div>
          </div>
          {/* 音效测试（通用） */}
          <div className={styles.devSection}>
            <span className={styles.devLabel} style={labelStyle}>音效测试</span>
            <div className={styles.devBtnGroup} style={gapStyle}>
              {[
                { id: 'clear1', label: '通关' },
                { id: 'error1', label: '错误' },
                { id: 'quiz1', label: '答题1' },
                { id: 'click1', label: '点击' },
                { id: 'decide1', label: '确认' }
              ].map(({ id, label }) => (
                <button
                  key={id}
                  className={styles.devBtn}
                  onClick={() => soundLibrary.play(id).catch(() => {})}
                  style={btnStyle}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {/* AI素材工坊（通用） */}
          <div className={styles.devSection}>
            <span className={styles.devLabel} style={labelStyle}>AI素材工坊</span>
            <div className={styles.devBtnGroup} style={gapStyle}>
              <button className={styles.devBtn} onClick={() => openInBrowser(`${window.location.origin}${encodeURI('/素材库/preview.html')}`)} style={btnStyle}>
                本地预览
              </button>
              <button
                className={styles.devBtn}
                onClick={uploadWorkshop}
                style={{ ...btnStyle, opacity: workshopUploading ? 0.5 : 1 }}
                disabled={workshopUploading}
              >
                {workshopUploading ? '上传中...' : '制作并上传'}
              </button>
              <button className={styles.devBtn} onClick={openRemoteWorkshop} style={btnStyle}>
                打开工坊
              </button>
            </div>
          </div>
          {/* 缩放手柄 */}
          <div className={styles.devResizeHandle} onMouseDown={onDevResizeStart}
            style={{ width: `${14 * scale}px`, height: `${14 * scale}px` }} />
        </div>
      )}
    </div>
  )
}
```

</details>

## 第二步：复制 DevPanel.module.css

从模板目录读取并复制到项目根目录，**无需任何修改**：

```
源文件：.claude/skills/debug-skill/templates/DevPanel.module.css
目标：项目根目录/DevPanel.module.css
```

使用 `read_file` 读取模板文件完整内容，然后用 `create_file` 写入项目根目录。

> 如果项目根目录已存在 DevPanel.module.css，**跳过此步**，不要覆盖。

<details>
<summary>DevPanel.module.css 源码参考（点击展开，实际执行时从模板文件读取）</summary>

```css
/* ═══════════════════════════════════════════
   Dev 调试面板
   ═══════════════════════════════════════════ */
.devPanel {
  position: fixed;
  z-index: 9999;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  user-select: none;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.devHeader {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: grab;
  padding: 2px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 4px;
}

.devHeader:active { cursor: grabbing; }

.devDragHint {
  color: #555;
  font-size: 14px;
  line-height: 1;
}

.devToggle {
  background: rgba(0, 0, 0, 0.7);
  color: #0f0;
  border: 1px solid #0f0;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-family: inherit;
  font-size: 11px;
  flex-shrink: 0;
}

.devToggle:hover { background: rgba(0, 80, 0, 0.8); }

.devBody {
  margin-top: 4px;
  background: rgba(0, 0, 0, 0.85);
  border: 1px solid #0f0;
  border-radius: 6px;
  padding: 10px;
  color: #ccc;
  min-width: 180px;
  backdrop-filter: blur(8px);
  flex: 1;
  overflow: auto;
  position: relative;
}

.devSection { margin-bottom: 8px; }

.devLabel {
  display: block;
  color: #0f0;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 4px;
}

.devBtnGroup {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.devBtn {
  background: rgba(255, 255, 255, 0.1);
  color: #ddd;
  border: 1px solid #555;
  border-radius: 3px;
  padding: 3px 8px;
  cursor: pointer;
  font-family: inherit;
  font-size: 11px;
  white-space: nowrap;
  transition: all 0.15s;
}

.devBtn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: #0f0;
  color: #fff;
}

.devBtnActive {
  background: rgba(0, 200, 0, 0.3);
  border-color: #0f0;
  color: #0f0;
}

.devState {
  font-size: 10px;
  color: #888;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid #333;
  line-height: 1.6;
}

.devStateVal { color: #0f0; }

.devResizeHandle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 14px;
  height: 14px;
  cursor: nwse-resize;
  background:
    linear-gradient(135deg, transparent 50%, #0f0 50%, #0f0 55%, transparent 55%),
    linear-gradient(135deg, transparent 65%, #0f0 65%, #0f0 70%, transparent 70%),
    linear-gradient(135deg, transparent 80%, #0f0 80%, #0f0 85%, transparent 85%);
  opacity: 0.5;
  border-radius: 0 0 5px 0;
}

.devResizeHandle:hover { opacity: 1; }
```

</details>

## 第三步：在 index.tsx 中接入（需按游戏定制）

### 3.1 Import

```tsx
import DevPanel, { type DevSection } from './DevPanel'
```

### 3.2 Dev 模式检测

在组件内添加：

```tsx
const [isDevMode] = useState<boolean>(() => {
  try {
    const url = new URL(window.location.href)
    return url.searchParams.get('dev') === '1' || /\/(dev|preview)\//.test(url.pathname)
  } catch {
    return false
  }
})
```

### 3.3 确保 exampleParams.json 包含 materialWorkshopUrl

```json
{
  "playerName": "...",
  "materialWorkshopUrl": ""
}
```

### 3.4 渲染面板（🔧 以下为游戏定制部分）

在 JSX 最外层 div 的末尾添加。**核心原则：分层组织、职责单一、状态丰富**。

> ⚠️ **常见反模式**：把所有步骤/关卡/页面跳转混在一个 buttons 区块里（如 `页面跳转: [开始, L1-S1, L1-S2a, ..., 结果]`）。
> 正确做法：**关卡、页面/屏幕、状态分别用独立区块**，让面板清晰可读。

#### 推荐结构（3 段式）：关卡 + 屏幕 + 状态

```tsx
{/* ═══ Dev 调试面板 @custom-dev-panel ═══ */}
{isDevMode && (
  <DevPanel
    sections={[
      // ─── 区块1：关卡跳转（仅关卡级别，不混入步骤）───
      {
        type: 'buttons',
        label: '关卡',
        buttons: LEVELS.map((lv, i) => ({
          label: `L${lv.level} ${lv.name}`,
          active: currentLevel === i && phase === 'playing',
          action: () => startCountdown(i)         // 走正常游戏流程
        }))
      },
      // ─── 区块2：屏幕/阶段切换（列出所有 phase）───
      // 关键：切换前调用 cleanupGame() 清理计时器、数组等残留状态
      {
        type: 'buttons',
        label: '屏幕',
        buttons: [
          { label: '开始页', active: phase === 'start',
            action: () => { cleanupGame(); setPhase('start'); playBGM('main') } },
          { label: '选关', active: phase === 'levels',
            action: () => { cleanupGame(); setPhase('levels'); playBGM('main') } },
          { label: '倒计时', active: phase === 'countdown',
            action: () => startCountdown(currentLevel) },
          { label: '游戏中', active: phase === 'playing',
            action: () => startCountdown(currentLevel) },
          { label: '游戏结束', active: phase === 'levelComplete' || phase === 'levelFail',
            action: () => { cleanupGame(); setPhase('levelFail') } },
          { label: '全通关', active: phase === 'gameComplete',
            action: () => { cleanupGame(); setPhase('gameComplete') } }
        ]
      },
      // ─── 区块3：状态监控（尽可能多展示关键指标）───
      {
        type: 'state',
        label: '状态',
        entries: [
          { key: '屏幕', value: phase },
          { key: '关卡', value: `L${currentLevel + 1}` },
          { key: '得分', value: score },
          { key: '时间', value: `${timeLeft}s` },
          { key: '鱼', value: fishRef.current.length },
          { key: '星级', value: `L1=${levelStars[0]} L2=${levelStars[1]} L3=${levelStars[2]}` }
        ]
      }
    ] satisfies DevSection[]}
    bgmKey={bgmKeyRef.current}
    playBGM={playBGM}
    stopBGM={stopBGM}
    materialWorkshopUrl={props.params.materialWorkshopUrl}
  />
)}
```

## 区块设计规范

### 规范1：分层组织

按关注点拆分为多个区块，**不要混在一起**：

| 层级 | 区块类型 | 用途 | 示例 |
|------|----------|------|------|
| 导航层 | `buttons` | 关卡跳转 | `关卡: [L1 小溪] [L2 激流] [L3 瀑布]` |
| 导航层 | `buttons` | 屏幕/阶段切换 | `屏幕: [开始页] [选关] [游戏中] [结算]` |
| 数据层 | `state` | 游戏状态 | `屏幕: playing │ 得分: 5 │ 时间: 28s` |
| 扩展层 | `custom` | 特殊控制 | 滑块、日志、自定义 UI |

### 规范2：按钮必须有 cleanup

屏幕切换按钮的 `action` 必须先清理游戏状态（停止计时器、清空数组等），否则跳转后残留的 interval/timeout 会导致错乱：

```tsx
// ✅ 正确：先清理再切换
{ label: '开始页', action: () => { cleanupGame(); setPhase('start'); playBGM('main') } }

// ❌ 错误：直接切换，计时器和状态残留
{ label: '开始页', action: () => setPhase('start') }
```

### 规范3：状态条目尽量丰富

`state` 区块应覆盖所有开发时需要观察的指标。常见条目：

```tsx
entries: [
  { key: '屏幕', value: phase },           // 当前生命周期阶段
  { key: '关卡', value: `L${level + 1}` }, // 当前关卡
  { key: '步骤', value: `${step}/${total}` }, // 步骤进度（步骤制游戏）
  { key: '得分', value: score },            // 分数
  { key: '时间', value: `${timeLeft}s` },   // 剩余时间
  { key: '错误', value: errorCount },       // 错误/失误次数
  { key: '超时', value: isTimeout ? 'Y' : 'N' }, // 是否超时
  { key: '生命', value: `${hp}/${maxHp}` }, // 生命值
  { key: '实体', value: entities.length },  // 场上实体数量
]
```

### 规范4：active 高亮当前状态

每个按钮通过 `active` 属性标识当前激活项，面板中会以绿色高亮：

```tsx
{ label: '游戏中', active: phase === 'playing', action: () => ... }
//                 ^^^^^^^ 当 phase 为 playing 时高亮
```

## 三种区块类型参考

### `buttons` — 按钮组

用于关卡跳转、步骤切换、屏幕切换等任何需要点击触发的操作。

```tsx
{
  type: 'buttons',
  label: '区块标题',
  buttons: [
    { label: '按钮文字', active: true/false, action: () => { /* 点击回调 */ } }
  ]
}
```

### `state` — 键值对状态

用于展示当前游戏状态（得分、时间、关卡、任意指标）。

```tsx
{
  type: 'state',
  label: '状态',
  entries: [
    { key: '得分', value: score },
    { key: '生命值', value: `${hp}/${maxHp}` }
  ]
}
```

### `custom` — 自定义渲染

用于需要完全自定义 UI 的场景（滑块、图表、日志等）。接收 `scale` 和 `baseFontSize` 用于等比缩放。

```tsx
{
  type: 'custom',
  label: '自定义区块',
  render: (scale, baseFontSize) => (
    <input
      type="range"
      min={0} max={100}
      style={{ width: `${100 * scale}px` }}
    />
  )
}
```

## 不同游戏类型的 sections 模板

### 模板A：关卡制游戏（如捕鱼、消除、跑酷）

特点：多关卡 + 每关有独立玩法循环

```tsx
sections={[
  { type: 'buttons', label: '关卡',
    buttons: LEVELS.map((lv, i) => ({
      label: `L${lv.level} ${lv.name}`,
      active: currentLevel === i,
      action: () => startLevel(i)
    }))
  },
  { type: 'buttons', label: '屏幕',
    buttons: [
      { label: '开始页', active: phase === 'start', action: () => { cleanup(); setPhase('start') } },
      { label: '选关', active: phase === 'levels', action: () => { cleanup(); setPhase('levels') } },
      { label: '游戏中', active: phase === 'playing', action: () => startLevel(currentLevel) },
      { label: '通关', active: phase === 'complete', action: () => { cleanup(); setPhase('complete') } },
      { label: '失败', active: phase === 'fail', action: () => { cleanup(); setPhase('fail') } },
    ]
  },
  { type: 'state', label: '状态',
    entries: [
      { key: '屏幕', value: phase },
      { key: '关卡', value: `L${currentLevel + 1}` },
      { key: '得分', value: score },
      { key: '时间', value: `${timeLeft}s` },
    ]
  }
]}
```

### 模板B：步骤制课件（如分步教学、实验操作）

特点：线性步骤推进 + 可能有多关卡 × 多步骤

```tsx
sections={[
  { type: 'buttons', label: '页面跳转',
    buttons: [
      { label: '开始', active: page === 'start', action: () => goTo('start') },
      // 每关每步独立按钮，按 L关卡-S步骤 格式
      ...STEPS.flatMap(step => ({
        label: step.shortLabel,   // 如 'L1-S1', 'L1-S2a'
        active: currentStep === step.id,
        action: () => jumpToStep(step.id)
      })),
      { label: '结果', active: page === 'result', action: () => goTo('result') }
    ]
  },
  { type: 'state', label: '状态',
    entries: [
      { key: '页面', value: currentPage },
      { key: '步骤', value: `${stepIndex + 1}/${totalSteps}` },
      { key: '错误', value: errorCount },
      { key: '超时', value: isTimeout ? 'Y' : 'N' },
    ]
  }
]}
```

### 模板C：答题/选择类游戏（如问答、连线、排序）

特点：题库驱动 + 答对/答错反馈

```tsx
sections={[
  { type: 'buttons', label: '题目',
    buttons: questions.map((q, i) => ({
      label: `Q${i + 1}`,
      active: currentQuestion === i,
      action: () => jumpToQuestion(i)
    }))
  },
  { type: 'buttons', label: '屏幕',
    buttons: [
      { label: '说明页', active: phase === 'intro', action: () => setPhase('intro') },
      { label: '答题中', active: phase === 'quiz', action: () => setPhase('quiz') },
      { label: '结算', active: phase === 'result', action: () => setPhase('result') },
    ]
  },
  { type: 'state', label: '状态',
    entries: [
      { key: '题号', value: `${currentQuestion + 1}/${questions.length}` },
      { key: '正确', value: correctCount },
      { key: '错误', value: wrongCount },
      { key: '得分', value: `${score}/${maxScore}` },
    ]
  }
]}
```

## 内置通用功能（无需配置）

| 功能 | 描述 |
|------|------|
| **拖拽移动** | 标题栏可拖拽，面板悬浮在右上角 |
| **等比缩放** | 右下角手柄拖拽，所有内容等比放大（基准 220px） |
| **折叠/展开** | 点击 DEV 按钮切换 |
| **BGM 控制** | 主流程 / 行动中 / 暂停 / 停止 |
| **音效测试** | 通关 / 错误 / 答题1 / 点击 / 确认 |
| **AI素材工坊** | 本地预览 / 制作并上传（上传 preview.html 到 CS） / 打开工坊（打开 materialWorkshopUrl） |

## AI素材工坊按钮说明

| 按钮 | 功能 |
|------|------|
| **本地预览** | 新标签页打开本地 `素材库/preview.html` |
| **制作并上传** | 获取本地 preview.html → 上传 CS → 生成 URL → 复制到剪贴板。浏览器直传失败时自动复制终端命令到剪贴板 |
| **打开工坊** | 新标签页打开 `params.materialWorkshopUrl`（已上传的在线版本） |

### 终端命令手动上传

如果浏览器直传因 CORS 失败，在项目根目录终端执行：

```powershell
$r = bun --env-file=".claude\.env" run ".claude\skills\upload-skill\scripts\upload.js" "素材库\preview.html" --json | ConvertFrom-Json; $dentryId = $r[0].dentryId; $url = "https://gcdncs.101.com/v0.1/download?dentryId=$dentryId"; $p = Get-Content "public\exampleParams.json" -Raw | ConvertFrom-Json; $p.materialWorkshopUrl = $url; $p | ConvertTo-Json -Depth 10 | Set-Content "public\exampleParams.json" -Encoding UTF8; Write-Host "✅ materialWorkshopUrl updated: $url"
```

## 面板布局

```
┌──────────────────────────────────┐
│ 🛠 DEV ▼                     ⠿  │  ← 可拖拽标题栏
├──────────────────────────────────┤
│ ┌ 游戏专属 sections（按顺序） ┐  │
│ │ 关卡                         │  │
│ │ [L1 小溪] [L2 激流] [L3 瀑布]│  │  ← type: 'buttons'
│ │ 屏幕                         │  │
│ │ [开始页] [选关] [游戏中]     │  │  ← type: 'buttons'
│ │ [游戏结束] [全通关]          │  │
│ │ 状态                         │  │
│ │ 屏幕: playing | 关卡: L1     │  │  ← type: 'state'
│ │ 得分: 5 | 时间: 28s | 鱼: 3 │  │
│ └──────────────────────────────┘  │
│ ┌ 通用内置（自动渲染） ───────┐  │
│ │ 背景音乐                     │  │
│ │ [主流程] [行动中] [暂停] [停止]│ │
│ │ 音效测试                     │  │
│ │ [通关] [错误] [答题1] [点击] │  │
│ │ [确认]                       │  │
│ │ AI素材工坊                   │  │
│ │ [本地预览] [制作并上传] [打开]│  │
│ └──────────────────────────────┘  │
│                                ◢  │  ← 缩放手柄
└──────────────────────────────────┘
```

## 注意事项

1. **DevPanel.tsx 和 DevPanel.module.css 跨项目零修改复用** — 所有游戏差异通过 `sections` prop 注入
2. **仅开发环境生效** — 通过 URL `?dev=1` 或路径含 `/dev/` 或 `/preview/` 激活
3. **等比缩放**：基准宽度 220px，`scale = width / 220`
4. 面板层级 z-index: 9999
5. **所有标签用中文**
6. **materialWorkshopUrl 格式** — 使用 `?dentryId=xxx`（不带 `attachment=true`），浏览器直接打开
7. **分层设计 sections**：关卡导航 + 屏幕切换 + 状态监控，不要混成一个大按钮组
8. **屏幕切换按钮必须先 cleanup**：停计时器、清数组、停音频，再切换 phase
