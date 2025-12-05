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
    `Retrieve validator statistics via /api/v1/validators for Stargate NFT delegation decisions and validator performance. **IMPORTANT: Look at all no status filter when getting validators when getting nft yields, when getting current validator not nft yields look at status=ACTIVE**

KEY METRICS:
- nftYieldsNextCycle: Projected APY (%) for each Stargate NFT level in the next cycle
- blockProbability: Validator's chance of producing blocks (higher = more rewards)
- percentageOffline: Validator uptime reliability (lower = better)
- delegatorTvl: Total USD value delegated by Stargate NFTs (higher = more competition)

FILTERS:
- validatorId: Filter by specific validator address
- endorser: Filter by endorser address  
- status: NONE, QUEUED, ACTIVE, EXITED, EXITING - only filter by ACTIVE for currently operating validators and all when getting nft yields

SORTING (sortBy parameter):
- For NFT delegation: Use 'nft:<Level>' (e.g., 'nft:Dawn', 'nft:Thunder') to sort by APY
  IMPORTANT: When sorting by NFT yield, filter by status=ACTIVE or include QUEUED validators
- Other options: validatorTvl, totalTvl, blockProbability, delegatorTvl

PAGINATION: Supports page, size, cursor, and direction (ASC/DESC)

VALIDATOR RECOMMENDATION GUIDELINES:
1. Primary metric: nftYieldsNextCycle[level] - this is APY percentage, NOT absolute VTHO
2. Sort by the user's NFT level (e.g., sortBy='nft:Dawn' for Dawn NFTs)
3. Filter to status=ACTIVE for currently operating validators
4. Consider percentageOffline as secondary factor (reject if >30%)
5. Present top 3-5 options with APY clearly labeled as percentage`,
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


