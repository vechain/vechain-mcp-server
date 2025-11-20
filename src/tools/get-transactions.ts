import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import {
  IndexerGetTransactionsParamsBaseSchema,
  IndexerGetTransactionsParamsSchema,
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

export const IndexerGetTransactionsOutputSchema =
  createIndexerStructuredOutputSchema(IndexerTransactionListResponseSchema)
export const IndexerGetTransactionsResponseSchema =
  createIndexerToolResponseSchema(IndexerTransactionListResponseSchema)
export type IndexerGetTransactionsResponse = z.infer<typeof IndexerGetTransactionsResponseSchema>

export const getTransactions: MCPTool = {
  name: 'getTransactions',
  title: 'Indexer: Transactions by origin or delegator (v1)',
  description:
    "Query VeWorld Indexer /api/v1/transactions. Provide either 'origin' or 'delegator' address with optional time filters and pagination. Returns decoded events.",
  inputSchema: IndexerGetTransactionsParamsBaseSchema.shape,
  outputSchema: IndexerGetTransactionsOutputSchema.shape,
  annotations: {
    idempotentHint: false,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (
    params: z.infer<typeof IndexerGetTransactionsParamsBaseSchema>,
  ): Promise<IndexerGetTransactionsResponse> => {
    try {
      const parsed = IndexerGetTransactionsParamsSchema.parse(params)
      const response = await veworldIndexerGet<typeof IndexerTransactionSchema>({
        endPoint: '/api/v1/transactions',
        params: {
          origin: parsed.origin,
          delegator: parsed.delegator,
          after: parsed.after,
          before: parsed.before,
          expanded: parsed.expanded,
          page: parsed.page,
          size: parsed.size,
          direction: parsed.direction,
          cursor: parsed.cursor,
        } as any,
      })

      if (!response?.data) {
        return indexerErrorResponse('Failed to fetch transactions from VeWorld Indexer')
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
      logger.warn(`Error getting transactions from VeWorld Indexer: ${String(error)}`)
      return indexerErrorResponse(`Error getting transactions from VeWorld Indexer: ${String(error)}`)
    }
  },
}


