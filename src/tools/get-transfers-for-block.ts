import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import { IndexerGetTransfersForBlockParamsSchema, IndexerTransferSchema } from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

const OutputSchema = createIndexerStructuredOutputSchema(z.array(IndexerTransferSchema))
const ResponseSchema = createIndexerToolResponseSchema(z.array(IndexerTransferSchema))
type Response = z.infer<typeof ResponseSchema>

export const getTransfersForBlock: MCPTool = {
  name: 'getTransfersForBlock',
  title: 'Indexer: Transfers for block (v1)',
  description:
    "Query VeWorld Indexer /api/v1/transfers/forBlock for all transfers in a block. Required 'blockNumber'. Optional 'tokenAddress' to scope to a specific VIP‑180/721 contract and pagination. Use for 'transfers in block' or 'block activity'.",
  inputSchema: IndexerGetTransfersForBlockParamsSchema.shape,
  outputSchema: OutputSchema.shape,
  annotations: {
    idempotentHint: false,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (params: z.infer<typeof IndexerGetTransfersForBlockParamsSchema>): Promise<Response> => {
    try {
      IndexerGetTransfersForBlockParamsSchema.parse(params)
      const response = await veworldIndexerGet<typeof IndexerTransferSchema, typeof IndexerGetTransfersForBlockParamsSchema>({
        endPoint: '/api/v1/transfers/forBlock',
        params,
      })

      if (!response?.data) {
        return indexerErrorResponse('Failed to fetch transfers for block from VeWorld Indexer')
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
      logger.warn(
        `Error getting Transfers for block ${params.blockNumber.toString()} from VeWorld Indexer: ${String(error)}`,
      )
      return indexerErrorResponse(
        `Error getting Transfers for block ${params.blockNumber.toString()} from VeWorld Indexer: ${String(error)}`,
      )
    }
  },
}


