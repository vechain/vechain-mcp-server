import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type IndexerGetTransfersOfResponse,
  IndexerGetTransfersOfResponseSchema,
} from '../../src/tools/get-transfers-of-account'

describe('Indexer Get Transfers Of Account', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({
      name: 'indexer-get-transfers-of-account-client',
      version: '1.0.0',
    })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test('should get transfers for a valid address', async () => {
    const response = await client.callTool({
      name: 'getTransfersOfAccount',
      arguments: {
        address: '0x14A65f53750E47654a833AF9D3b6619D04DA11aE',
      },
    })
    expect(response.content).toBeDefined()
    const structured: IndexerGetTransfersOfResponse = IndexerGetTransfersOfResponseSchema.parse(response)
    const structuredData = structured.structuredContent
    expect(structuredData.network).toBeDefined()
    expect(typeof structuredData.ok).toBe('boolean')
    if (structuredData.ok) {
      expect(Array.isArray(structuredData.data)).toBe(true)
    } else {
      expect(typeof structuredData.error).toBe('string')
    }
  })

  test('should get transfers for a valid tokenAddress (B3TR)', async () => {
    const B3TR_TOKEN_ADDRESS = '0x5ef79995FE8a89e0812330E4378eB2660ceDe699'
    const response = await client.callTool({
      name: 'getTransfersOfAccount',
      arguments: {
        tokenAddress: B3TR_TOKEN_ADDRESS,
      },
    })
    expect(response.content).toBeDefined()
    const structured: IndexerGetTransfersOfResponse = IndexerGetTransfersOfResponseSchema.parse(response)
    const structuredData = structured.structuredContent
    expect(structuredData.network).toBeDefined()
    expect(typeof structuredData.ok).toBe('boolean')
    if (structuredData.ok) {
      expect(Array.isArray(structuredData.data)).toBe(true)
    } else {
      expect(typeof structuredData.error).toBe('string')
    }
  })

  test('should fail when neither address nor tokenAddress is provided', async () => {
    const response = await client.callTool({
      name: 'getTransfersOfAccount',
      arguments: {},
    })
    expect(response.content).toBeDefined()
    const structured: IndexerGetTransfersOfResponse = IndexerGetTransfersOfResponseSchema.parse(response)
    const structuredData = structured.structuredContent
    expect(structuredData.ok).toBe(false)
  })
})


