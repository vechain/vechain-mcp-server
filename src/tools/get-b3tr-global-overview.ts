import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGetSingle } from '@/services/veworld-indexer'
import {
  IndexerB3TRGlobalOverviewSchema,
  IndexerGetB3TRGlobalOverviewParamsSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const IndexerB3TRGlobalOverviewOutputSchema =
  createIndexerStructuredOutputSchema(IndexerB3TRGlobalOverviewSchema)
export const IndexerB3TRGlobalOverviewResponseSchema =
  createIndexerToolResponseSchema(IndexerB3TRGlobalOverviewSchema)
export type IndexerB3TRGlobalOverviewResponse = z.infer<
  typeof IndexerB3TRGlobalOverviewResponseSchema
>

export const getB3TRGlobalOverview: MCPTool = {
  name: 'getB3TRGlobalOverview',
  title: 'B3TR: Global overview (totals)',
  description:
    'Get global B3TR action overview via /api/v1/b3tr/actions/global/overview. Optionally filter by roundId or date (yyyy-MM-dd UTC).',
  inputSchema: IndexerGetB3TRGlobalOverviewParamsSchema.shape,
  outputSchema: IndexerB3TRGlobalOverviewOutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (
    params: z.infer<typeof IndexerGetB3TRGlobalOverviewParamsSchema>,
  ): Promise<IndexerB3TRGlobalOverviewResponse> => {
    try {
      const parsed = IndexerGetB3TRGlobalOverviewParamsSchema.parse(params ?? {})

      const data = await veworldIndexerGetSingle<unknown>({
        endPoint: `/api/v1/b3tr/actions/global/overview`,
        params: {
          roundId: parsed.roundId,
          date: parsed.date,
        } as any,
      })

      if (!data) return indexerErrorResponse('Failed to fetch B3TR global overview')

      const overview = IndexerB3TRGlobalOverviewSchema.parse(data)
      return {
        content: [{ type: 'text', text: JSON.stringify(overview) }],
        structuredContent: { ok: true, network: getThorNetworkType(), data: overview },
      }
    } catch (error) {
      logger.warn(`Error fetching B3TR global overview: ${String(error)}`)
      return indexerErrorResponse(`Error fetching B3TR global overview: ${String(error)}`)
    }
  },
}


