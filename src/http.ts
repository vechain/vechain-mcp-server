#!/usr/bin/env node

import { type ChildProcess, spawn } from 'node:child_process'
import { dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import express, { type NextFunction, type Request, type Response } from 'express'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PORT = Number.parseInt(process.env.PORT || '3000', 10)
const VECHAIN_NETWORK = process.env.VECHAIN_NETWORK || 'mainnet'
const API_KEY = process.env.API_KEY || ''
const MAX_PENDING = Number.parseInt(process.env.MAX_PENDING_REQUESTS || '100', 10)
const REQUEST_TIMEOUT_MS = 30_000
const MAX_RESTART_FAILURES = 5
const RESTART_DELAY_MS = 2_000

// ---------------------------------------------------------------------------
// Structured logging
// ---------------------------------------------------------------------------
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

function log(level: LogLevel, msg: string, meta: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...meta }))
}

// ---------------------------------------------------------------------------
// McpClient — JSON-RPC 2.0 over stdin/stdout
// ---------------------------------------------------------------------------
type PendingRequest = {
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
  timer: NodeJS.Timeout
}

class McpClient {
  proc: ChildProcess | null = null
  requestId = 0
  pendingRequests = new Map<number, PendingRequest>()
  ready = false
  restartCount = 0
  buffer = ''
  private _stopping = false

  async start(): Promise<void> {
    this._stopping = false

    const __dirname = dirname(fileURLToPath(import.meta.url))
    // Spawn sibling stdio entrypoint (built by tsup alongside this file)
    const mcpBin = resolvePath(__dirname, 'stdio.js')

    this.proc = spawn(process.execPath, [mcpBin], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, VECHAIN_NETWORK },
    })

    this.proc.stdout?.on('data', chunk => this._onData(chunk))
    this.proc.stderr?.on('data', chunk => {
      const lines = chunk.toString().trim()
      if (lines) log('debug', lines, { src: 'mcp:stderr' })
    })
    this.proc.on('close', code => this._handleProcessExit(code ?? 1))
    this.proc.on('error', err => {
      log('error', 'MCP process error', { error: err.message })
      this._handleProcessExit(1)
    })

    // MCP initialize handshake (strict order)
    const initResult = (await this.send('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'vechain-mcp-wrapper', version: '1.0.0' },
    })) as { serverInfo?: unknown } | undefined
    log('info', 'MCP initialized', { server: initResult?.serverInfo })

    // Only AFTER receiving response:
    this.notify('notifications/initialized')
    this.ready = true
    this.restartCount = 0
  }

  send(method: string, params?: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.proc || !this.proc.stdin?.writable) {
        return reject(new Error('MCP process not running'))
      }

      const id = ++this.requestId
      const msg: { jsonrpc: '2.0'; id: number; method: string; params?: unknown } = {
        jsonrpc: '2.0',
        id,
        method,
      }
      if (params !== undefined) msg.params = params

      const timer = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error(`MCP request timeout (${method}, id=${id})`))
      }, REQUEST_TIMEOUT_MS)

      this.pendingRequests.set(id, { resolve, reject, timer })
      this.proc.stdin.write(`${JSON.stringify(msg)}\n`)
    })
  }

  notify(method: string, params?: unknown): void {
    if (!this.proc || !this.proc.stdin?.writable) return
    const msg: { jsonrpc: '2.0'; method: string; params?: unknown } = { jsonrpc: '2.0', method }
    if (params !== undefined) msg.params = params
    this.proc.stdin.write(`${JSON.stringify(msg)}\n`)
  }

  stop(): void {
    this._stopping = true
    this.ready = false
    this._rejectAllPending('MCP client shutting down')
    if (this.proc) {
      this.proc.kill()
      this.proc = null
    }
  }

  // -- Internal ---------------------------------------------------------------

  private _onData(chunk: Buffer): void {
    this.buffer += chunk.toString()
    let newlineIdx: number
    while ((newlineIdx = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIdx).trim()
      this.buffer = this.buffer.slice(newlineIdx + 1)
      if (line) this._handleLine(line)
    }
  }

  private _handleLine(line: string): void {
    let parsed: { id?: number | null; method?: string; result?: unknown; error?: unknown }
    try {
      parsed = JSON.parse(line)
    } catch {
      log('warn', 'Non-JSON line from MCP stdout', { line: line.slice(0, 200) })
      return
    }

    // Server notification (no id) — log and ignore
    if (parsed.id === undefined || parsed.id === null) {
      log('debug', 'MCP notification', { method: parsed.method })
      return
    }

    const pending = this.pendingRequests.get(parsed.id)
    if (!pending) {
      log('warn', 'Orphan MCP response', { id: parsed.id })
      return
    }

    clearTimeout(pending.timer)
    this.pendingRequests.delete(parsed.id)

    if (parsed.error) {
      pending.reject(parsed.error)
    } else {
      pending.resolve(parsed.result)
    }
  }

  private _handleProcessExit(code: number): void {
    log('warn', 'MCP process exited', { code })
    this.ready = false
    this._rejectAllPending(`MCP process exited with code ${code}`)

    if (this._stopping) return

    this.restartCount++
    if (this.restartCount >= MAX_RESTART_FAILURES) {
      log('error', 'MCP restart limit reached, giving up', { restartCount: this.restartCount })
      return
    }

    log('info', 'Scheduling MCP restart', { attempt: this.restartCount, delayMs: RESTART_DELAY_MS })
    setTimeout(() => {
      this.start().catch(err => {
        log('error', 'MCP restart failed', { error: err.message, attempt: this.restartCount })
      })
    }, RESTART_DELAY_MS)
  }

  private _rejectAllPending(reason: string): void {
    for (const [, { reject, timer }] of this.pendingRequests) {
      clearTimeout(timer)
      reject(new Error(reason))
    }
    this.pendingRequests.clear()
  }
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express()
app.use(express.json())

