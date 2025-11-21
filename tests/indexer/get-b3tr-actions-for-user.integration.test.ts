import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type GetB3TRActionsForUserResponse,
  ResponseSchema as GetB3TRActionsForUserResponseSchema,
} from '@/tools/get-b3tr-actions-for-user'

describe('Indexer B3TR Actions For User', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'b3tr-actions-for-user', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test(
    'should fetch actions for a known user',
    async () => {
      const WALLET = '0xf077b491b355e64048ce21e3a6fc4751eeea77fa'
      const response = await client.callTool({
        name: 'getB3TRActionsForUser',
        arguments: { wallet: WALLET, size: 5 },
      })
      const parsed: GetB3TRActionsForUserResponse =
        GetB3TRActionsForUserResponseSchema.parse(response)
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


