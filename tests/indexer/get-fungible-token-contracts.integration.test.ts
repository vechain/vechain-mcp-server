import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type IndexerGetFungibleTokenContractsResponse,
  IndexerGetFungibleTokenContractsResponseSchema,
} from '../../src/tools/get-fungible-token-contracts'

describe('Indexer Get Fungible Token Contracts', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({
      name: 'indexer-get-fungible-token-contracts-client',
      version: '1.0.0',
    })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test('should list fungible token contracts for an address', async () => {
    const response = await client.callTool({
      name: 'getFungibleTokenContracts',
      arguments: {
        address: '0x14A65f53750E47654a833AF9D3b6619D04DA11aE',
      },
    })
    expect(response.content).toBeDefined()
    const structured: IndexerGetFungibleTokenContractsResponse =
      IndexerGetFungibleTokenContractsResponseSchema.parse(response)
    const structuredData = structured.structuredContent
    expect(typeof structuredData.ok).toBe('boolean')
    if (structuredData.ok) {
      expect(Array.isArray(structuredData.data)).toBe(true)
    } else {
      expect(typeof structuredData.error).toBe('string')
    }
  })

  test('should reject when address is not provided', async () => {
    const response = await client.callTool({
      name: 'getFungibleTokenContracts',
      arguments: {},
    })
    // The SDK resolves with isError=true for input validation failures
    expect(response).toBeDefined()
    expect((response as any).isError).toBe(true)
  })
})


