import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import {
  IndexerGetContractTransactionsParamsSchema,
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

export const IndexerGetContractTransactionsOutputSchema =
  createIndexerStructuredOutputSchema(IndexerTransactionListResponseSchema)
export const IndexerGetContractTransactionsResponseSchema =
  createIndexerToolResponseSchema(IndexerTransactionListResponseSchema)
export type IndexerGetContractTransactionsResponse = z.infer<
  typeof IndexerGetContractTransactionsResponseSchema
>

export const getContractTransactions: MCPTool = {
  name: 'getContractTransactions',
  title: 'Indexer: Transactions for a contract (v1)',
  description:
    'Query VeWorld Indexer /api/v1/transactions/contract for transactions interacting with a contract address. Supports pagination.',
  inputSchema: IndexerGetContractTransactionsParamsSchema.shape,
  outputSchema: IndexerGetContractTransactionsOutputSchema.shape,
  annotations: {
    idempotentHint: false,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (
    params: z.infer<typeof IndexerGetContractTransactionsParamsSchema>,
  ): Promise<IndexerGetContractTransactionsResponse> => {
    try {
      const parsed = IndexerGetContractTransactionsParamsSchema.parse(params)
      const response = await veworldIndexerGet<typeof IndexerTransactionSchema>({
        endPoint: '/api/v1/transactions/contract',
        params: parsed as any,
      })

      if (!response?.data) {
        return indexerErrorResponse('Failed to fetch contract transactions from VeWorld Indexer')
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
      logger.warn(`Error getting contract transactions from VeWorld Indexer: ${String(error)}`)
      return indexerErrorResponse(
        `Error getting contract transactions from VeWorld Indexer: ${String(error)}`,
      )
    }
  },
}


