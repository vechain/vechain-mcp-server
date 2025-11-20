import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type IndexerTotalVthoClaimedHistoricResponse,
  IndexerTotalVthoClaimedHistoricResponseSchema,
} from '../../src/tools/get-stargate-total-vtho-claimed-historic'

describe('Indexer Historic Total VTHO Claimed', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'stargate-total-vtho-claimed-historic', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test('returns running-total series for 1-day', async () => {
    const response = await client.callTool({
      name: 'getStargateTotalVthoClaimedHistoric',
      arguments: { range: '1-day' },
    })
    const parsed: IndexerTotalVthoClaimedHistoricResponse =
      IndexerTotalVthoClaimedHistoricResponseSchema.parse(response)
    const { structuredContent: s } = parsed
    expect(typeof s.ok).toBe('boolean')
    if (s.ok) {
      expect(Array.isArray(s.data)).toBe(true)
    } else {
      expect(typeof s.error).toBe('string')
    }
  }, 60000)
})


