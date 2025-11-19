import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import {
  IndexerGetValidatorsParamsSchema,
  IndexerValidatorSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const IndexerGetValidatorsOutputSchema = createIndexerStructuredOutputSchema(
  z.array(IndexerValidatorSchema),
)
export const IndexerGetValidatorsResponseSchema = createIndexerToolResponseSchema(
  z.array(IndexerValidatorSchema),
)
export type IndexerGetValidatorsResponse = z.infer<typeof IndexerGetValidatorsResponseSchema>

export const getValidators: MCPTool = {
  name: 'getValidators',
  title: 'Indexer: Validators (v1)',
  description:
    'Retrieve validator statistics via /api/v1/validators. Filters: validatorId, endorser, status. Sort with sortBy (validatorTvl, totalTvl, blockProbability, delegatorTvl, or nft:<Level> Yield for next cycle). Supports pagination (page, size) and direction.',
  inputSchema: IndexerGetValidatorsParamsSchema.shape,
  outputSchema: IndexerGetValidatorsOutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (
    params: z.infer<typeof IndexerGetValidatorsParamsSchema>,
  ): Promise<IndexerGetValidatorsResponse> => {
    try {
      const parsed = IndexerGetValidatorsParamsSchema.parse(params ?? {})
      const response = await veworldIndexerGet<typeof IndexerValidatorSchema, typeof IndexerGetValidatorsParamsSchema>(
        {
          endPoint: '/api/v1/validators',
          params: parsed as any,
        },
      )

      if (!response?.data) {
        return indexerErrorResponse('Failed to fetch validators from VeWorld Indexer')
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(response.data) }],
        structuredContent: {
          ok: true,
          network: getThorNetworkType(),
          data: response.data,
        },
      }
    } catch (error) {
      logger.warn(`Error fetching validators: ${String(error)}`)
      return indexerErrorResponse(`Error fetching validators: ${String(error)}`)
    }
  },
}


