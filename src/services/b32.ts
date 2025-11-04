import type { Abi } from 'viem'
import { logger } from '../utils/logger'

const B32_URL = 'https://b32.vecha.in'

/**
 * Fetches ABI from B32 service by event signature hash
 * @param signature - The event signature hash (topic[0])
 * @returns The ABI if found, null otherwise
 */
export const fetchAbiBySignature = async (signature: string): Promise<Abi | null> => {
  try {
    logger.debug(`Fetching ABI for signature: ${signature}`)

    const response = await fetch(`${B32_URL}/q/${signature}.json`)

    if (!response.ok) {
      logger.warn(`Failed to fetch ABI: ${response.status} ${response.statusText}`)
      return null
    }

    const abi = (await response.json()) as Abi
    logger.debug(`Successfully fetched ABI for signature: ${signature}`)

    return abi
  } catch (error) {
    logger.warn(`Error fetching ABI for signature ${signature}:`, error)
    return null
  }
}
