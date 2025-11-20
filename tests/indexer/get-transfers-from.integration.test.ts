import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type IndexerGetTransfersFromResponse,
  IndexerGetTransfersFromResponseSchema,
} from '../../src/tools/get-transfers-from'

describe('Indexer Get Transfers From', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({
      name: 'indexer-get-transfers-from-client',
      version: '1.0.0',
    })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test('should get outgoing transfers for a valid address', async () => {
    const response = await client.callTool({
      name: 'getTransfersFrom',
      arguments: {
        address: '0x14A65f53750E47654a833AF9D3b6619D04DA11aE',
      },
    })
    expect(response.content).toBeDefined()
    const structured: IndexerGetTransfersFromResponse = IndexerGetTransfersFromResponseSchema.parse(response)
    const structuredData = structured.structuredContent
    expect(structuredData.ok).toBe(true)
    expect(Array.isArray(structuredData.data)).toBe(true)
  })

  test('should reject when address is not provided', async () => {
    const response = await client.callTool({
      name: 'getTransfersFrom',
      arguments: {},
    })
    // The SDK resolves with isError=true for input validation failures
    expect(response).toBeDefined()
    expect((response as any).isError).toBe(true)
  })
})


