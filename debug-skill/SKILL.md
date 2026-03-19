---
name: debug-skill
description: 为 React 小游戏/课件组件添加开发调试面板（debug 模式）。通过 URL 参数 dev=1 激活，支持关卡跳转、步骤跳转、背景音乐控制、音效测试、AI素材工坊链接、状态监控，面板可拖拽移动、可缩放且内容等比放大。所有标签和按钮使用中文。触发词：debug模式、调试面板、dev模式、开发模式、debug panel、调试工具、跳关、跳步骤。
---

# Debug Skill — 开发调试面板

为 React 游戏/课件组件添加一个悬浮调试面板，支持选择关卡和步骤、查看实时状态、可拖拽可缩放。

## ⚠️ 防覆盖规则

**执行前必须检查** `index.tsx` 中是否存在 `@custom-dev-panel` 标记注释。

- 如果找到 `@custom-dev-panel` → **跳过 Dev 面板 JSX 的替换**，只补充缺失的 state/ref/handler（如 devPos、devSize、拖拽事件等）
- 如果未找到 → 按下方模板正常生成

这个标记表示开发者已手工定制了 Dev 面板，模板不应覆盖。

## 适用场景

- 多关卡多步骤的游戏组件开发调试
- 课件交互组件开发时需要快速跳转到某个状态
- 需要在不重新加载页面的情况下切换游戏进度

## 激活方式

以下任一条件满足即激活，生产环境不会显示：

1. URL 参数 `?dev=1`
2. URL 路径匹配 `**/dev/**`（即路径中包含 `/dev/`）
3. URL 路径匹配 `**/preview/**`（即路径中包含 `/preview/`）

## 面板布局

```
┌─────────────────────────────┐
│ 🛠 DEV ▼                ⠿  │  ← 可拖拽标题栏
├─────────────────────────────┤
│ 关卡                         │
│ [L1 小溪初钓] [L2 激流] [L3] │  ← 点击切换关卡
│ 步骤                         │
│ [引入] [倒计时] [游戏中] [结算]│  ← 点击切换步骤
│ 状态                         │
│ 关卡: L1 | 步骤: intro       │
│ 背景音乐: 主流程              │
│ 背景音乐                     │
│ [主流程] [行动中] [暂停] [停止]│  ← BGM 中文按钮
│ 音效测试                      │
│ [通关] [错误] [答题1]         │  ← 音效中文按钮
│ [答题2] [点击] [确认]         │
│ AI素材工坊                    │
│ 🏭 打开AI素材工坊             │  ← 打开 CDN 工坊页
│                           ◢ │  ← 缩放手柄
└─────────────────────────────┘
```

## 中文标签规范

面板中所有标签和按钮**必须使用中文**，方便非英文开发者快速理解。

| 区块 | 标签名 | 按钮文字 |
|------|--------|---------|
| 关卡选择 | `关卡` | 项目自定义（如 `L1 小溪初钓`） |
| 步骤选择 | `步骤` | 项目自定义（如 `引入` / `倒计时` / `游戏中` / `结算`） |
| 状态监控 | `状态` | 显示 `关卡: L1 | 步骤: intro` + `背景音乐: 主流程` |
| BGM 控制 | `背景音乐` | `主流程` / `行动中` / `暂停` / `停止` |
| 音效测试 | `音效测试` | `通关` / `错误` / `答题1` / `答题2` / `点击` / `确认` |
| AI素材工坊 | `AI素材工坊` | `🏭 打开AI素材工坊`（链接到 CDN） |

## 实现规范

### 1. 关卡 & 步骤定义

在组件顶层（export 之前）定义关卡和步骤常量，根据项目实际情况调整：

```tsx
// ─── 关卡 & 步骤定义（根据项目调整） ───
const LEVELS = [
  { id: 'L1' as const, label: 'L1 小溪初钓' },
  { id: 'L2' as const, label: 'L2 激流挑战' },
  { id: 'L3' as const, label: 'L3 瀑布捕鱼' }
] as const

const STEPS = [
  { id: 'intro' as const, label: '引入' },
  { id: 'countdown' as const, label: '倒计时' },
  { id: 'gameplay' as const, label: '游戏中' },
  { id: 'result' as const, label: '结算' }
] as const

type LevelId = typeof LEVELS[number]['id']
type StepId = typeof STEPS[number]['id']
```

### 2. 状态声明

在组件内增加以下 state 和 ref：

```tsx
// ─── 关卡 & 步骤状态 ───
const [currentLevel, setCurrentLevel] = useState<LevelId>('L1')
const [currentStep, setCurrentStep] = useState<StepId>('intro')

// ─── Dev模式检测：URL 参数 ?dev=1 或路径包含 /dev/ ───
const [isDevMode] = useState<boolean>(() => {
  try {
    const url = new URL(window.location.href)
    return url.searchParams.get('dev') === '1' || /\/(dev|preview)\//.test(url.pathname)
  } catch {
    return false
  }
})
const [devPanelOpen, setDevPanelOpen] = useState<boolean>(true)
const [devPos, setDevPos] = useState({ x: 8, y: 8 })  // x = right offset，默认更贴右侧
const [devSize, setDevSize] = useState({ w: 580, h: 0 }) // h=0 表示高度 auto，默认宽度按当前项目调试习惯设置
const devDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
const devResizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null)
const devPanelRef = useRef<HTMLDivElement>(null)
```

