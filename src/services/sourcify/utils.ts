import { getThorNetworkType, ThorNetworkType } from '@/services/thor'
import { logger } from '@/utils/logger'
import {
  SignatureLookupResponseSchema,
  SignatureSearchResponseSchema,
  SourcifyContractsListResponseSchema,
  SourcifyVerifiedContractSchema,
  type SignatureLookupResponse,
  type SignatureSearchEntry,
  type SignatureSearchResponse,
  type SignatureType,
  type SourcifyContractsListResponse,
  type SourcifyVerifiedContract,
} from './schemas'

const SOURCIFY_API_URL = 'https://sourcify.dev/server'
const SOURCIFY_SIGNATURE_DB_URL = 'https://api.4byte.sourcify.dev/signature-database/v1'

/**
 * VeChain chain IDs for Sourcify
 */
export const VECHAIN_CHAIN_IDS = {
  [ThorNetworkType.MAINNET]: '100009',
  [ThorNetworkType.TESTNET]: '100010',
} as const

/**
 * Get the Sourcify chain ID for the current VeChain network
 * Returns null if the network is not supported (e.g., Solo)
 */
export function getSourcifyChainId(): string | null {
  const network = getThorNetworkType()
  return VECHAIN_CHAIN_IDS[network as keyof typeof VECHAIN_CHAIN_IDS] ?? null
}

/**
 * Fetch a verified contract from Sourcify by chain ID and address
 * @param chainId - The chain ID
 * @param address - The contract address (case-insensitive)
 * @param fields - Fields to include (default: 'all' for full details including ABI and name)
 * @returns The verified contract data or null if not found
 */
export async function fetchSourcifyContract(
  chainId: string,
  address: string,
  fields: string = 'all',
): Promise<SourcifyVerifiedContract | null> {
  const url = `${SOURCIFY_API_URL}/v2/contract/${chainId}/${address}?fields=${fields}`
  logger.debug(`Fetching Sourcify contract: ${url}`)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    logger.debug(`Sourcify response status: ${response.status}`)

    if (response.status === 404) {
      logger.debug(`Contract not found on Sourcify: chainId=${chainId}, address=${address}`)
      return null
    }

    if (!response.ok) {
      const errorText = await response.text()
      logger.warn(`Failed to fetch Sourcify contract: ${response.status} ${response.statusText} - ${errorText}`)
      return null
    }

    const data = await response.json()
    logger.debug(`Sourcify response keys: ${Object.keys(data).join(', ')}`)

    // Use safeParse to get detailed error info
    const parseResult = SourcifyVerifiedContractSchema.safeParse(data)
    if (!parseResult.success) {
      logger.warn(`Schema validation failed for Sourcify contract: ${JSON.stringify(parseResult.error.issues)}`)
      // Return raw data cast to type if schema fails - API may have changed
      return data as SourcifyVerifiedContract
    }

    logger.debug(`Successfully fetched Sourcify contract for address: ${address}`)
    return parseResult.data
  } catch (error) {
    logger.warn(`Error fetching Sourcify contract from ${url}: ${String(error)}`)
    return null
  }
}

/**
 * Fetch a list of verified contracts from Sourcify by chain ID
 * Uses cursor-based pagination with afterMatchId
 * @param chainId - The chain ID
 * @param limit - Results per page (default: 200, max: 200)
 * @param afterMatchId - Cursor for pagination (last matchId from previous response)
 * @param sort - Sort order: 'desc' (newest first, default) or 'asc' (oldest first)
 * @returns The list of verified contracts
 */
