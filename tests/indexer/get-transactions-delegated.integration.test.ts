import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type IndexerGetDelegatedTransactionsResponse,
  IndexerGetDelegatedTransactionsResponseSchema,
} from '../../src/tools/get-transactions-delegated'

describe('Indexer Get Delegated Transactions', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({
      name: 'indexer-get-delegated-transactions-client',
      version: '1.0.0',
    })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test('should get delegated transactions for delegator', async () => {
    const response = await client.callTool({
      name: 'getDelegatedTransactions',
      arguments: {
        delegator: '0x14A65f53750E47654a833AF9D3b6619D04DA11aE',
        expanded: true,
      },
    })
    expect(response.content).toBeDefined()
    const structured: IndexerGetDelegatedTransactionsResponse =
      IndexerGetDelegatedTransactionsResponseSchema.parse(response)
    const structuredData = structured.structuredContent
    expect(structuredData.network).toBeDefined()
    expect(typeof structuredData.ok).toBe('boolean')
    if (structuredData.ok) {
      expect(Array.isArray(structuredData.data?.data)).toBe(true)
    } else {
      expect(typeof structuredData.error).toBe('string')
    }
  })
})


