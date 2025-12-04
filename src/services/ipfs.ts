import { z } from 'zod'
import { logger } from '@/utils/logger'

const IPFS_GATEWAY_URL = 'https://api.gateway-proxy.vechain.org/ipfs'

/**
 * Schema for IPFS CID (Content Identifier)
 * Supports both CIDv0 (Qm...) and CIDv1 (baf...)
 */
export const IPFSCIDSchema = z
  .string()
  .min(1)
  .describe('IPFS Content Identifier (CID)')

/**
 * Fetches content from IPFS using the VeChain gateway proxy
 * @param cid - The IPFS Content Identifier (CID)
 * @returns The content as parsed JSON or text, null if fetch fails
 */
export async function fetchFromIPFS(cid: string): Promise<unknown | null> {
  try {
    logger.debug(`Fetching IPFS content for CID: ${cid}`)

    const url = `${IPFS_GATEWAY_URL}/${cid}`
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json, text/plain, */*' },
    })

    if (!response.ok) {
      logger.warn(
        `Failed to fetch IPFS content for CID ${cid}: ${response.status} ${response.statusText}`,
      )
      return null
    }

    // Try to parse as JSON first
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      const json = await response.json()
      logger.debug(`Successfully fetched JSON content from IPFS for CID: ${cid}`)
      return json
    }

    // Fall back to text
    const text = await response.text()
    logger.debug(`Successfully fetched text content from IPFS for CID: ${cid}`)
    
    // Try to parse as JSON if it looks like JSON
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        return JSON.parse(text)
      } catch {
        // Not valid JSON, return as text
        return text
      }
    }
    
    return text
  } catch (error) {
    logger.warn(`Error fetching IPFS content for CID ${cid}:`, String(error))
    return null
  }
}

/**
 * Fetches multiple IPFS contents in parallel
 * @param cids - Array of IPFS Content Identifiers
 * @returns Array of fetched contents in the same order as input CIDs
 */
export async function fetchMultipleFromIPFS(cids: string[]): Promise<Array<unknown | null>> {
  const promises = cids.map((cid) => fetchFromIPFS(cid))
  return Promise.all(promises)
}

