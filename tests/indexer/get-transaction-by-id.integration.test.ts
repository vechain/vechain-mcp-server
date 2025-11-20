import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type IndexerGetTransactionByIdResponse,
  IndexerGetTransactionByIdResponseSchema,
} from '../../src/tools/get-transaction-by-id'

describe('Indexer Get Transaction By ID', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({
      name: 'indexer-get-transaction-by-id-client',
      version: '1.0.0',
    })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test('should fetch transaction by id or return a clear error', async () => {
    const response = await client.callTool({
      name: 'getTransactionById',
      arguments: {
        txId: '0xe6a91ebcdd0823f5a630fe81da3ba1662536ea20118a2dd30c9ff8b41705e76c',
        expanded: true,
      },
    })
    expect(response.content).toBeDefined()
    const structured: IndexerGetTransactionByIdResponse =
      IndexerGetTransactionByIdResponseSchema.parse(response)
    const structuredData = structured.structuredContent
    expect(structuredData.network).toBeDefined()
    expect(typeof structuredData.ok).toBe('boolean')
    if (structuredData.ok) {
      expect(structuredData.data).toBeDefined()
    } else {
      expect(typeof structuredData.error).toBe('string')
    }
  })
})


