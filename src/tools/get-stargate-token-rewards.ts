import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import {
  IndexerGetStargateTokenRewardsParamsSchema,
  IndexerStargateTokenRewardSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const IndexerStargateTokenRewardsOutputSchema = createIndexerStructuredOutputSchema(
  z.array(IndexerStargateTokenRewardSchema),
)
export const IndexerStargateTokenRewardsResponseSchema = createIndexerToolResponseSchema(
  z.array(IndexerStargateTokenRewardSchema),
)
export type IndexerStargateTokenRewardsResponse = z.infer<
  typeof IndexerStargateTokenRewardsResponseSchema
>

export const getStargateTokenRewards: MCPTool = {
  name: 'getStargateTokenRewards',
  title: 'Indexer: Stargate token rewards',
  description:
    'Overview of rewards earned by a Stargate NFT delegation to a validator over time. Not the same as “claimed” (claimable only at end of cycle). Supports periodType (CYCLE, DAY, WEEK, MONTH, YEAR, ALL), optional validator, and pagination.',
  inputSchema: IndexerGetStargateTokenRewardsParamsSchema.shape,
  outputSchema: IndexerStargateTokenRewardsOutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (
    params: z.infer<typeof IndexerGetStargateTokenRewardsParamsSchema>,
  ): Promise<IndexerStargateTokenRewardsResponse> => {
    try {
      const validated = IndexerGetStargateTokenRewardsParamsSchema.parse(params)
      const { tokenId, ...query } = validated
      const endpoint = `/api/v1/stargate/token-rewards/${tokenId}`
      const response = await veworldIndexerGet<typeof IndexerStargateTokenRewardSchema>({
        endPoint: endpoint,
        params: query as any,
      })
      if (!response?.data) {
        return indexerErrorResponse(`Failed to fetch token rewards for ${tokenId}`)
      }
      const entries = response.data
      return {
        content: [{ type: 'text', text: JSON.stringify(entries) }],
        structuredContent: {
          ok: true,
          network: getThorNetworkType(),
          data: entries,
        },
      }
    } catch (error) {
      logger.warn(`Error fetching Stargate token rewards: ${String(error)}`)
      return indexerErrorResponse(`Error fetching Stargate token rewards: ${String(error)}`)
    }
  },
}


