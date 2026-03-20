#!/usr/bin/env node
/**
 * generate-preview.js — AI素材工坊 Preview 页面生成器
 *
 * 从项目的 materials.json / tts.json / index.tsx 中读取数据，
 * 结合通用模板 preview-template.html，生成项目专属的 preview.html。
 *
 * 用法:
 *   node generate-preview.js [--project-dir <path>] [--output <path>]
 *
 * 参数:
 *   --project-dir  项目根目录（默认为 cwd 向上查找含 素材库/ 的目录）
 *   --output       输出文件路径（默认 素材库/preview.html）
 *   --open         生成后自动打开
 */

const fs = require('fs');
const path = require('path');

// ─── 参数解析 ───
const args = process.argv.slice(2);
let projectDir = '';
let outputPath = '';
let autoOpen = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--project-dir' && args[i + 1]) { projectDir = args[++i]; }
  else if (args[i] === '--output' && args[i + 1]) { outputPath = args[++i]; }
  else if (args[i] === '--open') { autoOpen = true; }
}

// 查找项目根目录
if (!projectDir) {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, '素材库'))) { projectDir = dir; break; }
    dir = path.dirname(dir);
  }
  if (!projectDir) projectDir = process.cwd();
}

if (!outputPath) {
  outputPath = path.join(projectDir, '素材库', 'preview.html');
}

const materialsPath = path.join(projectDir, '素材库', 'materials.json');
const ttsPath = path.join(projectDir, '素材库', 'tts.json');
const assetsPath = path.join(projectDir, '素材库', 'assets.json');
const indexPath = path.join(projectDir, 'index.tsx');
const templatePath = path.join(__dirname, '..', 'templates', 'preview-template.html');

