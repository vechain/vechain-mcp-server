import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type IndexerGetTransfersOfResponse,
  IndexerGetTransfersOfResponseSchema,
} from '@/tools/get-transfers-of-account'

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
        address: '0x8D5195504DD1CdD8be425B03ae70EEfa011D25aF',
      },
    })
    expect(response.content).toBeDefined()
    expect(response.structuredContent).toBeDefined()
    const structured: IndexerGetTransfersOfResponse = IndexerGetTransfersOfResponseSchema.parse(response)
    const structuredData = structured.structuredContent
    expect(structuredData.network).toBeDefined()
    expect(structuredData.ok).toBe(true)
    expect(structuredData.data).toBeDefined()
    expect(structuredData.data?.length).toBeGreaterThan(10)
  })

  test('should get transfers for a valid VNS name', async () => {
    const response = await client.callTool({
      name: 'getTransfersOfAccount',
      arguments: {
        address: 'mrojofer.vet',
      },
    })
    expect(response.content).toBeDefined()
    expect(response.structuredContent).toBeDefined()

    const structured: IndexerGetTransfersOfResponse = IndexerGetTransfersOfResponseSchema.parse(response)
    const structuredData = structured.structuredContent

    expect(structuredData.network).toBeDefined()
    expect(structuredData.ok).toBe(true)
    expect(structuredData.data).toBeDefined()
    // Puede ser 0 si aún no hay transfers, solo validamos que sea un array
    expect(Array.isArray(structuredData.data)).toBe(true)
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
    expect(response.structuredContent).toBeDefined()
    const structured: IndexerGetTransfersOfResponse = IndexerGetTransfersOfResponseSchema.parse(response)
    const structuredData = structured.structuredContent
    expect(structuredData.network).toBeDefined()
    expect(structuredData.ok).toBe(true)
    expect(structuredData.data).toBeDefined()
    expect(structuredData.data?.length).toBeGreaterThan(10)
  })

  test('should fail when neither address nor tokenAddress is provided', async () => {
    const response = await client.callTool({
      name: 'getTransfersOfAccount',
      arguments: {},
    })

    expect(response.content).toBeDefined()
    expect(response.structuredContent).toBeDefined()
    const structured: IndexerGetTransfersOfResponse = IndexerGetTransfersOfResponseSchema.parse(response)
    const structuredData = structured.structuredContent
    expect(structuredData.ok).toBe(false)
    expect(structuredData.error).toContain('Failed to fetch transfers from VeWorld Indexer')
  })
})
