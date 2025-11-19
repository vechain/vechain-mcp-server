import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

describe('Thor Get Block', () => {
  let client: Client

  beforeAll(async () => {
    client = new Client({
      name: 'thor-get-block-client',
      version: '1.0.0',
    })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterAll(async () => {
    await client.close()
  })

  test('should get a block by number', async () => {
    const response = await client.callTool({
      name: 'thorGetBlock',
      arguments: {
        blockRevision: '1',
      },
    })
    expect(response.content).toBeDefined()
    expect(response.structuredContent).toBeDefined()
  })
  test('should get a block by id', async () => {
    const response = await client.callTool({
      name: 'thorGetBlock',
      arguments: {
        blockRevision: '0x016117e4991d812350828c6cf1184603eb1cd0c183d87c7f5e6f875e1aed6c2d',
      },
    })
    expect(response.content).toBeDefined()
    expect(response.structuredContent).toBeDefined()
  })
  test('should get a block by label', async () => {
    const response = await client.callTool({
      name: 'thorGetBlock',
      arguments: {
        blockRevision: 'best',
      },
    })
    expect(response.content).toBeDefined()
    expect(response.structuredContent).toBeDefined()
  })
  test('should fail to get a block by invalid revision', async () => {
    const request = client.callTool({
      name: 'thorGetBlock',
      arguments: {
        blockRevision: 'invalid',
      },
    })
    expect(async () => await request).rejects.toThrow()
  })
})
