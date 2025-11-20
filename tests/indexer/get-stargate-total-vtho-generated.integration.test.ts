import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type IndexerStargateTotalVthoGeneratedResponse,
  IndexerStargateTotalVthoGeneratedResponseSchema,
} from '../../src/tools/get-stargate-total-vtho-generated'

describe('Indexer Stargate Total VTHO Generated', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({
      name: 'indexer-stargate-total-vtho-generated-client',
      version: '1.0.0',
    })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test('should fetch total VTHO generated (latest)', async () => {
    const response = await client.callTool({
      name: 'getStargateTotalVthoGenerated',
      arguments: {},
    })
    expect(response.content).toBeDefined()
    const parsed: IndexerStargateTotalVthoGeneratedResponse =
      IndexerStargateTotalVthoGeneratedResponseSchema.parse(response)
    const structured = parsed.structuredContent
    expect(structured.network).toBeDefined()
    expect(typeof structured.ok).toBe('boolean')
    if (structured.ok) {
      expect(typeof structured.data).toBe('string')
    } else {
      expect(typeof structured.error).toBe('string')
    }
  })
})