// ─── 加载数据 ───
function loadJSON(p) {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function loadFile(p) {
  if (!fs.existsSync(p)) return '';
  return fs.readFileSync(p, 'utf-8');
}

const materials = loadJSON(materialsPath);
const ttsData = loadJSON(ttsPath);
const assetsData = loadJSON(assetsPath);
const indexSource = loadFile(indexPath);
const template = loadFile(templatePath);

if (!template) {
  console.error('❌ 模板文件不存在:', templatePath);
  process.exit(1);
}

if (!materials) {
  console.error('❌ materials.json 不存在:', materialsPath);
  process.exit(1);
}

// ─── 提取项目信息 ───
const meta = materials.meta || {};
const projectName = meta.project || path.basename(projectDir);
const sourceFile = meta.sourceFile || 'index.tsx';
const generatedAt = new Date().toISOString().split('T')[0];

// 项目图标（尝试从 nav-brand 或使用默认）
let projectIcon = '🎮';
// 从现有 preview.html 尝试继承图标
const existingPreview = loadFile(outputPath);
const iconMatch = existingPreview.match(/nav-brand-icon[^>]*>([^<]+)</);
if (iconMatch) projectIcon = iconMatch[1].trim();

// ─── 构建场景数据 (SCENES) ───
function buildScenes() {
  const scenes = [];
  const profile = materials.materialProfile || {};

  // globalScenes
  for (const s of (profile.globalScenes || [])) {
    scenes.push(buildSceneItem(s, '通用'));
  }

  // levelScenes
  for (const s of (profile.levelScenes || [])) {
    const levelMatch = s.materialId.match(/LEVEL(\d+)/);
    const level = levelMatch ? 'L' + levelMatch[1] : '通用';
    scenes.push(buildSceneItem(s, level));
  }

  return scenes;
}

function buildSceneItem(s, level) {
  const sizeStr = s.spec ? s.spec.size.replace('x', '×') : '';
  return {
    id: s.materialId,
    name: s.name,
    level: level,
    status: s.status || 'planned',
    spec: sizeStr,
    priority: s.priority || 'P0',
    url: (s.status === 'produced' || s.status === 'deployed') && s.remoteUrl ? s.remoteUrl : null,
    prompt: s.prompt || findPromptFromAssets(s.name) || '',
    icon: guessIcon(s.name),
  };
}

function findPromptFromAssets(name) {
  if (!assetsData) return '';
  for (const group of assetsData) {
    if (group.type === 12) {
      for (const item of (group.text || [])) {
        if (item.name === name) return item.prompt || '';
      }
    }
  }
  return '';
}

function guessIcon(name) {
  // 通用关卡/场景图标推断（无项目专属关键词）
  if (/开始|首页|start|home/i.test(name)) return '🏠';
  if (/关卡1|L1|level.?1/i.test(name)) return '🏞️';
  if (/关卡2|L2|level.?2/i.test(name)) return '🌊';
  if (/关卡3|L3|level.?3/i.test(name)) return '🏔️';
  if (/关卡4|L4|level.?4/i.test(name)) return '🌋';
  if (/关卡5|L5|level.?5/i.test(name)) return '🌌';
  if (/关卡|level/i.test(name)) return '🗺️';
  if (/背景|bg/i.test(name)) return '🖼️';
  return '📸';
}

// ─── 构建道具分组 (PROP_GROUPS) ───
function buildPropGroups() {
  const profile = materials.materialProfile || {};
  const groups = [];

  // levelProps — 按子分组
  const levelProps = profile.levelProps || {};
  for (const [groupKey, items] of Object.entries(levelProps)) {
    if (!items || !items.length) continue;
    const groupLabel = guessGroupLabel(groupKey, items);
    const groupIcon = guessGroupIcon(groupKey);
    groups.push({
      key: groupKey,
      label: groupLabel,
      icon: groupIcon,
      gridId: groupKey + 'Grid',
      sectionId: 'sec-' + groupKey,
      items: items.map(i => buildPropItem(i)),
    });
  }

  // feedbackProps
  const feedbackProps = profile.feedbackProps || [];
  if (feedbackProps.length) {
    groups.push({
      key: 'feedback',
      label: '特效 & 反馈',
      icon: '💫',
      gridId: 'feedbackGrid',
      sectionId: 'sec-feedback',
      items: feedbackProps.map(i => buildPropItem(i)),
    });
  }

  // uiProps（计时魔法等项目使用 materialProfile.uiProps）
  const uiProps = profile.uiProps || [];
  if (uiProps.length) {
    groups.push({
      key: 'ui',
      label: 'UI 元素',
      icon: '🎨',
      gridId: 'uiGrid',
      sectionId: 'sec-ui',
      items: uiProps.map(i => buildPropItem(i)),
    });
  }

  // UI from artChecklist（金色渔夫等项目使用 artChecklist.uiFromManifest）
  const uiFromManifest = materials.artChecklist?.uiFromManifest?.items || [];
  if (uiFromManifest.length && !uiProps.length) {
    groups.push({
      key: 'ui',
      label: 'UI 元素',
      icon: '🎨',
      gridId: 'uiGrid',
      sectionId: 'sec-ui',
      items: uiFromManifest.map(i => buildPropItem(i)),
    });
  }

  return groups;
}

function buildPropItem(p) {
  const sizeStr = p.spec ? p.spec.size.replace('x', '×') + (p.spec.format ? ' ' + p.spec.format.toUpperCase() : '') : '';
  const levelMatch = p.usage?.match(/关卡(\d)/);
  let level = '通用';
  if (p.usage) {
    if (/所有关卡|全关卡|核心/.test(p.usage)) level = '全关卡';
    else if (/关卡3/.test(p.usage)) level = 'L3';
    else if (/关卡2\+|关卡2及/.test(p.usage)) level = 'L2+';
    else if (/关卡2/.test(p.usage)) level = 'L2';
    else if (/关卡1/.test(p.usage)) level = 'L1';
  }
  return {
    id: p.materialId,
    name: p.name,
    level: level,
    status: p.status || 'planned',
    spec: sizeStr,
    priority: p.priority || 'P1',
    url: (p.status === 'produced' || p.status === 'deployed') && p.remoteUrl ? p.remoteUrl : null,
    prompt: p.prompt || findPromptFromAssets(p.name) || '',
    icon: p.emoji || guessPropIcon(p.name, p.category),
  };
}

// 通用分组标签推断词典（按 materials.json 中 levelProps 的 key 匹配）
const GROUP_LABEL_DICT = [
  [/fish|鱼/, '鱼类道具', '🐟'],
  [/tool|工具/, '工具道具', '🧰'],
  [/obstacle|障碍|干扰/, '障碍物', '🚧'],
  [/desk|桌面/, '桌面物品', '🪑'],
  [/story|故事|卡片/, '故事卡片', '📖'],
  [/robot|机器人/, '机器人', '🤖'],
  [/bead|珠/, '珠子道具', '📿'],
  [/card|卡/, '卡牌道具', '🃏'],
  [/chess|棋/, '棋子道具', '♟️'],
  [/word|单词|letter/, '文字道具', '🔤'],
  [/enemy|敌/, '敌人', '👾'],
  [/food|食物|水果/, '食材道具', '🍎'],
  [/animal|动物/, '动物道具', '🐾'],
  [/plant|植物/, '植物道具', '🌱'],
  [/weapon|武器/, '武器道具', '⚔️'],
];

// 从 key 中提取关卡前缀，如 "level1_desk" → "关卡1·"
function extractLevelPrefix(key) {
  const m = key.match(/^level(\d+)[_-]/);
  if (m) return '关卡' + m[1] + '·';
  const m2 = key.match(/^l(\d+)[_-]/i);
  if (m2) return '关卡' + m2[1] + '·';
  return '';
}

function guessGroupLabel(key, items) {
  const prefix = extractLevelPrefix(key);
  // 去掉关卡前缀后再匹配
  const cleanKey = key.replace(/^level\d+[_-]/i, '').replace(/^l\d+[_-]/i, '');
  for (const [pattern, label] of GROUP_LABEL_DICT) {
    if (pattern.test(cleanKey) || pattern.test(key)) return prefix + label;
  }
  // fallback: 将 key 转为可读标签
  const fallback = cleanKey.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return prefix + fallback;
}

function guessGroupIcon(key) {
  const cleanKey = key.replace(/^level\d+[_-]/i, '').replace(/^l\d+[_-]/i, '');
  for (const [pattern, , icon] of GROUP_LABEL_DICT) {
    if (pattern.test(cleanKey) || pattern.test(key)) return icon;
  }
  return '🎭';
}

// 通用道具图标推断词典（按素材 name 匹配）
const PROP_ICON_DICT = [
  // 通用 UI
  [/星|star/, '⭐'], [/锁|lock/, '🔒'], [/计时|timer|clock/, '⏱️'],
  [/金币|coin/, '🪙'], [/钥匙|key/, '🔑'], [/宝箱|chest/, '📦'],
  // 反馈特效
  [/成功|sparkle|success/, '✨'], [/误|错|wrong|fail/, '❌'],
  [/庆祝|celebration|win/, '🎉'], [/爆炸|boom|explode/, '💥'],
  // 自然元素
  [/气泡|bubble/, '💧'], [/漂浮|float|leaf/, '🍃'],
  [/火|fire/, '🔥'], [/冰|ice|snow/, '❄️'], [/雷|thunder/, '⚡'],
  // 动物
  [/鱼|fish/, '🐟'], [/鸟|bird/, '🐦'], [/猫|cat/, '🐱'],
  // 颜色 + 通用形状
  [/红色|red/, '🔴'], [/蓝色|blue/, '🔵'], [/绿色|green/, '🟢'],
  [/金色|golden|yellow/, '🟡'], [/紫色|purple/, '🟣'],
];

function guessPropIcon(name, category) {
  for (const [pattern, icon] of PROP_ICON_DICT) {
    if (pattern.test(name)) return icon;
  }
  if (/feedback|特效/.test(category)) return '✨';
  return '🎭';
}

// ─── 提取角色数据 (CHARACTERS) ───
function buildCharacters() {
  const chars = [];
  // 从 index.tsx 的 CHARACTERS 常量提取
  const charMatch = indexSource.match(/const CHARACTERS\s*=\s*\{([\s\S]*?)\}\s*as\s*const/);
  if (!charMatch) return chars;

  const charBlock = charMatch[1];
  const charEntries = charBlock.match(/(\w+)\s*:\s*\{[^}]+\}/g) || [];

  for (const entry of charEntries) {
    const id = entry.match(/^(\w+)/)?.[1] || '';
    const name = entry.match(/name:\s*['"]([^'"]+)['"]/)?.[1] || id;
    const color = entry.match(/themeColor:\s*['"]([^'"]+)['"]/)?.[1] || '#888';
    const idle = entry.match(/idle:\s*['"]([^'"]+)['"]/)?.[1] || '';
    const speaking = entry.match(/speaking:\s*['"]([^'"]+)['"]/)?.[1] || '';

    // 从 TTS 数据驱动查找音色配置，fallback 到 roles-skill
    const voiceCfg = findVoiceConfigForRole(id);
    const rolesVoice = !voiceCfg ? getRolesVoiceConfig()[id] : null;
    chars.push({
      id, name, color,
      model: voiceCfg?.model || rolesVoice?.model || null,
      ref_audio: voiceCfg?.ref_audio || rolesVoice?.ref_audio || null,
      voiceDesc: voiceCfg ? (name + '音色') : (rolesVoice?.voiceDesc || name + '音色'),
      idle, speaking,
    });
  }

  return chars;
}

