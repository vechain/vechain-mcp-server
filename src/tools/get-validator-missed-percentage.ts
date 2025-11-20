import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGetSingle } from '@/services/veworld-indexer'
import {
  IndexerGetValidatorMissedPercentageParamsSchema,
  IndexerValidatorMissedPercentageSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
  validatorEndpointsAvailable,
  validatorEndpointsUnavailableMessage,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const IndexerGetValidatorMissedPercentageOutputSchema =
  createIndexerStructuredOutputSchema(IndexerValidatorMissedPercentageSchema)
export const IndexerGetValidatorMissedPercentageResponseSchema =
  createIndexerToolResponseSchema(IndexerValidatorMissedPercentageSchema)
export type IndexerGetValidatorMissedPercentageResponse = z.infer<
  typeof IndexerGetValidatorMissedPercentageResponseSchema
>

export const getValidatorMissedPercentage: MCPTool = {
  name: 'getValidatorMissedPercentage',
  title: 'Indexer: Validator missed blocks percentage (v1)',
  description:
    'Calculate percentage of missed blocks for a validator in a block range via /api/v1/validators/blocks/missed/{validator}. Provide startBlock (inclusive) and endBlock (inclusive). Returns a percentage (0..100).',
  inputSchema: IndexerGetValidatorMissedPercentageParamsSchema.shape,
  outputSchema: IndexerGetValidatorMissedPercentageOutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (
    params: z.infer<typeof IndexerGetValidatorMissedPercentageParamsSchema>,
  ): Promise<IndexerGetValidatorMissedPercentageResponse> => {
    try {
      if (!(await validatorEndpointsAvailable())) {
        return indexerErrorResponse(validatorEndpointsUnavailableMessage())
      }
      const parsed = IndexerGetValidatorMissedPercentageParamsSchema.parse(params)
      const endpoint = `/api/v1/validators/blocks/missed/${parsed.validator}`
      const data = await veworldIndexerGetSingle<number>({
        endPoint: endpoint,
        params: {
          startBlock: parsed.startBlock,
          endBlock: parsed.endBlock,
        },
      })
      if (data === null || data === undefined) {
        return indexerErrorResponse('Failed to fetch missed blocks percentage from VeWorld Indexer')
      }
      const percentage = IndexerValidatorMissedPercentageSchema.parse(data)
      return {
        content: [{ type: 'text', text: JSON.stringify(percentage) }],
        structuredContent: {
          ok: true,
          network: getThorNetworkType(),
          data: percentage,
        },
      }
    } catch (error) {
      logger.warn(`Error fetching missed blocks percentage: ${String(error)}`)
      return indexerErrorResponse(`Error fetching missed blocks percentage: ${String(error)}`)
    }
  },
}


