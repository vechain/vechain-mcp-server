import { getTokenFiatPriceFromCoinGecko, clearPriceCache } from '@/services/coingecko'

describe('CoinGecko client', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    clearPriceCache()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  test('returns price for VET in USD when CoinGecko responds with valid data', async () => {
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
        },
      }),
    })

    const price = await getTokenFiatPriceFromCoinGecko({ token: 'vet', fiat: 'usd' })
    expect(price).toBe(0.0148)
  })

  test('throws when CoinGecko returns non-ok status', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({}),
    })

    await expect(
      getTokenFiatPriceFromCoinGecko({ token: 'vet', fiat: 'usd' }),
    ).rejects.toThrow(/CoinGecko request failed/)
  })

  test('throws when token is not present in response', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        'vethor-token': {
          usd: 0.001,
        },
      }),
    })

    await expect(
      getTokenFiatPriceFromCoinGecko({ token: 'vet', fiat: 'usd' }),
    ).rejects.toThrow(/Token vechain not found/)
  })

  test('throws when fiat is not present for token', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        vechain: {
          usd: 0.0148,
        },
      }),
    })

    await expect(
      getTokenFiatPriceFromCoinGecko({ token: 'vet', fiat: 'eur' }),
    ).rejects.toThrow(/Price for vechain in EUR not available/)
  })
})


