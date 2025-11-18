import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

describe('getTokenFiatPrice (integration)', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({
      name: 'get-token-fiat-price-client',
      version: '1.0.0',
    })

    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test('should get VET price in USD (shape check)', async () => {
    const response = await client.callTool({
      name: 'getTokenFiatPrice',
      arguments: {
        token: 'vet',
        fiat: 'usd',
      },
    })

    expect(response.content).toBeDefined()

    const data = response.structuredContent as {
      token: string
      fiat: string
      price: number
      source: string
      error?: string
    }

    expect(data.token).toBe('vet')
    expect(data.fiat).toBe('usd')
    expect(typeof data.price).toBe('number')
    expect(data.source).toBe('coingecko')
    expect(typeof data.error === 'string' || data.error === undefined).toBe(true)
  })

  test('should get VET price in EUR (shape check)', async () => {
    const response = await client.callTool({
      name: 'getTokenFiatPrice',
      arguments: {
        token: 'vet',
        fiat: 'eur',
      },
    })

    expect(response.content).toBeDefined()

    const data = response.structuredContent as {
      token: string
      fiat: string
      price: number
      source: string
      error?: string
    }

    expect(data.token).toBe('vet')
    expect(data.fiat).toBe('eur')
    expect(typeof data.price).toBe('number')
    expect(data.source).toBe('coingecko')
    expect(typeof data.error === 'string' || data.error === undefined).toBe(true)
  })
})


