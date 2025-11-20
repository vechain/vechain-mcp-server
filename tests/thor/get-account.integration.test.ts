import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { ThorGetAccountResponseSchema } from '@/tools/thor-get-account'

describe('Thor Get Account', () => {
  let client: Client

  beforeAll(async () => {
    client = new Client({
      name: 'thor-get-account-client',
      version: '1.0.0',
    })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterAll(async () => {
    await client.close()
  })

  test('should get an account by hex address', async () => {
    const response = await client.callTool({
      name: 'thorGetAccount',
      arguments: {
        address: '0x311E811cd3fC29Ba17D45B04c882245FA69DC776',
      },
    })

    expect(response.content).toBeDefined()
    expect(response.structuredContent).toBeDefined()
    const { structuredContent } = ThorGetAccountResponseSchema.parse(response)

    expect(structuredContent.ok).toBe(true)
    expect(structuredContent.data).toBeDefined()
    expect(structuredContent.data?.address).toBe('0x311E811cd3fC29Ba17D45B04c882245FA69DC776')
  })

  test('should get an account by VNS name', async () => {
    const response = await client.callTool({
      name: 'thorGetAccount',
      arguments: {
        address: 'test.vet',
      },
    })

    expect(response.content).toBeDefined()
    expect(response.structuredContent).toBeDefined()
    const { structuredContent } = ThorGetAccountResponseSchema.parse(response)

    expect(structuredContent.ok).toBe(true)
    expect(structuredContent.data).toBeDefined()
    // The returned address must be a Thor 0x... address
    expect(structuredContent.data?.address).toMatch(/^0x[a-fA-F0-9]{40}$/)
  })
})
