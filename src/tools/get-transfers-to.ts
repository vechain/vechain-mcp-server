import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import { IndexerGetTransfersToParamsSchema, IndexerTransferSchema } from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const IndexerGetTransfersToOutputSchema = createIndexerStructuredOutputSchema(z.array(IndexerTransferSchema))
export const IndexerGetTransfersToResponseSchema = createIndexerToolResponseSchema(z.array(IndexerTransferSchema))
export type IndexerGetTransfersToResponse = z.infer<typeof IndexerGetTransfersToResponseSchema>

export const getTransfersTo: MCPTool = {
  name: 'getTransfersTo',
  title: 'Indexer: Transfers to address (incoming) (v1)',
  description:
    "Query VeWorld Indexer /api/v1/transfers/to for incoming transfers. Required 'address' (recipient). Optional 'tokenAddress' to scope to a specific VIP‑180/721 contract and pagination. Use for 'incoming transfers' or 'receipts to wallet'.",
  inputSchema: IndexerGetTransfersToParamsSchema.shape,
  outputSchema: IndexerGetTransfersToOutputSchema.shape,
  annotations: {
    idempotentHint: false,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (
    params: z.infer<typeof IndexerGetTransfersToParamsSchema>,
  ): Promise<IndexerGetTransfersToResponse> => {
    try {
      IndexerGetTransfersToParamsSchema.parse(params)
      const response = await veworldIndexerGet<typeof IndexerTransferSchema, typeof IndexerGetTransfersToParamsSchema>({
        endPoint: '/api/v1/transfers/to',
        params,
      })

      if (!response?.data) {
        return indexerErrorResponse('Failed to fetch transfers (to) from VeWorld Indexer')
      }

      const transfers = response.data
      return {
        content: [{ type: 'text', text: JSON.stringify(transfers) }],
        structuredContent: {
          ok: true,
          network: getThorNetworkType(),
          data: transfers,
        },
      }
    } catch (error) {
      logger.warn(`Error getting Transfers to ${params.address} from VeWorld Indexer: ${String(error)}`)
      return indexerErrorResponse(`Error getting Transfers to ${params.address} from VeWorld Indexer: ${String(error)}`)
    }
  },
}


