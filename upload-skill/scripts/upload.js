#!/usr/bin/env bun

/**
 * CS 文件上传脚本
 * 通过 aic-service 封装接口上传本地文件到 CS，返回 CDN URL
 *
 * 接口: POST https://aic-service.sdp.101.com/v1.0/cs/actions/upload_to_cs
 * 参数: multipart/form-data, field name = "file"
 * 认证: BTS Token (@AicAuth)
 * 返回: Dentry 对象 { dentryId, ... }
 */

import * as crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

// ─── 配置 ───

const UPLOAD_API = Bun.env.UPLOAD_API || 'https://aic-service.sdp.101.com/v1.0/cs/actions/upload_to_cs'
const CDN_HOST = Bun.env.CDN_HOST || 'https://gcdncs.101.com'
const SDP_HEAD_FLAG = 'SDP-'

// ─── BTS 认证 ───

let latestTokenInfo

function randomString(n) {
	return (Math.random() * 1e18).toString(36).substring(0, n)
}

function getNonce() {
	return `${String(Date.now()).substring(0, 13)}:${randomString(8)}`
}

function base64Hmac(content, key) {
	const hmac = crypto.createHmac('sha256', key)
	hmac.update(content, 'utf8')
	return hmac.digest().toString('base64')
}

function getBtsAuthorizationByToken(tokenInfo, reqHeaders, method, route, host) {
	const accessToken = tokenInfo.access_token
	const nonce = getNonce()
	const signParams = [nonce, method, route, host]

	const tmpHeaders = []
	Object.entries(reqHeaders).forEach(([key, value]) => {
		if (key.toUpperCase().startsWith(SDP_HEAD_FLAG)) {
			tmpHeaders.push({ k: key.toUpperCase(), v: value })
		}
	})
	tmpHeaders.sort((a, b) => (a.k > b.k ? 1 : -1))
	tmpHeaders.forEach((item) => signParams.push(item.v))
	signParams.push('')

	const mac = base64Hmac(signParams.join('\n'), tokenInfo.mac_key)
	return `AIC id="${accessToken}",nonce="${nonce}",mac="${mac}"`
}

async function getBtsTokenInfo(reqHeaders) {
	if (latestTokenInfo?.expires_at) {
		const diff = new Date(latestTokenInfo.expires_at).valueOf() - Date.now()
		if (Number.isFinite(diff) && diff > 3600 * 1000 * 24) return latestTokenInfo
	}

	const btsHost = Bun.env.BTS_HOST || 'https://ucbts.101.com'
	const btsName = Bun.env.BTS_NAME
	const btsSecret = Bun.env.BTS_SECRET
	if (!btsName) throw new Error('Missing env: BTS_NAME')
	if (!btsSecret) throw new Error('Missing env: BTS_SECRET')

	const headers = { 'Content-Type': 'application/json' }
	Object.entries(reqHeaders).forEach(([key, value]) => {
		if (key.toUpperCase().startsWith(SDP_HEAD_FLAG)) headers[key] = value
	})

	const timestamp = Date.now()
	const data = {
		app_name: btsName,
		app_secret: btsSecret,
		token_type: 'e',
		timestamp,
		sign: base64Hmac(`${btsName}:${timestamp}`, btsSecret),
		version: 'javascript',
	}

	const resp = await fetch(`${btsHost}/v1/tokens`, {
		method: 'POST',
		headers,
		body: JSON.stringify(data),
	})

	if (!resp.ok) {
		let text = ''
		try { text = await resp.text() } catch { /* ignore */ }
		throw new Error(`Failed to get BTS token: ${resp.status} ${resp.statusText}${text ? `\n${text}` : ''}`)
	}

	latestTokenInfo = await resp.json()
	return latestTokenInfo
}

async function getAicToken() {
	return 'AIC'
}

// ─── 工具函数 ───

function getArgValue(flag) {
	const idx = Bun.argv.indexOf(flag)
	if (idx === -1) return undefined
	return Bun.argv[idx + 1]
}

function hasFlag(flag) {
	return Bun.argv.includes(flag)
}

function getMimeType(filePath) {
	const ext = path.extname(filePath).toLowerCase()
	const mimeMap = {
		'.png': 'image/png',
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.gif': 'image/gif',
		'.webp': 'image/webp',
		'.svg': 'image/svg+xml',
		'.mp3': 'audio/mpeg',
		'.wav': 'audio/wav',
		'.ogg': 'audio/ogg',
		'.mp4': 'video/mp4',
		'.json': 'application/json',
		'.pdf': 'application/pdf',
	}
	return mimeMap[ext] || 'application/octet-stream'
}

