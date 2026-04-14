import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type IndexerGetStargateTotalVetStakedResponse,
  IndexerGetStargateTotalVetStakedResponseSchema,
} from '../../src/tools/get-stargate-total-vet-staked'

describe('Indexer Stargate Total VET Staked', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'stargate-total-vet-staked', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test('should fetch total VET staked with per-level breakdown', async () => {
    const response = await client.callTool({
      name: 'getStargateTotalVetStaked',
      arguments: {},
    })
    const parsed: IndexerGetStargateTotalVetStakedResponse =
      IndexerGetStargateTotalVetStakedResponseSchema.parse(response)
    const structured = parsed.structuredContent
    expect(structured.network).toBeDefined()
    expect(typeof structured.ok).toBe('boolean')
    expect(typeof structured.data).toBe('object')

    // total is now a numeric string (BigInteger precision)
    expect(structured.data).toHaveProperty('total')
    expect(typeof (structured.data as any).total).toBe('string')
    expect((structured.data as any).total).toMatch(/^\d+$/)

    // byLevel values are also numeric strings
    expect(structured.data).toHaveProperty('byLevel')
    const byLevel = (structured.data as any).byLevel
    expect(typeof byLevel).toBe('object')
    for (const level of [
      'Strength', 'Thunder', 'Mjolnir', 'VeThorX', 'StrengthX',
      'ThunderX', 'MjolnirX', 'Dawn', 'Lightning', 'Flash',
    ]) {
      expect(byLevel).toHaveProperty(level)
      expect(typeof byLevel[level]).toBe('string')
      expect(byLevel[level]).toMatch(/^\d+$/)
    }

    // block metadata
    expect(structured.data).toHaveProperty('blockNumber')
    expect(structured.data).toHaveProperty('blockTimestamp')
  }, 30000)
})
