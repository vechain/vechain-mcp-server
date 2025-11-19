import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type IndexerTotalVetStakedHistoricResponse,
  IndexerTotalVetStakedHistoricResponseSchema,
} from '../../src/tools/get-stargate-total-vet-staked-historic'

describe('Indexer Historic Total VET Staked', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'stargate-total-vet-staked-historic', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test('returns running-total series for 1-day (no level filter)', async () => {
    const response = await client.callTool({
      name: 'getStargateTotalVetStakedHistoric',
      arguments: { range: '1-day' },
    })
    const parsed: IndexerTotalVetStakedHistoricResponse =
      IndexerTotalVetStakedHistoricResponseSchema.parse(response)
    const { structuredContent: s } = parsed
    expect(typeof s.ok).toBe('boolean')
    if (s.ok) {
      expect(Array.isArray(s.data)).toBe(true)
    } else {
      expect(typeof s.error).toBe('string')
    }
  }, 60000)
})