// ─── 上传核心 ───

/**
 * 通过 aic-service 接口上传文件
 * POST multipart/form-data { file: <binary> }
 * 返回 Dentry 对象，从中提取 dentryId 构建 CDN URL
 */
async function uploadFile(filePath) {
	const absPath = path.resolve(filePath)
	const fileName = path.basename(absPath)
	const fileBuffer = await fs.readFile(absPath)
	const mimeType = getMimeType(absPath)

	// 构建 multipart form data
	const formData = new FormData()
	const blob = new Blob([fileBuffer], { type: mimeType })
	formData.append('file', blob, fileName)

	// BTS 认证
	const signHeaders = {
		'Sdp-App-Id': 'b4fb92a0-af7f-49c2-b270-8f62afac1133',
	}

	const Authorization = await getAicToken()

	const headers = { ...signHeaders, Authorization }

	const resp = await fetch(UPLOAD_API, {
		method: 'POST',
		headers,
		body: formData,
	})

	if (!resp.ok) {
		let text = ''
		try { text = await resp.text() } catch { /* ignore */ }
		throw new Error(`Upload failed: ${resp.status} ${resp.statusText}${text ? `\n${text}` : ''}`)
	}

	const dentry = await resp.json()

	// 从 Dentry 响应中提取 dentryId
	const dentryId = dentry.dentry_id || dentry.dentryId || dentry.id
	if (!dentryId) {
		console.error(`[upload] Dentry response: ${JSON.stringify(dentry).substring(0, 500)}`)
		throw new Error('No dentryId found in response')
	}

	const cdnUrl = `${CDN_HOST}/v0.1/download?attachment=true&dentryId=${dentryId}`
	return { dentryId, cdnUrl, fileName, dentry }
}

// ─── 批量上传 ───

async function uploadFiles(files) {
	const results = []

	for (const filePath of files) {
		const absPath = path.resolve(filePath)
		const stat = await fs.stat(absPath)

		if (!stat.isFile()) {
			console.error(`[upload] Skipping non-file: ${absPath}`)
			continue
		}

		const fileName = path.basename(absPath)
		console.error(`[upload] Uploading: ${fileName} (${(stat.size / 1024).toFixed(1)} KB)`)

		try {
			const result = await uploadFile(absPath)
			results.push({ file: fileName, ...result, status: 'ok' })
			console.error(`[upload] ✅ ${fileName} → ${result.cdnUrl}`)
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err)
			results.push({ file: fileName, status: 'error', error: msg })
			console.error(`[upload] ❌ ${fileName} → ${msg}`)
		}
	}

	return results
}

// ─── 收集文件 ───

async function collectFiles(inputPath) {
	const absPath = path.resolve(inputPath)
	const stat = await fs.stat(absPath)

	if (stat.isFile()) return [absPath]

	if (stat.isDirectory()) {
		const entries = await fs.readdir(absPath, { withFileTypes: true })
		const validExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.mp3', '.wav', '.ogg', '.mp4']
		const files = []
		for (const entry of entries) {
			if (!entry.isFile()) continue
			const ext = path.extname(entry.name).toLowerCase()
			if (validExts.includes(ext)) {
				files.push(path.join(absPath, entry.name))
			}
		}
		files.sort()
		return files
	}

	return []
}

// ─── 更新 asset-urls ───

async function updateAssetUrls(results, nameMap, assetUrlsPath, assetUrlsJsonPath) {
	let existing = {}
	try {
		const raw = await fs.readFile(assetUrlsJsonPath, 'utf-8')
		existing = JSON.parse(raw)
	} catch {
		// 文件不存在或解析失败
	}

	for (const r of results) {
		if (r.status !== 'ok') continue
		const baseName = path.basename(r.file, path.extname(r.file))
		const name = nameMap[r.file] || nameMap[baseName] || baseName
		existing[name] = r.cdnUrl
	}

	await fs.writeFile(assetUrlsJsonPath, JSON.stringify(existing, null, 2), 'utf-8')

	const entries = Object.entries(existing)
		.map(([k, v]) => `  '${k}': '${v}'`)
		.join(',\n')

	const ts = `/**
 * 素材 CDN URL 映射（由素材生产线自动生成，请勿手动修改）
 * 生成时间: ${new Date().toISOString()}
 * 素材数量: ${Object.keys(existing).length}
 *
 * 规则: 项目中禁止使用相对路径引用素材，必须使用此文件中的 CDN URL
 */

export const ASSET_URLS: Record<string, string> = {
${entries},
} as const

export type AssetName = keyof typeof ASSET_URLS

export function getAssetUrl(name: AssetName): string {
  return ASSET_URLS[name]
}
`
	await fs.writeFile(assetUrlsPath, ts, 'utf-8')
	console.error(`[upload] Updated ${assetUrlsPath} (${Object.keys(existing).length} entries)`)
	console.error(`[upload] Updated ${assetUrlsJsonPath}`)

	// 自动重新生成 asset-data.json（保持与 asset-urls.ts 同步）
	const genScript = path.resolve(import.meta.dir, '../../preview-skill/scripts/gen-asset-data.mjs');
	try {
		const proc = Bun.spawn(['node', genScript], { cwd: process.cwd(), stdout: 'pipe', stderr: 'pipe' });
		await proc.exited;
		if (proc.exitCode === 0) {
			console.error('[upload] ✅ asset-data.json 已同步更新');
		} else {
			const err = await new Response(proc.stderr).text();
			console.error('[upload] ⚠️  asset-data.json 更新失败:', err.trim());
		}
	} catch (e) {
		console.error('[upload] ⚠️  无法运行 gen-asset-data.mjs:', e.message);
	}
}