// ─── 角色音色查找（优先 TTS 数据驱动，fallback 读 roles-skill） ───

// 从 roles-skill/SKILL.md 解析 TTS 音色配置表作为 fallback
// FIX: 同时按角色ID和中文名建索引，因为 tts.json 的 roleTTS.role 可能是中文名
function loadRolesSkillVoiceConfig() {
  const rolesSkillPath = path.join(__dirname, '..', '..', 'roles-skill', 'SKILL.md');
  if (!fs.existsSync(rolesSkillPath)) return {};
  const content = fs.readFileSync(rolesSkillPath, 'utf-8');
  // 匹配表格行: | `角色ID` | 名称 | `model` | `ref_audio` | 音色描述 |
  const rows = content.match(/\|\s*`(\w+)`\s*\|\s*([^\|]+?)\s*\|\s*`(\d+)`\s*\|\s*`(\d+)`\s*\|\s*([^\|]+?)\s*\|/g) || [];
  const map = {};
  for (const row of rows) {
    const m = row.match(/\|\s*`(\w+)`\s*\|\s*([^\|]+?)\s*\|\s*`(\d+)`\s*\|\s*`(\d+)`\s*\|\s*([^\|]+?)\s*\|/);
    if (m) {
      const entry = { model: parseInt(m[3]), ref_audio: parseInt(m[4]), voiceDesc: m[5].trim() };
      map[m[1]] = entry;                // 按角色ID索引: xiao_an, narrator
      map[m[2].trim()] = entry;         // 按中文名索引: 小安, 旁白
    }
  }
  return map;
}

let _rolesVoiceCache = null;
function getRolesVoiceConfig() {
  if (!_rolesVoiceCache) _rolesVoiceCache = loadRolesSkillVoiceConfig();
  return _rolesVoiceCache;
}

function buildVoiceLookup() {
  // 从 assets.json 中的 TTS 配置构建 {name → {model, ref_audio}} 映射
  const lookup = {};
  if (assetsData) {
    for (const group of assetsData) {
      if (group.type === 21) {
        for (const item of (group.text || [])) {
          lookup[item.name] = { model: item.model, ref_audio: item.ref_audio };
        }
      }
    }
  }
  return lookup;
}

