import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type IndexerGetTransactionsResponse,
  IndexerGetTransactionsResponseSchema,
} from '../../src/tools/get-transactions'

describe('Indexer Get Transactions (origin/delegator)', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({
      name: 'indexer-get-transactions-client',
      version: '1.0.0',
    })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test('should get transactions for a valid origin', async () => {
    const response = await client.callTool({
      name: 'getTransactions',
      arguments: {
        origin: '0x14A65f53750E47654a833AF9D3b6619D04DA11aE',
        expanded: true,
      },
    })
    expect(response.content).toBeDefined()
    const structured: IndexerGetTransactionsResponse = IndexerGetTransactionsResponseSchema.parse(response)
    const structuredData = structured.structuredContent
    expect(structuredData.network).toBeDefined()
    expect(typeof structuredData.ok).toBe('boolean')
    if (structuredData.ok) {
      expect(Array.isArray(structuredData.data?.data)).toBe(true)
    } else {
      expect(typeof structuredData.error).toBe('string')
    }
  })

  test('should get transactions for a valid delegator', async () => {
    const response = await client.callTool({
      name: 'getTransactions',
      arguments: {
        delegator: '0x14A65f53750E47654a833AF9D3b6619D04DA11aE',
        expanded: true,
      },
    })
    expect(response.content).toBeDefined()
    const structured: IndexerGetTransactionsResponse = IndexerGetTransactionsResponseSchema.parse(response)
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


