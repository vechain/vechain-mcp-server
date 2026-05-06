import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

describe('B32 Signature Lookup', () => {
  let client: Client

  beforeAll(async () => {
    client = new Client({
      name: 'b32-signature-lookup-client',
      version: '1.0.0',
    })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterAll(async () => {
    await client.close()
  })

  test('should lookup a known function selector', async () => {
    // 0xa9059cbb is the selector for transfer(address,uint256)
    const response = await client.callTool({
      name: 'getB32Signature',
      arguments: {
        signature: '0xa9059cbb',
      },
    })

    expect(response.content).toBeDefined()
    expect(response.structuredContent).toBeDefined()

    const structuredContent = response.structuredContent as {
      ok: boolean
      result?: {
        signature: string
        found: boolean
        abi?: unknown[]
        matchingItems?: Array<{
          type: string
          name?: string
          signature?: string
        }>
      }
      error?: string
    }

    expect(structuredContent.ok).toBe(true)
    expect(structuredContent.result).toBeDefined()
    expect(structuredContent.result?.signature).toBe('0xa9059cbb')
    expect(structuredContent.result?.found).toBe(true)
    expect(structuredContent.result?.abi).toBeDefined()
    expect(Array.isArray(structuredContent.result?.abi)).toBe(true)
  })

  test('should lookup an event topic hash', async () => {
    // Transfer(address,address,uint256) event topic
    const response = await client.callTool({
      name: 'getB32Signature',
      arguments: {
        signature: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
      },
    })

    expect(response.content).toBeDefined()
    expect(response.structuredContent).toBeDefined()

    const structuredContent = response.structuredContent as {
      ok: boolean
      result?: {
        signature: string
        found: boolean
        abi?: unknown[]
        matchingItems?: Array<{
          type: string
          name?: string
        }>
      }
    }

    expect(structuredContent.ok).toBe(true)
    expect(structuredContent.result).toBeDefined()
    expect(structuredContent.result?.found).toBe(true)

    // Should find event type items
    if (structuredContent.result?.matchingItems) {
      const hasEvent = structuredContent.result.matchingItems.some((item) => item.type === 'event')
      expect(hasEvent).toBe(true)
    }
  })

  test('should return not found for unknown signature', async () => {
    const response = await client.callTool({
      name: 'getB32Signature',
      arguments: {
        signature: '0xdeadbeefdeadbeef',
      },
    })

    expect(response.content).toBeDefined()
    expect(response.structuredContent).toBeDefined()

    const structuredContent = response.structuredContent as {
      ok: boolean
      result?: {
        signature: string
        found: boolean
      }
    }

    expect(structuredContent.ok).toBe(true)
    expect(structuredContent.result).toBeDefined()
    expect(structuredContent.result?.found).toBe(false)
  })

  test('should handle approve function selector', async () => {
    // 0x095ea7b3 is the selector for approve(address,uint256)
    const response = await client.callTool({
      name: 'getB32Signature',
      arguments: {
        signature: '0x095ea7b3',
      },
    })

    expect(response.content).toBeDefined()
    expect(response.structuredContent).toBeDefined()

    const structuredContent = response.structuredContent as {
      ok: boolean
      result?: {
        found: boolean
        matchingItems?: Array<{
          type: string
          name?: string
          signature?: string
        }>
      }
    }

    expect(structuredContent.ok).toBe(true)
    expect(structuredContent.result?.found).toBe(true)

    // Should find approve function
    if (structuredContent.result?.matchingItems) {
      const hasApprove = structuredContent.result.matchingItems.some(
        (item) => item.name === 'approve' || item.signature?.includes('approve'),
      )
      expect(hasApprove).toBe(true)
    }
  })
})

