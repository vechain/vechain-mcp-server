import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type GetB3TRUserDailySummariesResponse,
  ResponseSchema as GetB3TRUserDailySummariesResponseSchema,
} from '@/tools/get-b3tr-user-daily-summaries'

describe('Indexer B3TR User Daily Summaries', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'b3tr-user-daily-summaries', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test(
    'should fetch daily summaries for a user',
    async () => {
      const WALLET = '0xf077b491b355e64048ce21e3a6fc4751eeea77fa'
      const response = await client.callTool({
        name: 'getB3TRUserDailySummaries',
        arguments: {
          wallet: WALLET,
          startDate: '2024-01-01',
          endDate: '2026-01-01',
          size: 5,
        },
      })
      const parsed: GetB3TRUserDailySummariesResponse =
        GetB3TRUserDailySummariesResponseSchema.parse(response)
      const { structuredContent } = parsed
      expect(structuredContent.network).toBeDefined()
      expect(typeof structuredContent.ok).toBe('boolean')
      if (structuredContent.ok) {
        expect(structuredContent.data).toHaveProperty('data')
        expect(Array.isArray((structuredContent.data as any).data)).toBe(true)
      }
    },
    30000,
  )
})