// ─── 主函数 ───

async function main() {
	try {
		const help = hasFlag('-h') || hasFlag('--help')
		if (help) {
			console.error(
				[
					'CS 文件上传工具（通过 aic-service）',
					'',
					'Usage:',
					'  bun run scripts/upload.js <file-or-dir> [options]',
					'  bun run scripts/upload.js ./素材库/download/西红柿.jpg',
					'  bun run scripts/upload.js ./素材库/download/ --update-urls',
					'',
					'Env:',
					'  BTS_NAME=...            (required) BTS app name',
					'  BTS_SECRET=...          (required) BTS app secret',
					'  UPLOAD_API=...          (optional, default: https://aic-service.sdp.101.com/v1.0/cs/actions/upload_to_cs)',
					'  CDN_HOST=...            (optional, default: https://gcdncs.101.com)',
					'',
					'Args:',
					'  <file-or-dir>           (required) local file or directory to upload',
					'  --update-urls           (optional) update asset-urls.ts and asset-urls.json',
					'  --urls-ts <path>        (optional, default: ./asset-urls.ts)',
					'  --urls-json <path>      (optional, default: ./asset-urls.json)',
					'  --json                  (optional) output results as JSON',
					'  --name-map <json>       (optional) JSON mapping: {"filename": "素材名称"}',
				].join('\n')
			)
			process.exit(0)
		}

		const args = Bun.argv.slice(2)
		let inputPath = null
		for (const arg of args) {
			if (!arg.startsWith('-')) {
				inputPath = arg
				break
			}
		}
		if (!inputPath) throw new Error('Missing input file or directory path')

		const updateUrls = hasFlag('--update-urls')
		const jsonOutput = hasFlag('--json')
		const urlsTsPath = getArgValue('--urls-ts') || './asset-urls.ts'
		const urlsJsonPath = getArgValue('--urls-json') || './asset-urls.json'
		const nameMapRaw = getArgValue('--name-map')

		let nameMap = {}
		if (nameMapRaw) {
			try {
				nameMap = JSON.parse(nameMapRaw)
			} catch {
				throw new Error(`Invalid --name-map JSON: ${nameMapRaw}`)
			}
		}

		console.error(`[upload] API: ${UPLOAD_API}`)
		console.error(`[upload] Input: ${inputPath}`)

		const files = await collectFiles(inputPath)
		if (files.length === 0) {
			throw new Error(`No uploadable files found in: ${inputPath}`)
		}
		console.error(`[upload] Found ${files.length} file(s) to upload`)

		const results = await uploadFiles(files)

		const okCount = results.filter((r) => r.status === 'ok').length
		const errCount = results.filter((r) => r.status === 'error').length

		if (jsonOutput) {
			console.log(JSON.stringify(results, null, 2))
		} else {
			console.log('')
			console.log('─── Upload Results ───')
			for (const r of results) {
				if (r.status === 'ok') {
					const baseName = path.basename(r.file, path.extname(r.file))
					const displayName = nameMap[r.file] || nameMap[baseName] || r.file
					console.log(`✅ ${displayName} → ${r.cdnUrl}`)
				} else {
					console.log(`❌ ${r.file} → ${r.error}`)
				}
			}
			console.log(`\nTotal: ${okCount} success, ${errCount} failed`)
		}

		if (updateUrls && okCount > 0) {
			await updateAssetUrls(results, nameMap, urlsTsPath, urlsJsonPath)
		}

		if (errCount > 0) process.exit(1)
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err)
		console.error(`[upload] Error: ${message}`)
		process.exit(1)
	}
}

await main()
