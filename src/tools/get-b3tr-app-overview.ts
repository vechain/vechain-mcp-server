import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGetSingle } from '@/services/veworld-indexer'
import {
  IndexerB3TRAppOverviewSchema,
  IndexerGetB3TRAppOverviewParamsSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const IndexerB3TRAppOverviewOutputSchema =
  createIndexerStructuredOutputSchema(IndexerB3TRAppOverviewSchema)
export const IndexerB3TRAppOverviewResponseSchema =
  createIndexerToolResponseSchema(IndexerB3TRAppOverviewSchema)
export type IndexerB3TRAppOverviewResponse = z.infer<typeof IndexerB3TRAppOverviewResponseSchema>

export const getB3TRAppOverview: MCPTool = {
  name: 'getB3TRAppOverview',
  title: 'B3TR: App overview (totals)',
  description:
    'Get APP overview for a specific app listed on veBetterDao via /api/v1/b3tr/actions/apps/{appId}/overview. Returns total B3TR rewards, number of rewarded actions, sustainability impact totals, global rankings for a specific app. If coming from app-hub from name or description, use veBetterDaoId. Optionally filter by roundId or date (yyyy-MM-dd UTC).',
  inputSchema: IndexerGetB3TRAppOverviewParamsSchema.shape,
  outputSchema: IndexerB3TRAppOverviewOutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (
    params: z.infer<typeof IndexerGetB3TRAppOverviewParamsSchema>,
  ): Promise<IndexerB3TRAppOverviewResponse> => {
    try {
      const parsed = IndexerGetB3TRAppOverviewParamsSchema.parse(params ?? {})
      const data = await veworldIndexerGetSingle<unknown>({
        endPoint: `/api/v1/b3tr/actions/apps/${parsed.appId}/overview`,
        params: {
          roundId: parsed.roundId,
          date: parsed.date,
        } as any,
      })
      if (!data) return indexerErrorResponse('Failed to fetch B3TR app overview')
      const overview = IndexerB3TRAppOverviewSchema.parse(data)
      return {
        content: [{ type: 'text', text: JSON.stringify(overview) }],
        structuredContent: { ok: true, network: getThorNetworkType(), data: overview },
      }
    } catch (error) {
      logger.warn(`Error fetching B3TR app overview: ${String(error)}`)
      return indexerErrorResponse(`Error fetching B3TR app overview: ${String(error)}`)
    }
  },
}




