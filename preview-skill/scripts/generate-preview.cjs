#!/usr/bin/env node
/**
 * generate-preview.js — AI素材工坊 Preview 页面生成器
 *
 * 读取 public/asset-data.json（由 gen-asset-data.mjs 生成），
 * 结合通用模板 preview-template.html，生成项目专属的 public/preview.html。
 *
 * 用法:
 *   node generate-preview.js [--project-dir <path>] [--output <path>]
 *
 * 参数:
 *   --project-dir  项目根目录（默认为 cwd 向上查找含 素材库/ 的目录）
 *   --output       输出文件路径（默认 public/preview.html）
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
  outputPath = path.join(projectDir, 'public', 'preview.html');
}

const assetDataPath = path.join(projectDir, 'public', 'asset-data.json');
const indexPath = path.join(projectDir, 'index.tsx');
const templatePath = path.join(__dirname, '..', 'templates', 'preview-template.html');

// 读取 project_id ，构建远端 CS URL
let assetDataUrl = '/asset-data.json'; // 默认本地回退
const aicInfoPath = path.join(projectDir, '.aic-info.json');
if (fs.existsSync(aicInfoPath)) {
  try {
    const aicInfo = JSON.parse(fs.readFileSync(aicInfoPath, 'utf-8'));
    if (aicInfo.id) {
      assetDataUrl = 'https://cs.101.com/v0.1/static/aic_deploy/' + aicInfo.id + '/asset-data.json';
    }
  } catch (e) { /* ignore */ }
}

// 从 package.json dev 脚本提取本地端口
let devPort = 3005;
const _devPkgPath = path.join(projectDir, 'package.json');
if (fs.existsSync(_devPkgPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(_devPkgPath, 'utf-8'));
    const devCmd = (pkg.scripts && pkg.scripts.dev) || '';
    const portMatch = devCmd.match(/--port\s+(\d+)/);
    if (portMatch) devPort = parseInt(portMatch[1], 10);
  } catch (e) { /* ignore */ }
}
const localAssetDataUrl = 'http://127.0.0.1:' + devPort + '/asset-data.json';

