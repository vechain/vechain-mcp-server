import { z } from 'zod'
import { logger } from '@/utils/logger'

export type SupportedToken = 'vet' | 'vtho'
export type SupportedFiat = 'usd' | 'eur' | 'jpy' | 'chf'

const CoinGeckoSimplePriceResponseSchema = z.object({
  vechain: z.record(z.string(), z.number()).optional(),
  'vethor-token': z.record(z.string(), z.number()).optional(),
})

function getCoinGeckoIdForToken(token: SupportedToken): 'vechain' | 'vethor-token' {
  return token === 'vet' ? 'vechain' : 'vethor-token'
}

/**
 * Fetch prices for VET and VTHO from CoinGecko using /simple/price
 */
async function fetchCoinGeckoPrices(): Promise<z.infer<typeof CoinGeckoSimplePriceResponseSchema>> {
  const baseUrl = process.env.COINGECKO_BASE_URL || 'https://api.coingecko.com'
  const url = new URL('/api/v3/simple/price', baseUrl)
  url.searchParams.set('ids', 'vechain,vethor-token')
  url.searchParams.set('vs_currencies', 'usd,eur,jpy,chf')

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
