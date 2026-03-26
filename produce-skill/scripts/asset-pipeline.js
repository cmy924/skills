#!/usr/bin/env bun

/**
 * 素材生产线 (Asset Pipeline)
 * 读取 assets.json，批量调用 asset-generate 获取 CDN URL，生成 URL 映射文件。
 *
 * 核心规则：项目中禁止使用相对路径引用素材，必须使用 API 返回的 CDN URL。
 *
 * Usage:
 *   bun run <this-script> --input <assets.json> --output <asset-urls.ts> [options]
 *
 * assets.json 格式:
 *   type 12 (图片): [{ "name": "勺子", "prompt": "A cute cartoon spoon...", "size": "512x512" }]
 *   type 21 (TTS):  [{ "name": "L1_S1_01", "content": "你好", "model": 10139, "ref_audio": 10311, "role_id": "xx", "type": 21 }]
 *   type 12 的 API text 参数为 JSON 对象数组 [{name,prompt,size}]
 *   type 21 的 API text 参数为 JSON 对象数组 [{name,content,model,ref_audio,role_id}]
 *   Pipeline 自动按类型分组批量调用
 *
 * 输出:
 *   asset-urls.ts — TypeScript 常量文件，导出 ASSET_URLS 对象
 *   asset-urls.json — JSON 备份文件
 */

import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const GENERATE_SCRIPT = path.join(SCRIPT_DIR, 'asset-generate.js')

// ==================== 参数解析 ====================

function getArgValue(flag) {
	const idx = Bun.argv.indexOf(flag)
	if (idx === -1) return undefined
	return Bun.argv[idx + 1]
}

function hasFlag(flag) {
	return Bun.argv.includes(flag)
}

// ==================== 主逻辑 ====================