const mcpClient = new McpClient()

// -- Helpers ------------------------------------------------------------------

function waitForReady(timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (mcpClient.ready) return resolve()
    const start = Date.now()
    const interval = setInterval(() => {
      if (mcpClient.ready) {
        clearInterval(interval)
        resolve()
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval)
        reject(new Error('Timeout waiting for MCP ready'))
      }
    }, 100)
  })
}

// -- Middleware ----------------------------------------------------------------

function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (API_KEY && req.headers['x-api-key'] !== API_KEY) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}

function backpressureMiddleware(_req: Request, res: Response, next: NextFunction): void {
  if (mcpClient.pendingRequests.size >= MAX_PENDING) {
    res.status(429).json({ error: 'Too many pending requests' })
    return
  }
  next()
}

function requireReady(_req: Request, res: Response, next: NextFunction): void {
  if (!mcpClient.ready) {
    res.status(503).json({ error: 'MCP server not ready' })
    return
  }
  next()
}

// -- Schema sanitization (OpenAI compatibility) -------------------------------
// OpenAI does NOT support $ref or array-without-items in function schemas.
// We must: 1) resolve all $ref inline  2) add missing "items" on arrays.

type SchemaNode = Record<string, unknown> | unknown[] | unknown

function resolveRef(ref: string, root: SchemaNode): SchemaNode | undefined {
  if (!ref || !ref.startsWith('#/')) return undefined
  const parts = ref.slice(2).split('/')
  let node: SchemaNode = root
  for (const part of parts) {
    if (node === undefined || node === null) return undefined
    node = Array.isArray(node)
      ? (node as unknown[])[Number.parseInt(part, 10)]
      : (node as Record<string, unknown>)[part]
  }
  return node
}

function sanitizeSchema(node: SchemaNode, root: SchemaNode): SchemaNode {
  if (!node || typeof node !== 'object') return node

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      node[i] = sanitizeSchema(node[i], root)
    }
    return node
  }

  const obj = node as Record<string, unknown>

  // Resolve $ref → inline the referenced schema (deep copy to avoid cycles)
  if (typeof obj.$ref === 'string') {
    const resolved = resolveRef(obj.$ref, root)
    if (resolved && typeof resolved === 'object') {
      // Deep copy to avoid circular mutation, then strip the $ref
      return JSON.parse(JSON.stringify(resolved))
    }
    obj.$ref = undefined
    delete obj.$ref
    return obj
  }

  // Fix: array without items
  if (obj.type === 'array' && !obj.items) {
    obj.items = {}
  }

  for (const key of Object.keys(obj)) {
    obj[key] = sanitizeSchema(obj[key], root)
  }
  return obj
}

type ToolsListResult = { tools?: Array<{ inputSchema?: unknown; outputSchema?: unknown }> }

function sanitizeToolsListResult(result: unknown): unknown {
  const r = result as ToolsListResult
  if (!r || !Array.isArray(r.tools)) return result
  for (const tool of r.tools) {
    if (tool.inputSchema) sanitizeSchema(tool.inputSchema as SchemaNode, tool.inputSchema as SchemaNode)
    if (tool.outputSchema) sanitizeSchema(tool.outputSchema as SchemaNode, tool.outputSchema as SchemaNode)
  }
  return result
}

// -- MCP Streamable HTTP endpoint (POST /mcp) ---------------------------------
// n8n and other MCP clients use this — transparent JSON-RPC proxy