function findVoiceConfigForRole(roleId) {
  // 在 tts.json 的 roleTTS 中找到该角色的第一条 TTS 条目，再从 assets.json 查 model/ref_audio
  const voiceLookup = buildVoiceLookup();
  if (ttsData && ttsData.roleTTS) {
    for (const roleGroup of ttsData.roleTTS) {
      if (roleGroup.role === roleId && roleGroup.lines && roleGroup.lines.length > 0) {
        const firstLineId = roleGroup.lines[0].id;
        if (voiceLookup[firstLineId]) return voiceLookup[firstLineId];
      }
    }
  }
  return null;
}

function findNarratorVoiceConfig() {
  // 从 narratorTTS 的第一条条目查找
  const voiceLookup = buildVoiceLookup();
  if (ttsData && ttsData.narratorTTS && ttsData.narratorTTS.length > 0) {
    const firstId = ttsData.narratorTTS[0].id;
    if (voiceLookup[firstId]) return voiceLookup[firstId];
  }
  return { model: null, ref_audio: null };
}

// ─── 提取 BGM 数据 ───
function buildBGMs() {
  const bgms = [];
  // 从 index.tsx 提取 BGM URL
  const bgmMatch = indexSource.match(/const\s+BGM_URLS\s*=\s*\{([\s\S]*?)\}/);
  if (bgmMatch) {
    const block = bgmMatch[1];
    const entries = block.match(/(\w+)\s*:\s*['"]([^'"]+)['"]/g) || [];
    // 通用 BGM key → 说明映射（key 名称来自 copilot-instructions.md 标准定义）
    const nameMap = {
      main: { name: '主流程 BGM', desc: '默认播放' },
      progress: { name: '进行中 BGM', desc: '行动阶段循环播放' },
      rest: { name: '休息 BGM', desc: '暂停/休息时切换播放' },
    };
    for (const e of entries) {
      const m = e.match(/(\w+)\s*:\s*['"]([^'"]+)['"]/);
      if (m) {
        const key = m[1];
        const url = m[2];
        const info = nameMap[key] || { name: key + ' BGM', desc: '' };
        bgms.push({ id: key, name: info.name, desc: info.desc, url });
      }
    }
  }

  // 无 fallback — BGM 数据完全来自项目 index.tsx，不使用硬编码 URL

  return bgms;
}

// ─── 构建 TTS 数据 ───
function buildTTS() {
  if (!ttsData) return [];
  const tts = [];

  // assets.json 中的 TTS 配置（含 model/ref_audio）
  const ttsConfig = {};
  if (assetsData) {
    for (const group of assetsData) {
      if (group.type === 21) {
        for (const item of (group.text || [])) {
          ttsConfig[item.name] = item;
        }
      }
    }
  }

  // FIX: roles-skill 音色配置作为 fallback，解决新项目没有 assets.json 时模型/音色显示为"—"的问题
  const rolesVoice = getRolesVoiceConfig();

  // narratorTTS — fallback 到 roles-skill 的 narrator 配置
  const narratorFallback = rolesVoice['narrator'] || rolesVoice['旁白'] || {};
  // FIX: narratorTTS 可能是对象（含 lines 数组）或数组，统一处理
  const narratorLines = Array.isArray(ttsData.narratorTTS)
    ? ttsData.narratorTTS
    : (ttsData.narratorTTS && Array.isArray(ttsData.narratorTTS.lines) ? ttsData.narratorTTS.lines : []);
  for (const t of narratorLines) {
    const cfg = ttsConfig[t.id] || {};
    tts.push({
      role: 'narrator',
      name: t.id,
      stage: t.scene || '',
      model: cfg.model || narratorFallback.model || null,
      ref_audio: cfg.ref_audio || narratorFallback.ref_audio || null,
      content: t.text,
      url: t.url || '',
    });
  }

  // roleTTS — fallback 到 roles-skill 对应角色的配置
  for (const roleGroup of (ttsData.roleTTS || [])) {
    const roleFallback = rolesVoice[roleGroup.role] || {};
    for (const t of (roleGroup.lines || [])) {
      const cfg = ttsConfig[t.id] || {};
      tts.push({
        role: roleGroup.role || 'unknown',
        name: t.id,
        stage: t.scene || '',
        model: cfg.model || roleFallback.model || null,
        ref_audio: cfg.ref_audio || roleFallback.ref_audio || null,
        content: t.text,
        url: t.url || '',
      });
    }
  }

  // uiTTS — 无角色音色 fallback
  // FIX: uiTTS 可能是对象（含 lines 数组）或数组，统一处理
  const uiLines = Array.isArray(ttsData.uiTTS)
    ? ttsData.uiTTS
    : (ttsData.uiTTS && Array.isArray(ttsData.uiTTS.lines) ? ttsData.uiTTS.lines : []);
  for (const t of uiLines) {
    const cfg = ttsConfig[t.id] || {};
    tts.push({
      role: 'ui',
      name: t.id,
      stage: t.scene || '',
      model: cfg.model || null,
      ref_audio: cfg.ref_audio || null,
      content: t.text,
      url: t.url || '',
    });
  }

  return tts;
}

