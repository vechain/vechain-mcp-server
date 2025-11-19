import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

describe('Thor Get Transaction', () => {
  let client: Client

  beforeAll(async () => {
    client = new Client({
      name: 'thor-get-transaction-client',
      version: '1.0.0',
    })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'), {
      reconnectionOptions: {
        maxReconnectionDelay: 1000,
        initialReconnectionDelay: 100,
        reconnectionDelayGrowFactor: 1.5,
        maxRetries: 0,
      },
    })
    await client.connect(transport)
  })

  afterAll(async () => {
    await client.close()
  })

  test('should get a transaction by id', async () => {
    const response = await client.callTool({
      name: 'thorGetTransaction',
      arguments: {
        transactionId: '0x3348860d703a13f5eb7e874187c26baf018c07025546308e3e1ee58e29941e0d',
      },
    })
    expect(response.content).toBeDefined()
    expect(response.structuredContent).toBeDefined()
  })
  test('should fail to get a transaction by invalid id', async () => {
    const request = client.callTool({
      name: 'thorGetBlock',
      arguments: {
        transactionId: 'invalid',
      },
    })
    expect(async () => await request).rejects.toThrow()
  })
})
