import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type GetB3TRActionsForAppResponse,
  ResponseSchema as GetB3TRActionsForAppResponseSchema,
} from '@/tools/get-b3tr-actions-for-app'

describe('Indexer B3TR Actions For App', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'b3tr-actions-for-app', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test(
    'should fetch actions for a known app',
    async () => {
      const APP_ID =
        '0x3a66df25581b931b27557101b2d93f87e43c550d0675599f7a6029e9943a1566'
      const response = await client.callTool({
        name: 'getB3TRActionsForApp',
        arguments: { appId: APP_ID, size: 5 },
      })
      const parsed: GetB3TRActionsForAppResponse =
        GetB3TRActionsForAppResponseSchema.parse(response)
      const { structuredContent } = parsed
      expect(structuredContent.network).toBeDefined()
      expect(typeof structuredContent.ok).toBe('boolean')
      expect(structuredContent.data).toBeDefined()
      expect(structuredContent.data).toHaveProperty('data')
      expect(structuredContent.data).toHaveProperty('pagination')
    },
    30000,
  )
})


