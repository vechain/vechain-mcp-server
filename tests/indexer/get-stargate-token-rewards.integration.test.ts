import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type IndexerStargateTokenRewardsResponse,
  IndexerStargateTokenRewardsResponseSchema,
} from '../../src/tools/get-stargate-token-rewards'

describe('Indexer Stargate Token Rewards', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'stargate-token-rewards', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test('should fetch rewards timeline (CYCLE)', async () => {
    const response = await client.callTool({
      name: 'getStargateTokenRewards',
      arguments: {
        tokenId: '100014',
        periodType: 'CYCLE',
        size: 5,
        page: 0,
        direction: 'DESC',
      },
    })
    const parsed: IndexerStargateTokenRewardsResponse =
      IndexerStargateTokenRewardsResponseSchema.parse(response)
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


