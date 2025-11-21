import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type GetB3TRAppUsersLeaderboardResponse,
  ResponseSchema as GetB3TRAppUsersLeaderboardResponseSchema,
} from '@/tools/get-b3tr-app-users-leaderboard'

describe('Indexer B3TR App Users Leaderboard', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'b3tr-app-users-leaderboard', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test(
    'should fetch app users leaderboard',
    async () => {
      const APP_ID =
        '0x3a66df25581b931b27557101b2d93f87e43c550d0675599f7a6029e9943a1566'
      const response = await client.callTool({
        name: 'getB3TRAppUsersLeaderboard',
        arguments: { appId: APP_ID, size: 5, sortBy: 'totalRewardAmount' },
      })
      const parsed: GetB3TRAppUsersLeaderboardResponse =
        GetB3TRAppUsersLeaderboardResponseSchema.parse(response)
      const { structuredContent } = parsed
      expect(structuredContent.network).toBeDefined()
      expect(typeof structuredContent.ok).toBe('boolean')
      expect(structuredContent.data).toHaveProperty('data')
      expect(structuredContent.data).toHaveProperty('pagination')
    },
    30000,
  )
})


