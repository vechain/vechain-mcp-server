import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

describe('Sourcify Get Contract', () => {
  let client: Client

  beforeAll(async () => {
    client = new Client({
      name: 'sourcify-get-contract-client',
      version: '1.0.0',
    })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterAll(async () => {
    await client.close()
  })

  test('should get a verified contract by address', async () => {
    // Known verified contract on VeChain mainnet
    const response = await client.callTool({
      name: 'getSourcifyContract',
      arguments: {
        address: '0x1c65C25fABe2fc1bCb82f253fA0C916a322f777C',
      },
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
    expect(result.contract).toBeDefined()
    expect(result.contract.abi).toBeDefined()
    expect(Array.isArray(result.contract.abi)).toBe(true)
  })

  test('should get only specific fields when requested', async () => {
    const response = await client.callTool({
      name: 'getSourcifyContract',
      arguments: {
        address: '0x1c65C25fABe2fc1bCb82f253fA0C916a322f777C',
        fields: ['abi', 'compilation'],
        resolveProxy: false,
      },
    })

    const content = response.content as Array<{ type: string; text: string }>
    expect(content.length).toBeGreaterThan(0)

    if (content[0].text.startsWith('MCP error')) {
      throw new Error(content[0].text)
    }

    const result = JSON.parse(content[0].text)

    expect(result.ok).toBe(true)
    expect(result.contract).toBeDefined()
    expect(result.contract.abi).toBeDefined()
  })

  test('should resolve proxy contract and get implementation ABI', async () => {
    const response = await client.callTool({
      name: 'getSourcifyContract',
      arguments: {
        address: '0x1c65C25fABe2fc1bCb82f253fA0C916a322f777C',
        resolveProxy: true,
      },
    })

    const content = response.content as Array<{ type: string; text: string }>
    expect(content.length).toBeGreaterThan(0)

    if (content[0].text.startsWith('MCP error')) {
      throw new Error(content[0].text)
    }

    const result = JSON.parse(content[0].text)

    expect(result.ok).toBe(true)
    expect(result.contract).toBeDefined()
    expect(typeof result.contract.isProxy).toBe('boolean')
  })

  test('should return error for non-verified contract', async () => {
    const response = await client.callTool({
      name: 'getSourcifyContract',
      arguments: {
        address: '0x0000000000000000000000000000000000000001',
      },
    })

    const content = response.content as Array<{ type: string; text: string }>
    expect(content.length).toBeGreaterThan(0)

    const result = JSON.parse(content[0].text)

    expect(result.ok).toBe(false)
    expect(result.error).toBeDefined()
  })
})
