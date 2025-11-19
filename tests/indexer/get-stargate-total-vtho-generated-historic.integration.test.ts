import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type IndexerTotalVthoGeneratedHistoricResponse,
  IndexerTotalVthoGeneratedHistoricResponseSchema,
} from '../../src/tools/get-stargate-total-vtho-generated-historic'

describe('Indexer Historic Total VTHO Generated', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'stargate-total-vtho-generated-historic', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test('returns running-total series for 1-day', async () => {
    const response = await client.callTool({
      name: 'getStargateTotalVthoGeneratedHistoric',
      arguments: { range: '1-day' },
    })
    const parsed: IndexerTotalVthoGeneratedHistoricResponse =
      IndexerTotalVthoGeneratedHistoricResponseSchema.parse(response)
    const { structuredContent: s } = parsed
    expect(typeof s.ok).toBe('boolean')
    if (s.ok) {
      expect(Array.isArray(s.data)).toBe(true)
    } else {
      expect(typeof s.error).toBe('string')
    }
  }, 60000)
})