// ─── 加载音效参考库（ai-sounds/references/sounds.md）───
function loadSoundsReference() {
  const soundsRef = {};
  const refPath = path.join(__dirname, '..', '..', 'ai-sounds', 'references', 'sounds.md');
  if (!fs.existsSync(refPath)) return soundsRef;
  const content = fs.readFileSync(refPath, 'utf-8');
  let currentCategory = '';
  for (const line of content.split('\n')) {
    const catMatch = line.match(/^###\s+(.+)/);
    if (catMatch) { currentCategory = catMatch[1].trim(); continue; }
    const rowMatch = line.match(/^\|\s*(\w[\w-]*\w?)\s*\|\s*([^|]+)\s*\|\s*([^|]*)\s*\|/);
    if (rowMatch && rowMatch[1] !== 'id' && rowMatch[1] !== '---') {
      soundsRef[rowMatch[1].trim()] = {
        name: rowMatch[2].trim(),
        description: rowMatch[3].trim(),
        category: currentCategory,
      };
    }
  }
  return soundsRef;
}

// ─── 构建音效数据（从 index.tsx 提取 ai-sounds 使用情况）───
function buildSoundEffects() {
  if (!indexSource) return [];
  const soundsRef = loadSoundsReference();

  // 扫描 soundLibrary.play('xxx') 调用
  const regex = /soundLibrary\.play\(['"]([\w-]+)['"]\)/g;
  const usageMap = {};
  let match;
  while ((match = regex.exec(indexSource)) !== null) {
    const id = match[1];
    if (!usageMap[id]) usageMap[id] = { count: 0, contexts: [] };
    usageMap[id].count++;
  }

  // 提取使用上下文
  const lines = indexSource.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const lineRegex = /soundLibrary\.play\(['"]([\w-]+)['"]\)/g;
    let lm;
    while ((lm = lineRegex.exec(lines[i])) !== null) {
      const id = lm[1];
      if (usageMap[id]) {
        let ctx = lines[i].trim();
        if (ctx.length > 120) ctx = ctx.substring(0, 120) + '...';
        usageMap[id].contexts.push({ line: i + 1, code: ctx });
      }
    }
  }

  const effects = [];
  for (const [id, usage] of Object.entries(usageMap)) {
    const ref = soundsRef[id] || {};
    effects.push({
      id,
      name: ref.name || id,
      description: ref.description || '',
      category: ref.category || '未分类',
      count: usage.count,
      contexts: usage.contexts,
    });
  }

  return effects.sort((a, b) => b.count - a.count);
}

// ─── 构建导航栏 HTML ───
function buildNavItems(scenes, propGroups) {
  let html = '';

  // 总览
  html += '  <div class="nav-group-label">总览</div>\n';
  html += '  <div class="nav-items">\n';
  html += '    <button class="nav-item active" onclick="navTo(\'sec-pipeline\')"><span class="nav-icon">📊</span>生产线<span class="nav-dot empty"></span></button>\n';
  html += '    <button class="nav-item" onclick="navTo(\'sec-levels\')"><span class="nav-icon">🗺️</span>关卡设计</button>\n';
  html += '  </div>\n';

  // 场景
  html += '\n  <div class="nav-group-label">场景</div>\n';
  html += '  <div class="nav-items">\n';
  html += '    <button class="nav-item" onclick="navTo(\'sec-scenes\')"><span class="nav-icon">🌊</span>背景图<span class="nav-dot empty"></span></button>\n';
  html += '  </div>\n';

  // 道具
  html += '\n  <div class="nav-group-label">道具</div>\n';
  html += '  <div class="nav-items">\n';
  for (const g of propGroups) {
    html += '    <button class="nav-item" onclick="navTo(\'' + g.sectionId + '\')"><span class="nav-icon">' + g.icon + '</span>' + g.label.replace(/\s*&\s*/g, '&amp;').split(/[·（(]/)[0].trim() + '<span class="nav-dot empty"></span></button>\n';
  }
  html += '  </div>\n';

  // 音频
  html += '\n  <div class="nav-group-label">音频</div>\n';
  html += '  <div class="nav-items">\n';
  html += '    <button class="nav-item" onclick="navTo(\'sec-chars\')"><span class="nav-icon">🧑‍🎓</span>角色</button>\n';
  html += '    <button class="nav-item" onclick="navTo(\'sec-bgm\')"><span class="nav-icon">🎵</span>BGM</button>\n';
  html += '    <button class="nav-item" onclick="navTo(\'sec-sfx\')"><span class="nav-icon">🔊</span>音效</button>\n';
  html += '    <button class="nav-item" onclick="navTo(\'sec-tts\')"><span class="nav-icon">🗣️</span>TTS<span class="nav-dot empty"></span></button>\n';
  html += '  </div>\n';

  return html;
}

// ─── 构建关卡 HTML ───
function buildLevelsHTML() {
  // 尝试从现有 preview.html 继承关卡 HTML（因为关卡设计是手写的）
  if (existingPreview) {
    const levelsMatch = existingPreview.match(/<div class="section" id="sec-levels">([\s\S]*?)<\/div>\s*\n\s*<div class="category-banner/);
    if (levelsMatch) {
      return '<div class="section" id="sec-levels">' + levelsMatch[1] + '</div>';
    }
  }

  const profile = materials.materialProfile || {};
  const levelScenes = profile.levelScenes || [];
  const levelProps = profile.levelProps || {};
  const feedbackProps = profile.feedbackProps || [];
  // 计时魔法等项目可能还有 uiProps
  const uiProps = profile.uiProps || [];
  const allArtItems = (materials.artChecklist?.deployed?.items || [])
    .concat(materials.artChecklist?.planned?.items || [])
    .concat(materials.artChecklist?.uiFromManifest?.items || []);

  if (!levelScenes.length) {
    return '<div class="section" id="sec-levels">\n  <h2 class="section-title">游戏关卡</h2>\n  <p style="color:var(--muted)">暂无关卡数据，请在 extract-skill 中配置</p>\n</div>';
  }

  // 将 levelScenes 按关卡号分组
  const levelGroups = {};
  for (const s of levelScenes) {
    const m = s.materialId?.match(/LEVEL(\d+)/i) || s.name?.match(/关卡(\d)/);
    const levelNum = m ? parseInt(m[1]) : 0;
    if (!levelGroups[levelNum]) levelGroups[levelNum] = { scenes: [], num: levelNum };
    levelGroups[levelNum].scenes.push(s);
  }
  const sortedLevels = Object.values(levelGroups).sort((a, b) => a.num - b.num);

  // 收集每关出现的道具（从 levelProps 的 usage 字段推断）
  function getPropsForLevel(levelNum) {
    const props = [];
    for (const [groupKey, items] of Object.entries(levelProps)) {
      for (const p of items) {
        const usage = (p.usage || '').toLowerCase();
        const usesInLevel =
          /所有关卡|全关卡|核心|全部/.test(usage) ||
          new RegExp('关卡' + levelNum + '(?!\\+|及)').test(usage) ||
          new RegExp('l' + levelNum + '(?!\\+)', 'i').test(usage) ||
          (levelNum >= 2 && /关卡2\+|关卡2及以上|l2\+/i.test(usage)) ||
          (levelNum >= 3 && /关卡3\+|关卡3及以上|l3\+/i.test(usage));
        if (usesInLevel) {
          props.push({ name: p.name, emoji: p.emoji || guessPropIcon(p.name, p.category), category: p.category });
        }
      }
    }
    // 也检查 feedbackProps 和 uiProps
    for (const p of feedbackProps.concat(uiProps)) {
      const usage = (p.usage || '').toLowerCase();
      const usesInLevel =
        /所有关卡|全关卡|通用/.test(usage) ||
        new RegExp('关卡' + levelNum).test(usage);
      if (usesInLevel) {
        props.push({ name: p.name, emoji: p.emoji || guessPropIcon(p.name, p.category), category: p.category || 'ui' });
      }
    }
    return props;
  }

  const colors = ['#4ecdc4', '#f5a623', '#ff6b6b', '#a78bfa', '#4ecdc4'];
  const difficulties = ['⭐ 简单', '⭐⭐ 中等', '⭐⭐⭐ 困难', '⭐⭐⭐⭐ 极难', '⭐⭐⭐⭐⭐ 地狱'];

  let html = '<div class="section" id="sec-levels">\n';
  html += '  <h2 class="section-title">游戏关卡 (' + sortedLevels.length + ')</h2>\n';
  html += '  <div class="grid grid-levels">\n';

  for (let idx = 0; idx < sortedLevels.length; idx++) {
    const group = sortedLevels[idx];
    const color = colors[idx % colors.length];
    const mainScene = group.scenes[0];
    const levelNum = group.num;

    // 提取关卡名和副标题
    const rawName = mainScene.name || ('关卡' + levelNum);
    // 去掉 "关卡N背景 — " 或 "关卡N背景—" 前缀，提取真正的场景名
    const sceneName = rawName.replace(/^关卡\d+背景\s*[—\-]\s*/, '');
    const displayName = '关卡' + levelNum + (sceneName !== rawName ? ' — ' + sceneName : '');

    // 背景缩略图
    const bgUrl = mainScene.remoteUrl || null;
    const bgThumb = bgUrl ? '<div class="level-bg-thumb" style="background-image:url(\'' + bgUrl + '\')"></div>' : '';

    // 步骤场景（同一关卡多个 scene）
    let stepsInfo = '';
    if (group.scenes.length > 1) {
      const stepNames = group.scenes.map(s => {
        const stepMatch = s.materialId?.match(/STEP(\d+)/i) || s.name?.match(/step\s*(\d+)/i);
        return stepMatch ? 'step' + stepMatch[1] : s.name;
      });
      stepsInfo = '<p class="level-steps-info">' + stepNames[0] + ' ~ ' + stepNames[stepNames.length - 1] + ' 共' + group.scenes.length + '个步骤场景</p>';
    }

    // 本关出现的道具
    const levelPropsList = getPropsForLevel(levelNum);
    let propsHtml = '';
    if (levelPropsList.length > 0) {
      propsHtml = '<h4>出现元素</h4>\n        <div class="level-tags">\n';
      for (const p of levelPropsList) {
        const tagClass = p.category === 'prop' ? 'fish' : (p.category === 'ui' ? 'mechanic' : 'mechanic');
        propsHtml += '          <span class="level-tag ' + tagClass + '">' + p.emoji + ' ' + p.name + '</span>\n';
      }
      propsHtml += '          <span class="level-tag difficulty">' + (difficulties[idx] || difficulties[difficulties.length - 1]) + '</span>\n';
      propsHtml += '        </div>';
    }

    // 用途说明
    const usageText = mainScene.usage || '';

    html += '    <div class="level-card" style="border-top: 3px solid ' + color + '">\n';
    html += '      ' + bgThumb + '\n';
    html += '      <div class="level-header">\n';
    html += '        <span class="level-icon">' + guessIcon(mainScene.name) + '</span>\n';
    html += '        <div>\n';
    html += '          <div class="level-name">' + displayName + '</div>\n';
    if (usageText) {
      html += '          <div class="level-subtitle">' + usageText + '</div>\n';
    }
    html += '        </div>\n';
    html += '      </div>\n';
    html += '      <div class="level-body">\n';
    if (stepsInfo) html += '        ' + stepsInfo + '\n';
    if (propsHtml) html += '        ' + propsHtml + '\n';
    html += '      </div>\n';
    html += '    </div>\n';
  }

  html += '  </div>\n</div>';
  return html;
}

// ─── 构建内容区 HTML ───
function buildSectionsHTML(propGroups) {
  let html = '';

  // 场景类 banner
  html += '<div class="category-banner scene-cat" id="sec-scenes">\n';
  html += '  <span>📸 场景类素材</span>\n';
  html += '  <span class="cat-sep">— 生成后直接使用，无需透明化处理</span>\n';
  html += '  <span class="cat-desc">文生图 → CDN URL → 完成</span>\n';
  html += '</div>\n\n';

  // 场景背景
  html += '<div class="section">\n';
  html += '  <h2 class="section-title">场景背景 <button class="produce-btn" onclick="produceSection(\'scenes\')"><span class="icon">⚡</span> 生产</button><button class="refresh-btn" onclick="location.reload()"><span class="icon">🔄</span> 刷新</button></h2>\n';
  html += '  <div class="grid grid-bg" id="scenesGrid"></div>\n';
  html += '</div>\n\n';

  // 道具类 banner
  html += '<div class="category-banner prop-cat" id="sec-' + (propGroups[0]?.key || 'props') + '">\n';
  html += '  <span>🎭 道具类素材</span>\n';
  html += '  <span class="cat-sep">— 生成后需透明化 + 重新上传</span>\n';
  html += '  <span class="cat-desc">文生图 → 下载 → 去背景 → 上传CS → 完成</span>\n';
  html += '</div>\n\n';

  // 各道具分组
  for (const g of propGroups) {
    html += '<div class="section" id="' + g.sectionId + '">\n';
    html += '  <h2 class="section-title">' + g.label + ' (' + g.items.length + ') ';
    html += '<button class="produce-btn prop-btn" onclick="produceSection(\'' + g.key + '\')"><span class="icon">⚡</span> 生产+透明化</button>';
    html += '<button class="refresh-btn" onclick="location.reload()"><span class="icon">🔄</span> 刷新</button></h2>\n';
    html += '  <div class="grid grid-prop" id="' + g.gridId + '"></div>\n';
    html += '</div>\n\n';
  }

  // 角色形象
  html += '<div class="section" id="sec-chars">\n';
  html += '  <h2 class="section-title">角色形象 · 音色配置</h2>\n';
  html += '  <div class="grid grid-char" id="charsGrid"></div>\n';
  html += '  <div style="margin-top:16px">\n';
  html += '    <div class="table-wrap">\n';
  html += '      <table class="tts-table">\n';
  html += '        <thead><tr><th style="width:80px">角色</th><th style="width:100px">ID</th><th style="width:80px">model</th><th style="width:80px">ref_audio</th><th>音色描述</th></tr></thead>\n';
  html += '        <tbody id="voiceConfigTable"></tbody>\n';
  html += '      </table>\n';
  html += '    </div>\n';
  html += '  </div>\n';
  html += '</div>\n\n';

  // BGM
  html += '<div class="section" id="sec-bgm">\n';
  html += '  <h2 class="section-title">BGM 音轨</h2>\n';
  html += '  <div class="grid grid-audio" id="bgmGrid"></div>\n';
  html += '</div>\n\n';

  // 音效（ai-sounds 库）
  html += '<div class="section" id="sec-sfx">\n';
  html += '  <h2 class="section-title">🔊 交互音效 <span style="font-size:12px;color:var(--muted);font-weight:400">（ai-sounds 音效库）</span></h2>\n';
  html += '  <div class="table-wrap">\n';
  html += '    <table class="tts-table" id="sfxTable">\n';
  html += '      <thead><tr><th style="width:40px">#</th><th style="width:120px">音效 ID</th><th style="width:150px">名称</th><th style="width:100px">分类</th><th>描述</th><th style="width:60px">使用</th><th style="width:80px">试听</th></tr></thead>\n';
  html += '      <tbody></tbody>\n';
  html += '    </table>\n';
  html += '  </div>\n';
  html += '</div>\n\n';

  // TTS
  html += '<div class="section" id="sec-tts">\n';
  html += '  <h2 class="section-title">TTS 语音 <button class="produce-btn tts-btn" onclick="produceSection(\'tts\')"><span class="icon">🎙️</span> 生产TTS</button><button class="refresh-btn" onclick="location.reload()"><span class="icon">🔄</span> 刷新</button></h2>\n';
  html += '  <div class="table-wrap">\n';
  html += '    <table class="tts-table" id="ttsTable">\n';
  html += '      <thead><tr><th style="width:40px">#</th><th style="width:70px">角色</th><th style="width:180px">编号</th><th style="width:100px">场景</th><th style="width:70px">模型</th><th style="width:70px">音色</th><th>台词内容</th><th style="width:180px">试听</th><th style="width:60px">状态</th></tr></thead>\n';
  html += '      <tbody></tbody>\n';
  html += '    </table>\n';
  html += '  </div>\n';
  html += '</div>\n';

  return html;
}

// ─── 生成最终 HTML ───
function generate() {
  const scenes = buildScenes();
  const propGroups = buildPropGroups();
  const characters = buildCharacters();
  const bgms = buildBGMs();
  const tts = buildTTS();
  const soundEffects = buildSoundEffects();
  const navItems = buildNavItems(scenes, propGroups);
  const levelsHTML = buildLevelsHTML();
  const sectionsHTML = buildSectionsHTML(propGroups);

  // 角色名映射
  const roleNames = { narrator: '旁白', ui: 'UI语音' };
  for (const c of characters) {
    roleNames[c.id] = c.name;
  }
  // 从 roleTTS 补充角色名（role 字段直接是中文名如 "小安"）
  if (ttsData && ttsData.roleTTS) {
    for (const rg of ttsData.roleTTS) {
      if (rg.role && !roleNames[rg.role]) {
        roleNames[rg.role] = rg.role;
      }
    }
  }

  // 旁白语音配置（从 TTS 数据驱动提取，fallback 到 roles-skill）
  const narratorCfg = findNarratorVoiceConfig();
  const narratorRolesCfg = getRolesVoiceConfig()['narrator'];
  const narratorVoice = {
    id: 'narrator', name: '旁白',
    model: narratorCfg.model || narratorRolesCfg?.model || null,
    ref_audio: narratorCfg.ref_audio || narratorRolesCfg?.ref_audio || null,
    voiceDesc: narratorRolesCfg?.voiceDesc || '旁白音色',
  };

  // 短名称
  let shortName = projectName;
  if (shortName.length > 6) shortName = shortName.substring(0, 6);

  // 转义 JSON 用于嵌入 HTML script
  function jsonStr(obj) {
    return JSON.stringify(obj, null, 2)
      .replace(/</g, '\\x3c')
      .replace(/>/g, '\\x3e');
  }

  let output = template;

  // 替换占位符
  output = output.replace(/\{\{PROJECT_NAME\}\}/g, projectName);
  output = output.replace(/\{\{PROJECT_SHORT_NAME\}\}/g, shortName);
  output = output.replace(/\{\{PROJECT_ICON\}\}/g, projectIcon);
  output = output.replace(/\{\{GENERATED_AT\}\}/g, generatedAt);
  output = output.replace(/\{\{SOURCE_FILE\}\}/g, sourceFile);
  output = output.replace(/\{\{WORKSPACE_PATH\}\}/g, projectDir.replace(/\\/g, '\\\\'));
  output = output.replace(/\{\{NAV_ITEMS\}\}/g, navItems);
  output = output.replace(/\{\{LEVELS_HTML\}\}/g, levelsHTML);
  output = output.replace(/\{\{SECTIONS_HTML\}\}/g, sectionsHTML);
  output = output.replace(/\{\{SCENES_DATA\}\}/g, jsonStr(scenes));
  output = output.replace(/\{\{PROP_GROUPS_DATA\}\}/g, jsonStr(propGroups));
  output = output.replace(/\{\{CHARACTERS_DATA\}\}/g, jsonStr(characters));
  output = output.replace(/\{\{NARRATOR_VOICE_DATA\}\}/g, jsonStr(narratorVoice));
  output = output.replace(/\{\{BGMS_DATA\}\}/g, jsonStr(bgms));
  output = output.replace(/\{\{TTS_DATA\}\}/g, jsonStr(tts));
  output = output.replace(/\{\{SOUND_EFFECTS_DATA\}\}/g, jsonStr(soundEffects));
  output = output.replace(/\{\{ROLE_NAMES_DATA\}\}/g, jsonStr(roleNames));

  // 写入文件
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output, 'utf-8');

  console.log('✅ preview.html 已生成:', outputPath);
  console.log('   项目:', projectName);
  console.log('   场景:', scenes.length, '个');
  console.log('   道具分组:', propGroups.length, '组,', propGroups.reduce((s, g) => s + g.items.length, 0), '个道具');
  console.log('   角色:', characters.length, '个');
  console.log('   BGM:', bgms.length, '条');
  console.log('   TTS:', tts.length, '条');
  console.log('   音效:', soundEffects.length, '种 (ai-sounds)');

  if (autoOpen) {
    const { exec } = require('child_process');
    if (process.platform === 'win32') exec('start "" "' + outputPath + '"');
    else if (process.platform === 'darwin') exec('open "' + outputPath + '"');
    else exec('xdg-open "' + outputPath + '"');
  }
}

generate();
