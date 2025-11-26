import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import {
  IndexerB3TRAppUserLeaderboardEntrySchema,
  IndexerB3TRAppUsersLeaderboardResponseSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import { enrichAddressesWithVns } from '@/services/vns'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const OutputSchema = createIndexerStructuredOutputSchema(
  IndexerB3TRAppUsersLeaderboardResponseSchema,
)
export const ResponseSchema = createIndexerToolResponseSchema(
  IndexerB3TRAppUsersLeaderboardResponseSchema,
)
export type GetB3TRAppUsersLeaderboardResponse = z.infer<typeof ResponseSchema>

const InputSchema = z
  .object({
    appId: z.string().describe('App ID (veBetterDaoId) to query by'),
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
  .describe('Parameters for querying the B3TR users leaderboard for a specific app')

export const getB3TRAppUsersLeaderboard: MCPTool = {
  name: 'getB3TRAppUsersLeaderboard',
  title: 'B3TR: App users leaderboard',
  description:
    'Get user B3TR action leaderboard for a given app via /api/v1/b3tr/actions/leaderboards/apps/{appId}. Optionally filter by roundId or date; sort by totalRewardAmount or actionsRewarded; supports cursor pagination.',
  inputSchema: InputSchema.shape,
  outputSchema: OutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (
    params: z.infer<typeof InputSchema>,
  ): Promise<GetB3TRAppUsersLeaderboardResponse> => {
    try {
      const parsed = InputSchema.parse(params ?? {})
      const response = await veworldIndexerGet<typeof IndexerB3TRAppUserLeaderboardEntrySchema>({
        endPoint: `/api/v1/b3tr/actions/leaderboards/apps/${parsed.appId}`,
        params: {
          roundId: parsed.roundId,
          date: parsed.date,
          size: parsed.size,
          direction: parsed.direction,
          sortBy: parsed.sortBy,
          cursor: parsed.cursor,
        } as any,
      })

      if (!response?.data) return indexerErrorResponse('Failed to fetch app users leaderboard')

      // Enrich user addresses with VNS names
      const users = response.data.map((entry: any) => entry.user as `0x${string}`)
      logger.info(`Enriching ${users.length} user addresses with VNS names...`)
      const enrichedUsers = await enrichAddressesWithVns(users)
      
      const vnsCount = enrichedUsers.filter(u => u.vnsName).length
      logger.info(`Found ${vnsCount} VNS names out of ${users.length} addresses`)
      
      const enrichedData = response.data.map((entry: any, index: number) => ({
        ...entry,
        vnsName: enrichedUsers[index].vnsName,
      }))

      const list = {
        data: enrichedData,
        pagination: response.pagination,
      }
      const validated = IndexerB3TRAppUsersLeaderboardResponseSchema.parse(list)
      return {
        content: [{ type: 'text', text: JSON.stringify(validated) }],
        structuredContent: {
          ok: true,
          network: getThorNetworkType(),
          data: validated,
        },
      }
    } catch (error) {
      logger.warn(`Error fetching app users leaderboard: ${String(error)}`)
      return indexerErrorResponse(`Error fetching app users leaderboard: ${String(error)}`)
    }
  },
}


