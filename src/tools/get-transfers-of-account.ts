import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import {
  IndexerGetTransfersParamsBaseSchema,
  IndexerGetTransfersParamsSchema,
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
export const IndexerGetTransfersOfResponseSchema = createIndexerToolResponseSchema(z.array(IndexerTransferSchema))
export type IndexerGetTransfersOfResponse = z.infer<typeof IndexerGetTransfersOfResponseSchema>

/**
 * Tool for getting transfer events of a given account
 */
export const getTransfersOfAccount: MCPTool = {
  name: 'getTransfersOfAccount',
  title: 'Indexer: List transfers for wallet or token (v1)',
  description:
    "Query transfer events using VeWorld Indexer /api/v1/transfers. Provide either 'address' (wallet) or 'tokenAddress' (ERC-20) plus optional pagination. Use for 'wallet transfers', 'token movements', or 'activity for contract/wallet'.",
  inputSchema: IndexerGetTransfersParamsBaseSchema.shape,
  outputSchema: IndexerGetTransfersOfOutputSchema.shape,
  annotations: {
    idempotentHint: false,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (
    params: z.infer<typeof IndexerGetTransfersParamsBaseSchema>,
  ): Promise<IndexerGetTransfersOfResponse> => {
    try {
      IndexerGetTransfersParamsSchema.parse(params)
      const response = await veworldIndexerGet<
        typeof IndexerTransferSchema,
        typeof IndexerGetTransfersParamsBaseSchema
      >({
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
      if (error instanceof z.ZodError) {
        const messages = error.issues?.map(issue => issue.message).filter(Boolean)
        const validationMessage = messages?.length
          ? messages.join('; ')
          : 'Invalid parameters for getTransfersOfAccount.'

        logger.warn(`Validation error in getTransfersOfAccount: ${validationMessage}`)
        return indexerErrorResponse(validationMessage)
      }

      const identifier = params.address ?? params.tokenAddress ?? 'address or tokenAddress'
      logger.warn(`Error getting Transfers of ${identifier} from VeWorld Indexer: ${String(error)}`)
      return indexerErrorResponse(`Error getting transfers of ${identifier} from VeWorld Indexer.`)
    }
  },
}
