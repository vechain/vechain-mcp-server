import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type IndexerStargateTotalVthoClaimedResponse,
  IndexerStargateTotalVthoClaimedResponseSchema,
} from '../../src/tools/get-stargate-total-vtho-claimed'

describe('Indexer Stargate Total VTHO Claimed', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({
      name: 'indexer-stargate-total-vtho-claimed-client',
      version: '1.0.0',
    })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test('should fetch total VTHO claimed (latest)', async () => {
    const response = await client.callTool({
      name: 'getStargateTotalVthoClaimed',
      arguments: {},
    })
    expect(response.content).toBeDefined()
    const parsed: IndexerStargateTotalVthoClaimedResponse =
      IndexerStargateTotalVthoClaimedResponseSchema.parse(response)
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



