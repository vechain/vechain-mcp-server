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
const paginationSchema = z.object({
  hasCount: z.boolean(),
  countLimit: z.number(),
  totalPages: z.number().nullable().optional(),
  totalElements: z.number().nullable().optional(),
  hasNext: z.boolean(),
})

const indexerResponseSchema = <T extends z.ZodSchema>(schema: T) =>
  z.object({
    data: z.array(schema),
    pagination: paginationSchema,
  })

type IndexerResponse<T extends z.ZodSchema> = z.infer<ReturnType<typeof indexerResponseSchema<T>>>