export async function fetchSourcifyContracts(
  chainId: string,
  limit: number = 200,
  afterMatchId?: string,
  sort: 'asc' | 'desc' = 'desc',
): Promise<SourcifyContractsListResponse | null> {
  try {
    logger.debug(`Fetching Sourcify contracts for chainId: ${chainId}, limit: ${limit}, afterMatchId: ${afterMatchId}`)

    const params = new URLSearchParams({
      limit: String(limit),
      sort,
    })
    if (afterMatchId) {
      params.append('afterMatchId', afterMatchId)
    }

    const url = `${SOURCIFY_API_URL}/v2/contracts/${chainId}?${params.toString()}`
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      logger.warn(`Failed to fetch Sourcify contracts: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()
    logger.debug(`Successfully fetched Sourcify contracts list for chainId: ${chainId}`)
    return SourcifyContractsListResponseSchema.parse(data)
  } catch (error) {
    logger.warn(`Error fetching Sourcify contracts: ${String(error)}`)
    return null
  }
}

// ============================================
// Signature Database Functions
// ============================================

/**
 * Lookup signatures by their hash (4-byte function selector or 32-byte event topic)
 * @param hashes - Array of signature hashes to look up
 * @param type - Type of signatures to look up: 'function', 'event', or both if not specified
 * @returns The lookup response with matching signatures
 */
export async function lookupSignatures(
  hashes: string[],
  type?: SignatureType,
): Promise<SignatureLookupResponse | null> {
  try {
    logger.debug(`Looking up signatures: ${hashes.join(', ')}${type ? ` (type: ${type})` : ''}`)

    const params = new URLSearchParams()

    // Add hashes based on type
    if (type === 'function' || !type) {
      for (const hash of hashes) {
        params.append('function', hash)
      }
    }
    if (type === 'event' || !type) {
      for (const hash of hashes) {
        params.append('event', hash)
      }
    }

    // Add filter=true for cleaner results
    params.append('filter', 'true')

    const url = `${SOURCIFY_SIGNATURE_DB_URL}/lookup?${params.toString()}`
    logger.debug(`Looking up signatures at: ${url}`)

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.warn(`Failed to lookup signatures: ${response.status} ${response.statusText} - ${errorText}`)
      return null
    }

    const data = await response.json()
    logger.debug(`Lookup response: ${JSON.stringify(data).slice(0, 200)}`)

    const parsed = SignatureLookupResponseSchema.safeParse(data)
    if (!parsed.success) {
      logger.warn(`Schema validation failed for signature lookup: ${JSON.stringify(parsed.error.issues)}`)
      // Return raw data if schema fails
      return data as SignatureLookupResponse
    }

    logger.debug(`Successfully looked up ${hashes.length} signatures`)
    return parsed.data
  } catch (error) {
    logger.warn(`Error looking up signatures: ${String(error)}`)
    return null
  }
}

/**
 * Search for signatures by name (partial match)
 * @param query - The search query (function/event name)
 * @param type - Type of signatures to search: 'function', 'event', or both if not specified
 * @returns The search response with ok status and result array
 */
export async function searchSignatures(
  query: string,
  type?: SignatureType,
): Promise<SignatureSearchResponse | null> {
  try {
    logger.debug(`Searching signatures for: "${query}"${type ? ` (type: ${type})` : ''}`)

    const params = new URLSearchParams({ q: query })
    if (type) {
      params.append('type', type)
    }

    const url = `${SOURCIFY_SIGNATURE_DB_URL}/search?${params.toString()}`
    logger.debug(`Searching signatures at: ${url}`)

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.warn(`Failed to search signatures: ${response.status} ${response.statusText} - ${errorText}`)
      return null
    }

    const data = await response.json()
    logger.debug(`Search response: ${JSON.stringify(data).slice(0, 200)}`)

    const parsed = SignatureSearchResponseSchema.safeParse(data)
    if (!parsed.success) {
      logger.warn(`Schema validation failed for signature search: ${JSON.stringify(parsed.error.issues)}`)
      // Return raw data if schema fails
      return data as SignatureSearchResponse
    }

    logger.debug(`Found ${parsed.data.result?.length ?? 0} signatures matching "${query}"`)
    return parsed.data
  } catch (error) {
    logger.warn(`Error searching signatures: ${String(error)}`)
    return null
  }
}