### 3. 拖拽移动逻辑

```tsx
const onDevDragStart = (e: React.MouseEvent) => {
  e.preventDefault()
  devDragRef.current = { startX: e.clientX, startY: e.clientY, origX: devPos.x, origY: devPos.y }
  const onMove = (ev: MouseEvent) => {
    if (!devDragRef.current) return
    setDevPos({
      x: Math.max(0, devDragRef.current.origX - (ev.clientX - devDragRef.current.startX)),  // inverted for right-positioned panel
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
```

### 4. 缩放逻辑（内容等比放大）

```tsx
const onDevResizeStart = (e: React.MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  const el = devPanelRef.current
  const currentH = el ? el.getBoundingClientRect().height : 200
  devResizeRef.current = { startX: e.clientX, startY: e.clientY, origW: devSize.w, origH: devSize.h || currentH }
  const onMove = (ev: MouseEvent) => {
    if (!devResizeRef.current) return
    setDevSize({
      w: Math.max(520, devResizeRef.current.origW + ev.clientX - devResizeRef.current.startX),
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
```

关键：基准宽度为 220px，缩放比 `scale = devSize.w / 220`，所有字体大小和 padding 都乘以 scale：

```tsx
const scale = devSize.w / 220
const baseFontSize = 12 * scale
```

### 5. 跳转函数（devJump）

需要根据项目的关卡/步骤（level/step）定义跳转函数，核心逻辑：

```tsx
const devJump = useCallback((level: LevelId, step: StepId) => {
  // 1. 清理所有定时器
  if (timerRef.current) clearInterval(timerRef.current)
  // 2. 设置目标关卡和步骤
  setCurrentLevel(level)
  setCurrentStep(step)
  // 3. 重置所有弹窗/动画/暂停状态
  setShowTimeout(false)
  setShowCharacterClap(false)
  setIsPaused(false)
  // 4. 根据不同步骤设置合理初始状态（项目自定义）
  if (step === 'intro') {
    // 重置所有游戏状态
  } else if (step === 'countdown') {
    // 启动倒计时
  } else if (step === 'gameplay') {
    // 预设目标但不启动计时器，等用户点击
  } else if (step === 'result') {
    // 直接展示结算状态
  }
}, [])
```

### 6. JSX 渲染模板

面板区块顺序：关卡 → 步骤 → 状态 → 背景音乐 → 音效测试 → AI素材工坊 → 缩放手柄

