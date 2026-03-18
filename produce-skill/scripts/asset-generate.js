#!/usr/bin/env bun

/**
 * 小游戏-素材生产库 (Mini Game Asset Production)
 * AI_HUB_X_APP_ID: e1b65227-ecf5-4b26-9bef-0f719f43e426
 *
 * Inputs: { text, type }
 * Type options:
 *   11 - 图生图 (image-to-image) - text 为 JSON 对象数组字符串 [{name,prompt,size,url},...] ✅
 *   12 - 文生图数组 (text-to-image array) - text 为 JSON 对象数组字符串 [{name,prompt,size},...] ✅
 *   21 - 文生语音数组 (text-to-speech array) - text 为 JSON 对象数组 [{name,content,model,ref_audio,role_id}] ✅
 */

import * as crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

const SDP_HEAD_FLAG = 'SDP-'
const ASSET_APP_ID = 'e1b65227-ecf5-4b26-9bef-0f719f43e426'

const TYPE_MAP = {
	11: '图生图',
	12: '文生图-数组',
	21: '文生语音-数组',
}

const VALID_TYPES = [11, 12, 21]
const PIC_TYPES = [11, 12]
const TTS_TYPES = [21]

let latestTokenInfo

function randomString(n) {
	return (Math.random() * 1e18).toString(36).substring(0, n)
}

function getNonce() {
	const timeLength = 13
	const randomLength = 8
	return `${String(Date.now()).substring(0, timeLength)}:${randomString(randomLength)}`
}

function base64Hmac(requestContent, macKey) {
	const hmac = crypto.createHmac('sha256', macKey)
	hmac.update(requestContent, 'utf8')
	return hmac.digest().toString('base64')
}

function buildURL(url, params) {
	if (!params || Object.keys(params).length === 0) return url
	const u = new URL(url)
	for (const [k, v] of Object.entries(params)) {
		if (v === undefined || v === null) continue
		u.searchParams.set(k, String(v))
	}
	return u.toString()
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
	return `BTS id="${accessToken}",nonce="${nonce}",mac="${mac}"`
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
		try {
			text = await resp.text()
		} catch {
			// ignore
		}
		throw new Error(`Failed to get BTS token: ${resp.status} ${resp.statusText}${text ? `\n${text}` : ''}`)
	}

	latestTokenInfo = await resp.json()
	return latestTokenInfo
}

async function getBtsToken({ method, params, headers, url }) {
	const tokenInfo = await getBtsTokenInfo(headers)
	const urlBuild = buildURL(url, params)
	const { host, pathname, search } = new URL(urlBuild)
	const route = `${pathname}${search}`
	return getBtsAuthorizationByToken(tokenInfo, headers, method, route, host)
}

function getArgValue(flag) {
	const idx = Bun.argv.indexOf(flag)
	if (idx === -1) return undefined
	return Bun.argv[idx + 1]
}

function hasFlag(flag) {
	return Bun.argv.includes(flag)
}

