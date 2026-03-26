#!/usr/bin/env node
/**
 * extract-skill · 第三步：同步 public/asset-data.json 的 URL 字段
 *
 * 数据源：
 *   - public/asset-data.json → 主数据文件（ASSETS 含 prompt/size/type 等元数据）
 *   - asset-urls.ts          → CDN URL（ASSET_URLS）、角色（CHARACTERS）、BGM、TTS_URLS
 *   - 素材库/tts-data.json   → TTS 台词元数据（role/text/scene/trigger，不含 url）[可选]
 *
 * 作用：将 asset-urls.ts 中最新的 URL 同步回 asset-data.json 各条目的 url 字段。
 *       ASSETS 元数据（prompt/size/type/materialId）由 AI 直接编辑 asset-data.json 维护。
 *
 * 使用方式（项目根目录下运行）：
 *   node .claude/skills/preview-skill/scripts/gen-asset-data.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';

// ─── 查找项目根目录（向上查找含 public/asset-data.json 的目录） ───
function findRootDir() {
  let dir = process.cwd();
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, 'public', 'asset-data.json'))) return dir;
    if (existsSync(join(dir, 'asset-urls.ts'))) return dir;
    dir = dirname(dir);
  }
  return process.cwd();
}
const rootDir = findRootDir();
const outPath = join(rootDir, 'public', 'asset-data.json');

// ═══ 1. 读取现有 asset-data.json 的 ASSETS（元数据来源） ═══
let existingData = { ASSETS: [], SECTIONS: [], CHARACTERS: null, BGM_URLS: {}, TTS_URLS: {}, TTS_DATA: [] };
if (existsSync(outPath)) {
  existingData = JSON.parse(readFileSync(outPath, 'utf-8'));
}

// ═══ 2. 读取 CDN URL ═══
let tsCode = readFileSync(join(rootDir, 'asset-urls.ts'), 'utf-8');

// 去掉 TypeScript 语法，转为可执行 JS
tsCode = tsCode
  .replace(/export\s+type\s+\w+\s*=[^;\n]*;?/g, '')
  .replace(/export\s+function\s+\w+\s*\([^)]*\)[^{]*\{[^}]*\}/g, '')
  .replace(/:\s*Record<[^>]+>/g, '')
  .replace(/:\s*string\b/g, '')
  .replace(/\bas\s+const\b/g, '')
  .replace(/export\s+const/g, 'const');

const extractFn = new Function(`
  ${tsCode}
  return { ASSET_URLS, CHARACTERS, BGM_URLS, TTS_URLS };
`);
const { ASSET_URLS, CHARACTERS, BGM_URLS, TTS_URLS } = extractFn();

// ═══ 3. 将 ASSET_URLS 的最新 URL 同步回 ASSETS 各条目 ═══
const ASSETS = existingData.ASSETS.map(item => ({
  ...item,
  url: ASSET_URLS[item.name] ?? item.url ?? null,
}));

// ═══ 4. 推导素材分组（SECTIONS）从 materialId 前缀 ═══
function deriveGroupKey(materialId) {
  if (materialId.startsWith('SCENE_')) return 'scene';
  const propMatch = materialId.match(/^PROP_L(\d+)_([A-Z]+)/);
  if (propMatch) return `L${propMatch[1]}_${propMatch[2].toLowerCase()}`;
  const tagMatch = materialId.match(/^TAG_L(\d+)/);
  if (tagMatch) return `L${tagMatch[1]}_task_tag`;
  return 'misc';
}

const GROUP_LABEL = {
  scene: { label: '场景背景', icon: '🌊', category: 'scene', transparentBg: false },
  L1_story: { label: '关卡1·故事卡片', icon: '📖', category: 'prop', transparentBg: true },
  L1_tag: { label: '关卡1·工具图标', icon: '🏷️', category: 'prop', transparentBg: true },
  L1_phone: { label: '关卡1·桌面物品', icon: '🪑', category: 'prop', transparentBg: true },
  L1_task_tag: { label: '关卡1·任务标签', icon: '🏷️', category: 'prop', transparentBg: false },
  L2_robot: { label: '关卡2·机器人', icon: '🤖', category: 'prop', transparentBg: true },
  L2_task_tag: { label: '关卡2·任务标签', icon: '🏷️', category: 'prop', transparentBg: false },
  L3_task_tag: { label: '关卡3·任务标签', icon: '🏷️', category: 'prop', transparentBg: false },
};

function normalizeGroupKey(rawKey) {
  if (rawKey.startsWith('L1_') && !['L1_story', 'L1_tag', 'L1_task_tag'].includes(rawKey)) return 'L1_desk';
  if (rawKey.startsWith('L2_') && !['L2_robot', 'L2_task_tag'].includes(rawKey)) return 'L2_desk';
  if (rawKey.startsWith('L3_') && !['L3_task_tag'].includes(rawKey)) return 'L3_desk';
  return rawKey;
}

const DESK_DEFAULTS = {
  L1_desk: { label: '关卡1·桌面物品', icon: '🪑', category: 'prop', transparentBg: true },
  L2_desk: { label: '关卡2·桌面物品', icon: '🪑', category: 'prop', transparentBg: true },
  L3_desk: { label: '关卡3·桌面物品', icon: '🪑', category: 'prop', transparentBg: true },
};

const groupMap = {};
for (const asset of ASSETS) {
  if (asset.type !== 12) continue;
  const rawKey = deriveGroupKey(asset.materialId);
  const key = normalizeGroupKey(rawKey);
  if (!groupMap[key]) groupMap[key] = [];
  groupMap[key].push(asset.materialId);
}

const SECTIONS = Object.entries(groupMap).map(([key, materialIds]) => {
  const meta = GROUP_LABEL[key] || DESK_DEFAULTS[key] || { label: key, icon: '🎭', category: 'prop', transparentBg: false };
  return { key, ...meta, materialIds };
});

// ═══ 5. 读取 TTS 台词数据（可选，从 tts-data.json 读取，URL 从 TTS_URLS 补入） ═══
const ttsDataPath = join(rootDir, '素材库', 'tts-data.json');
let TTS_DATA = [];
if (existsSync(ttsDataPath)) {
  const ttsRaw = JSON.parse(readFileSync(ttsDataPath, 'utf-8'));
  TTS_DATA = ttsRaw.map(t => ({
    ...t,
    url: (TTS_URLS && TTS_URLS[t.id]) || t.url || '',
  }));
}

const data = {
  _meta: {
    generatedAt: new Date().toISOString(),
    sources: ['public/asset-data.json (ASSETS)', 'asset-urls.ts', existsSync(ttsDataPath) ? '素材库/tts-data.json' : null].filter(Boolean),
    description: 'ASSETS 由 AI 直接维护；url 字段由 gen-asset-data.mjs 从 asset-urls.ts 同步。',
  },
  ASSET_URLS,
  ASSETS,
  SECTIONS,
  CHARACTERS,
  BGM_URLS,
  TTS_URLS,
  TTS_DATA,
};

writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8');

const withUrl = ASSETS.filter(a => a.url).length;
const noUrl = ASSETS.filter(a => !a.url).length;
const charCount = CHARACTERS ? (Array.isArray(CHARACTERS) ? CHARACTERS.length : Object.keys(CHARACTERS).length) : 0;
console.log(`✅ 已生成 public/asset-data.json`);
console.log(`   素材: ${ASSETS.length} (${withUrl} 有URL, ${noUrl} 待部署) | 分组: ${SECTIONS.length} | 角色: ${charCount} | BGM: ${BGM_URLS ? Object.keys(BGM_URLS).length : 0} | TTS台词: ${TTS_DATA.length}`);
