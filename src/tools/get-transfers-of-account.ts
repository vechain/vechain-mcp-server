import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import {
  IndexerGetTransfersParamsBaseSchema,
  type IndexerGetTransfersParamsSchema,
  IndexerTransferSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

/**
 * Schemas for get transfers of account tool outputs
 */
const IndexerGetTransfersOfOutputSchema = createIndexerStructuredOutputSchema(z.array(IndexerTransferSchema))
const IndexerGetTransfersOfResponseSchema = createIndexerToolResponseSchema(z.array(IndexerTransferSchema))
type IndexerGetTransfersOfResponse = z.infer<typeof IndexerGetTransfersOfResponseSchema>

/**
 * Tool for getting transfer events of a given account
 */
export const getTransfersOfAccount: MCPTool = {
  name: 'getTransfersOfAccount',
  title: 'Get Transfer events of account',
  description: 'Get the Transfer events of a given address or token address',
  inputSchema: IndexerGetTransfersParamsBaseSchema.shape,
  outputSchema: IndexerGetTransfersOfOutputSchema.shape,
  annotations: {
    idempotentHint: false,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (params: z.infer<typeof IndexerGetTransfersParamsSchema>): Promise<IndexerGetTransfersOfResponse> => {
    try {
      const response = await veworldIndexerGet<typeof IndexerTransferSchema>({
        endPoint: '/api/v1/transfers',
        params,
      })

      if (!response?.data) {
        return indexerErrorResponse('Failed to fetch transfers from VeWorld Indexer')
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
        `Error getting Transfers of ${params.address ?? params.tokenAddress} from VeWorld Indexer: ${String(error)}`,
      )
      return indexerErrorResponse(
        `Error getting transfers of ${params.address ?? params.tokenAddress} from VeWorld Indexer: ${String(error)}`,
      )
    }
  },
}
