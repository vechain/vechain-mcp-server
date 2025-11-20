import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { type IndexerGetNFTContractsResponse, IndexerGetNFTContractsResponseSchema } from '../../src/tools/get-nft-contracts'

describe('Indexer Get NFT Contracts', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({
      name: 'indexer-get-nft-contracts-client',
      version: '1.0.0',
    })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test('should get NFT contract addresses for a valid owner', async () => {
    const response = await client.callTool({
      name: 'getNFTContracts',
      arguments: {
        owner: '0x14A65f53750E47654a833AF9D3b6619D04DA11aE',
      },
    })
    expect(response.content).toBeDefined()
    expect(response.structuredContent).toBeDefined()
    const structured: IndexerGetNFTContractsResponse = IndexerGetNFTContractsResponseSchema.parse(response)
    const structuredData = structured.structuredContent
    expect(structuredData.network).toBeDefined()
    expect(structuredData.ok).toBe(true)
    expect(Array.isArray(structuredData.data)).toBe(true)
  })

  test('should fail when address is not provided', async () => {
    const response = await client.callTool({
      name: 'getNFTContracts',
      arguments: {},
    })

    expect(response.content).toBeDefined()
    expect(response.structuredContent).toBeDefined()
    const structured: IndexerGetNFTContractsResponse = IndexerGetNFTContractsResponseSchema.parse(response)
    const structuredData = structured.structuredContent
    expect(structuredData.ok).toBe(false)
  })
})