// ─── 加载数据 ───
function loadJSON(p) {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function loadFile(p) {
  if (!fs.existsSync(p)) return '';
  return fs.readFileSync(p, 'utf-8');
}

const assetData = loadJSON(assetDataPath);
const indexSource = loadFile(indexPath);
const template = loadFile(templatePath);

if (!template) {
  console.error('❌ 模板文件不存在:', templatePath);
  process.exit(1);
}
if (!assetData) {
  console.error('❌ asset-data.json 不存在:', assetDataPath);
  console.error('   请先运行: node .claude/skills/preview-skill/scripts/gen-asset-data.mjs');
  process.exit(1);
}

// ─── 从 asset-data.json 解构数据 ───
const ASSET_URLS = assetData.ASSET_URLS || {};
const ASSETS = assetData.ASSETS || [];
const SECTIONS = assetData.SECTIONS || [];
const CHARACTERS_RAW = assetData.CHARACTERS || {};
const BGM_URLS = assetData.BGM_URLS || {};
const TTS_DATA_RAW = assetData.TTS_DATA || [];

// ─── 提取项目信息 ───
let projectName = path.basename(projectDir);
// 尝试从 package.json 读取项目名
const pkgPath = path.join(projectDir, 'package.json');
if (fs.existsSync(pkgPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    if (pkg.description) projectName = pkg.description;
    else if (pkg.name) projectName = pkg.name;
  } catch (e) { /* ignore */ }
}
const sourceFile = 'index.tsx';
const generatedAt = new Date().toISOString().split('T')[0];

// 项目图标（从现有 preview.html 继承）
let projectIcon = '🎮';
const existingPreview = loadFile(outputPath);
const iconMatch = existingPreview.match(/nav-brand-icon[^>]*>([^<]+)</);
if (iconMatch) projectIcon = iconMatch[1].trim();

// ─── 构建场景数据 (SCENES) 从 asset-data.json ───
function buildScenes() {
  return ASSETS
    .filter(a => a.materialId && a.materialId.startsWith('SCENE_'))
    .map(a => {
      const levelMatch = a.materialId.match(/SCENE_L(\d+)/i);
      const level = levelMatch ? 'L' + levelMatch[1] : '通用';
      return {
        id: a.materialId,
        name: a.name,
        level,
        status: a.url ? 'deployed' : 'planned',
        spec: a.size ? a.size.replace('x', '×') : '',
        priority: 'P0',
        url: a.url || null,
        prompt: a.prompt || '',
        icon: guessIcon(a.name),
      };
    });
}

function guessIcon(name) {
  if (/开始|首页|start|home/i.test(name)) return '🏠';
  if (/关卡1|L1|level.?1/i.test(name)) return '🏞️';
  if (/关卡2|L2|level.?2/i.test(name)) return '🌊';
  if (/关卡3|L3|level.?3/i.test(name)) return '🏔️';
  if (/关卡4|L4|level.?4/i.test(name)) return '🌋';
  if (/关卡5|L5|level.?5/i.test(name)) return '🌌';
  if (/关卡|level/i.test(name)) return '🗺️';
  if (/背景|bg/i.test(name)) return '🖼️';
  if (/过渡|结果|result|transition/i.test(name)) return '✨';
  return '📸';
}

// ─── 构建道具分组 (PROP_GROUPS) 从 SECTIONS ───
// 从 key（如 L1_desk、L2_robot）或 label（如 关卡1·桌面物品）提取关卡序号，用于排序
function extractLevelNum(section) {
  const fromKey = section.key.match(/^L(\d+)/i);
  if (fromKey) return parseInt(fromKey[1], 10);
  const fromLabel = section.label.match(/关卡(\d+)/);
  if (fromLabel) return parseInt(fromLabel[1], 10);
  return 99; // 无关卡归属放末尾
}

function buildPropGroups() {
  return SECTIONS
    .filter(s => s.category !== 'scene')
    .sort((a, b) => {
      // 先按关卡序号升序排列，同关卡内保持原始顺序（stable sort）
      const la = extractLevelNum(a), lb = extractLevelNum(b);
      return la - lb;
    })
    .map(s => {
      const items = (s.materialIds || [])
        .map(mid => {
          const asset = ASSETS.find(a => a.materialId === mid);
          if (!asset) return null;
          return buildPropItem(asset, s);
        })
        .filter(Boolean);
      if (!items.length) return null;
      return {
        key: s.key,
        label: s.label,
        icon: s.icon,
        transparentBg: s.transparentBg,
        gridId: s.key + 'Grid',
        sectionId: 'sec-' + s.key,
        items,
      };
    })
    .filter(Boolean);
}

function buildPropItem(asset, section) {
  const levelMatch = asset.materialId.match(/L(\d+)/i);
  const level = levelMatch ? 'L' + levelMatch[1] : '通用';
  return {
    id: asset.materialId,
    name: asset.name,
    level,
    status: asset.url ? 'deployed' : 'planned',
    spec: asset.size ? asset.size.replace('x', '×') : '',
    priority: 'P1',
    url: asset.url || null,
    prompt: asset.prompt || '',
    icon: guessPropIcon(asset.name),
    transparentBg: section ? section.transparentBg : asset.transparentBg,
  };
}
// 道具图标推断
const PROP_ICON_DICT = [
  [/星|star/, '⭐'], [/锁|lock/, '🔒'], [/计时|timer|clock/, '⏱️'],
  [/成功|sparkle|success/, '✨'], [/误|错|wrong|fail/, '❌'], [/庆祝|win/, '🎉'],
  [/气泡|bubble/, '💧'], [/火|fire/, '🔥'], [/冰|ice|snow/, '❄️'],
  [/鱼|fish/, '🐟'], [/鸟|bird/, '🐦'], [/猫|cat/, '🐱'],
  [/机器人|robot/, '🤖'], [/手机|phone/, '📱'], [/游戏机|gamepad/, '🎮'],
  [/卡片|card/, '🃏'], [/书|book/, '📖'], [/铅笔|pencil/, '✏️'],
  [/尺|ruler/, '📏'], [/作业|homework/, '📝'], [/笔记|note/, '📒'],
  [/糖果|candy/, '🍬'], [/遥控|remote/, '📺'], [/收纳|storage/, '📦'],
];

function guessPropIcon(name) {
  for (const [pattern, icon] of PROP_ICON_DICT) {
    if (pattern.test(name)) return icon;
  }
  return '🎭';
}

// ─── 提取角色数据 (CHARACTERS) from asset-data.json ───
function buildCharacters() {
  const chars = [];
  // CHARACTERS_RAW 是对象 { xiao_an: { id, name, idleUrl, speakingUrl, themeColor, ... } }
  for (const [id, c] of Object.entries(CHARACTERS_RAW)) {
    // 从 TTS_DATA_RAW 找该角色第一条台词的 model/ref_audio
    const firstLine = TTS_DATA_RAW.find(t => t.roleId === id || t.role === (c.name || id));
    chars.push({
      id,
      name: c.name || id,
      color: c.themeColor || c.color || '#888',
      model: firstLine?.model || null,
      ref_audio: firstLine?.ref_audio || null,
      voiceDesc: firstLine ? (c.name || id) + '音色' : (c.name || id) + '音色',
      idle: c.idleUrl || c.idle || '',
      speaking: c.speakingUrl || c.speaking || '',
    });
  }
  return chars;
}

// ─── 提取 BGM 数据 from asset-data.json ───
function buildBGMs() {
  const nameMap = {
    main: { name: '主流程 BGM', desc: '默认播放' },
    progress: { name: '进行中 BGM', desc: '行动阶段循环播放' },
    rest: { name: '休息 BGM', desc: '暂停/休息时切换播放' },
  };
  return Object.entries(BGM_URLS).map(([key, url]) => {
    const info = nameMap[key] || { name: key + ' BGM', desc: '' };
    return { id: key, name: info.name, desc: info.desc, url };
  });
}

// ─── 构建 TTS 数据 from asset-data.json ───
function buildTTS() {
  return TTS_DATA_RAW
    .filter(t => t.role !== 'ui')  // ui 标签文本不是真正 TTS 内容
    .map(t => ({
    role: t.role || 'unknown',
    name: t.id,
    stage: t.scene || '',
    model: t.model || null,
    ref_audio: t.ref_audio || null,
    content: t.text,
    url: t.url || '',
  }));
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

  // 扫描 soundLibrary.play('xxx') 或 soundLibrary.play('xxx', {...}) 调用
  const regex = /soundLibrary\.play\(['"]([\w-]+)['"]/g;
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
    const lineRegex = /soundLibrary\.play\(['"]([\w-]+)['"]/g;
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
  // 角色（独立分组，置于场景之前）
  html += '\n  <div class="nav-group-label">角色</div>\n';
  html += '  <div class="nav-items">\n';
  html += '    <button class="nav-item" onclick="navTo(\'sec-chars\')" ><span class="nav-icon">🧑‍🎓</span>角色形象</button>\n';
  html += '  </div>\n';
  // 场景
  html += '\n  <div class="nav-group-label">场景</div>\n';
  html += '  <div class="nav-items">\n';
  html += '    <button class="nav-item" onclick="navTo(\'sec-scenes\')"><span class="nav-icon">🌊</span>背景图<span class="nav-dot empty"></span></button>\n';
  html += '  </div>\n';

  // 道具 — 按关卡子分组
  html += '\n  <div class="nav-group-label">道具</div>\n';
  let lastLevel = null;
  for (const g of propGroups) {
    const lv = extractLevelNum(g);
    const lvLabel = lv < 99 ? '关卡' + lv : '通用';
    if (lvLabel !== lastLevel) {
      if (lastLevel !== null) html += '  </div>\n'; // 结束上一个子组
      html += '  <div class="nav-sub-label" style="padding:2px 8px 1px 20px;font-size:10px;color:var(--muted);letter-spacing:.05em;margin-top:4px">' + lvLabel + '</div>\n';
      html += '  <div class="nav-items">\n';
      lastLevel = lvLabel;
    }
    // 显示·后面的具体类型名（如 桌面物品、故事卡片），截掉"关卡N·"前缀
    const specificLabel = g.label.includes('·') ? g.label.split('·')[1] : g.label;
    html += '    <button class="nav-item" onclick="navTo(\'' + g.sectionId + '\')"><span class="nav-icon">' + g.icon + '</span>' + specificLabel + '<span class="nav-dot empty"></span></button>\n';
  }
  if (lastLevel !== null) html += '  </div>\n'; // 结束最后一个子组

  // 音频（TTS → BGM → 音效）
  html += '\n  <div class="nav-group-label">音频</div>\n';
  html += '  <div class="nav-items">\n';
  html += '    <button class="nav-item" onclick="navTo(\'sec-tts\')" ><span class="nav-icon">🗣️</span>TTS<span class="nav-dot empty"></span></button>\n';
  html += '    <button class="nav-item" onclick="navTo(\'sec-bgm\')" ><span class="nav-icon">🎵</span>BGM</button>\n';
  html += '    <button class="nav-item" onclick="navTo(\'sec-sfx\')" ><span class="nav-icon">🔊</span>音效</button>\n';
  html += '  </div>\n';

  return html;
}

// ─── 关卡步骤关键字高亮 ───
function highlightStep(text) {
  // 1. 括号内含顿号的物品列表 → 红色小芯片（先处理，避免后面规则污染）
  text = text.replace(/[（(]([^）)]*[、，,][^）)]*)[）)]/g, function(_, inner) {
    if (/限时|秒/.test(inner)) return '（' + inner + '）'; // 跳过，交给限时规则
    const items = inner.split(/[、，,]/).map(s => s.trim()).filter(Boolean);
    const chips = items.map(item =>
      '<span style="display:inline-block;background:rgba(255,107,107,0.12);color:#ff6b6b;padding:0 5px;border-radius:4px;border:1px solid rgba(255,107,107,0.25);font-size:11px;margin:0 1px">' + item + '</span>'
    ).join('');
    return '<span style="color:var(--muted);font-size:11px">（</span>' + chips + '<span style="color:var(--muted);font-size:11px">）</span>';
  });

  // 2. 限时 N 秒 → 橙色强调框
  text = text.replace(/[（(]?(限时\d+秒)[）)]?/g,
    '<span style="display:inline-block;background:rgba(245,166,35,0.15);color:#f5a623;font-weight:700;padding:0 5px;border-radius:4px;border:1px solid rgba(245,166,35,0.3)">⏱ $1</span>');

  // 3. N选N → 青色粗体
  text = text.replace(/(\d+选\d+)/g,
    '<span style="color:#4ecdc4;font-weight:700">$1</span>');

  // 4. 数字 + 量词 → 青色
  text = text.replace(/(\d+\s*(?:轮|张|行|步|个|关|种|次|题))/g,
    '<span style="color:#4ecdc4;font-weight:600">$1</span>');

  // 5. 核心动词 → 淡绿色
  text = text.replace(/(拖拽|移走|点击|排序|分类|识别|标记|找出|区分)/g,
    '<span style="color:#a8e6cf;font-weight:600">$1</span>');

  // 6. 需全部正确 → 橙色边框提示
  text = text.replace(/(需全部正确|全部正确|需全部)/g,
    '<span style="color:#f5a623;font-size:11px;border:1px solid rgba(245,166,35,0.4);padding:0 4px;border-radius:3px">$1</span>');

  // 7. 剩余普通中文括号 → 灰色（只匹配全角括号，避免误匹配 CSS 中的 ASCII 括号）
  text = text.replace(/（([^）<]+)）/g,
    '<span style="color:var(--muted)">（$1）</span>');

  // 8. Step 前缀 → 青色标签（最后执行，避免 rgba() 被上面规则误匹配）
  text = text.replace(/(Step\d+[a-z]*[：:])/g,
    '<span style="display:inline-block;background:rgba(78,205,196,0.15);color:#4ecdc4;font-weight:700;padding:0 5px;border-radius:4px;margin-right:4px;border:1px solid rgba(78,205,196,0.3)">$1</span>');

  return text;
}

// ─── 构建关卡 HTML ───
function buildLevelsHTML() {
  // 优先使用 asset-data.json 中的 LEVELS 数据
  const levels = (assetData && assetData.LEVELS) || [];

  if (!levels.length) {
    return '<div class="section" id="sec-levels">\n  <h2 class="section-title">游戏关卡</h2>\n  <p style="color:var(--muted)">暂无关卡数据（请在 asset-data.json 中添加 LEVELS 字段）</p>\n</div>';
  }

  // tag 类型 → CSS 类
  function tagClass(type) {
    if (type === 'target') return 'fish';
    if (type === 'distractor') return 'mechanic';
    if (type === 'difficulty') return 'difficulty';
    return 'mechanic';
  }
  // tag 类型 → emoji 前缀
  function tagEmoji(type) {
    if (type === 'target') return '◉ ';
    if (type === 'distractor') return '◉ ';
    if (type === 'difficulty') return '★ ';
    return '◈ ';
  }

  let html = '<div class="section" id="sec-levels">\n';
  html += '  <h2 class="section-title">游戏关卡 (' + levels.length + ')</h2>\n';
  html += '  <div class="grid grid-levels">\n';

  for (const lv of levels) {
    const color = lv.color || '#4ecdc4';
    const bgUrl = (ASSET_URLS && ASSET_URLS[lv.bgKey]) || '';
    const bgThumb = bgUrl
      ? '<div class="level-bg-thumb" style="background-image:url(\'' + bgUrl + '\')"></div>\n'
      : '';

    html += '    <div class="level-card" style="border-top: 3px solid ' + color + '">\n';
    html += '      ' + bgThumb;
    html += '      <div class="level-header">\n';
    html += '        <span class="level-icon">' + guessIcon('关卡' + lv.num) + '</span>\n';
    html += '        <div>\n';
    html += '          <div class="level-name">关卡' + lv.num + ' — ' + (lv.title || '') + '</div>\n';
    if (lv.subtitle) {
      html += '          <div class="level-subtitle">' + lv.subtitle + '</div>\n';
    }
    html += '        </div>\n';
    html += '      </div>\n';
    if (lv.steps && lv.steps.length) {
      html += '      <div class="level-body">\n';
      html += '        <h4>基本玩法</h4>\n';
      html += '        <ul>\n';
      for (const step of lv.steps) {
        html += '          <li>' + highlightStep(step) + '</li>\n';
      }
      html += '        </ul>\n';
      if (lv.tags && lv.tags.length) {
        html += '        <h4>出现元素</h4>\n';
        html += '        <div class="level-tags">\n';
        for (const tag of lv.tags) {
          html += '          <span class="level-tag ' + tagClass(tag.type) + '">' + tagEmoji(tag.type) + tag.text + '</span>\n';
        }
        html += '        </div>\n';
      }
      html += '      </div>\n';
    }
    html += '    </div>\n';
  }

  html += '  </div>\n</div>';
  return html;
}

// ─── 构建内容区 HTML ───
function buildSectionsHTML(propGroups) {
  let html = '';

  // 角色形象（置于场景之前）
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

  // TTS（音频第一）
  html += '<div class="section" id="sec-tts">\n';
  html += '  <h2 class="section-title">TTS 语音 <button class="produce-btn tts-btn" onclick="produceSection(\'tts\')"><span class="icon">🎙️</span> 生产TTS</button><button class="refresh-btn" onclick="location.reload()"><span class="icon">🔄</span> 刷新</button></h2>\n';
  html += '  <div class="table-wrap">\n';
  html += '    <table class="tts-table" id="ttsTable">\n';
  html += '      <thead><tr><th style="width:40px">#</th><th style="width:70px">角色</th><th style="width:180px">编号</th><th style="width:100px">场景</th><th style="width:70px">模型</th><th style="width:70px">音色</th><th>台词内容</th><th style="width:180px">试听</th><th style="width:60px">状态</th></tr></thead>\n';
  html += '      <tbody></tbody>\n';
  html += '    </table>\n';
  html += '  </div>\n';
  html += '</div>\n\n';

  // BGM（音频第二）
  html += '<div class="section" id="sec-bgm">\n';
  html += '  <h2 class="section-title">BGM 音轨</h2>\n';
  html += '  <div class="grid grid-audio" id="bgmGrid"></div>\n';
  html += '</div>\n\n';

  // 音效（ai-sounds 库，音频第三）
  html += '<div class="section" id="sec-sfx">\n';
  html += '  <h2 class="section-title">🔊 交互音效 <span style="font-size:12px;color:var(--muted);font-weight:400">（ai-sounds 音效库）</span></h2>\n';
  html += '  <div class="table-wrap">\n';
  html += '    <table class="tts-table" id="sfxTable">\n';
  html += '      <thead><tr><th style="width:40px">#</th><th style="width:120px">音效 ID</th><th style="width:150px">名称</th><th style="width:100px">分类</th><th>描述</th><th style="width:60px">使用</th><th style="width:80px">试听</th></tr></thead>\n';
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
  // 导航、关卡卡片、内容区骨架已移至模板运行时动态生成，无需生成器注入

  // 角色名映射
  const roleNames = { narrator: '旁白', ui: 'UI语音' };
  for (const c of characters) {
    roleNames[c.id] = c.name;
  }
  // 从 TTS_DATA_RAW 补充角色名（role 字段可能是中文名或 ID）
  for (const t of TTS_DATA_RAW) {
    if (t.role && !roleNames[t.role]) roleNames[t.role] = t.role;
  }

  // 旁白语音配置（从 TTS_DATA_RAW 提取）
  const narratorLine = TTS_DATA_RAW.find(t => t.role === 'narrator');
  const narratorVoice = {
    id: 'narrator', name: '旁白',
    model: narratorLine?.model || null,
    ref_audio: narratorLine?.ref_audio || null,
    voiceDesc: '旁白音色',
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
  // NAV_ITEMS / LEVELS_HTML / SECTIONS_HTML 已由模板运行时 JS 动态生成
  output = output.replace(/\{\{ASSET_DATA_URL\}\}/g, assetDataUrl);
  output = output.replace(/\{\{LOCAL_ASSET_DATA_URL\}\}/g, localAssetDataUrl);
  output = output.replace(/\{\{SOUND_EFFECTS_DATA\}\}/g, jsonStr(soundEffects));

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
