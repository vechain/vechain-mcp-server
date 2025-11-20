import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { type IndexerStargateTokensResponse, IndexerStargateTokensResponseSchema } from '../../src/tools/get-stargate-tokens'

describe('Indexer Stargate Tokens', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({
      name: 'indexer-stargate-tokens-client',
      version: '1.0.0',
    })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test('should fetch stargate tokens by owner', async () => {
    const response = await client.callTool({
      name: 'getStargateTokens',
      arguments: { owner: '0xcaf7c7d50ba19014c1f86ea24530639bec8a9a36', size: 5, page: 0, direction: 'DESC' },
    })
    expect(response.content).toBeDefined()
    const parsed: IndexerStargateTokensResponse = IndexerStargateTokensResponseSchema.parse(response)
    const structured = parsed.structuredContent
    expect(structured.network).toBeDefined()
    expect(typeof structured.ok).toBe('boolean')
    if (structured.ok) {
      expect(Array.isArray(structured.data)).toBe(true)
    } else {
      expect(typeof structured.error).toBe('string')
    }
  }, 30000)
})


