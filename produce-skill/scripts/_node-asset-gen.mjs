#!/usr/bin/env node
/**
 * Node.js-compatible single-asset generator (no Bun dependency).
 * Reimplements the core logic of asset-generate.js for environments without Bun.
 * Usage: node _node-asset-gen.mjs --text '[{...}]' --type 12 --url-only
 */
import * as crypto from 'node:crypto'

const SDP_HEAD_FLAG = 'SDP-'
const ASSET_APP_ID = 'e1b65227-ecf5-4b26-9bef-0f719f43e426'
let latestTokenInfo

function randomString(n) { return (Math.random() * 1e18).toString(36).substring(0, n) }
function getNonce() { return `${String(Date.now()).substring(0, 13)}:${randomString(8)}` }
function base64Hmac(content, key) {
  const hmac = crypto.createHmac('sha256', key)
  hmac.update(content, 'utf8')
  return hmac.digest().toString('base64')
}

function buildURL(url, params) {
  if (!params || Object.keys(params).length === 0) return url
  const u = new URL(url)
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v))
  return u.toString()
}

async function getBtsToken(reqHeaders) {
  if (latestTokenInfo?.access_token) {
    const diff = new Date(latestTokenInfo.expires_at).valueOf() - Date.now()
    if (Number.isFinite(diff) && diff > 3600 * 1000 * 24) return latestTokenInfo
  }
  const btsHost = process.env.BTS_HOST || 'https://ucbts.101.com'
  const btsName = process.env.BTS_NAME
  const btsSecret = process.env.BTS_SECRET
  if (!btsName) throw new Error('Missing env: BTS_NAME')
  if (!btsSecret) throw new Error('Missing env: BTS_SECRET')

  const headers = { 'Content-Type': 'application/json' }
  Object.entries(reqHeaders).forEach(([key, value]) => {
    if (key.toUpperCase().startsWith(SDP_HEAD_FLAG)) headers[key] = value
  })
  const timestamp = Date.now()
  const data = {
    app_name: btsName, app_secret: btsSecret, token_type: 'e',
    timestamp, sign: base64Hmac(`${btsName}:${timestamp}`, btsSecret), version: 'javascript',
  }
  const resp = await fetch(`${btsHost}/v1/tokens`, { method: 'POST', headers, body: JSON.stringify(data) })
  if (!resp.ok) throw new Error(`BTS token failed: ${resp.status}`)
  latestTokenInfo = await resp.json()
  return latestTokenInfo
}

function getBtsAuth(tokenInfo, reqHeaders, method, route, host) {
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

async function getBtsAuthByToken({ method, headers, url, params }) {
  const tokenInfo = await getBtsToken(headers)
  const urlBuild = buildURL(url, params)
  const { host, pathname, search } = new URL(urlBuild)
  return getBtsAuth(tokenInfo, headers, method, `${pathname}${search}`, host)
}

async function* sseEvents(response) {
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
      const dataLines = []
      for (const line of raw.split(/\r?\n/)) {
        if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
      }
      if (dataLines.length) yield dataLines.join('\n')
    }
  }
}

async function runWorkflow({ endpoint, apiKey, text, type, environment }) {
  const headers = {
    Accept: 'text/event-stream', 'Content-Type': 'application/json',
    'X-App-Id': ASSET_APP_ID, 'X-Project-Key': apiKey,
    'Sdp-App-Id': 'b4fb92a0-af7f-49c2-b270-8f62afac1133',
  }
  const Authorization = await getBtsAuthByToken({ method: 'POST', headers, url: endpoint })
  if (Authorization) headers.Authorization = Authorization

  const res = await fetch(endpoint, {
    method: 'POST', headers,
    body: JSON.stringify({ inputs: { text, type: String(type) }, user: '', response_mode: 'streaming', environment }),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${res.statusText} ${errText}`)
  }

  for await (const dataStr of sseEvents(res)) {
    let payload
    try { payload = JSON.parse(dataStr) } catch { continue }
    if (!payload || payload.event !== 'workflow_finished') continue
    const errorMessage = payload?.data?.outputs?.error_message || payload?.outputs?.error_message
    if (typeof errorMessage === 'string' && errorMessage.trim()) throw new Error(errorMessage.trim())
    return payload?.data?.outputs || payload?.outputs || {}
  }
  throw new Error('SSE stream ended before workflow_finished')
}

// --- main ---
const apiKey = process.env.AI_HUB_KEY
if (!apiKey) { console.error('Missing AI_HUB_KEY'); process.exit(1) }
const endpoint = (process.env.AI_HUB_HOST || 'https://ai-hub-api.aiae.ndhy.com') + '/v1/workflows/run'

const args = process.argv.slice(2)
function getArg(flag) { const i = args.indexOf(flag); return i === -1 ? undefined : args[i + 1] }

const text = getArg('--text') || getArg('-t')
const type = Number(getArg('--type') || '12')
const jsonOut = args.includes('--json')
const urlOnly = args.includes('--url-only')

if (!text) { console.error('Missing --text'); process.exit(1) }

console.error(`[node-asset-gen] type=${type}, calling workflow...`)

const outputs = await runWorkflow({ endpoint, apiKey, text, type, environment: 'prod' })

if (jsonOut) { console.log(JSON.stringify(outputs, null, 2)); process.exit(0) }

// Extract URLs
const urls = []
for (const key of ['scene_list', 'samll_list', 'output']) {
  if (Array.isArray(outputs[key])) {
    for (const item of outputs[key]) { if (item?.url) urls.push(item.url) }
  }
}
for (const key of ['url_list', 'urls']) {
  if (Array.isArray(outputs[key])) {
    for (const u of outputs[key]) { if (typeof u === 'string' && u.startsWith('http')) urls.push(u) }
  }
}

if (urls.length > 0) {
  for (const u of urls) console.log(u)
} else {
  console.error('[node-asset-gen] No URLs found. Raw output:')
  console.error(JSON.stringify(outputs, null, 2))
}