async function main() {
	const help = hasFlag('-h') || hasFlag('--help')
	if (help) {
		console.log([
			'素材生产线 (Asset Pipeline)',
			'',
			'核心规则: 禁止使用相对路径，所有素材通过 CDN URL 引用。',
			'',
			'Usage:',
			'  bun run asset-pipeline.js --input ./素材库/assets.json --output ./asset-urls.ts',
			'',
			'Args:',
			'  --input, -i <path>      (required) JSON file with asset definitions',
			'  --output, -o <path>     (required) Output .ts file for URL mapping',
			'  --type <number>         (optional) Asset type, default: 12 (pic数组)',
			'  --skip-existing         (optional) Skip assets already in existing URL mapping',
			'  --dry-run               (optional) Print plan without generating',
			'  --filter <name>         (optional) Only generate assets matching this name',
			'  --download-dir <path>   (optional) Also download files to this directory',
			'',
			'Output:',
			'  生成 asset-urls.ts 和 asset-urls.json',
			'  TS 文件导出 ASSET_URLS: Record<string, string>',
			'  游戏代码中直接 import { ASSET_URLS } from "./asset-urls" 使用',
		].join('\n'))
		process.exit(0)
	}

	const inputFile = getArgValue('--input') || getArgValue('-i')
	if (!inputFile) {
		console.error('[pipeline] Error: Missing --input <assets.json>')
		process.exit(1)
	}

	const outputFile = getArgValue('--output') || getArgValue('-o')
	if (!outputFile) {
		console.error('[pipeline] Error: Missing --output <asset-urls.ts>')
		process.exit(1)
	}

	const globalType = getArgValue('--type') || '12'
	const skipExisting = hasFlag('--skip-existing')
	const dryRun = hasFlag('--dry-run')
	const filter = getArgValue('--filter')
	const downloadDir = getArgValue('--download-dir')

	// 读取 assets.json
	const inputPath = path.isAbsolute(inputFile) ? inputFile : path.resolve(process.cwd(), inputFile)
	const raw = await fs.readFile(inputPath, 'utf-8')
	let assets
	try {
		assets = JSON.parse(raw)
	} catch (e) {
		console.error(`[pipeline] Error: Failed to parse ${inputPath}: ${e.message}`)
		process.exit(1)
	}

	if (!Array.isArray(assets)) {
		console.error('[pipeline] Error: JSON must be an array of { name, prompt, size }')
		process.exit(1)
	}

	// 过滤
	if (filter) {
		assets = assets.filter(a => a.name && a.name.includes(filter))
	}

	// 读取已有映射（用于 --skip-existing）
	const outputPath = path.isAbsolute(outputFile) ? outputFile : path.resolve(process.cwd(), outputFile)
	const jsonOutputPath = outputPath.replace(/\.ts$/, '.json')
	let existingUrls = {}
	if (skipExisting) {
		try {
			const existing = await fs.readFile(jsonOutputPath, 'utf-8')
			existingUrls = JSON.parse(existing)
		} catch {
			// no existing file, that's fine
		}
	}

	console.log(`[pipeline] 📋 共 ${assets.length} 个素材, 默认type=${globalType}`)
	console.log(`[pipeline] 📁 输出: ${outputPath}`)
	console.log('')

	if (dryRun) {
		for (let i = 0; i < assets.length; i++) {
			const a = assets[i]
			const skip = skipExisting && existingUrls[a.name]
			const assetType = a.type || globalType
			console.log(`  [${i + 1}/${assets.length}] ${a.name} (${a.size || 'default'}, type=${assetType}) ${skip ? '⏭️ 已有URL' : ''}`)
			console.log(`    prompt: ${(a.prompt || '').slice(0, 80)}...`)
		}
		console.log('\n[pipeline] --dry-run 模式，未实际生成。')
		return
	}

	// ==================== 分组批量处理 ====================
	// type 12 (图片): text 为 JSON 对象数组 [{name, prompt, size}, ...]
	// type 21 (TTS):  text 为 JSON 对象数组 [{name,content,model,ref_audio,role_id}]
	// Pipeline 将同类型素材归组，一次性批量调用 API

	const urlMap = { ...existingUrls }
	const results = []

	// 按 type 分组
	const groupedAssets = {}
	for (const asset of assets) {
		const assetType = String(asset.type || globalType)
		if (!groupedAssets[assetType]) groupedAssets[assetType] = []
		groupedAssets[assetType].push(asset)
	}

	let idx = 0
	const totalCount = assets.length

	for (const [assetType, group] of Object.entries(groupedAssets)) {
		// 过滤掉缺字段和已存在的
		const pending = []
		for (const asset of group) {
			idx++
			const { name, prompt } = asset
			if (!name || !prompt) {
				console.error(`  [${idx}/${totalCount}] ⚠️ 跳过: 缺少 name 或 prompt`)
				results.push({ name: name || `item_${idx}`, status: 'skipped', reason: 'missing fields' })
				continue
			}
			if (skipExisting && existingUrls[name]) {
				console.log(`  [${idx}/${totalCount}] ⏭️  ${name} - 已有URL, 跳过`)
				results.push({ name, status: 'skipped', reason: 'existing', url: existingUrls[name] })
				continue
			}
			pending.push({ ...asset, _idx: idx })
		}

		if (pending.length === 0) continue

		// 构建 text 参数：type 12 为对象数组 [{name,prompt,size}]，type 21 为对象数组 [{name,content,model,ref_audio,role_id}]
		let textJson
		if (assetType === '12') {
			// type 12: [{name, prompt, size}, ...]
			const objArray = pending.map(a => ({
				name: a.name,
				prompt: a.prompt,
				size: a.size || '',
			}))
			textJson = JSON.stringify(objArray)
		} else {
			// type 21: [{name, content, model, ref_audio, role_id}, ...]
			const objArray = pending.map(a => ({
				name: a.name,
				content: a.content || a.prompt,
				model: a.model,
				ref_audio: a.ref_audio,
				role_id: a.role_id,
			}))
			textJson = JSON.stringify(objArray)
		}

		const typeLabel = assetType === '21' ? '🔊 TTS' : '🎨 图片'
		console.log(`  ${typeLabel} 批量 type=${assetType}: ${pending.length} 个素材 [${pending.map(a => a.name).join(', ')}]`)

		try {
			const bunExe = process.execPath || 'bun'
			const cmd = [bunExe, 'run', GENERATE_SCRIPT, '--text', textJson, '--type', assetType, '--url-only']
			const proc = Bun.spawn({
				cmd,
				cwd: process.cwd(),
				stdout: 'pipe',
				stderr: 'pipe',
				env: { ...process.env },
			})

			const stdout = await new Response(proc.stdout).text()
			const stderr = await new Response(proc.stderr).text()
			const exitCode = await proc.exited

			if (exitCode !== 0) {
				console.error(`    ❌ 批量失败 (type=${assetType}): ${stderr.trim().split('\n').pop()}`)
				for (const a of pending) {
					results.push({ name: a.name, status: 'failed', error: stderr.trim().split('\n').pop() })
				}
			} else {
				// 每行一个 URL，按顺序对应 pending
				const urls = stdout.trim().split('\n').filter(l => l.startsWith('http'))

				for (let j = 0; j < pending.length; j++) {
					const a = pending[j]
					const url = urls[j]
					if (url) {
						urlMap[a.name] = url
						console.log(`    ✅ ${a.name} → ${url.slice(0, 80)}...`)
						results.push({ name: a.name, status: 'success', url })

						if (downloadDir) {
							const dlDir = path.isAbsolute(downloadDir) ? downloadDir : path.resolve(process.cwd(), downloadDir)
							await fs.mkdir(dlDir, { recursive: true })
							try {
								const res = await fetch(url)
								const ct = res.headers.get('content-type') || ''
								let ext = assetType === '21' ? '.mp3' : '.jpg'
								if (ct.includes('png')) ext = '.png'
								else if (ct.includes('webp')) ext = '.webp'
								else if (ct.includes('mp3') || ct.includes('mpeg')) ext = '.mp3'
								else if (ct.includes('wav')) ext = '.wav'
								else if (ct.includes('ogg')) ext = '.ogg'
								const buf = new Uint8Array(await res.arrayBuffer())
								const dlPath = path.join(dlDir, `${a.name}${ext}`)
								await Bun.write(dlPath, buf)
								console.log(`    📥 ${path.basename(dlPath)}`)
							} catch (dlErr) {
								console.error(`    ⚠️ 下载失败: ${dlErr.message}`)
							}
						}
					} else {
						console.error(`    ❌ ${a.name}: 未获取到对应 URL (第${j + 1}条)`)
						results.push({ name: a.name, status: 'failed', error: `No URL at index ${j}` })
					}
				}
			}
		} catch (err) {
			console.error(`    ❌ 批量异常 (type=${assetType}): ${err.message}`)
			for (const a of pending) {
				results.push({ name: a.name, status: 'failed', error: err.message })
			}
		}
	}

	// ==================== 输出文件生成 ====================

	// 1. 生成 JSON 文件
	await fs.mkdir(path.dirname(jsonOutputPath), { recursive: true })
	await fs.writeFile(jsonOutputPath, JSON.stringify(urlMap, null, 2))

	// 2. 生成 TypeScript 文件
	const tsContent = [
		'/**',
		' * 素材 CDN URL 映射（由素材生产线自动生成，请勿手动修改）',
		` * 生成时间: ${new Date().toISOString()}`,
		` * 素材数量: ${Object.keys(urlMap).length}`,
		' *',
		' * 规则: 项目中禁止使用相对路径引用素材，必须使用此文件中的 CDN URL',
		' */',
		'',
		'export const ASSET_URLS: Record<string, string> = {',
		...Object.entries(urlMap).map(([k, v]) => `  '${k}': '${v}',`),
		'} as const',
		'',
		'export type AssetName = keyof typeof ASSET_URLS',
		'',
		'/** 获取素材 URL，带类型检查 */',
		'export function getAssetUrl(name: AssetName): string {',
		'  return ASSET_URLS[name]',
		'}',
		'',
	].join('\n')

	await fs.writeFile(outputPath, tsContent)

	// 汇总
	console.log('')
	console.log('━'.repeat(50))
	const success = results.filter(r => r.status === 'success').length
	const failed = results.filter(r => r.status === 'failed').length
	const skipped = results.filter(r => r.status === 'skipped').length
	console.log(`[pipeline] ✅ 成功: ${success}  ❌ 失败: ${failed}  ⏭️  跳过: ${skipped}  📦 总计: ${results.length}`)
	console.log(`[pipeline] 📄 ${outputPath}`)
	console.log(`[pipeline] 📄 ${jsonOutputPath}`)
	console.log(`[pipeline] 🔗 URL 映射共 ${Object.keys(urlMap).length} 条`)

	// 自动重新生成 asset-data.json（保持与 asset-urls.ts 同步）
	const genScript = path.resolve(import.meta.dir, '../../preview-skill/scripts/gen-asset-data.mjs');
	try {
		const proc = Bun.spawn(['node', genScript], { cwd: process.cwd(), stdout: 'pipe', stderr: 'pipe' });
		await proc.exited;
		if (proc.exitCode === 0) {
			console.log('[pipeline] ✅ asset-data.json 已同步更新');
		} else {
			const err = await new Response(proc.stderr).text();
			console.log('[pipeline] ⚠️  asset-data.json 更新失败:', err.trim());
		}
	} catch (e) {
		console.log('[pipeline] ⚠️  无法运行 gen-asset-data.mjs:', e.message);
	}

	if (failed > 0) {
		process.exit(1)
	}
}

await main()
