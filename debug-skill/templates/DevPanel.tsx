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
  /** 项目 ID（来自 .aic-info.json，用于生产环境工坊 URL） */
  projectId: string
}

export default function DevPanel({
  sections = [], bgmKey, playBGM, stopBGM, materialWorkshopUrl, projectId
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
  const openInBrowser = useCallback((url: string) => {
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.click()
  }, [])

  // FIX: 工坊地址策略 — 根据 URL 参数判断环境
  // 本地开发: aic-view.sdp.101.com/dev/?id=xxx&host=127.0.0.1&port=3005
  // 生产环境: 无 host/port 参数
  const urlParams = new URLSearchParams(window.location.search)
  const devHost = urlParams.get('host')
  const devPort = urlParams.get('port') || '3005'
  const isLocal = Boolean(devHost)
  const workshopUrl = materialWorkshopUrl
    || (isLocal
      ? `http://${devHost}:${devPort}/preview.html`
      : `https://cs.101.com/v0.1/static/aic_deploy/${projectId}/preview.html`)

  const openWorkshopPage = useCallback(() => {
    openInBrowser(workshopUrl)
  }, [openInBrowser, workshopUrl])

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
              <button
                className={styles.devBtn}
                onClick={openWorkshopPage}
                style={btnStyle}
                title="打开AI素材工坊"
              >
                打开AI素材工坊
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
