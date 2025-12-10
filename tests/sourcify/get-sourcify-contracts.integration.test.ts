import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

describe('Sourcify Get Contracts List', () => {
  let client: Client

  beforeAll(async () => {
    client = new Client({
      name: 'sourcify-get-contracts-client',
      version: '1.0.0',
    })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterAll(async () => {
    await client.close()
  })

  test('should list verified contracts with default parameters', async () => {
    const response = await client.callTool({
      name: 'getSourcifyContracts',
      arguments: {},
    })

    const content = response.content as Array<{ type: string; text: string }>
    expect(content.length).toBeGreaterThan(0)

    if (content[0].text.startsWith('MCP error')) {
      throw new Error(content[0].text)
    }

    const result = JSON.parse(content[0].text)

    expect(result.ok).toBe(true)
    expect(result.network).toBe('mainnet')
    expect(result.chainId).toBe('100009')
    expect(result.contracts).toBeDefined()
    expect(Array.isArray(result.contracts)).toBe(true)
    expect(result.totalReturned).toBeGreaterThan(0)
  })

  test('should list verified contracts with custom limit', async () => {
    const response = await client.callTool({
      name: 'getSourcifyContracts',
      arguments: {
        limit: 5,
      },
    })

    const content = response.content as Array<{ type: string; text: string }>
    expect(content.length).toBeGreaterThan(0)

    if (content[0].text.startsWith('MCP error')) {
      throw new Error(content[0].text)
    }

    const result = JSON.parse(content[0].text)

    expect(result.ok).toBe(true)
    expect(result.contracts).toBeDefined()
    expect(result.contracts?.length).toBeLessThanOrEqual(5)
  })

  test('should support pagination with afterMatchId', async () => {
    // First request
    const firstResponse = await client.callTool({
      name: 'getSourcifyContracts',
      arguments: {
        limit: 5,
      },
    })

    const firstContent = firstResponse.content as Array<{ type: string; text: string }>
    if (firstContent[0].text.startsWith('MCP error')) {
      throw new Error(firstContent[0].text)
    }

    const firstResult = JSON.parse(firstContent[0].text)

    expect(firstResult.ok).toBe(true)
    expect(firstResult.lastMatchId).toBeDefined()

    // Second request with pagination
    const secondResponse = await client.callTool({
      name: 'getSourcifyContracts',
      arguments: {
        limit: 5,
        afterMatchId: firstResult.lastMatchId,
      },
    })

    const secondContent = secondResponse.content as Array<{ type: string; text: string }>
    if (secondContent[0].text.startsWith('MCP error')) {
      throw new Error(secondContent[0].text)
    }

    const secondResult = JSON.parse(secondContent[0].text)

    expect(secondResult.ok).toBe(true)
    expect(secondResult.contracts).toBeDefined()

    // Ensure we got different contracts
    const firstAddresses = firstResult.contracts?.map((c: { address: string }) => c.address) ?? []
    const secondAddresses = secondResult.contracts?.map((c: { address: string }) => c.address) ?? []

    const overlap = secondAddresses.filter((addr: string) => firstAddresses.includes(addr))
    expect(overlap.length).toBeLessThan(secondAddresses.length)
  })
})
