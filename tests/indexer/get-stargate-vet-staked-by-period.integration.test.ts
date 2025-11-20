import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type IndexerStargateMetricsByPeriodResponse,
  IndexerStargateMetricsByPeriodResponseSchema,
} from '../../src/tools/get-stargate-metrics-by-period'

describe('Indexer Stargate VET Staked By Period', () => {
  let client: Client
  beforeEach(async () => {
    client = new Client({ name: 'stargate-vet-staked-by-period', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })
  afterEach(async () => {
    await client.close()
  })
  test('DAY period returns an array', async () => {
    const response = await client.callTool({
      name: 'getStargateVetStakedByPeriod',
      arguments: { period: 'DAY' },
    })
    const parsed: IndexerStargateMetricsByPeriodResponse =
      IndexerStargateMetricsByPeriodResponseSchema.parse(response)
    const structured = parsed.structuredContent
    expect(typeof structured.ok).toBe('boolean')
    if (structured.ok) {
      expect(Array.isArray(structured.data)).toBe(true)
    } else {
      expect(typeof structured.error).toBe('string')
    }
  }, 60000)
})


