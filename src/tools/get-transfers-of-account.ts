import { z } from 'zod'
import { getThorNetworkType, ThorAddressSchema } from '@/services/thor'
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
import { resolveVnsOrAddress, VnsNameSchema } from '@/services/vns'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

/**
 * Schemas for get transfers of account tool outputs
 */
const IndexerGetTransfersOfOutputSchema = createIndexerStructuredOutputSchema(z.array(IndexerTransferSchema))
export const IndexerGetTransfersOfResponseSchema = createIndexerToolResponseSchema(z.array(IndexerTransferSchema))
export type IndexerGetTransfersOfResponse = z.infer<typeof IndexerGetTransfersOfResponseSchema>

const IndexerGetTransfersVnsParamsBaseSchema = IndexerGetTransfersParamsBaseSchema.extend({
  address: z.union([ThorAddressSchema, VnsNameSchema]).optional(),
  tokenAddress: z.union([ThorAddressSchema, VnsNameSchema]).optional(),
})

const IndexerGetTransfersVnsParamsSchema = IndexerGetTransfersVnsParamsBaseSchema.refine(
  data => data.address || data.tokenAddress,
  {
    message: "At least one of 'address' or 'tokenAddress' must be provided.",
  },
)

/**
 * Tool for getting transfer events of a given account
 */
export const getTransfersOfAccount: MCPTool = {
  name: 'getTransfersOfAccount',
  title: 'Get Transfer events of account',
  description: 'Get the Transfer events of a given address or token address',
  inputSchema: IndexerGetTransfersVnsParamsBaseSchema.shape,
  outputSchema: IndexerGetTransfersOfOutputSchema.shape,
  annotations: {
    idempotentHint: false,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (
    params: z.infer<typeof IndexerGetTransfersVnsParamsSchema>,
  ): Promise<IndexerGetTransfersOfResponse> => {
    try {
      const parsed = IndexerGetTransfersVnsParamsSchema.parse(params)

      const { address, tokenAddress, ...rest } = parsed

      const resolvedAddress = address !== undefined ? await resolveVnsOrAddress(address) : undefined
      const resolvedTokenAddress = tokenAddress !== undefined ? await resolveVnsOrAddress(tokenAddress) : undefined

      const indexerParams = {
        ...rest,
        ...(resolvedAddress ? { address: resolvedAddress as `0x${string}` } : {}),
        ...(resolvedTokenAddress ? { tokenAddress: resolvedTokenAddress as `0x${string}` } : {}),
      }

      const response = await veworldIndexerGet<typeof IndexerTransferSchema, typeof IndexerGetTransfersParamsSchema>({
        endPoint: '/api/v1/transfers',
        params: indexerParams,
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
