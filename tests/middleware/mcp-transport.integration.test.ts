/**
 * Integration tests for the POST /mcp transport.
 *
 * Covers the bits of the MCP Streamable HTTP spec that clients in the wild
 * (n8n, Claude Desktop, Cursor, dApp Kit) actually exercise but that the
 * wrapper previously did not handle:
 *
 *   - JSON-RPC batch requests (an array body)
 *   - HTTP verbs other than POST on `/mcp` (must return 405, not Express's
 *     default 404 HTML page, so client transports can fall back cleanly)
 *
 * The test suite assumes `npm test` has booted `node dist/http.js` on port
 * 4000 with auth disabled — same harness used by every other integration
 * test in this repo (see `tests/thor/*.integration.test.ts`).
 */

const BASE_URL = process.env.MCP_BASE_URL ?? 'http://localhost:4000'

describe('POST /mcp — JSON-RPC batch support', () => {
  test('batch with a single valid request returns an array of one response', async () => {
    const res = await fetch(`${BASE_URL}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify([{ jsonrpc: '2.0', id: 1, method: 'tools/list' }]),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as Array<{ jsonrpc: string; id: number; result?: unknown }>
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(1)
    expect(body[0].jsonrpc).toBe('2.0')
    expect(body[0].id).toBe(1)
    expect(body[0].result).toBeDefined()
  })

  test('batch with multiple requests returns one response per request, ids preserved', async () => {
    const res = await fetch(`${BASE_URL}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify([
        { jsonrpc: '2.0', id: 'a', method: 'tools/list' },
        { jsonrpc: '2.0', id: 'b', method: 'tools/list' },
      ]),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as Array<{ id: string }>
    expect(body).toHaveLength(2)
    const ids = body.map(r => r.id).sort()
    expect(ids).toEqual(['a', 'b'])
  })

  test('batch with an invalid entry returns that entry as a -32600 error without aborting the batch', async () => {
    const res = await fetch(`${BASE_URL}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify([
        { jsonrpc: '2.0', id: 1, method: 'tools/list' },
        { id: 2 }, // missing jsonrpc + method
      ]),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as Array<{ id: number | null; result?: unknown; error?: { code: number } }>
    expect(body).toHaveLength(2)
    const okEntry = body.find(r => r.id === 1)
    const badEntry = body.find(r => r.id === 2)
    expect(okEntry?.result).toBeDefined()
    expect(badEntry?.error?.code).toBe(-32600)
  })

  test('empty batch is rejected with 400 -32600', async () => {
    const res = await fetch(`${BASE_URL}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify([]),
    })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: { code: number } }
    expect(body.error.code).toBe(-32600)
  })

  test('batch made entirely of notifications returns 202 with no body', async () => {
    const res = await fetch(`${BASE_URL}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify([
        { jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 'x' } },
        { jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 'y' } },
      ]),
    })
    expect(res.status).toBe(202)
    const text = await res.text()
    expect(text).toBe('')
  })

  test('single message (non-batch) still works — backwards compatibility', async () => {
    const res = await fetch(`${BASE_URL}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 99, method: 'tools/list' }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { jsonrpc: string; id: number; result?: unknown }
    expect(Array.isArray(body)).toBe(false)
    expect(body.id).toBe(99)
    expect(body.result).toBeDefined()
  })
})

describe('/mcp — non-POST verbs return 405', () => {
  test('GET /mcp → 405 with Allow: POST', async () => {
    const res = await fetch(`${BASE_URL}/mcp`, { method: 'GET' })
    expect(res.status).toBe(405)
    expect(res.headers.get('allow')).toBe('POST')
    const body = (await res.json()) as { error: { code: number; message: string } }
    expect(body.error.code).toBe(-32000)
  })

  test('DELETE /mcp → 405 with Allow: POST', async () => {
    const res = await fetch(`${BASE_URL}/mcp`, { method: 'DELETE' })
    expect(res.status).toBe(405)
    expect(res.headers.get('allow')).toBe('POST')
    const body = (await res.json()) as { error: { code: number } }
    expect(body.error.code).toBe(-32000)
  })
})

describe('tools/list — schema sanitization', () => {
  test('every array property in every tool inputSchema has a non-empty items schema', async () => {
    const res = await fetch(`${BASE_URL}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    })
    const body = (await res.json()) as { result: { tools: Array<{ name: string; inputSchema: unknown }> } }

    type SchemaNode = Record<string, unknown> | unknown[] | unknown
    const offenders: Array<{ tool: string; path: string }> = []

    function visit(node: SchemaNode, path: string, toolName: string): void {
      if (!node || typeof node !== 'object') return
      if (Array.isArray(node)) {
        node.forEach((child, i) => visit(child, `${path}[${i}]`, toolName))
        return
      }
      const obj = node as Record<string, unknown>
      if (obj.type === 'array') {
        const items = obj.items as Record<string, unknown> | undefined
        // Empty items ({}) is what OpenAI strict-mode rejects. Any of the
        // following counts as a concrete shape: a `type` field (string or
        // JSON Schema "multi-type" array form), or an `anyOf` / `oneOf`
        // discriminator.
        const hasShape =
          !!items &&
          (typeof items.type === 'string' ||
            Array.isArray(items.type) ||
            Array.isArray(items.anyOf) ||
            Array.isArray(items.oneOf))
        if (!hasShape) offenders.push({ tool: toolName, path })
      }
      for (const key of Object.keys(obj)) {
        visit(obj[key] as SchemaNode, `${path}.${key}`, toolName)
      }
    }

    for (const tool of body.result.tools) {
      visit(tool.inputSchema as SchemaNode, 'inputSchema', tool.name)
    }

    expect(offenders).toEqual([])
  })

  test('buildContractTransaction.args items has a concrete type (regression for OpenAI strict mode)', async () => {
    const res = await fetch(`${BASE_URL}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    })
    const body = (await res.json()) as {
      result: { tools: Array<{ name: string; inputSchema: Record<string, unknown> }> }
    }
    const tool = body.result.tools.find(t => t.name === 'buildContractTransaction')
    expect(tool).toBeDefined()
    // Drill down: inputSchema.properties.clauses.items.properties.args
    const properties = tool!.inputSchema.properties as Record<string, Record<string, unknown>>
    const clausesItems = properties.clauses.items as Record<string, unknown>
    const clauseProps = clausesItems.properties as Record<string, Record<string, unknown>>
    const argsSchema = clauseProps.args
    expect(argsSchema.type).toBe('array')
    const items = argsSchema.items as Record<string, unknown>
    const hasShape =
      typeof items.type === 'string' ||
      Array.isArray(items.type) ||
      Array.isArray(items.anyOf) ||
      Array.isArray(items.oneOf)
    expect(hasShape).toBe(true)
  })
})
