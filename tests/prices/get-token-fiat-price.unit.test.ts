import { getTokenFiatPrice, TokenFiatPriceDataSchema } from '@/tools/get-token-fiat-price'
import { clearOraclePriceCache } from '@/services/price-oracle'

describe('getTokenFiatPrice tool (unit)', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    clearOraclePriceCache()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  test('returns structured data with price for VET in USD from oracle', async () => {
    // Mock oracle response (Thor node POST /accounts/{address})
    // Price: 0.0148 * 1e12 = 14800000000 = 0x34630b8a00
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ([{
        data: '0x' + '0000000000000000000000000000000000000000000000000000034630b8a000' + '0000000000000000000000000000000000000000000000000000000000000000',
        reverted: false,
      }]),
    })

    const result = await getTokenFiatPrice.handler({ token: 'VET', fiat: 'USD' })
    const data = TokenFiatPriceDataSchema.parse(result.structuredContent)

    expect(data.token).toBe('vet')
    expect(data.fiat).toBe('usd')
    expect(data.source).toBe('oracle')
    expect(typeof data.price).toBe('number')
    expect(data.price).toBeCloseTo(0.0148, 4)
    expect(data.error).toBeUndefined()
  })

  test('returns structured data with price for VTHO in USD from oracle', async () => {
    // Price: 0.001 * 1e12 = 1000000000 = 0xe8d4a51000
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ([{
        data: '0x' + '000000000000000000000000000000000000000000000000000000e8d4a51000' + '0000000000000000000000000000000000000000000000000000000000000000',
        reverted: false,
      }]),
    })

    const result = await getTokenFiatPrice.handler({ token: 'VTHO', fiat: 'USD' })
    const data = TokenFiatPriceDataSchema.parse(result.structuredContent)

    expect(data.token).toBe('vtho')
    expect(data.fiat).toBe('usd')
    expect(data.source).toBe('oracle')
    expect(typeof data.price).toBe('number')
    expect(data.price).toBeCloseTo(0.001, 4)
    expect(data.error).toBeUndefined()
  })

  test('returns structured data with price for VET in EUR from oracle', async () => {
    // First call: VET-USD price, Second call: EUR-USD rate
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([{
          data: '0x' + '0000000000000000000000000000000000000000000000000000034630b8a000' + '0000000000000000000000000000000000000000000000000000000000000000',
          reverted: false,
        }]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([{
          data: '0x' + '00000000000000000000000000000000000000000000000000000d4a4d2c6000' + '0000000000000000000000000000000000000000000000000000000000000000',
          reverted: false,
        }]),
      })

    const result = await getTokenFiatPrice.handler({ token: 'vet', fiat: 'eur' })
    const data = TokenFiatPriceDataSchema.parse(result.structuredContent)

    expect(data.token).toBe('vet')
    expect(data.fiat).toBe('eur')
    expect(data.source).toBe('oracle')
    expect(typeof data.price).toBe('number')
    expect(data.error).toBeUndefined()
  })

  test('returns error field when oracle call fails', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    const result = await getTokenFiatPrice.handler({ token: 'vet', fiat: 'usd' })
    const data = TokenFiatPriceDataSchema.parse(result.structuredContent)

    expect(data.token).toBe('vet')
    expect(data.fiat).toBe('usd')
    expect(data.source).toBe('oracle')
    expect(Number.isNaN(data.price)).toBe(true)
    expect(typeof data.error).toBe('string')
  })

  test('returns error for unsupported token', async () => {
    const result = await getTokenFiatPrice.handler({ token: 'btc', fiat: 'usd' })
    const data = result.structuredContent as { error?: string }
    
    expect(data.error).toBeDefined()
  })

  test('returns error for unsupported fiat', async () => {
    const result = await getTokenFiatPrice.handler({ token: 'vet', fiat: 'jpy' })
    const data = result.structuredContent as { error?: string }
    
    expect(data.error).toBeDefined()
  })
})
