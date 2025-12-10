import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

describe('Sourcify Signature Search', () => {
  let client: Client

  beforeAll(async () => {
    client = new Client({
      name: 'sourcify-signature-search-client',
      version: '1.0.0',
    })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterAll(async () => {
    await client.close()
  })

  test('should search for function signatures by name', async () => {
    const response = await client.callTool({
      name: 'getSourcifySignatureSearch',
      arguments: {
        query: 'transfer',
        type: 'function',
      },
    })

    expect(response.content).toBeDefined()

    const content = response.content as Array<{ type: string; text: string }>
    expect(content.length).toBeGreaterThan(0)

    const parsed = JSON.parse(content[0].text)
    expect(parsed.query).toBe('transfer')

    // Check if API call succeeded
    if (parsed.ok) {
      // If we got results, validate them
      if (parsed.totalFound > 0) {
        expect(parsed.signatures).toBeDefined()
        expect(Array.isArray(parsed.signatures)).toBe(true)

        // Should find transfer-related functions
        const hasTransfer = parsed.signatures.some((sig: { name: string }) =>
          sig.name.toLowerCase().includes('transfer'),
        )
        expect(hasTransfer).toBe(true)
      }
    } else {
      // API might be unavailable - log the error but don't fail
      console.warn('Signature search API returned error:', parsed.error)
    }
  })

  test('should search for event signatures by name', async () => {
    const response = await client.callTool({
      name: 'getSourcifySignatureSearch',
      arguments: {
        query: 'Transfer',
        type: 'event',
      },
    })

    expect(response.content).toBeDefined()

    const content = response.content as Array<{ type: string; text: string }>
    const parsed = JSON.parse(content[0].text)

    // Should not throw, regardless of whether it found results
    expect(parsed).toBeDefined()
    expect(parsed.query).toBe('Transfer')
  })

  test('should handle non-matching search gracefully', async () => {
    const response = await client.callTool({
      name: 'getSourcifySignatureSearch',
      arguments: {
        query: 'xyznonexistentfunction12345',
      },
    })

    expect(response.content).toBeDefined()

    const content = response.content as Array<{ type: string; text: string }>
    const parsed = JSON.parse(content[0].text)

    // Should not throw
    expect(parsed).toBeDefined()
    expect(parsed.query).toBe('xyznonexistentfunction12345')

    if (parsed.ok) {
      expect(parsed.totalFound).toBe(0)
    }
  })
})
