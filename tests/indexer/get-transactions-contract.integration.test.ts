import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type IndexerGetContractTransactionsResponse,
  IndexerGetContractTransactionsResponseSchema,
} from '../../src/tools/get-transactions-contract'

describe('Indexer Get Contract Transactions', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({
      name: 'indexer-get-contract-transactions-client',
      version: '1.0.0',
    })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test('should get transactions for a contract', async () => {
    const response = await client.callTool({
      name: 'getContractTransactions',
      arguments: {
        contractAddress: '0x89a00bb0947a30ff95beef77a66aede3842fe5b7',
        expanded: true,
      },
    })
    expect(response.content).toBeDefined()
    const structured: IndexerGetContractTransactionsResponse =
      IndexerGetContractTransactionsResponseSchema.parse(response)
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


