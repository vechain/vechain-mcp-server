import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type IndexerB3TRUserOverviewResponse,
  IndexerB3TRUserOverviewResponseSchema,
} from '@/tools/get-b3tr-user-overview'

describe('Indexer B3TR User Overview', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'b3tr-user-overview', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test(
    'should fetch user overview',
    async () => {
      const WALLET = '0xf077b491b355e64048ce21e3a6fc4751eeea77fa'
      const response = await client.callTool({
        name: 'getB3TRUserOverview',
        arguments: { wallet: WALLET },
      })
      const parsed: IndexerB3TRUserOverviewResponse =
        IndexerB3TRUserOverviewResponseSchema.parse(response)
      const { structuredContent } = parsed
      expect(structuredContent.network).toBeDefined()
      expect(typeof structuredContent.ok).toBe('boolean')
      expect(structuredContent.data).toBeDefined()
      expect(typeof (structuredContent.data as any).actionsRewarded).toBe('number')
    },
    30000,
  )
})


