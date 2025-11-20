import { ThorNetworkType, getThorNetworkType } from '@/services/thor'
import { logger } from '@/utils/logger'
import { TokenRegistrySchema, type TokenRegistry } from './schemas'

export const TOKEN_REGISTRY_URL: Record<Exclude<ThorNetworkType, ThorNetworkType.SOLO>, string> = {
  [ThorNetworkType.MAINNET]: 'https://vechain.github.io/token-registry/main.json',
  [ThorNetworkType.TESTNET]: 'https://vechain.github.io/token-registry/test.json',
}

export function getTokenRegistryUrl(): string | null {
  const network = getThorNetworkType()
  if (network === ThorNetworkType.SOLO) return null
  return TOKEN_REGISTRY_URL[network]
}

export async function fetchTokenRegistry(): Promise<TokenRegistry | null> {
  const url = getTokenRegistryUrl()
  if (!url) {
    logger.warn('Token registry is not available on solo network')
    return null
  }
  try {
    const res = await fetch(url, { method: 'GET' })
    if (!res.ok) {
      logger.warn(`Failed to fetch token registry: ${res.status} ${res.statusText}`)
      return null
    }
    const json = (await res.json()) as unknown
    const parsed = TokenRegistrySchema.safeParse(json)
    if (!parsed.success) {
      logger.warn(`Token registry schema validation failed: ${parsed.error.message}`)
      return null
    }
    return parsed.data
  } catch (err) {
    logger.warn(`Error fetching token registry: ${String(err)}`)
    return null
  }
}


