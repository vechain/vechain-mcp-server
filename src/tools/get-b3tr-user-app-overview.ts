import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGetSingle } from '@/services/veworld-indexer'
import {
  IndexerB3TRUserAppOverviewSchema,
  IndexerGetB3TRUserAppOverviewParamsBaseSchema,
  IndexerGetB3TRUserAppOverviewParamsSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import { resolveVnsOrAddress } from '@/services/vns'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const IndexerB3TRUserAppOverviewOutputSchema =
  createIndexerStructuredOutputSchema(IndexerB3TRUserAppOverviewSchema)
export const IndexerB3TRUserAppOverviewResponseSchema =
  createIndexerToolResponseSchema(IndexerB3TRUserAppOverviewSchema)
export type IndexerB3TRUserAppOverviewResponse = z.infer<
  typeof IndexerB3TRUserAppOverviewResponseSchema
>

export const getB3TRUserAppOverview: MCPTool = {
  name: 'getB3TRUserAppOverview',
  title: 'B3TR: User app overview (totals)',
  description:
    'Get a users overview for a specific app on veBetterDao via /api/v1/b3tr/actions/users/{wallet}/app/{appId}/overview. Returns total B3TR rewards, number of rewarded actions, sustainability impact totals, global rankings for a specific app. **appId must be the veBetterDaoId (32-byte hex). If the user gives an app name, call getAppHubApps first to resolve the veBetterDaoId.** Optionally filter by roundId OR date (yyyy-MM-dd UTC), but not both — they are mutually exclusive.',
  inputSchema: IndexerGetB3TRUserAppOverviewParamsBaseSchema.shape,
  outputSchema: IndexerB3TRUserAppOverviewOutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (
    params: z.infer<typeof IndexerGetB3TRUserAppOverviewParamsSchema>,
  ): Promise<IndexerB3TRUserAppOverviewResponse> => {
    try {
      const parsed = IndexerGetB3TRUserAppOverviewParamsSchema.parse(params ?? {})
      const wallet = await resolveVnsOrAddress(parsed.wallet)

      const data = await veworldIndexerGetSingle<unknown>({
        endPoint: `/api/v1/b3tr/actions/users/${wallet}/app/${parsed.appId}/overview`,
        params: {
          roundId: parsed.roundId,
          date: parsed.date,
        } as any,
      })

      if (!data) return indexerErrorResponse('Failed to fetch B3TR user app overview')

      const overview = IndexerB3TRUserAppOverviewSchema.parse(data)
      return {
        content: [{ type: 'text', text: JSON.stringify(overview) }],
        structuredContent: { ok: true, network: getThorNetworkType(), data: overview },
      }
    } catch (error) {
      logger.warn(`Error fetching B3TR user app overview: ${String(error)}`)
      return indexerErrorResponse(`Error fetching B3TR user app overview: ${String(error)}`)
    }
  },
}


