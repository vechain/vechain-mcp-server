import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import {
  IndexerExplorerBlockUsageItemSchema,
  IndexerExplorerBlockUsageParamsSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const IndexerExplorerBlockUsageOutputSchema = createIndexerStructuredOutputSchema(
  z.array(IndexerExplorerBlockUsageItemSchema),
)
export const IndexerExplorerBlockUsageResponseSchema = createIndexerToolResponseSchema(
  z.array(IndexerExplorerBlockUsageItemSchema),
)
export type IndexerExplorerBlockUsageResponse = z.infer<typeof IndexerExplorerBlockUsageResponseSchema>

export const getExplorerBlockUsage: MCPTool = {
  name: 'getExplorerBlockUsage',
  title: 'Explorer: Block usage statistics',
  description:
    'Get cumulative block usage statistics (gas, tx counts, clauses, base fee) over a timestamp range via /api/v1/explorer/block-usage. Query: startTimestamp, endTimestamp (Unix seconds, inclusive). Returns cumulative counters at sampled points; compute deltas client-side.',
  inputSchema: IndexerExplorerBlockUsageParamsSchema.shape,
  outputSchema: IndexerExplorerBlockUsageOutputSchema.shape,
  annotations: { idempotentHint: true, openWorldHint: true, readOnlyHint: true, destructiveHint: false },
  handler: async (
    params: z.infer<typeof IndexerExplorerBlockUsageParamsSchema>,
  ): Promise<IndexerExplorerBlockUsageResponse> => {
    try {
      const parsed = IndexerExplorerBlockUsageParamsSchema.parse(params)
      const response = await veworldIndexerGet<typeof IndexerExplorerBlockUsageItemSchema>({
        endPoint: '/api/v1/explorer/block-usage',
        params: parsed as any,
      })
      if (!response?.data) return indexerErrorResponse('Failed to fetch explorer block usage')
      return {
        content: [{ type: 'text', text: JSON.stringify(response.data) }],
        structuredContent: { ok: true, network: getThorNetworkType(), data: response.data },
      }
    } catch (error) {
      logger.warn(`Error fetching explorer block usage: ${String(error)}`)
      return indexerErrorResponse(`Error fetching explorer block usage: ${String(error)}`)
    }
  },
}