```tsx
{isDevMode && (() => {
  const scale = devSize.w / 220
  const baseFontSize = 12 * scale
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
          {/* 关卡选择 */}
          <div className={styles.devSection}>
            <span className={styles.devLabel} style={{ fontSize: `${baseFontSize * 0.83}px` }}>关卡</span>
            <div className={styles.devBtnGroup} style={{ gap: `${4 * scale}px` }}>
              {LEVELS.map(lv => (
                <button
                  key={lv.id}
                  className={`${styles.devBtn} ${currentLevel === lv.id ? styles.devBtnActive : ''}`}
                  onClick={() => devJump(lv.id, currentStep)}
                  style={{ fontSize: `${baseFontSize * 0.92}px`, padding: `${3 * scale}px ${8 * scale}px` }}
                >
                  {lv.label}
                </button>
              ))}
            </div>
          </div>
          {/* 步骤选择 */}
          <div className={styles.devSection}>
            <span className={styles.devLabel} style={{ fontSize: `${baseFontSize * 0.83}px` }}>步骤</span>
            <div className={styles.devBtnGroup} style={{ gap: `${4 * scale}px` }}>
              {STEPS.map(s => (
                <button
                  key={s.id}
                  className={`${styles.devBtn} ${currentStep === s.id ? styles.devBtnActive : ''}`}
                  onClick={() => devJump(currentLevel, s.id)}
                  style={{ fontSize: `${baseFontSize * 0.92}px`, padding: `${3 * scale}px ${8 * scale}px` }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {/* 状态监控区 */}
          <div className={styles.devSection}>
            <span className={styles.devLabel} style={{ fontSize: `${baseFontSize * 0.83}px` }}>状态</span>
            <div className={styles.devState} style={{ fontSize: `${baseFontSize * 0.83}px` }}>
              关卡: <span className={styles.devStateVal}>{currentLevel}</span> |{' '}
              步骤: <span className={styles.devStateVal}>{currentStep}</span>
              <br />
              背景音乐: <span className={styles.devStateVal}>{
                bgmKeyRef.current === 'main' ? '主流程' :
                bgmKeyRef.current === 'progress' ? '行动中' :
                bgmKeyRef.current === 'rest' ? '暂停' : '无'
              }</span>
            </div>
          </div>
          {/* 背景音乐控制 */}
          <div className={styles.devSection}>
            <span className={styles.devLabel} style={{ fontSize: `${baseFontSize * 0.83}px` }}>背景音乐</span>
            <div className={styles.devBtnGroup} style={{ gap: `${4 * scale}px` }}>
              {([
                { key: 'main' as BgmKey, label: '主流程' },
                { key: 'progress' as BgmKey, label: '行动中' },
                { key: 'rest' as BgmKey, label: '暂停' }
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  className={`${styles.devBtn} ${bgmKeyRef.current === key ? styles.devBtnActive : ''}`}
                  onClick={() => playBGM(key)}
                  style={{ fontSize: `${baseFontSize * 0.92}px`, padding: `${3 * scale}px ${8 * scale}px` }}
                >
                  {label}
                </button>
              ))}
              <button
                className={styles.devBtn}
                onClick={stopBGM}
                style={{ fontSize: `${baseFontSize * 0.92}px`, padding: `${3 * scale}px ${8 * scale}px` }}
              >
                停止
              </button>
            </div>
          </div>
          {/* 音效测试 */}
          <div className={styles.devSection}>
            <span className={styles.devLabel} style={{ fontSize: `${baseFontSize * 0.83}px` }}>音效测试</span>
            <div className={styles.devBtnGroup} style={{ gap: `${4 * scale}px` }}>
              {[
                { id: 'clear1', label: '通关' },
                { id: 'error1', label: '错误' },
                { id: 'quiz1', label: '答题1' },
                { id: 'quiz2', label: '答题2' },
                { id: 'click1', label: '点击' },
                { id: 'decide1', label: '确认' }
              ].map(({ id, label }) => (
                <button
                  key={id}
                  className={styles.devBtn}
                  onClick={() => soundLibrary.play(id).catch(() => {})}
                  style={{ fontSize: `${baseFontSize * 0.92}px`, padding: `${3 * scale}px ${8 * scale}px` }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {/* AI素材工坊 — 上传 preview.html 到 CS 后替换此 URL */}
          <div className={styles.devSection}>
            <span className={styles.devLabel} style={{ fontSize: `${baseFontSize * 0.83}px` }}>AI素材工坊</span>
            <a
              className={styles.devLink}
              href="CDN_PREVIEW_URL"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: `${baseFontSize * 0.92}px` }}
            >
              🏭 打开AI素材工坊
            </a>
          </div>
          {/* 缩放手柄 */}
          <div className={styles.devResizeHandle} onMouseDown={onDevResizeStart}
            style={{ width: `${14 * scale}px`, height: `${14 * scale}px` }} />
        </div>
      )}
    </div>
  )
})()}
```

> **项目适配要点**：
> - `LEVELS` / `STEPS` 数组替换为项目实际关卡和步骤
> - BGM `label` 可根据项目场景自定义（如 `'战斗'` / `'探索'` / `'休息'`）
> - 音效按钮根据项目使用的音效 ID 调整映射
> - `CDN_PREVIEW_URL` 替换为 upload-skill 上传 preview.html 后返回的 URL（注意去掉 `attachment=true`，使用 `?dentryId=xxx` 格式直接在浏览器打开）

### 7. CSS Modules 样式

将以下样式追加到 `index.module.css` 末尾：

```css
/* ─── Dev 调试面板 ─── */
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

.devHeader:active {
  cursor: grabbing;
}

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

.devToggle:hover {
  background: rgba(0, 80, 0, 0.8);
}

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

.devSection {
  margin-bottom: 8px;
}

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

.devStateVal {
  color: #0f0;
}

.devLink {
  display: inline-block;
  color: #0f0;
  text-decoration: none;
  padding: 3px 8px;
  border: 1px solid #555;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  transition: all 0.15s;
  cursor: pointer;
}

.devLink:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: #0f0;
  text-decoration: underline;
}

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

.devResizeHandle:hover {
  opacity: 1;
}
```

## 自定义扩展

根据项目实际需求，可以在 devBody 中自由增加更多调试区域：

- **参数编辑器**：动态修改 `params` 输入
- **状态快照**：一键保存/恢复当前游戏状态
- **日志面板**：显示 `onStatusChange` 回调历史
- **性能监控**：FPS、渲染次数等

## 注意事项

1. **仅开发环境生效** — 通过 URL `?dev=1` 或路径含 `/dev/` 激活，不影响生产打包
2. **devJump 务必清理定时器** — 避免跳转后遗留计时器导致状态混乱
3. **等比缩放**：基准宽度 220px，`scale = width / 220`，字体和 padding 全部乘以 scale
4. **默认宽度建议 580px，最小宽度建议 ≥ 520px** — 更符合当前项目按钮排布，避免换行过早
5. 面板层级 z-index: 9999，不会被游戏内容遮挡
6. **所有标签用中文** — 确保非英文环境的开发者也能快速使用
7. **AI素材工坊 URL 格式** — 上传到 CS 后使用 `?dentryId=xxx`（不带 `attachment=true`），确保浏览器直接打开而非下载
