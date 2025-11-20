import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type IndexerGetTransfersForBlockResponse,
  IndexerGetTransfersForBlockResponseSchema,
} from '../../src/tools/get-transfers-for-block'

describe('Indexer Get Transfers For Block', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({
      name: 'indexer-get-transfers-for-block-client',
      version: '1.0.0',
    })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test('should get transfers for a block number', async () => {
    const response = await client.callTool({
      name: 'getTransfersForBlock',
      arguments: {
        blockNumber: 1,
      },
    })
    expect(response.content).toBeDefined()
    const structured: IndexerGetTransfersForBlockResponse =
      IndexerGetTransfersForBlockResponseSchema.parse(response)
    const structuredData = structured.structuredContent
    expect(typeof structuredData.ok).toBe('boolean')
    if (structuredData.ok) {
      expect(Array.isArray(structuredData.data)).toBe(true)
    } else {
      expect(typeof structuredData.error).toBe('string')
    }
  })

  test('should reject when blockNumber is not provided', async () => {
    const response = await client.callTool({
      name: 'getTransfersForBlock',
      arguments: {},
    })
    // The SDK resolves with isError=true for input validation failures
    expect(response).toBeDefined()
    expect((response as any).isError).toBe(true)
  })
})


