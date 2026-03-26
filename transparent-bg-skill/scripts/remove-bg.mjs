#!/usr/bin/env node
/**
 * remove-bg.mjs — 图片去背景透明化工具（Node.js 版）
 *
 * 支持两种模式：
 *   1. AI 模式（默认）：使用 @imgly/background-removal-node AI 抠图，效果最好
 *   2. 颜色模式：基于背景色 flood-fill 替换，适合纯色背景，无需大型依赖
 *
 * 依赖（全局安装，不污染项目）：
 *   npm install -g @imgly/background-removal-node   # AI 模式
 *   npm install -g sharp                             # 颜色模式 + 图片 I/O
 *
 * 用法：
 *   node remove-bg.mjs input.png
 *   node remove-bg.mjs input.png -o output.png
 *   node remove-bg.mjs input.png --mode color --tolerance 30
 *   node remove-bg.mjs "素材库/download/*.png" -o "素材库/download/transparent/"
 *   node remove-bg.mjs sprite.png --feather 2 --preview
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { createRequire } from 'module';
import { join, dirname, basename, extname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── CLI 参数解析 ───────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    inputs: [],
    output: null,
    mode: 'ai',
    tolerance: 30,
    bgColor: null,
    feather: 0,
    preview: false,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-o' || a === '--output') { opts.output = args[++i]; }
    else if (a === '--mode') { opts.mode = args[++i]; }
    else if (a === '--tolerance') { opts.tolerance = parseInt(args[++i], 10); }
    else if (a === '--bg-color') { opts.bgColor = args[++i]; }
    else if (a === '--feather') { opts.feather = parseInt(args[++i], 10); }
    else if (a === '--preview') { opts.preview = true; }
    else if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
    else if (!a.startsWith('-')) { opts.inputs.push(a); }
  }
  return opts;
}

function printHelp() {
  console.log(`
remove-bg.mjs — 图片去背景透明化工具

用法：
  node remove-bg.mjs <input...> [options]

选项：
  -o, --output PATH     输出路径（单文件=文件名，多文件=目录）
  --mode {ai,color}     去背景模式（默认 ai）
  --tolerance N         颜色模式容差 0-255（默认 30）
  --bg-color #RRGGBB    颜色模式指定背景色（默认自动检测）
  --feather N           边缘羽化半径像素（默认 0，推荐 1-3）
  --preview             处理后打开图片预览
  --help                显示帮助

示例：
  node remove-bg.mjs photo.png
  node remove-bg.mjs photo.png --mode color --tolerance 25
  node remove-bg.mjs "*.png" -o transparent/
  node remove-bg.mjs icon.png --feather 2 --preview
`);
}

// ─── 依赖加载 ───────────────────────────────────────────────────
const requireGlobal = createRequire(
  join(process.env.APPDATA || process.env.HOME, 'npm', 'node_modules', '.package-lock.json')
);

function tryLoadSharp() {
  // 1. 本地
  try { return (await import('sharp')).default; } catch {}
  // 只能用 require 方式全局
  return null;
}

async function loadSharp() {
  // 先尝试本地
  try {
    const { default: s } = await import('sharp');
    return s;
  } catch {}
  // 全局路径候选
  const candidates = [
    join(process.env.APPDATA || '', 'npm', 'node_modules', 'sharp'),
    join(process.env.HOME || '', '.npm', 'lib', 'node_modules', 'sharp'),
    '/usr/local/lib/node_modules/sharp',
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        const s = createRequire(p + '/package.json')('sharp');
        return s;
      } catch {}
    }
  }
  return null;
}

async function loadRemoveBg() {
  // 先尝试本地
  try {
    const m = await import('@imgly/background-removal-node');
    return m.removeBackground ?? m.default?.removeBackground;
  } catch {}
  // 全局路径候选
  const candidates = [
    join(process.env.APPDATA || '', 'npm', 'node_modules', '@imgly', 'background-removal-node'),
    join(process.env.HOME || '', '.npm', 'lib', 'node_modules', '@imgly', 'background-removal-node'),
    '/usr/local/lib/node_modules/@imgly/background-removal-node',
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        const pkg = join(p, 'dist', 'node.cjs');
        if (existsSync(pkg)) {
          const r = createRequire(pkg);
          const m = r(pkg);
          return m.removeBackground ?? m.default?.removeBackground;
        }
      } catch {}
    }
  }
  return null;
}

// ─── 颜色工具 ───────────────────────────────────────────────────
function parseColor(hex) {
  if (!hex) return null;
  const h = hex.replace('#', '');
  if (h.length !== 6) throw new Error(`颜色格式错误: ${hex}，需为 #RRGGBB`);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function colorDist(a, b) {
  return Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2);
}

// ─── 背景色检测（从四角采样） ───────────────────────────────────
function detectBgColor(data, width, height, sampleSize = 10) {
  const pixels = [];
  const regions = [
    [0, sampleSize, 0, sampleSize],
    [0, sampleSize, width - sampleSize, width],
    [height - sampleSize, height, 0, sampleSize],
    [height - sampleSize, height, width - sampleSize, width],
  ];
  for (const [y1, y2, x1, x2] of regions) {
    for (let y = y1; y < Math.min(y2, height); y++) {
      for (let x = x1; x < Math.min(x2, width); x++) {
        const i = (y * width + x) * 4;
        // 量化到 8 的倍数减少噪声
        pixels.push([(data[i] >> 3) << 3, (data[i+1] >> 3) << 3, (data[i+2] >> 3) << 3]);
      }
    }
  }
  const counts = new Map();
  for (const p of pixels) {
    const key = `${p[0]},${p[1]},${p[2]}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  return best.split(',').map(Number);
}

// ─── 颜色模式：flood-fill 从边缘去除背景 ───────────────────────
function removeBgColor(data, width, height, tolerance = 30, bgColor = null) {
  const buf = Buffer.from(data); // 拷贝，不修改原始数据

  const bg = bgColor || detectBgColor(buf, width, height);
  console.log(`  🎨 背景色: RGB(${bg[0]}, ${bg[1]}, ${bg[2]})`);

  const visited = new Uint8Array(width * height);
  // 预计算每像素与背景色距离
  const dist = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i4 = (y * width + x) * 4;
      dist[y * width + x] = colorDist([buf[i4], buf[i4+1], buf[i4+2]], bg);
    }
  }

  // BFS 从所有四条边开始
  const queue = [];
  for (let x = 0; x < width; x++) {
    if (dist[x] <= tolerance && !visited[x]) { visited[x] = 1; queue.push(x); }
    const bot = (height - 1) * width + x;
    if (dist[bot] <= tolerance && !visited[bot]) { visited[bot] = 1; queue.push(bot); }
  }
  for (let y = 1; y < height - 1; y++) {
    const l = y * width;
    if (dist[l] <= tolerance && !visited[l]) { visited[l] = 1; queue.push(l); }
    const r = y * width + width - 1;
    if (dist[r] <= tolerance && !visited[r]) { visited[r] = 1; queue.push(r); }
  }

  let head = 0;
  const dx = [1, -1, 0, 0];
  const dy = [0, 0, 1, -1];
  while (head < queue.length) {
    const idx = queue[head++];
    const cx = idx % width, cy = Math.floor(idx / width);
    for (let d = 0; d < 4; d++) {
      const nx = cx + dx[d], ny = cy + dy[d];
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const ni = ny * width + nx;
      if (visited[ni] || dist[ni] > tolerance) continue;
      visited[ni] = 1;
      queue.push(ni);
    }
  }

  // 将连通背景区域设为透明
  for (let i = 0; i < width * height; i++) {
    if (visited[i]) buf[i * 4 + 3] = 0;
  }

  return buf;
}

// ─── 羽化：对 alpha 通道做简单盒式模糊 ──────────────────────────
function applyFeather(data, width, height, radius) {
  if (radius <= 0) return data;
  const buf = Buffer.from(data);
  const alpha = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) alpha[i] = buf[i * 4 + 3];

  // 水平方向模糊
  const tmp = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0, cnt = 0;
      for (let k = -radius; k <= radius; k++) {
        const nx = x + k;
        if (nx >= 0 && nx < width) { sum += alpha[y * width + nx]; cnt++; }
      }
      tmp[y * width + x] = sum / cnt;
    }
  }
  // 垂直方向模糊
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0, cnt = 0;
      for (let k = -radius; k <= radius; k++) {
        const ny = y + k;
        if (ny >= 0 && ny < height) { sum += tmp[ny * width + x]; cnt++; }
      }
      // 只对边缘区域（非完全透明/非完全不透明）应用模糊
      const orig = alpha[y * width + x];
      const blurred = sum / cnt;
      const result = orig === 255 ? 255 : orig === 0 ? 0 : blurred;
      buf[(y * width + x) * 4 + 3] = Math.round(result);
    }
  }
  return buf;
}

// ─── 输出路径推导 ───────────────────────────────────────────────
function getOutputPath(inputPath, outputArg, isBatch) {
  const ext = extname(inputPath);
  const stem = basename(inputPath, ext);
  if (outputArg) {
    // 判断是否为目录
    if (isBatch || outputArg.endsWith('/') || outputArg.endsWith('\\') ||
        (existsSync(outputArg) && statSync(outputArg).isDirectory())) {
      mkdirSync(outputArg, { recursive: true });
      const s = stem.endsWith('_transparent') ? stem : stem + '_transparent';
      return join(outputArg, s + '.png');
    }
    return outputArg;
  }
  const s = stem.endsWith('_transparent') ? stem : stem + '_transparent';
  return join(dirname(inputPath), s + '.png');
}

// ─── 展开 glob ──────────────────────────────────────────────────
function expandInputs(inputs) {
  const files = [];
  for (const p of inputs) {
    if (p.includes('*') || p.includes('?')) {
      try {
        const matches = globSync(p);
        if (matches.length) { files.push(...matches); continue; }
      } catch {}
    }
    files.push(p);
  }
  return files;
}

// ─── 预览 ───────────────────────────────────────────────────────
function openPreview(filePath) {
  const { execSync } = await import('child_process');
  const abs = resolve(filePath);
  try {
    if (process.platform === 'win32') execSync(`start "" "${abs}"`);
    else if (process.platform === 'darwin') execSync(`open "${abs}"`);
    else execSync(`xdg-open "${abs}"`);
  } catch {}
}

// ─── 处理单张图片 ───────────────────────────────────────────────
async function processSingle(inputPath, outputPath, opts, sharp, removeBg) {
  if (!existsSync(inputPath)) {
    console.log(`❌ 文件不存在: ${inputPath}`);
    return false;
  }

  console.log(`🖼️  处理: ${basename(inputPath)}`);

  // 确保输出目录存在
  mkdirSync(dirname(resolve(outputPath)), { recursive: true });

  if (opts.mode === 'ai') {
    if (!removeBg) {
      console.log('❌ AI 模式需要全局安装 @imgly/background-removal-node');
      console.log('   npm install -g @imgly/background-removal-node');
      return false;
    }
    const inputBuf = readFileSync(inputPath);
    const blob = new Blob([inputBuf], { type: 'image/png' });
    const result = await removeBg(blob, { publicPath: 'https://staticimgly.com/@imgly/background-removal-data/1.5.3/dist/' });
    const outBuf = Buffer.from(await result.arrayBuffer());

    if (opts.feather > 0) {
      // 羽化需要经过 sharp 解码/编码
      if (!sharp) {
        writeFileSync(outputPath, outBuf);
        console.log('  ⚠️  未安装 sharp，跳过羽化');
      } else {
        const { data, info } = await sharp(outBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const feathered = applyFeather(data, info.width, info.height, opts.feather);
        await sharp(feathered, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(outputPath);
        console.log(`  🌫️  边缘羽化: ${opts.feather}px`);
      }
    } else {
      writeFileSync(outputPath, outBuf);
    }
    console.log('  ✨ AI 去背景完成');

  } else {
    // 颜色模式
    if (!sharp) {
      console.log('❌ 颜色模式需要全局安装 sharp');
      console.log('   npm install -g sharp');
      return false;
    }
    const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    console.log(`  📐 尺寸: ${info.width}x${info.height}`);

    const bgColor = opts.bgColor ? parseColor(opts.bgColor) : null;
    let result = removeBgColor(data, info.width, info.height, opts.tolerance, bgColor);
    console.log(`  ✨ 颜色去背景完成 (容差=${opts.tolerance})`);

    if (opts.feather > 0) {
      result = applyFeather(result, info.width, info.height, opts.feather);
      console.log(`  🌫️  边缘羽化: ${opts.feather}px`);
    }

    await sharp(result, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(outputPath);
  }

  const size = statSync(outputPath).size;
  console.log(`  💾 保存: ${outputPath} (${(size / 1024).toFixed(1)} KB)`);

  if (opts.preview) await openPreview(outputPath);
  return true;
}

// ─── 主流程 ─────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs();

  if (opts.inputs.length === 0) {
    printHelp();
    process.exit(1);
  }

  const inputFiles = expandInputs(opts.inputs);
  if (inputFiles.length === 0) {
    console.log('❌ 未找到任何输入文件');
    process.exit(1);
  }

  console.log(`🔧 模式: ${opts.mode === 'ai' ? 'AI 抠图' : '颜色替换'}`);
  console.log(`📁 共 ${inputFiles.length} 个文件待处理\n`);

  // 加载依赖
  const sharp = await loadSharp();
  const removeBg = opts.mode === 'ai' ? await loadRemoveBg() : null;

  if (opts.mode === 'ai' && !removeBg) {
    console.log('⚠️  未找到 @imgly/background-removal-node，请先全局安装：');
    console.log('   npm install -g @imgly/background-removal-node');
    console.log('   安装后重新运行，或改用 --mode color\n');
    process.exit(1);
  }
  if (opts.mode === 'color' && !sharp) {
    console.log('⚠️  未找到 sharp，颜色模式需要全局安装：');
    console.log('   npm install -g sharp');
    process.exit(1);
  }

  const isBatch = inputFiles.length > 1;
  let success = 0, failed = 0;

  for (const inputPath of inputFiles) {
    const outputPath = getOutputPath(inputPath, opts.output, isBatch);
    const ok = await processSingle(inputPath, outputPath, opts, sharp, removeBg);
    ok ? success++ : failed++;
    console.log();
  }

  console.log('='.repeat(40));
  console.log(`✅ 成功: ${success}  ❌ 失败: ${failed}  📊 总计: ${inputFiles.length}`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
