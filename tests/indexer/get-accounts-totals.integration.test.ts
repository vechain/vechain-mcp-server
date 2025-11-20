import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type AccountsTotalsResponse,
  AccountsTotalsResponseSchema,
} from '../../src/tools/get-accounts-totals'

describe('Accounts Totals', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'accounts-totals', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test('should fetch totals by DAY timeFrame', async () => {
    const response = await client.callTool({
      name: 'getAccountsTotals',
      arguments: { timeFrame: 'DAY', page: 0, size: 5 },
    })
    const parsed: AccountsTotalsResponse = AccountsTotalsResponseSchema.parse(response)
    const s = parsed.structuredContent
    expect(typeof s.ok).toBe('boolean')
    if (s.ok) {
      expect(Array.isArray(s.data)).toBe(true)
    } else {
      expect(typeof s.error).toBe('string')
    }
  }, 60000)
})


