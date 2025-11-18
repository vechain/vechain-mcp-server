import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type IndexerGetTransfersToResponse,
  IndexerGetTransfersToResponseSchema,
} from '../../src/tools/get-transfers-to'

describe('Indexer Get Transfers To', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({
      name: 'indexer-get-transfers-to-client',
      version: '1.0.0',
    })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test('should get incoming transfers for a valid address', async () => {
    const response = await client.callTool({
      name: 'getTransfersTo',
      arguments: {
        address: '0x14A65f53750E47654a833AF9D3b6619D04DA11aE',
      },
    })
    expect(response.content).toBeDefined()
    const structured: IndexerGetTransfersToResponse = IndexerGetTransfersToResponseSchema.parse(response)
    const structuredData = structured.structuredContent
    expect(structuredData.ok).toBe(true)
    expect(Array.isArray(structuredData.data)).toBe(true)
  })

  test('should reject when address is not provided', async () => {
    const response = await client.callTool({
      name: 'getTransfersTo',
      arguments: {},
    })
    // The SDK resolves with isError=true for input validation failures
    expect(response).toBeDefined()
    expect((response as any).isError).toBe(true)
  })
})


