import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

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
    expect((response.structuredContent as { network: string }).network).toBeDefined()
    expect((response.structuredContent as { ok: boolean }).ok).toBe(true)
    expect((response.structuredContent as { data: any[] }).data).toBeDefined()
    expect((response.structuredContent as { data: any[] }).data.length).toBeGreaterThan(10)
  })

  test('should fail when neither address nor tokenAddress is provided', async () => {
    const response = await client.callTool({
      name: 'getTransfersOfAccount',
      arguments: {},
    })

    expect(response.content).toBeDefined()
    expect(response.structuredContent).toBeDefined()
    expect((response.structuredContent as { ok: boolean }).ok).toBe(false)
    expect((response.structuredContent as { error: string }).error).toContain(
      'Failed to fetch transfers from VeWorld Indexer',
    )
  })
})
