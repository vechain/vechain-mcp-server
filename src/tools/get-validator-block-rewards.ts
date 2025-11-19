import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import {
  IndexerGetValidatorBlockRewardsParamsSchema,
  IndexerValidatorBlockRewardSchema,
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

export const IndexerGetValidatorBlockRewardsOutputSchema = createIndexerStructuredOutputSchema(
  z.array(IndexerValidatorBlockRewardSchema),
)
export const IndexerGetValidatorBlockRewardsResponseSchema = createIndexerToolResponseSchema(
  z.array(IndexerValidatorBlockRewardSchema),
)
export type IndexerGetValidatorBlockRewardsResponse = z.infer<
  typeof IndexerGetValidatorBlockRewardsResponseSchema
>

export const getValidatorBlockRewards: MCPTool = {
  name: 'getValidatorBlockRewards',
  title: 'Indexer: Validator block rewards (v1)',
  description:
    'Fetch VTHO rewards per block via /api/v1/validators/blocks. Returns blockReward (base), priorityReward (mempool priority fees), total, and the split into delegatorRewards and validatorRewards. Filter by blockNumber, validator, and status. Use status=VALIDATED for produced blocks or status=MISSED for blocks the validator missed. Supports pagination and sort direction.',
  inputSchema: IndexerGetValidatorBlockRewardsParamsSchema.shape,
  outputSchema: IndexerGetValidatorBlockRewardsOutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (
    params: z.infer<typeof IndexerGetValidatorBlockRewardsParamsSchema>,
  ): Promise<IndexerGetValidatorBlockRewardsResponse> => {
    try {
      if (!(await validatorEndpointsAvailable())) {
        return indexerErrorResponse(validatorEndpointsUnavailableMessage())
      }
      const parsed = IndexerGetValidatorBlockRewardsParamsSchema.parse(params ?? {})
      const response = await veworldIndexerGet<typeof IndexerValidatorBlockRewardSchema>({
        endPoint: '/api/v1/validators/blocks',
        params: parsed as any,
      })
      if (!response?.data) {
        return indexerErrorResponse('Failed to fetch validator block rewards from VeWorld Indexer')
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
      logger.warn(`Error fetching validator block rewards: ${String(error)}`)
      return indexerErrorResponse(`Error fetching validator block rewards: ${String(error)}`)
    }
  },
}


