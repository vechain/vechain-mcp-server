import { logger } from '@/utils/logger'
import { getThorNodeUrl, getThorNetworkType } from '@/services/thor'

/**
 * VeChain Energy Oracle - On-chain price feed
 * More reliable than external APIs like CoinGecko
 */

// Oracle contract addresses per network
const ORACLE_ADDRESSES = {
  mainnet: '0x49eC7192BF804Abc289645ca86F1eD01a6C17713',
  testnet: '0xdcCAaBd81B38e0dEEf4c202bC7F1261A4D9192C6',
  solo: null, // Not available on solo
} as const

// Price feed IDs (bytes32) - token-usd pairs
const PRICE_FEED_IDS = {
  vet: '0x7665742d75736400000000000000000000000000000000000000000000000000',
  vtho: '0x7674686f2d757364000000000000000000000000000000000000000000000000',
  b3tr: '0x623374722d757364000000000000000000000000000000000000000000000000',
} as const

// Fiat conversion feed IDs (fiat-usd pairs)
const FIAT_FEED_IDS = {
  gbp: '0x6762702d75736400000000000000000000000000000000000000000000000000',
  eur: '0x657572742d757364000000000000000000000000000000000000000000000000',
} as const

export type SupportedToken = keyof typeof PRICE_FEED_IDS
export type SupportedFiat = 'usd' | 'eur' | 'gbp' | 'jpy' | 'chf'

// ABI for getLatestValue function
const ORACLE_ABI = [
  {
    inputs: [{ internalType: 'bytes32', name: 'id', type: 'bytes32' }],
    name: 'getLatestValue',
    outputs: [
      { internalType: 'uint128', name: 'value', type: 'uint128' },
      { internalType: 'uint128', name: 'updatedAt', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const

// Function selector for getLatestValue(bytes32)
// keccak256("getLatestValue(bytes32)") = 0x73fc67dd...
const GET_LATEST_VALUE_SELECTOR = '0x73fc67dd'

/**
 * Cache TTL in milliseconds (5 minutes)
 * Oracle prices update less frequently than exchange prices
 */
const PRICE_CACHE_TTL = 5 * 60 * 1000

interface PriceCacheEntry {
  price: number
  timestamp: number
}

const priceCache = new Map<string, PriceCacheEntry>()

function getOracleAddress(): string | null {
  const network = getThorNetworkType()
  return ORACLE_ADDRESSES[network] ?? null
}

/**
 * Call the oracle contract to get a price value
 */
async function callOracle(feedId: string): Promise<number> {
  const oracleAddress = getOracleAddress()
  if (!oracleAddress) {
    throw new Error(`Oracle not available on ${getThorNetworkType()} network`)
  }

  const nodeUrl = getThorNodeUrl()
  
  // Encode the call data: selector + feedId (padded to 32 bytes)
  const data = GET_LATEST_VALUE_SELECTOR + feedId.slice(2)

  // Use Thor's simulate endpoint for contract calls
  const response = await fetch(`${nodeUrl}/accounts/*`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      clauses: [{ 
        to: oracleAddress, 
        value: '0', 
        data 
      }],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`Thor node request failed: ${response.status} ${response.statusText} - ${errorText}`)
  }

  const result = await response.json()
  
  if (!result || !Array.isArray(result) || !result[0]) {
    throw new Error('Invalid response from Thor node')
  }

  if (result[0].reverted) {
    throw new Error(`Oracle call reverted: ${result[0].revertReason || 'unknown reason'}`)
  }

  if (!result[0].data) {
    throw new Error('No data returned from oracle')
  }

  // Decode the response - first 32 bytes is the value (uint128), next 32 bytes is updatedAt
  const hexData = result[0].data.slice(2) // Remove 0x prefix
  const valueHex = hexData.slice(0, 64) // First 32 bytes (64 hex chars)
  const value = BigInt('0x' + valueHex)

  // Oracle returns price scaled by 1e12
  const price = Number(value) / 1e12

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('Invalid price value from oracle')
  }

  return price
}

/**
 * Get token price in USD from the oracle
 */
async function getTokenUsdPrice(token: SupportedToken): Promise<number> {
  const cacheKey = `${token}-usd`
  const now = Date.now()

  // Check cache
  const cached = priceCache.get(cacheKey)
  if (cached && (now - cached.timestamp) < PRICE_CACHE_TTL) {
    logger.debug(`Oracle price cache hit for ${token}`)
    return cached.price
  }

  const feedId = PRICE_FEED_IDS[token]
  if (!feedId) {
    throw new Error(`Unsupported token: ${token}`)
  }

  logger.debug(`Fetching ${token} price from oracle...`)
  const price = await callOracle(feedId)

  // Cache the result
  priceCache.set(cacheKey, { price, timestamp: now })

  return price
}

/**
 * Get fiat conversion rate (fiat per 1 USD)
 */
async function getFiatConversionRate(fiat: 'eur' | 'gbp'): Promise<number> {
  const cacheKey = `usd-${fiat}`
  const now = Date.now()

  // Check cache
  const cached = priceCache.get(cacheKey)
  if (cached && (now - cached.timestamp) < PRICE_CACHE_TTL) {
    logger.debug(`Oracle fiat cache hit for ${fiat}`)
    return cached.price
  }

  const feedId = FIAT_FEED_IDS[fiat]
  if (!feedId) {
    throw new Error(`Unsupported fiat for oracle conversion: ${fiat}`)
  }

  logger.debug(`Fetching ${fiat}/USD rate from oracle...`)
  const rate = await callOracle(feedId)

  // Cache the result
  priceCache.set(cacheKey, { price: rate, timestamp: now })

  return rate
}

/**
 * Get token price in specified fiat currency
 */
export async function getTokenFiatPriceFromOracle(params: {
  token: SupportedToken
  fiat: SupportedFiat
}): Promise<number> {
  const { token, fiat } = params

  // Get USD price first
  const usdPrice = await getTokenUsdPrice(token)

  // If USD requested, return directly
  if (fiat === 'usd') {
    return usdPrice
  }

  // For EUR and GBP, use oracle conversion rates
  if (fiat === 'eur' || fiat === 'gbp') {
    const conversionRate = await getFiatConversionRate(fiat)
    // The oracle gives us fiat-usd rate, so we multiply
    return usdPrice * conversionRate
  }

  // For JPY and CHF, oracle doesn't have feeds - throw error
  throw new Error(`Fiat currency ${fiat.toUpperCase()} not available from oracle. Only USD, EUR, GBP are supported.`)
}

/**
 * Clear the price cache (useful for testing)
 */
export function clearOraclePriceCache(): void {
  priceCache.clear()
}

/**
 * Check if oracle is available on current network
 */
export function isOracleAvailable(): boolean {
  return getOracleAddress() !== null
}

