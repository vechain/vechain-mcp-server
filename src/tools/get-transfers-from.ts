import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import { IndexerGetTransfersFromParamsSchema, IndexerTransferSchema } from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const IndexerGetTransfersFromOutputSchema = createIndexerStructuredOutputSchema(z.array(IndexerTransferSchema))
export const IndexerGetTransfersFromResponseSchema = createIndexerToolResponseSchema(z.array(IndexerTransferSchema))
export type IndexerGetTransfersFromResponse = z.infer<typeof IndexerGetTransfersFromResponseSchema>

export const getTransfersFrom: MCPTool = {
  name: 'getTransfersFrom',
  title: 'Indexer: Transfers from address (outgoing) (v1)',
  description:
    "Query VeWorld Indexer /api/v1/transfers/from for outgoing transfers. Required 'address' (sender). Optional 'tokenAddress' to scope to a specific VIP‑180/721 contract and pagination. Use for 'outgoing transfers' or 'payments from wallet'.",
  inputSchema: IndexerGetTransfersFromParamsSchema.shape,
  outputSchema: IndexerGetTransfersFromOutputSchema.shape,
  annotations: {
    idempotentHint: false,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (
    params: z.infer<typeof IndexerGetTransfersFromParamsSchema>,
  ): Promise<IndexerGetTransfersFromResponse> => {
    try {
      IndexerGetTransfersFromParamsSchema.parse(params)
      const response = await veworldIndexerGet<typeof IndexerTransferSchema, typeof IndexerGetTransfersFromParamsSchema>({
        endPoint: '/api/v1/transfers/from',
        params,
      })

      if (!response?.data) {
        return indexerErrorResponse('Failed to fetch transfers (from) from VeWorld Indexer')
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
      logger.warn(`Error getting Transfers from ${params.address} from VeWorld Indexer: ${String(error)}`)
      return indexerErrorResponse(
        `Error getting Transfers from ${params.address} from VeWorld Indexer: ${String(error)}`,
      )
    }
  },
}


