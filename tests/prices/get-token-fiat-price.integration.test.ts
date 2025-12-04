import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { TokenFiatPriceDataSchema } from '@/tools/get-token-fiat-price'

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

  test('should get VET price in USD from oracle', async () => {
    const response = await client.callTool({
      name: 'getTokenFiatPrice',
      arguments: {
        token: 'vet',
        fiat: 'usd',
      },
    })

    expect(response.content).toBeDefined()

    const data = TokenFiatPriceDataSchema.parse(response.structuredContent)

    expect(data.token).toBe('vet')
    expect(data.fiat).toBe('usd')
    expect(typeof data.price).toBe('number')
    expect(data.source).toBe('oracle')
    expect(typeof data.error === 'string' || data.error === undefined).toBe(true)
  })

  test('should get VET price in EUR from oracle', async () => {
    const response = await client.callTool({
      name: 'getTokenFiatPrice',
      arguments: {
        token: 'vet',
        fiat: 'eur',
      },
    })

    expect(response.content).toBeDefined()

    const data = TokenFiatPriceDataSchema.parse(response.structuredContent)

    expect(data.token).toBe('vet')
    expect(data.fiat).toBe('eur')
    expect(typeof data.price).toBe('number')
    expect(data.source).toBe('oracle')
    expect(typeof data.error === 'string' || data.error === undefined).toBe(true)
  })

  test('should get VTHO price in USD from oracle', async () => {
    const response = await client.callTool({
      name: 'getTokenFiatPrice',
      arguments: {
        token: 'VTHO',
        fiat: 'USD',
      },
    })

    expect(response.content).toBeDefined()

    const data = TokenFiatPriceDataSchema.parse(response.structuredContent)

    expect(data.token).toBe('vtho')
    expect(data.fiat).toBe('usd')
    expect(typeof data.price).toBe('number')
    expect(data.source).toBe('oracle')
    expect(typeof data.error === 'string' || data.error === undefined).toBe(true)
  })

  test('should get B3TR price in USD from oracle', async () => {
    const response = await client.callTool({
      name: 'getTokenFiatPrice',
      arguments: {
        token: 'B3TR',
        fiat: 'USD',
      },
    })

    expect(response.content).toBeDefined()

    const data = TokenFiatPriceDataSchema.parse(response.structuredContent)

    expect(data.token).toBe('b3tr')
    expect(data.fiat).toBe('usd')
    expect(typeof data.price).toBe('number')
    expect(data.source).toBe('oracle')
    expect(typeof data.error === 'string' || data.error === undefined).toBe(true)
  })
})
