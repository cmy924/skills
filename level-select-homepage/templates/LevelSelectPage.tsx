/**
 * LevelSelectPage — 糖果色关卡选择首页模板
 *
 * 使用方式：
 *   方式 A（内联）：将 renderStart() 的 JSX 和样式合并到 index.tsx / index.module.css
 *   方式 B（独立）：import LevelSelectPage 直接使用
 *
 * 自定义要点：
 *   1. 修改 LEVEL_CARDS 数组配置关卡信息
 *   2. 修改 onStart 回调处理开始游戏逻辑
 *   3. 卡片配色类名 characterCardA/B/C 可按需扩展
 */

import { type FC } from 'react'
import styles from './LevelSelectPage.module.css'

// ─── 关卡卡片配置 ───────────────────────────────────────────────────────────

interface LevelCardConfig {
  /** 关卡唯一标识 */
  id: string
  /** 关卡名称，如 "关卡1 · 吃饭任务" */
  label: string
  /** 场景预览图 URL */
  sceneImage: string
  /** 场景预览图 alt */
  sceneAlt: string
  /** 角色立绘 URL（idle 态） */
  characterImage: string
  /** 角色名称 */
  characterName: string
  /** 卡片配色类名后缀：'A' | 'B' | 'C' | 'D' | 'E' */
  colorVariant: 'A' | 'B' | 'C' | 'D' | 'E'
  /** 是否锁定 */
  locked: boolean
}

/**
 * 关卡配置示例 — 根据项目实际情况修改
 *
 * 图片 URL 从 asset-urls.ts 的 ASSET_URLS 获取
 * 角色 URL 从 roles-skill 或项目 CHARACTERS 配置获取
 */
const LEVEL_CARDS: LevelCardConfig[] = [
  {
    id: 'level1',
    label: '关卡1 · 吃饭任务',
    sceneImage: '/* ASSET_URLS["关卡1背景"] */',
    sceneAlt: '关卡1场景',
    characterImage: '/* CHARACTERS.xiao_an.idle */',
    characterName: '小安',
    colorVariant: 'A',
    locked: false,
  },
  {
    id: 'level2',
    label: '关卡2 · 机器人分类',
    sceneImage: '/* ASSET_URLS["关卡2背景"] */',
    sceneAlt: '关卡2场景',
    characterImage: '/* CHARACTERS.xiao_rui.idle */',
    characterName: '小瑞',
    colorVariant: 'B',
    locked: true,
  },
  {
    id: 'level3',
    label: '关卡3 · 找错字',
    sceneImage: '/* ASSET_URLS["关卡3背景"] */',
    sceneAlt: '关卡3场景',
    characterImage: '/* CHARACTERS.xiao_bu.idle */',
    characterName: '小布',
    colorVariant: 'C',
    locked: true,
  },
]

// ─── 组件 Props ─────────────────────────────────────────────────────────────

interface LevelSelectPageProps {
  /** 游戏标题 */
  title?: string
  /** 游戏副标题 */
  subtitle?: string
  /** 关卡配置（不传则使用默认 LEVEL_CARDS） */
  levels?: LevelCardConfig[]
  /** 开始按钮文本 */
  startButtonText?: string
  /** 点击开始游戏 */
  onStart: () => void
}

// ─── 配色映射 ───────────────────────────────────────────────────────────────

const COLOR_VARIANT_CLASS: Record<string, string> = {
  A: styles.characterCardA,
  B: styles.characterCardB,
  C: styles.characterCardC,
  D: styles.characterCardD,
  E: styles.characterCardE,
}

// ─── 组件实现 ───────────────────────────────────────────────────────────────

const LevelSelectPage: FC<LevelSelectPageProps> = ({
  title = '⏱️ 计时魔法',
  subtitle = '为什么吃饭时最好不要看动画片？',
  levels = LEVEL_CARDS,
  startButtonText = '开始游戏 🚀',
  onStart,
}) => {
  return (
    <div className={styles.startPage}>
      {/* ── 标题区域 ── */}
      <div className={styles.startBubble}>
        <div className={styles.gameTitle}>{title}</div>
        <div className={styles.gameSubtitle}>{subtitle}</div>
      </div>

      {/* ── 关卡卡片区域 ── */}
      <div className={styles.characters}>
        {levels.map((level) => (
          <div
            key={level.id}
            className={[
              styles.characterCard,
              COLOR_VARIANT_CLASS[level.colorVariant] || styles.characterCardA,
              level.locked ? styles.characterCardLocked : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {/* 锁定遮罩 */}
            {level.locked && (
              <div className={styles.levelLockOverlay} aria-hidden>
                <span className={styles.levelLockIcon}>🔒</span>
              </div>
            )}

            {/* 场景预览 */}
            <div className={styles.levelPreview}>
              <img
                className={styles.levelSceneImage}
                src={level.sceneImage}
                alt={level.sceneAlt}
              />
            </div>

            {/* 角色 + 关卡名 */}
            <div className={styles.levelInfoRow}>
              <div className={styles.characterHeroWrap}>
                <img
                  className={styles.characterHero}
                  src={level.characterImage}
                  alt={level.characterName}
                />
              </div>
              <div className={styles.charDesc}>{level.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 开始按钮 ── */}
      <button className={styles.btnPrimary} onClick={onStart}>
        {startButtonText}
      </button>
    </div>
  )
}

export default LevelSelectPage
export type { LevelCardConfig, LevelSelectPageProps }
