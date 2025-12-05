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

  // Helper to create mock oracle response
  // Oracle returns price scaled by 1e12
  const mockOracleResponse = (priceScaled: bigint) => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => '',
    json: async () => ([{
      data: '0x' + priceScaled.toString(16).padStart(64, '0') + '0'.repeat(64),
      reverted: false,
    }]),
  })

  test('returns structured data with price for VET in USD from oracle', async () => {
    // Price: 0.0148 * 1e12 = 14,800,000,000
    const priceScaled = BigInt(14_800_000_000)
    ;(global.fetch as jest.Mock).mockResolvedValue(mockOracleResponse(priceScaled))

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
    // Price: 0.001 * 1e12 = 1,000,000,000
    const priceScaled = BigInt(1_000_000_000)
    ;(global.fetch as jest.Mock).mockResolvedValue(mockOracleResponse(priceScaled))

    const result = await getTokenFiatPrice.handler({ token: 'VTHO', fiat: 'USD' })
    const data = TokenFiatPriceDataSchema.parse(result.structuredContent)

    expect(data.token).toBe('vtho')
    expect(data.fiat).toBe('usd')
    expect(data.source).toBe('oracle')
    expect(typeof data.price).toBe('number')
    expect(data.price).toBeCloseTo(0.001, 4)
    expect(data.error).toBeUndefined()
  })

  test('returns structured data with price for B3TR in USD from oracle', async () => {
    // Price: 0.027 * 1e12 = 27,000,000,000
    const priceScaled = BigInt(27_000_000_000)
    ;(global.fetch as jest.Mock).mockResolvedValue(mockOracleResponse(priceScaled))

    const result = await getTokenFiatPrice.handler({ token: 'B3TR', fiat: 'USD' })
    const data = TokenFiatPriceDataSchema.parse(result.structuredContent)

    expect(data.token).toBe('b3tr')
    expect(data.fiat).toBe('usd')
    expect(data.source).toBe('oracle')
    expect(typeof data.price).toBe('number')
    expect(data.price).toBeCloseTo(0.027, 4)
    expect(data.error).toBeUndefined()
  })

  test('returns structured data with price for VET in EUR from oracle', async () => {
    // First call: VET-USD price (0.0148), Second call: EUR-USD rate (0.94)
    const vetUsdScaled = BigInt(14_800_000_000)   // 0.0148 * 1e12
    const eurUsdScaled = BigInt(940_000_000_000)  // 0.94 * 1e12

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockOracleResponse(vetUsdScaled))
      .mockResolvedValueOnce(mockOracleResponse(eurUsdScaled))

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
      text: async () => 'Server error',
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
