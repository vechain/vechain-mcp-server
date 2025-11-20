import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import {
  IndexerGetDelegatedTransactionsParamsSchema,
  IndexerTransactionListResponseSchema,
  IndexerTransactionSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const IndexerGetDelegatedTransactionsOutputSchema =
  createIndexerStructuredOutputSchema(IndexerTransactionListResponseSchema)
export const IndexerGetDelegatedTransactionsResponseSchema =
  createIndexerToolResponseSchema(IndexerTransactionListResponseSchema)
export type IndexerGetDelegatedTransactionsResponse = z.infer<
  typeof IndexerGetDelegatedTransactionsResponseSchema
>

export const getDelegatedTransactions: MCPTool = {
  name: 'getDelegatedTransactions',
  title: 'Indexer: Delegated transactions by delegator (v1)',
  description:
    'Query VeWorld Indexer /api/v1/transactions/delegated for transactions delegated by a given delegator address. Supports pagination.',
  inputSchema: IndexerGetDelegatedTransactionsParamsSchema.shape,
  outputSchema: IndexerGetDelegatedTransactionsOutputSchema.shape,
  annotations: {
    idempotentHint: false,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (
    params: z.infer<typeof IndexerGetDelegatedTransactionsParamsSchema>,
  ): Promise<IndexerGetDelegatedTransactionsResponse> => {
    try {
      const parsed = IndexerGetDelegatedTransactionsParamsSchema.parse(params)
      const response = await veworldIndexerGet<typeof IndexerTransactionSchema>({
        endPoint: '/api/v1/transactions/delegated',
        params: parsed as any,
      })

      if (!response?.data) {
        return indexerErrorResponse('Failed to fetch delegated transactions from VeWorld Indexer')
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(response) }],
        structuredContent: {
          ok: true,
          network: getThorNetworkType(),
          data: response as unknown as z.infer<typeof IndexerTransactionListResponseSchema>,
        },
      }
    } catch (error) {
      logger.warn(`Error getting delegated transactions from VeWorld Indexer: ${String(error)}`)
      return indexerErrorResponse(
        `Error getting delegated transactions from VeWorld Indexer: ${String(error)}`,
      )
    }
  },
}


