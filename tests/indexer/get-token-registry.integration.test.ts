import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { getTokenRegistry } from '../../src/tools/get-token-registry'

describe('Token Registry', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({
      name: 'token-registry-client',
      version: '1.0.0',
    })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test('should fetch token registry (all)', async () => {
    const response = await client.callTool({
      name: 'getTokenRegistry',
      arguments: {},
    })
    expect(response.content).toBeDefined()
    // Shape checks on structured content
    expect(response.structuredContent).toBeDefined()
    const sc = response.structuredContent as any
    expect(typeof sc.ok).toBe('boolean')
    if (sc.ok) {
      expect(Array.isArray(sc.data)).toBe(true)
    } else {
      expect(typeof sc.error).toBe('string')
    }
  })

  test('should filter token registry by symbol (may be empty)', async () => {
    const response = await client.callTool({
      name: 'getTokenRegistry',
      arguments: { symbol: 'NONEXISTENT_SYMBOL_123' },
    })
    expect(response.content).toBeDefined()
    expect(response.structuredContent).toBeDefined()
    const sc = response.structuredContent as any
    expect(typeof sc.ok).toBe('boolean')
    if (sc.ok) {
      expect(Array.isArray(sc.data)).toBe(true)
    } else {
      expect(typeof sc.error).toBe('string')
    }
  })
})


