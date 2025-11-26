import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type IndexerB3TRGlobalOverviewResponse,
  IndexerB3TRGlobalOverviewResponseSchema,
} from '@/tools/get-b3tr-global-overview'

describe('Indexer B3TR Global Overview', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'b3tr-global-overview', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test(
    'should fetch global overview',
    async () => {
      const response = await client.callTool({
        name: 'getB3TRGlobalOverview',
        arguments: {},
      })
      const parsed: IndexerB3TRGlobalOverviewResponse =
        IndexerB3TRGlobalOverviewResponseSchema.parse(response)
      const { structuredContent } = parsed
      expect(structuredContent.network).toBeDefined()
      expect(typeof structuredContent.ok).toBe('boolean')
      if (structuredContent.ok) {
        expect(structuredContent.data).toBeDefined()
        expect(typeof (structuredContent.data as any).actionsRewarded).toBe('number')
        expect(typeof (structuredContent.data as any).totalRewardAmount).toBe('number')
      }
    },
    30000,
  )
})


