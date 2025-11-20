import { z } from 'zod'
import { getThorNetworkType, ThorTransactionIdSchema } from '@/services/thor'
import { veworldIndexerGetSingle } from '@/services/veworld-indexer'
import { IndexerTransactionSchema } from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const IndexerGetTransactionByIdOutputSchema =
  createIndexerStructuredOutputSchema(IndexerTransactionSchema)
export const IndexerGetTransactionByIdResponseSchema =
  createIndexerToolResponseSchema(IndexerTransactionSchema)
export type IndexerGetTransactionByIdResponse = z.infer<
  typeof IndexerGetTransactionByIdResponseSchema
>

export const getTransactionById: MCPTool = {
  name: 'getTransactionById',
  title: 'Indexer: Transaction by ID (v1)',
  description:
    'Get a single decoded transaction (with events) by ID from VeWorld Indexer. Endpoint: /api/v1/transactions/{txId}.',
  inputSchema: {
    txId: ThorTransactionIdSchema,
    expanded: z.boolean().optional(),
  },
  outputSchema: IndexerGetTransactionByIdOutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async ({
    txId,
    expanded,
  }: {
    txId: string
    expanded?: boolean
  }): Promise<IndexerGetTransactionByIdResponse> => {
    try {
      const transaction = await veworldIndexerGetSingle<z.infer<typeof IndexerTransactionSchema>>({
        endPoint: `/api/v1/transactions/${txId}`,
        params: { expanded },
      })

      if (!transaction) {
        return indexerErrorResponse('Failed to fetch transaction by ID from VeWorld Indexer')
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(transaction) }],
        structuredContent: {
          ok: true,
          network: getThorNetworkType(),
          data: transaction,
        },
      }
    } catch (error) {
      logger.warn(`Error getting transaction by ID from VeWorld Indexer: ${String(error)}`)
      return indexerErrorResponse(
        `Error getting transaction by ID from VeWorld Indexer: ${String(error)}`,
      )
    }
  },
}