app.post('/mcp', authMiddleware, backpressureMiddleware, async (req: Request, res: Response) => {
  const body = req.body as { jsonrpc?: string; method?: string; id?: number | null; params?: unknown }

  if (!body || !body.jsonrpc || !body.method) {
    res.status(400).json({
      jsonrpc: '2.0',
      id: body?.id ?? null,
      error: { code: -32600, message: 'Invalid JSON-RPC request' },
    })
    return
  }

  // Notification (no id) — fire-and-forget
  if (body.id === undefined || body.id === null) {
    mcpClient.notify(body.method, body.params)
    res.status(202).end()
    return
  }

  // Request — proxy to MCP child process and return response
  if (!mcpClient.ready) {
    res.status(503).json({
      jsonrpc: '2.0',
      id: body.id,
      error: { code: -32000, message: 'MCP server not ready' },
    })
    return
  }

  try {
    let result = await mcpClient.send(body.method, body.params)
    if (body.method === 'tools/list') result = sanitizeToolsListResult(result)
    res.json({ jsonrpc: '2.0', id: body.id, result })
  } catch (err) {
    // Retry once if MCP crashed mid-request
    if (!mcpClient.ready) {
      try {
        await waitForReady(5000)
        let result = await mcpClient.send(body.method, body.params)
        if (body.method === 'tools/list') result = sanitizeToolsListResult(result)
        res.json({ jsonrpc: '2.0', id: body.id, result })
        return
      } catch (retryErr) {
        const msg = retryErr instanceof Error ? retryErr.message : 'MCP retry failed'
        res.status(502).json({
          jsonrpc: '2.0',
          id: body.id,
          error: { code: -32000, message: msg },
        })
        return
      }
    }

    // MCP returned an error object (from _handleLine reject)
    const e = err as { code?: number; message?: string }
    if (e?.code !== undefined && e?.message !== undefined) {
      res.json({ jsonrpc: '2.0', id: body.id, error: e })
      return
    }

    res.status(502).json({
      jsonrpc: '2.0',
      id: body.id,
      error: { code: -32000, message: e?.message || 'MCP call failed' },
    })
  }
})

// -- REST Routes --------------------------------------------------------------

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', ready: mcpClient.ready, network: VECHAIN_NETWORK })
})

app.get('/ready', (_req: Request, res: Response) => {
  if (mcpClient.ready) {
    res.json({ ready: true })
  } else {
    res.status(503).json({ ready: false })
  }
})

app.get('/tools', authMiddleware, backpressureMiddleware, requireReady, async (_req: Request, res: Response) => {
  try {
    const result = sanitizeToolsListResult(await mcpClient.send('tools/list'))
    res.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log('error', 'tools/list failed', { error: msg })
    res.status(502).json({ error: 'Failed to list tools', detail: msg })
  }
})

app.post('/tools/call', authMiddleware, backpressureMiddleware, async (req: Request, res: Response) => {
  const { name } = req.body as { name?: string; arguments?: unknown }
  let args = req.body.arguments

  // Input validation
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'Missing or invalid field: name (must be a string)' })
    return
  }
  if (args === undefined || args === null) {
    args = {}
  } else if (typeof args !== 'object' || Array.isArray(args)) {
    res.status(400).json({ error: 'Invalid field: arguments (must be an object)' })
    return
  }

  if (!mcpClient.ready) {
    res.status(503).json({ error: 'MCP server not ready' })
    return
  }

  try {
    let result: unknown
    try {
      result = await mcpClient.send('tools/call', { name, arguments: args })
    } catch (err) {
      // Retry once if MCP crashed and is restarting
      if (!mcpClient.ready) {
        log('info', 'MCP not ready after error, waiting for restart', { tool: name })
        await waitForReady(5000)
        result = await mcpClient.send('tools/call', { name, arguments: args })
      } else {
        throw err
      }
    }
    res.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log('error', 'tools/call failed', { tool: name, error: msg })
    res.status(502).json({ error: 'Tool call failed', detail: msg })
  }
})

// -- Error handler ------------------------------------------------------------

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  log('error', 'Unhandled error', { error: err.message })
  res.status(500).json({ error: 'Internal server error' })
})

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------
try {
  await mcpClient.start()
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err)
  log('warn', 'MCP initial start failed, HTTP will start anyway', { error: msg })
}

const httpServer = app.listen(PORT, '0.0.0.0', () => {
  log('info', 'HTTP server listening', { port: PORT, host: '0.0.0.0', network: VECHAIN_NETWORK })
})

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
function shutdown(): void {
  log('info', 'Shutting down')
  mcpClient.stop()
  httpServer.close(() => process.exit(0))
  // Force exit after 5s
  setTimeout(() => process.exit(1), 5000)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
