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

  // UI from artChecklist
  const uiItems = materials.artChecklist?.uiFromManifest?.items || [];
  if (uiItems.length) {
    groups.push({
      key: 'ui',
      label: 'UI 元素',
      icon: '🎨',
      gridId: 'uiGrid',
      sectionId: 'sec-ui',
      items: uiItems.map(i => buildPropItem(i)),
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
    icon: guessPropIcon(p.name, p.category),
  };
}

// 通用分组标签推断词典（按 materials.json 中 levelProps 的 key 匹配）
const GROUP_LABEL_DICT = [
  [/fish|鱼/, '鱼类道具', '🐟'],
  [/tool|工具/, '工具道具', '🧰'],
  [/obstacle|障碍|干扰/, '障碍物', '🚧'],
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

function guessGroupLabel(key, items) {
  for (const [pattern, label] of GROUP_LABEL_DICT) {
    if (pattern.test(key)) return label;
  }
  // fallback: 将 key 转为可读标签
  return key.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function guessGroupIcon(key) {
  for (const [pattern, , icon] of GROUP_LABEL_DICT) {
    if (pattern.test(key)) return icon;
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
      map[m[1]] = { model: parseInt(m[3]), ref_audio: parseInt(m[4]), voiceDesc: m[5].trim() };
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

  // narratorTTS
  for (const t of (ttsData.narratorTTS || [])) {
    const cfg = ttsConfig[t.id] || {};
    tts.push({
      role: 'narrator',
      name: t.id,
      stage: t.scene || '',
      model: cfg.model || null,
      ref_audio: cfg.ref_audio || null,
      content: t.text,
      url: t.url || '',
    });
  }

  // roleTTS
  for (const roleGroup of (ttsData.roleTTS || [])) {
    for (const t of (roleGroup.lines || [])) {
      const cfg = ttsConfig[t.id] || {};
      tts.push({
        role: roleGroup.role || 'unknown',
        name: t.id,
        stage: t.scene || '',
        model: cfg.model || null,
        ref_audio: cfg.ref_audio || null,
        content: t.text,
        url: t.url || '',
      });
    }
  }

  return tts;
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
  // 自动生成简单的关卡占位
  const levelScenes = materials.materialProfile?.levelScenes || [];
  if (!levelScenes.length) {
    return '<div class="section" id="sec-levels">\n  <h2 class="section-title">游戏关卡</h2>\n  <p style="color:var(--muted)">暂无关卡数据，请在 extract-skill 中配置</p>\n</div>';
  }

  let html = '<div class="section" id="sec-levels">\n';
  html += '  <h2 class="section-title">游戏关卡 (' + levelScenes.length + ')</h2>\n';
  html += '  <div class="grid grid-levels">\n';
  const colors = ['#4ecdc4', '#f5a623', '#ff6b6b', '#a78bfa', '#4ecdc4'];
  for (let i = 0; i < levelScenes.length; i++) {
    const s = levelScenes[i];
    const color = colors[i % colors.length];
    html += '    <div class="level-card" style="border-top: 3px solid ' + color + '">\n';
    html += '      <div class="level-header">\n';
    html += '        <span class="level-icon">' + guessIcon(s.name) + '</span>\n';
    html += '        <div><div class="level-name">' + s.name + '</div></div>\n';
    html += '      </div>\n';
    html += '      <div class="level-body"><p style="color:var(--muted);font-size:13px">' + (s.usage || '') + '</p></div>\n';
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
  const navItems = buildNavItems(scenes, propGroups);
  const levelsHTML = buildLevelsHTML();
  const sectionsHTML = buildSectionsHTML(propGroups);

  // 角色名映射
  const roleNames = { narrator: '旁白' };
  for (const c of characters) {
    roleNames[c.id] = c.name;
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

  if (autoOpen) {
    const { exec } = require('child_process');
    if (process.platform === 'win32') exec('start "" "' + outputPath + '"');
    else if (process.platform === 'darwin') exec('open "' + outputPath + '"');
    else exec('xdg-open "' + outputPath + '"');
  }
}

generate();
