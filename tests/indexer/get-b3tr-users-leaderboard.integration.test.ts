import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type GetB3TRUsersLeaderboardResponse,
  ResponseSchema as GetB3TRUsersLeaderboardResponseSchema,
} from '@/tools/get-b3tr-users-leaderboard'

describe('Indexer B3TR Users Leaderboard', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'b3tr-users-leaderboard', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test(
    'should fetch users leaderboard',
    async () => {
      const response = await client.callTool({
        name: 'getB3TRUsersLeaderboard',
        arguments: { size: 5, sortBy: 'totalRewardAmount' },
      })
      const parsed: GetB3TRUsersLeaderboardResponse =
        GetB3TRUsersLeaderboardResponseSchema.parse(response)
      const { structuredContent } = parsed
      expect(structuredContent.network).toBeDefined()
      expect(typeof structuredContent.ok).toBe('boolean')
      expect(structuredContent.data).toHaveProperty('data')
      expect(structuredContent.data).toHaveProperty('pagination')
    },
    30000,
  )
})


