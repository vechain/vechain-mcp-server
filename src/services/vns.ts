import { vnsUtils } from '@vechain/sdk-network'
import { z } from 'zod'
import { getThorClient, ThorAddressSchema } from '@/services/thor'
import { logger } from '@/utils/logger'

/**
 * Schema for a VNS name ending in .vet (case-insensitive)
 */
export const VnsNameSchema = z
  .string()
  .regex(/\.vet$/i, 'VNS name must end with .vet')
  .describe('VNS name ending in .vet')

/**
 * Cache TTL in milliseconds (5 minutes)
 */
const VNS_CACHE_TTL = 5 * 60 * 1000

/**
 * Cache entry with timestamp for forward resolution (name -> address)
 */
interface ForwardCacheEntry {
  address: `0x${string}`
  timestamp: number
}

/**
 * Cache entry with timestamp for reverse resolution (address -> name)
 */
interface ReverseCacheEntry {
  name: string | null
  timestamp: number
}

const vnsCacheWithTTL = new Map<string, ForwardCacheEntry>()
const reverseVnsCache = new Map<string, ReverseCacheEntry>()

/**
 * Resolve a VNS name (ending in .vet) to a Thor address, or return the input
 * unchanged (validated) if it is already a Thor address.
 *
 * - If the value ends with `.vet` (case-insensitive), it is treated as a VNS name.
 * - If the name cannot be resolved, an Error is thrown.
 * - Otherwise, the original value is validated as a Thor address and returned.
 * - VNS resolutions are cached for 5 minutes to avoid duplicate lookups.
 */
export async function resolveVnsOrAddress(
  value: z.infer<typeof ThorAddressSchema> | z.infer<typeof VnsNameSchema>,
): Promise<`0x${string}`> {
  const normalized = value.trim()

  if (!normalized.toLowerCase().endsWith('.vet')) {
    // Already a Thor address: validate and return typed
    return ThorAddressSchema.parse(normalized)
  }

  const cacheKey = normalized.toLowerCase()
  const now = Date.now()

  // Check cache
  const cached = vnsCacheWithTTL.get(cacheKey)
  if (cached && (now - cached.timestamp) < VNS_CACHE_TTL) {
    logger.debug(`VNS cache hit for ${normalized} -> ${cached.address}`)
    return cached.address
  }

  // Resolve from network
  logger.debug(`VNS cache miss for ${normalized}, resolving...`)
  const thorClient = getThorClient()
  const resolved = await vnsUtils.resolveName(thorClient, normalized)

  if (!resolved) {
    throw new Error(`Unknown VNS name: ${normalized}`)
  }

  // Ensure the resolved value is a valid Thor address
  const validatedAddress = ThorAddressSchema.parse(resolved)

  // Cache the result (both forward and reverse)
  vnsCacheWithTTL.set(cacheKey, {
    address: validatedAddress,
    timestamp: now,
  })
  
  // Also cache reverse lookup
  const reverseCacheKey = validatedAddress.toLowerCase()
  reverseVnsCache.set(reverseCacheKey, {
    name: normalized,
    timestamp: now,
  })

  return validatedAddress
}

/**
 * Reverse lookup: resolve an address to its VNS name if it has one.
 * Returns null if no VNS name is found.
 * Results are cached for 5 minutes.
 */
export async function lookupVnsName(address: `0x${string}`): Promise<string | null> {
  const cacheKey = address.toLowerCase()
  const now = Date.now()

  // Check cache
  const cached = reverseVnsCache.get(cacheKey)
  if (cached && (now - cached.timestamp) < VNS_CACHE_TTL) {
    logger.debug(`Reverse VNS cache hit for ${address} -> ${cached.name || 'none'}`)
    return cached.name
  }

  // Lookup from network
  logger.debug(`Reverse VNS cache miss for ${address}, looking up...`)
  try {
    const thorClient = getThorClient()
    const name = await vnsUtils.lookupAddress(thorClient, address)

    // Cache the result (even if null)
    reverseVnsCache.set(cacheKey, {
      name: name || null,
      timestamp: now,
    })

    return name || null
  } catch (error) {
    logger.warn(`Error looking up VNS name for ${address}: ${String(error)}`)
    // Cache negative result to avoid repeated failed lookups
    reverseVnsCache.set(cacheKey, {
      name: null,
      timestamp: now,
    })
    return null
  }
}

/**
 * Enrich an address with its VNS name if available.
 * Returns an object with both address and vnsName (or null).
 */
export async function enrichAddressWithVns(address: `0x${string}`): Promise<{
  address: `0x${string}`
  vnsName: string | null
}> {
  const vnsName = await lookupVnsName(address)
  return { address, vnsName }
}

/**
 * Batch enrich multiple addresses with VNS names.
 * More efficient than calling enrichAddressWithVns multiple times.
 */
export async function enrichAddressesWithVns(
  addresses: `0x${string}`[]
): Promise<Array<{ address: `0x${string}`; vnsName: string | null }>> {
  return Promise.all(addresses.map(addr => enrichAddressWithVns(addr)))
}
