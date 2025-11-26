import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGetSingle } from '@/services/veworld-indexer'
import {
  IndexerB3TRUserOverviewSchema,
  IndexerGetB3TRUserOverviewParamsSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import { resolveVnsOrAddress } from '@/services/vns'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const IndexerB3TRUserOverviewOutputSchema =
  createIndexerStructuredOutputSchema(IndexerB3TRUserOverviewSchema)
export const IndexerB3TRUserOverviewResponseSchema =
  createIndexerToolResponseSchema(IndexerB3TRUserOverviewSchema)
export type IndexerB3TRUserOverviewResponse = z.infer<typeof IndexerB3TRUserOverviewResponseSchema>

export const getB3TRUserOverview: MCPTool = {
  name: 'getB3TRUserOverview',
  title: 'B3TR: User overview (totals)',
  description:
    'Get the B3TR action overview for a specific wallet via /api/v1/b3tr/actions/users/{wallet}/overview. Returns total B3TR rewards, number of rewarded actions, sustainability impact totals, global rankings, and unique X-App interactions. Optionally filter by roundId or by date (yyyy-MM-dd UTC).',
  inputSchema: IndexerGetB3TRUserOverviewParamsSchema.shape,
  outputSchema: IndexerB3TRUserOverviewOutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (
    params: z.infer<typeof IndexerGetB3TRUserOverviewParamsSchema>,
  ): Promise<IndexerB3TRUserOverviewResponse> => {
    try {
      const parsed = IndexerGetB3TRUserOverviewParamsSchema.parse(params ?? {})
      const wallet = await resolveVnsOrAddress(parsed.wallet)

      const data = await veworldIndexerGetSingle<unknown>({
        endPoint: `/api/v1/b3tr/actions/users/${wallet}/overview`,
        params: {
          roundId: parsed.roundId,
          date: parsed.date,
        } as any,
      })

      if (!data) return indexerErrorResponse('Failed to fetch B3TR user overview')

      const overview = IndexerB3TRUserOverviewSchema.parse(data)
      return {
        content: [{ type: 'text', text: JSON.stringify(overview) }],
        structuredContent: { ok: true, network: getThorNetworkType(), data: overview },
      }
    } catch (error) {
      logger.warn(`Error fetching B3TR user overview: ${String(error)}`)
      return indexerErrorResponse(`Error fetching B3TR user overview: ${String(error)}`)
    }
  },
}


