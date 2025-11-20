import { z } from 'zod'
import { getThorNetworkType, ThorAddressSchema } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import { IndexedHistoryEventSchema, IndexerGetHistoryParamsSchema } from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import { resolveVnsOrAddress, VnsNameSchema } from '@/services/vns'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

/**
 * Schemas for get history of account tool outputs
 */

const IndexerGetHistoryQueryParamsSchema = IndexerGetHistoryParamsSchema.omit({ address: true })

const GetHistoryInputSchema = z
  .object({
    address: z.union([ThorAddressSchema, VnsNameSchema]).describe('The account address or VNS (.vet) name to retrieve'),
  })
  .extend(IndexerGetHistoryQueryParamsSchema.shape)

export const IndexerGetHistoryOfAccountDataSchema = z.array(IndexedHistoryEventSchema)

export const IndexerGetHistoryOfAccountOutputSchema = createIndexerStructuredOutputSchema(
  IndexerGetHistoryOfAccountDataSchema,
)
export const IndexerGetHistoryOfAccountResponseSchema = createIndexerToolResponseSchema(
  IndexerGetHistoryOfAccountDataSchema,
)
type IndexerGetHistoryOfAccountResponse = z.infer<typeof IndexerGetHistoryOfAccountResponseSchema>

/**
 * Tool for getting transaction history of a given account
 * NOTE: Address is a url parameter, other params are query params
 */
export const getHistoryOfAccount: MCPTool = {
  name: 'getHistoryOfAccount',
  title: 'Get History of account',
  description: 'Get the transaction history of a given address',
  inputSchema: GetHistoryInputSchema.shape,
  outputSchema: IndexerGetHistoryOfAccountOutputSchema.shape,
  annotations: {
    idempotentHint: false,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (params: z.infer<typeof GetHistoryInputSchema>): Promise<IndexerGetHistoryOfAccountResponse> => {
    try {
      const parsed = GetHistoryInputSchema.parse(params)
      const { address, ...queryParams } = parsed

      const resolvedAddress = await resolveVnsOrAddress(address)
      const resolvedAddressHex = resolvedAddress as `0x${string}`

      const validatedParams = IndexerGetHistoryParamsSchema.parse({
        address: resolvedAddressHex,
        ...queryParams,
      })

      const { address: validatedAddress, ...validatedQuery } = validatedParams

      const response = await veworldIndexerGet<
        typeof IndexedHistoryEventSchema,
        typeof IndexerGetHistoryQueryParamsSchema
      >({
        endPoint: `/api/v2/history/${validatedAddress}`,
        params: validatedQuery,
      })

      if (!response?.data) {
        return indexerErrorResponse('Failed to fetch history from VeWorld Indexer')
      }

      const history = response.data

      return {
        content: [{ type: 'text', text: JSON.stringify(history) }],
        structuredContent: {
          ok: true,
          network: getThorNetworkType(),
          data: history,
        },
      }
    } catch (error) {
      logger.warn(`Error getting History of ${params.address} from VeWorld Indexer: ${String(error)}`)
      return indexerErrorResponse(`Error getting History of ${params.address} from VeWorld Indexer: ${String(error)}`)
    }
  },
}
