import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type IndexerB3TRUserAppOverviewResponse,
  IndexerB3TRUserAppOverviewResponseSchema,
} from '@/tools/get-b3tr-user-app-overview'

describe('Indexer B3TR User App Overview', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'b3tr-user-app-overview', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test(
    'should fetch user app overview',
    async () => {
      const WALLET = '0xf077b491b355e64048ce21e3a6fc4751eeea77fa'
      const APP_ID =
        '0x3a66df25581b931b27557101b2d93f87e43c550d0675599f7a6029e9943a1566'
      const response = await client.callTool({
        name: 'getB3TRUserAppOverview',
        arguments: { wallet: WALLET, appId: APP_ID },
      })
      const parsed: IndexerB3TRUserAppOverviewResponse =
        IndexerB3TRUserAppOverviewResponseSchema.parse(response)
      const { structuredContent } = parsed
      expect(structuredContent.network).toBeDefined()
      expect(typeof structuredContent.ok).toBe('boolean')
      if (structuredContent.ok) {
        expect(structuredContent.data).toBeDefined()
        expect(typeof (structuredContent.data as any).actionsRewarded).toBe('number')
      }
    },
    30000,
  )
})


