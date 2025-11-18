import { z } from 'zod'
import { getThorNetworkType, ThorNetworkType } from '@/services/thor/config'
import { logger } from '@/utils/logger'

export const veworldIndexerGet = async <
  T extends z.ZodSchema,
  P extends z.ZodSchema = z.ZodObject<Record<string, z.ZodType>>,
>({
  endPoint,
  params = {},
}: {
  endPoint: string
  params?: z.infer<P>
}): Promise<IndexerResponse<T> | null> => {
  try {
    const url = new URL(endPoint, getIndexerUrl())

    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && typeof value !== 'object') {
        url.searchParams.set(key, value as string)
      }
    })

    logger.debug(`GET ${url.toString()}`)

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      logger.warn(`Failed to fetch VeWorld Indexer data: ${response.status} ${response.statusText}`)

      return null
    }

    const data = (await response.json()) as IndexerResponse<T>
    logger.debug(`Fetch success: ${JSON.stringify(data, null, 2)}`)

    return data
  } catch (error) {
    logger.warn(`Error fetching VeWorld Indexer data:`, String(error))
    return null
  }
}

/**
 * Convenience helper for endpoints that return a single object (not wrapped in { data, pagination }).
 */
export const veworldIndexerGetSingle = async <T>({
  endPoint,
  params = {},
}: {
  endPoint: string
  params?: Record<string, string | number | boolean | null | undefined>
}): Promise<T | null> => {
  try {
    const url = new URL(endPoint, getIndexerUrl())
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && typeof value !== 'object') {
        url.searchParams.set(key, String(value))
      }
    })
    logger.debug(`GET ${url.toString()}`)
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) {
      logger.warn(`Failed to fetch VeWorld Indexer data: ${response.status} ${response.statusText}`)
      return null
    }
    const data = (await response.json()) as T
    logger.debug(`Fetch success: ${JSON.stringify(data, null, 2)}`)
    return data
  } catch (error) {
    logger.warn(`Error fetching VeWorld Indexer data:`, String(error))
    return null
  }
}

const veworldIndexerUrl = {
  [ThorNetworkType.MAINNET]: 'https://indexer.mainnet.vechain.org',
  [ThorNetworkType.TESTNET]: 'https://indexer.testnet.vechain.org',
  [ThorNetworkType.SOLO]: null,
}

const getIndexerUrl = () => {
  const networkType = getThorNetworkType()

  if (networkType === ThorNetworkType.SOLO) {
    throw new Error("VeWorld Indexer can't be used on solo network")
  }

  return veworldIndexerUrl[networkType]
}

/**
 * Schemas for VeWorld Indexer
 */

/**
 * RESPONSE
 */
export const paginationSchema = z
  .object({
    // Cursor-based fields (used by some endpoints like /api/v1/nfts)
    hasNext: z.boolean().describe('Whether there is another page of results'),
    cursor: z.string().optional().describe('Opaque cursor token for fetching the next page'),
    // Count-based fields (used by other list endpoints)
    hasCount: z.boolean().optional().describe('Whether the response includes total count metadata'),
    countLimit: z.number().optional().describe('The maximum number of items counted if counting is limited'),
    totalPages: z.number().nullable().optional().describe('Total number of pages when counting is enabled'),
    totalElements: z.number().nullable().optional().describe('Total number of elements when counting is enabled'),
  })
  .describe('Pagination metadata returned by the Indexer (supports cursor- and count-based styles)')

export const indexerResponseSchema = <T extends z.ZodSchema>(schema: T) =>
  z
    .object({
      data: z.array(schema),
      pagination: paginationSchema,
    })
    .describe('Generic Indexer list response: data array with pagination')

type IndexerResponse<T extends z.ZodSchema> = z.infer<ReturnType<typeof indexerResponseSchema<T>>>
