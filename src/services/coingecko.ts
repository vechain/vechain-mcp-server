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

function getCoinGeckoIdForToken(token: SupportedToken): (typeof TOKEN_CONFIG)[SupportedToken] {
  return TOKEN_CONFIG[token]
}

/**
 * Fetch prices for VET and VTHO from CoinGecko using /simple/price
 */
async function fetchCoinGeckoPrices(): Promise<z.infer<typeof CoinGeckoSimplePriceResponseSchema>> {
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
