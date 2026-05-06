import type { Abi as ViemAbi } from 'viem'
import { logger } from '@/utils/logger'
import type { Abi } from './schemas'

const B32_URL = 'https://b32.vecha.in'

/**
 * Fetches ABI from B32 service by event/function signature hash
 * B32 is a signature database that maps 4-byte function selectors and
 * 32-byte event topic hashes to their corresponding ABI definitions.
 *
 * @param signature - The signature hash (topic[0] for events, 4-byte selector for functions)
 * @returns The ABI if found, null otherwise
 */
export async function fetchAbiBySignature(signature: string): Promise<ViemAbi | null> {
  try {
    logger.debug(`Fetching ABI for signature: ${signature}`)

    const response = await fetch(`${B32_URL}/q/${signature}.json`)

    if (!response.ok) {
      if (response.status === 404) {
        logger.debug(`No ABI found for signature: ${signature}`)
        return null
      }
      logger.warn(`Failed to fetch ABI: ${response.status} ${response.statusText}`)
      return null
    }

    const abi = (await response.json()) as ViemAbi
    logger.debug(`Successfully fetched ABI for signature: ${signature}`)

    return abi
  } catch (error) {
    logger.warn(`Error fetching ABI for signature ${signature}:`, error)
    return null
  }
}

/**
 * Fetches ABI from B32 and returns parsed result with metadata
 * @param signature - The signature hash to look up
 * @returns Structured result with ABI and matching items summary
 */
export async function lookupSignature(signature: string): Promise<{
  found: boolean
  abi: Abi | null
  matchingItems: Array<{ type: string; name?: string; signature?: string }>
}> {
  const abi = await fetchAbiBySignature(signature)

  if (!abi) {
    return {
      found: false,
      abi: null,
      matchingItems: [],
    }
  }

  // Extract summary of matching items
  const matchingItems = abi.map((item) => {
    const result: { type: string; name?: string; signature?: string } = {
      type: item.type,
    }

    if ('name' in item && item.name) {
      result.name = item.name
    }

    // Build human-readable signature for events and functions
    if ((item.type === 'event' || item.type === 'function') && 'name' in item && 'inputs' in item) {
      const inputs = item.inputs || []
      const params = inputs.map((input) => input.type).join(', ')
      result.signature = `${item.name}(${params})`
    }

    return result
  })

  return {
    found: true,
    abi: abi as Abi,
    matchingItems,
  }
}

/**
 * Check if a signature hash is a valid format
 * @param signature - The signature hash to validate
 * @returns true if valid format
 */
export function isValidSignatureHash(signature: string): boolean {
  // Must be 0x-prefixed hex string
  if (!signature.startsWith('0x')) {
    return false
  }

  // Remove 0x prefix and check if valid hex
  const hex = signature.slice(2)
  if (!/^[a-fA-F0-9]+$/.test(hex)) {
    return false
  }

  // Function selectors are 4 bytes (8 hex chars), event topics are 32 bytes (64 hex chars)
  // But B32 accepts various lengths
  return hex.length >= 8
}

