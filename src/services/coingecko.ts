import { z } from 'zod'
import { logger } from '@/utils/logger'

const SUPPORTED_FIATS = ['usd', 'eur', 'jpy', 'chf'] as const
export type SupportedFiat = (typeof SUPPORTED_FIATS)[number]

const TOKEN_CONFIG = {
  vet: 'vechain',
  vtho: 'vethor-token',
  b3tr: 'vebetterdao',
  vot3: 'vebetterdao',
} as const
export type SupportedToken = keyof typeof TOKEN_CONFIG

const CoinGeckoSimplePriceResponseSchema = z.record(z.string(), z.record(z.string(), z.number()).optional())

/**
 * Cache TTL in milliseconds (30 minutes)
 * Crypto prices change frequently, but we don't need real-time data for most use cases
 */
const PRICE_CACHE_TTL = 30 * 60 * 1000

/**
 * Cache entry with timestamp for price data
 */
interface PriceCacheEntry {
  data: z.infer<typeof CoinGeckoSimplePriceResponseSchema>
  timestamp: number
}

/**
 * Cache for CoinGecko price data to avoid hitting rate limits
 */
let priceCache: PriceCacheEntry | null = null

function getCoinGeckoIdForToken(token: SupportedToken): (typeof TOKEN_CONFIG)[SupportedToken] {
  return TOKEN_CONFIG[token]
}

/**
 * Fetch prices for VET and VTHO from CoinGecko using /simple/price
 * Results are cached for 5 minutes to avoid hitting rate limits
 */
async function fetchCoinGeckoPrices(): Promise<z.infer<typeof CoinGeckoSimplePriceResponseSchema>> {
  const now = Date.now()

  // Check cache
  if (priceCache && (now - priceCache.timestamp) < PRICE_CACHE_TTL) {
    logger.debug('CoinGecko price cache hit')
    return priceCache.data
  }

  // Cache miss or expired - fetch from API
  logger.debug('CoinGecko price cache miss, fetching from API...')
  
  const baseUrl = process.env.COINGECKO_BASE_URL || 'https://api.coingecko.com'
  const url = new URL('/api/v3/simple/price', baseUrl)
  url.searchParams.set('ids', Object.values(TOKEN_CONFIG).join(','))
  url.searchParams.set('vs_currencies', SUPPORTED_FIATS.join(','))

  logger.debug(`Fetching prices from CoinGecko: ${url.toString()}`)

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    const message = `CoinGecko request failed with status ${response.status} ${response.statusText}`
    logger.warn(message)
    throw new Error(message)
  }

  const json = await response.json()
  const parsed = CoinGeckoSimplePriceResponseSchema.safeParse(json)

  if (!parsed.success) {
    const message = `Failed to parse CoinGecko response: ${JSON.stringify(parsed.error.issues)}`
    logger.warn(message)
    throw new Error(message)
  }

  // Cache the result
  priceCache = {
    data: parsed.data,
    timestamp: now,
  }

  return parsed.data
}

export async function getTokenFiatPriceFromCoinGecko(params: {
  token: SupportedToken
  fiat: SupportedFiat
}): Promise<number> {
  const { token, fiat } = params

  const data = await fetchCoinGeckoPrices()
  const id = getCoinGeckoIdForToken(token)
  const tokenPrices = data[id]

  if (!tokenPrices) {
    const message = `Token ${id} not found in CoinGecko response`
    logger.warn(message)
    throw new Error(message)
  }

  const price = tokenPrices[fiat]

  if (price === undefined || price === null || !Number.isFinite(price)) {
    const message = `Price for ${id} in ${fiat.toUpperCase()} not available in CoinGecko response`
    logger.warn(message)
    throw new Error(message)
  }

  return price
}

/**
 * Clear the price cache (useful for testing)
 */
export function clearPriceCache(): void {
  priceCache = null
}
