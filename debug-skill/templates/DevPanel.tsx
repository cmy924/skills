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
      // 1. 获取本地 preview.html
      const localUrl = `${window.location.origin}${encodeURI('/素材库/preview.html')}`
      const resp = await fetch(localUrl)
      if (!resp.ok) throw new Error(`获取 preview.html 失败: ${resp.status}`)
      const htmlBlob = await resp.blob()

      // 2. 上传到 CS
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

      // 3. 构建浏览器可查看 URL（不带 attachment=true）
      const url = `${CDN_HOST}/v0.1/download?dentryId=${dentryId}`

      // 4. 复制到剪贴板
      await navigator.clipboard.writeText(url)
      alert(`✅ AI素材工坊已上传！\n\nURL已复制到剪贴板:\n${url}\n\n请更新 exampleParams.json 中的 materialWorkshopUrl`)
    } catch (err) {
      // FIX: CORS 或认证失败时，退回终端命令方案
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