function nowStamp() {
	const d = new Date()
	const pad = (n) => String(n).padStart(2, '0')
	return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

function safeFileBaseName(input) {
	return String(input)
		.trim()
		.slice(0, 60)
		.replace(/[\\/:*?"<>|]/g, '_')
		.replace(/\s+/g, '_')
}

function inferExtFromUrlOrType(url, contentType) {
	const byType = String(contentType || '').toLowerCase()
	if (byType.includes('image/png')) return '.png'
	if (byType.includes('image/jpeg') || byType.includes('image/jpg')) return '.jpg'
	if (byType.includes('image/webp')) return '.webp'
	if (byType.includes('image/svg')) return '.svg'
	if (byType.includes('audio/mpeg') || byType.includes('audio/mp3')) return '.mp3'
	if (byType.includes('audio/wav')) return '.wav'
	if (byType.includes('audio/ogg')) return '.ogg'
	if (byType.includes('application/json')) return '.json'

	try {
		const u = new URL(url)
		const ext = path.extname(u.pathname)
		if (ext) return ext
	} catch {
		// ignore
	}
	return ''
}

function isLikelyDirPath(p) {
	if (!p) return false
	return p.endsWith('/') || p.endsWith('\\')
}

async function* sseEvents(response) {
	if (!response.body) throw new Error('Empty response body')

	const reader = response.body.getReader()
	const decoder = new TextDecoder('utf-8')
	let buffer = ''

	while (true) {
		const { value, done } = await reader.read()
		if (done) break
		buffer += decoder.decode(value, { stream: true })

		while (true) {
			const sepIdx = buffer.indexOf('\n\n')
			const sepIdxCrLf = buffer.indexOf('\r\n\r\n')
			const idx = sepIdxCrLf !== -1 ? sepIdxCrLf : sepIdx
			const sepLen = sepIdxCrLf !== -1 ? 4 : 2
			if (idx === -1) break

			const raw = buffer.slice(0, idx)
			buffer = buffer.slice(idx + sepLen)

			const lines = raw.split(/\r?\n/)
			const dataLines = []
			for (const line of lines) {
				if (!line) continue
				if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
			}

			if (!dataLines.length) continue
			const dataStr = dataLines.join('\n')
			yield dataStr
		}
	}

	const rest = buffer.trim()
	if (rest) {
		const lines = rest.split(/\r?\n/)
		const dataLines = []
		for (const line of lines) {
			if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
		}
		if (dataLines.length) yield dataLines.join('\n')
	}
}

async function runAssetWorkflow({ endpoint, apiKey, text, type, environment, imagePath }) {
	const headers = {
		Accept: 'text/event-stream',
		'X-App-Id': ASSET_APP_ID,
		'X-Project-Key': apiKey,
		'Sdp-App-Id': 'b4fb92a0-af7f-49c2-b270-8f62afac1133',
	}

	const Authorization = await getBtsToken({
		method: 'POST',
		headers,
		url: endpoint,
	})

	if (Authorization) headers.Authorization = Authorization

	let body
	if (imagePath) {
		// type 11 (图生图): use multipart/form-data to upload image file
		const fileBuffer = await fs.readFile(imagePath)
		const fileName = path.basename(imagePath)
		const blob = new Blob([fileBuffer])
		const formData = new FormData()
		formData.append('inputs', JSON.stringify({ text, type: String(type) }))
		formData.append('user', '')
		formData.append('response_mode', 'streaming')
		formData.append('environment', environment)
		formData.append('image', blob, fileName)
		body = formData
		// Do NOT set Content-Type — fetch auto-sets multipart boundary
	} else {
		headers['Content-Type'] = 'application/json'
		body = JSON.stringify({
			inputs: { text, type: String(type) },
			user: '',
			response_mode: 'streaming',
			environment,
		})
	}

	const res = await fetch(endpoint, {
		method: 'POST',
		headers,
		body,
	})

	if (!res.ok) {
		const errText = await res.text().catch(() => '')
		throw new Error(`Workflow run failed: HTTP ${res.status} ${res.statusText}${errText ? `\n${errText}` : ''}`)
	}

	for await (const dataStr of sseEvents(res)) {
		let payload
		try {
			payload = JSON.parse(dataStr)
		} catch {
			continue
		}

		if (!payload || typeof payload !== 'object') continue
		if (payload.event !== 'workflow_finished') continue

		const errorMessage =
			payload?.data?.outputs?.error_message ||
			payload?.outputs?.error_message ||
			payload?.data?.error_message

		if (typeof errorMessage === 'string' && errorMessage.trim()) {
			throw new Error(errorMessage.trim())
		}

		// Return full outputs for flexible downstream handling
		const outputs = payload?.data?.outputs || payload?.outputs || {}
		return outputs
	}

	throw new Error('SSE stream ended before workflow_finished')
}

async function downloadToFile(url, filePath) {
	const res = await fetch(url)
	if (!res.ok) {
		throw new Error(`Download failed: HTTP ${res.status} ${res.statusText}`)
	}

	const contentType = res.headers.get('content-type')
	let finalPath = filePath
	const ext = path.extname(finalPath)
	if (!ext) {
		const inferred = inferExtFromUrlOrType(url, contentType)
		if (inferred) finalPath = `${finalPath}${inferred}`
	}

	finalPath = path.resolve(finalPath)
	await fs.mkdir(path.dirname(finalPath), { recursive: true })

	const buf = new Uint8Array(await res.arrayBuffer())
	await Bun.write(finalPath, buf)
	return finalPath
}

async function downloadToDir(url, outDir, fileBaseName) {
	await fs.mkdir(outDir, { recursive: true })

	const res = await fetch(url)
	if (!res.ok) {
		throw new Error(`Download failed: HTTP ${res.status} ${res.statusText}`)
	}

	const contentType = res.headers.get('content-type')
	const ext = inferExtFromUrlOrType(url, contentType) || '.bin'
	const filename = `${fileBaseName}${ext}`
	const filePath = path.resolve(outDir, filename)

	const buf = new Uint8Array(await res.arrayBuffer())
	await Bun.write(filePath, buf)
	return filePath
}

async function saveJsonToFile(data, filePath) {
	const finalPath = path.resolve(filePath)
	await fs.mkdir(path.dirname(finalPath), { recursive: true })
	await Bun.write(finalPath, JSON.stringify(data, null, 2))
	return finalPath
}

async function main() {
	try {
		const help = hasFlag('-h') || hasFlag('--help')
		if (help) {
			console.error(
				[
					'小游戏-素材生产库 Asset Generator',
					'',
					'Usage:',
					'  bun run scripts/asset-generate.js --text "..." --type 10',
					'  bun run scripts/asset-generate.js --text "..." --type 20 --outFile "./audio/speech.mp3"',
					'',
					'Env:',
					'  AI_HUB_KEY=...          (required) Bearer token for API',
					'  BTS_NAME=...            (required) BTS app name',
					'  BTS_SECRET=...          (required) BTS app secret',
					'  AI_HUB_HOST=...         (optional, default: https://ai-hub-api.aiae.ndhy.com)',
					'  AI_HUB_BOT_ENV=prod     (optional, default: prod)',
					'',
					'Args:',
					'  --text, -t <text>       (required) input text / prompt',
					'  --type <number>         (required) asset type:',
					'                            12 = pic 数组 (image array, text=JSON对象数组[{name,prompt,size}])',
				'                            21 = tts 数组 (tts array, text=JSON对象数组[{name,content,model,ref_audio,role_id}])',
					'  --outFile <path>        (optional) output file path',
					'  --outDir <path>         (optional) output directory (default: output)',
					'  --json                  (optional) print full JSON output to stdout',
					'',
					'Output:',
					'  Default: prints saved file paths to stdout.',
					'  With --json: prints full workflow outputs JSON.',
				].join('\n')
			)
			process.exit(0)
		}

		const apiKey = Bun.env.AI_HUB_KEY
		if (!apiKey) throw new Error('Missing env: AI_HUB_KEY')

		const endpoint = (Bun.env.AI_HUB_HOST || 'https://ai-hub-api.aiae.ndhy.com') + '/v1/workflows/run'
		const environment = getArgValue('--env') || Bun.env.AI_HUB_BOT_ENV || 'prod'

		const text = getArgValue('--text') || getArgValue('-t')
		if (!text) throw new Error('Missing required arg: --text')

		const typeStr = getArgValue('--type')
		if (!typeStr) throw new Error('Missing required arg: --type')
		const type = Number(typeStr)
		if (!VALID_TYPES.includes(type)) {
			throw new Error(`Invalid --type ${typeStr}. Must be one of: ${VALID_TYPES.join(', ')}`)
		}

		// --image is optional for type 11 (图生图)
		// If --image is provided, use multipart/form-data upload
		// If not provided, type 11 can also use JSON body with url in text array: [{name,prompt,size,url}]
		const imageRaw = getArgValue('--image')
		const imagePath = imageRaw
			? (path.isAbsolute(imageRaw) ? imageRaw : path.resolve(process.cwd(), imageRaw))
			: undefined
		if (imagePath) {
			try { await fs.access(imagePath) } catch {
				throw new Error(`Image file not found: ${imagePath}`)
			}
		}

		const jsonOutput = hasFlag('--json')
		const urlOnly = hasFlag('--url-only')
		const outFileRaw = getArgValue('--outFile') || getArgValue('--output')
		const outFile = outFileRaw
			? (path.isAbsolute(outFileRaw) ? outFileRaw : path.resolve(process.cwd(), outFileRaw))
			: undefined
		const outDir = getArgValue('--outDir') || path.resolve(process.cwd(), 'output')

		const typeLabel = TYPE_MAP[type] || `type${type}`
		const base = `${nowStamp()}_${typeLabel}_${safeFileBaseName(text)}`

		console.error(`[asset-generate] type=${type} (${typeLabel}), text="${text.slice(0, 80)}..."${imagePath ? `, image=${imagePath}` : ''}`)
		console.error(`[asset-generate] Calling workflow...`)

		const outputs = await runAssetWorkflow({
			endpoint,
			apiKey,
			text,
			type,
			environment,
			imagePath,
		})

		if (jsonOutput) {
			console.log(JSON.stringify(outputs, null, 2))
			return
		}

		// Extract all URLs from outputs first
		const extractedUrls = []
		if (Array.isArray(outputs.scene_list)) {
			for (const item of outputs.scene_list) {
				if (item?.url && typeof item.url === 'string') extractedUrls.push(item.url)
			}
		}
		if (Array.isArray(outputs.samll_list)) {
			for (const item of outputs.samll_list) {
				if (item?.url && typeof item.url === 'string') extractedUrls.push(item.url)
			}
		}
		// FIX: Handle outputs.output array format [{url, name}]
		if (Array.isArray(outputs.output)) {
			for (const item of outputs.output) {
				if (item?.url && typeof item.url === 'string') extractedUrls.push(item.url)
			}
		}
		const flatList = outputs.url_list || outputs.urls || []
		if (Array.isArray(flatList)) {
			for (const u of flatList) {
				if (typeof u === 'string' && u.startsWith('http')) extractedUrls.push(u)
			}
		}

		// --url-only mode: just print CDN URLs, no download
		if (urlOnly) {
			if (extractedUrls.length > 0) {
				for (const u of extractedUrls) console.log(u)
			} else {
				console.error('[asset-generate] Warning: No URLs found in output')
				console.error(JSON.stringify(outputs, null, 2))
			}
			return
		}

		// Extract downloadable URLs from outputs
		// API response formats:
		//   type 10 (父子图): { scene_list: [{level, url}], samll_list: [{level, url}] | null }
		//   type 11 (pic数组): { scene_list: [{level, url}], samll_list: [{level, url}] | null }
		//   type 20/21/23 (tts): { url_list: [string] } or { scene_list, ... }
		const savedPaths = []

		// Collect all URLs from various response shapes
		const allUrls = []

		// Handle scene_list (parent/main images)
		if (Array.isArray(outputs.scene_list)) {
			for (const item of outputs.scene_list) {
				if (item?.url && typeof item.url === 'string') {
					allUrls.push({ url: item.url, tag: `scene_L${item.level ?? 0}` })
				}
			}
		}

		// Handle samll_list (child/detail images) — note: API typo "samll"
		if (Array.isArray(outputs.samll_list)) {
			for (const item of outputs.samll_list) {
				if (item?.url && typeof item.url === 'string') {
					allUrls.push({ url: item.url, tag: `small_L${item.level ?? 0}` })
				}
			}
		}

		// FIX: Handle outputs.output array format [{url, name}]
		if (Array.isArray(outputs.output)) {
			for (const item of outputs.output) {
				if (item?.url && typeof item.url === 'string') {
					allUrls.push({ url: item.url, tag: item.name || `output_${allUrls.length}` })
				}
			}
		}

		// Handle flat url_list (for TTS or other types)
		const flatUrlList = outputs.url_list || outputs.urls || []
		if (Array.isArray(flatUrlList)) {
			for (let i = 0; i < flatUrlList.length; i++) {
				const u = flatUrlList[i]
				if (typeof u === 'string' && u.startsWith('http')) {
					allUrls.push({ url: u, tag: `${i}` })
				}
			}
		}

		if (allUrls.length > 0) {
			for (let i = 0; i < allUrls.length; i++) {
				const { url, tag } = allUrls[i]
				// FIX: Use just the tag as filename when it looks like a meaningful name
				// (e.g., "xiao_an_idle" from outputs.output[].name), avoid prepending the long base
				const hasNamedTag = /^[a-zA-Z0-9_-]+$/.test(tag) && tag.length > 2
				const fileBase = hasNamedTag ? tag : (allUrls.length === 1 ? base : `${base}_${tag}`)

				let savedPath
				if (outFile && allUrls.length === 1) {
					savedPath = await downloadToFile(url, outFile)
				} else if (outFile && isLikelyDirPath(outFile)) {
					savedPath = await downloadToDir(url, outFile, fileBase)
				} else {
					savedPath = await downloadToDir(url, outDir, fileBase)
				}
				savedPaths.push(savedPath)
				console.log(savedPath)
			}
		}

		// If no downloadable URLs found, save raw outputs as JSON
		if (savedPaths.length === 0) {
			const jsonPath = outFile
				? (path.extname(outFile) ? outFile : `${outFile}.json`)
				: path.resolve(outDir, `${base}.json`)
			const saved = await saveJsonToFile(outputs, jsonPath)
			console.log(saved)
			savedPaths.push(saved)
		}

		if (savedPaths.length === 0) {
			console.error('[asset-generate] Warning: No files were saved. Raw outputs:')
			console.error(JSON.stringify(outputs, null, 2))
		} else {
			console.error(`[asset-generate] Saved ${savedPaths.length} file(s)`)
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err)
		console.error(`[asset-generate] Error: ${message}`)
		process.exit(1)
	}
}

await main()
