import { getTokenFiatPrice, TokenFiatPriceDataSchema } from '@/tools/get-token-fiat-price'
import { clearPriceCache } from '@/services/coingecko'

describe('getTokenFiatPrice tool (unit)', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    clearPriceCache()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  test('returns structured data with price for VET in USD', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        vechain: {
          usd: 0.0148,
          eur: 0.0139,
          jpy: 2.3,
          chf: 0.0135,
        },
        'vethor-token': {
          usd: 0.001,
          eur: 0.0009,
          jpy: 0.2,
          chf: 0.00095,
        },
      }),
    })

    const result = await getTokenFiatPrice.handler({ token: 'VET', fiat: 'USD' })
    const data = TokenFiatPriceDataSchema.parse(result.structuredContent)

    expect(data.token).toBe('vet')
    expect(data.fiat).toBe('usd')
    expect(data.source).toBe('coingecko')
    expect(typeof data.price).toBe('number')
    expect(data.price).toBe(0.0148)
    expect(data.error).toBeUndefined()
  })

  test('returns structured data with price for VET in EUR', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        vechain: {
          usd: 0.0148,
          eur: 0.0139,
        },
        'vethor-token': {
          usd: 0.001,
          eur: 0.0009,
        },
      }),
    })

    const result = await getTokenFiatPrice.handler({ token: 'vet', fiat: 'eur' })
    const data = TokenFiatPriceDataSchema.parse(result.structuredContent)

    expect(data.token).toBe('vet')
    expect(data.fiat).toBe('eur')
    expect(data.source).toBe('coingecko')
    expect(typeof data.price).toBe('number')
    expect(data.price).toBe(0.0139)
    expect(data.error).toBeUndefined()
  })

  test('returns structured data with price for B3TR in EUR', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        vechain: {
          usd: 0.0148,
          eur: 0.0139,
        },
        'vethor-token': {
          usd: 0.001,
          eur: 0.0009,
        },
        vebetterdao: {
          usd: 0.5,
          eur: 0.45,
        },
      }),
    })

    const result = await getTokenFiatPrice.handler({ token: 'B3TR', fiat: 'EUR' })
    const data = TokenFiatPriceDataSchema.parse(result.structuredContent)

    expect(data.token).toBe('b3tr')
    expect(data.fiat).toBe('eur')
    expect(data.source).toBe('coingecko')
    expect(typeof data.price).toBe('number')
    expect(data.price).toBe(0.45)
    expect(data.error).toBeUndefined()
  })

  test('returns error field when CoinGecko call fails', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({}),
    })

    const result = await getTokenFiatPrice.handler({ token: 'vet', fiat: 'usd' })
    const data = TokenFiatPriceDataSchema.parse(result.structuredContent)

    expect(data.token).toBe('vet')
    expect(data.fiat).toBe('usd')
    expect(data.source).toBe('coingecko')
    expect(Number.isNaN(data.price)).toBe(true)
    expect(typeof data.error).toBe('string')
  })
})
