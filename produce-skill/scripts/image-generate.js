#!/usr/bin/env bun

import * as crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

const SDP_HEAD_FLAG = 'SDP-'

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

function printResult(result, asJson = false) {
	if (asJson) {
		console.log(JSON.stringify(result, null, 2))
		return
	}

	console.log(result.localPath)
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

function inferExtFromUrlOrType(imageUrl, contentType) {
	const byType = String(contentType || '').toLowerCase()
	if (byType.includes('image/png')) return '.png'
	if (byType.includes('image/jpeg') || byType.includes('image/jpg')) return '.jpg'
	if (byType.includes('image/webp')) return '.webp'
	if (byType.includes('image/svg')) return '.svg'

	try {
		const url = new URL(imageUrl)
		const ext = path.extname(url.pathname)
		if (ext) return ext
	} catch {
		// ignore
	}
	return '.jpg'
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

		// SSE event messages are separated by a blank line
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

	// flush remaining buffer (in case server ends without extra newline)
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

async function runWorkflowAndGetFirstImageUrl({
	endpoint,
	apiKey,
	query,
	width,
	height,
	environment,
}) {
	const xAppId = Bun.env.AI_HUB_X_APP_ID || '99fc09bd-ff83-44c3-8bf9-3c66a749cedb'
	const headers = {
		Accept: 'text/event-stream',
		'Content-Type': 'application/json',
		'X-App-Id': xAppId,
		'X-Project-Key': apiKey,
		'Sdp-App-Id': 'b4fb92a0-af7f-49c2-b270-8f62afac1133',
	}

	const Authorization = await getBtsToken({
		method: 'POST',
		headers,
		url: endpoint,
	})

	if (Authorization) headers.Authorization = Authorization

	const res = await fetch(endpoint, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			inputs: { query, width, height },
      user: '',
			response_mode: 'streaming',
			environment,
		}),
	})

	if (!res.ok) {
		const text = await res.text().catch(() => '')
		throw new Error(`Workflow run failed: HTTP ${res.status} ${res.statusText}${text ? `\n${text}` : ''}`)
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

		const url =
			payload?.data?.outputs?.url_list?.[0] ||
			payload?.outputs?.url_list?.[0] ||
			payload?.data?.url_list?.[0]

		if (!url || typeof url !== 'string') {
			throw new Error('workflow_finished received but outputs.url_list[0] is missing')
		}

		return url
	}

	throw new Error('SSE stream ended before workflow_finished')
}

async function downloadImageToProject(imageUrl, outDir, fileBaseName) {
	await fs.mkdir(outDir, { recursive: true })

	const res = await fetch(imageUrl)
	if (!res.ok) {
		throw new Error(`Download failed: HTTP ${res.status} ${res.statusText}`)
	}

	const contentType = res.headers.get('content-type')
	const ext = inferExtFromUrlOrType(imageUrl, contentType)
	const filename = `${fileBaseName}${ext}`
	const filePath = path.resolve(outDir, filename)

	const buf = new Uint8Array(await res.arrayBuffer())
	await Bun.write(filePath, buf)

	return filePath
}

async function downloadImageToFile(imageUrl, outFilePath, fallbackBaseName) {
	const res = await fetch(imageUrl)
	if (!res.ok) {
		throw new Error(`Download failed: HTTP ${res.status} ${res.statusText}`)
	}

	const contentType = res.headers.get('content-type')
	const inferredExt = inferExtFromUrlOrType(imageUrl, contentType)

	let finalPath = outFilePath
	if (isLikelyDirPath(finalPath)) {
		finalPath = path.join(finalPath, `${fallbackBaseName}${inferredExt}`)
	} else {
		const ext = path.extname(finalPath)
		if (!ext) finalPath = `${finalPath}${inferredExt}`
	}

	finalPath = path.resolve(finalPath)
	await fs.mkdir(path.dirname(finalPath), { recursive: true })

	const buf = new Uint8Array(await res.arrayBuffer())
	await Bun.write(finalPath, buf)
	return finalPath
}

async function main() {
	try {
		const help = hasFlag('-h') || hasFlag('--help')
		if (help) {
			console.error(
				[
					'Usage:',
					'  bun run scripts/image-generate.js --query "cats" --width 4096 --height 4096',
					'  bun run scripts/image-generate.js --query "..." --outFile "./my-image.jpg"',
					'  bun run scripts/image-generate.js --query "..." --outFile "./out/"  # treat as directory',
					'',
					'Env:',
					'  AI_HUB_KEY=...                 (required) Bearer token for API',
					'  AI_HUB_X_APP_ID=...            (optional) value for request header X-App-Id',
					'  AI_HUB_HOST=...                (optional, default: https://ai-hub-api.aiae.ndhy.com)',
					'  AI_HUB_BOT_ENV=prod            (optional, default: prod)',
					'',
					'Args:',
					'  --query, -q <text>           (required) prompt text',
					'  --width <number>             (optional, default: 4096)',
					'  --height <number>            (optional, default: 4096)',
					'    Note: width*height (total pixels) must be within [2560x1440=3686400, 4096x4096=16777216].',
					'  --env <name>                 (optional, default: AI_HUB_BOT_ENV or prod)',
					'  --json                       (optional) print { remoteUrl, localPath } JSON to stdout',
					'  --outFile, --output <path>   (optional) expected output file path; relative to cwd; if ends with / or \\ treated as directory; auto-add extension when missing',
					'  --outDir <path>              (optional) output directory when --outFile not provided (default: skills/image-generate/output)',
					'',
					'Output:',
					'  Default: prints the saved image absolute path to stdout.',
					'  With --json: prints { remoteUrl, localPath }.',
				].join('\n')
			)
			process.exit(0)
		}

		const apiKey = Bun.env.AI_HUB_KEY
		if (!apiKey) throw new Error('Missing env: AI_HUB_KEY')

		const endpoint = (Bun.env.AI_HUB_HOST || 'https://ai-hub-api.aiae.ndhy.com') + '/v1/workflows/run'
		const environment = getArgValue('--env') || Bun.env.AI_HUB_BOT_ENV || 'prod'

		const query = getArgValue('--query') || getArgValue('-q')
		if (!query) throw new Error('Missing required arg: --query')

		const width = Number(getArgValue('--width') || '4096')
		const height = Number(getArgValue('--height') || '4096')
		const jsonOutput = hasFlag('--json')
		if (!Number.isFinite(width) || !Number.isFinite(height)) {
			throw new Error('Invalid --width/--height')
		}

		const outFileRaw = getArgValue('--outFile') || getArgValue('--output')
		const outFile = outFileRaw
			? (path.isAbsolute(outFileRaw) ? outFileRaw : path.resolve(process.cwd(), outFileRaw))
			: undefined

		const outDir = getArgValue('--outDir') || path.resolve(__dirname, '../../../..', 'output')

		const base = `${nowStamp()}_${safeFileBaseName(query)}`
		const imageUrl = await runWorkflowAndGetFirstImageUrl({
			endpoint,
			apiKey,
			query,
			width,
			height,
			environment,
		})

		const savedPath = outFile
			? await downloadImageToFile(imageUrl, outFile, base)
			: await downloadImageToProject(imageUrl, outDir, base)

		printResult({ remoteUrl: imageUrl, localPath: savedPath }, jsonOutput)
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err)
		console.error(message)
		process.exit(1)
	}
}

await main()
