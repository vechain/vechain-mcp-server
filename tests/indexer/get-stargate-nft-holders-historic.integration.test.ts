import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type IndexerNftHoldersHistoricResponse,
  IndexerNftHoldersHistoricResponseSchema,
} from '../../src/tools/get-stargate-nft-holders-historic'

describe('Indexer Stargate NFT Holders Historic', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'stargate-nft-holders-historic', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test('should fetch running-total holders over a range', async () => {
    const response = await client.callTool({
      name: 'getStargateNftHoldersHistoric',
      arguments: { range: '1-day' },
    })
    const parsed: IndexerNftHoldersHistoricResponse =
      IndexerNftHoldersHistoricResponseSchema.parse(response)
    const structured = parsed.structuredContent
    expect(structured.network).toBeDefined()
    expect(typeof structured.ok).toBe('boolean')
    if (structured.ok) {
      expect(Array.isArray(structured.data)).toBe(true)
    } else {
      expect(typeof structured.error).toBe('string')
    }
  }, 60000)
})


