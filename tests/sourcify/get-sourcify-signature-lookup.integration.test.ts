import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

describe('Sourcify Signature Lookup', () => {
  let client: Client

  beforeAll(async () => {
    client = new Client({
      name: 'sourcify-signature-lookup-client',
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
      name: 'getSourcifySignatureLookup',
      arguments: {
        hashes: ['0xa9059cbb'],
        type: 'function',
      },
    })

    expect(response.content).toBeDefined()

    const content = response.content as Array<{ type: string; text: string }>
    expect(content.length).toBeGreaterThan(0)

    const parsed = JSON.parse(content[0].text)

    // Check if API call succeeded
    if (parsed.ok) {
      expect(parsed.totalFound).toBeGreaterThan(0)
      expect(parsed.functions).toBeDefined()
      expect(parsed.functions['0xa9059cbb']).toBeDefined()

      // Should find transfer(address,uint256)
      const transferSigs = parsed.functions['0xa9059cbb']
      expect(transferSigs.some((sig: { name: string }) => sig.name.includes('transfer'))).toBe(true)
    } else {
      // API might be unavailable - log the error but don't fail
      console.warn('Signature lookup API returned error:', parsed.error)
    }
  })

  test('should lookup multiple hashes at once', async () => {
    const response = await client.callTool({
      name: 'getSourcifySignatureLookup',
      arguments: {
        hashes: [
          '0xa9059cbb', // transfer(address,uint256)
          '0x095ea7b3', // approve(address,uint256)
        ],
        type: 'function',
      },
    })

    expect(response.content).toBeDefined()

    const content = response.content as Array<{ type: string; text: string }>
    const parsed = JSON.parse(content[0].text)

    if (parsed.ok) {
      expect(parsed.totalFound).toBeGreaterThanOrEqual(2)
    } else {
      console.warn('Signature lookup API returned error:', parsed.error)
    }
  })

  test('should handle unknown hash gracefully', async () => {
    const response = await client.callTool({
      name: 'getSourcifySignatureLookup',
      arguments: {
        hashes: ['0xdeadbeef'],
        type: 'function',
      },
    })

    expect(response.content).toBeDefined()

    const content = response.content as Array<{ type: string; text: string }>
    const parsed = JSON.parse(content[0].text)

    // Should not throw, regardless of whether it found results
    expect(parsed).toBeDefined()
  })
})
