import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import {
  IndexerB3TRAppLeaderboardEntrySchema,
  IndexerB3TRAppsLeaderboardResponseSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const OutputSchema = createIndexerStructuredOutputSchema(
  IndexerB3TRAppsLeaderboardResponseSchema,
)
export const ResponseSchema = createIndexerToolResponseSchema(
  IndexerB3TRAppsLeaderboardResponseSchema,
)
export type GetB3TRAppsLeaderboardResponse = z.infer<typeof ResponseSchema>

const InputSchema = z
  .object({
    roundId: z.number().optional().describe('Optional round id to filter by'),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in yyyy-MM-dd format (UTC)')
      .optional()
      .describe('Optional date (UTC) to filter by, format yyyy-MM-dd'),
    size: z.number().optional().describe('The results page size'),
    direction: z.enum(['ASC', 'DESC']).optional().describe('The sort direction'),
    sortBy: z
      .enum(['totalRewardAmount', 'actionsRewarded'])
      .optional()
      .describe('Sort by totalRewardAmount or actionsRewarded'),
    cursor: z.string().optional().describe('Pagination cursor returned by a previous request'),
  })
  .describe('Parameters for querying the B3TR apps leaderboard')

export const getB3TRAppsLeaderboard: MCPTool = {
  name: 'getB3TRAppsLeaderboard',
  title: 'B3TR: Apps leaderboard',
  description:
    'Get app B3TR action leaderboard via /api/v1/b3tr/actions/leaderboards/apps. Optionally filter by roundId or date; sort by totalRewardAmount or actionsRewarded; supports cursor pagination.',
  inputSchema: InputSchema.shape,
  outputSchema: OutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (params: z.infer<typeof InputSchema>): Promise<GetB3TRAppsLeaderboardResponse> => {
    try {
      const parsed = InputSchema.parse(params ?? {})
      const response = await veworldIndexerGet<typeof IndexerB3TRAppLeaderboardEntrySchema>({
        endPoint: `/api/v1/b3tr/actions/leaderboards/apps`,
        params: {
          roundId: parsed.roundId,
          date: parsed.date,
          size: parsed.size,
          direction: parsed.direction,
          sortBy: parsed.sortBy,
          cursor: parsed.cursor,
        } as any,
      })

      if (!response?.data) return indexerErrorResponse('Failed to fetch B3TR apps leaderboard')

      const list = {
        data: response.data,
        pagination: response.pagination,
      }
      const validated = IndexerB3TRAppsLeaderboardResponseSchema.parse(list)
      return {
        content: [{ type: 'text', text: JSON.stringify(validated) }],
        structuredContent: {
          ok: true,
          network: getThorNetworkType(),
          data: validated,
        },
      }
    } catch (error) {
      logger.warn(`Error fetching B3TR apps leaderboard: ${String(error)}`)
      return indexerErrorResponse(`Error fetching B3TR apps leaderboard: ${String(error)}`)
    }
  },
}


