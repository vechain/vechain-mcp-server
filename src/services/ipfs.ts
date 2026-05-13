import { z } from 'zod'
import { IPFS_GATEWAY_URL } from '@/constants/ipfs'
import { logger } from '@/utils/logger'

/**
 * Schema for IPFS CID (Content Identifier)
 * Supports both CIDv0 (Qm...) and CIDv1 (baf...)
 */
export const IPFSCIDSchema = z
  .string()
  .min(1)
  .describe('IPFS Content Identifier (CID)')

/**
 * Converts an IPFS URI (ipfs://, raw CID, or path) to an HTTP gateway URL.
 * Returns the input untouched if it is already an http(s) URL, or null when falsy.
 */
export function ipfsToHttp(uri: string | undefined | null): string | null {
  if (!uri) return null
  if (uri.startsWith('ipfs://')) {
    return `${IPFS_GATEWAY_URL}/${uri.slice('ipfs://'.length)}`
  }
  if (uri.startsWith('http://') || uri.startsWith('https://')) return uri
  return `${IPFS_GATEWAY_URL}/${uri.replace(/^\/+/, '')}`
}

/**
 * Resolves a contract `metadataURI` against an optional `baseURI` into an HTTP URL.
 *
 * - Absolute URIs (`ipfs://...`, `http(s)://...`) are passed through `ipfsToHttp`.
 * - Otherwise the value is treated as a path appended to `baseURI` (joined with a
 *   single `/` separator) and then routed through the IPFS gateway.
 *
 * Returns `null` when `metadataURI` is empty.
 */
export function resolveMetadataUrl(baseURI: string, metadataURI: string): string | null {
  if (!metadataURI) return null
  if (metadataURI.startsWith('ipfs://') || metadataURI.startsWith('http')) {
    return ipfsToHttp(metadataURI)
  }
  const base = baseURI ?? ''
  const sep = base.endsWith('/') || metadataURI.startsWith('/') ? '' : '/'
  return ipfsToHttp(`${base}${sep}${metadataURI}`)
}

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

