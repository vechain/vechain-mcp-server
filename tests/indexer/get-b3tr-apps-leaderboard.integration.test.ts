import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type GetB3TRAppsLeaderboardResponse,
  ResponseSchema as GetB3TRAppsLeaderboardResponseSchema,
} from '@/tools/get-b3tr-apps-leaderboard'

describe('Indexer B3TR Apps Leaderboard', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'b3tr-apps-leaderboard', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test(
    'should fetch apps leaderboard',
    async () => {
      const response = await client.callTool({
        name: 'getB3TRAppsLeaderboard',
        arguments: { size: 5, sortBy: 'totalRewardAmount' },
      })
      const parsed: GetB3TRAppsLeaderboardResponse =
        GetB3TRAppsLeaderboardResponseSchema.parse(response)
      const { structuredContent } = parsed
      expect(structuredContent.network).toBeDefined()
      expect(typeof structuredContent.ok).toBe('boolean')
      expect(structuredContent.data).toHaveProperty('data')
      expect(structuredContent.data).toHaveProperty('pagination')
    },
    30000,
  )
})


