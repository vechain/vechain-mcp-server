import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGetSingle } from '@/services/veworld-indexer'
import {
  IndexerGetStargateTotalVetStakedParamsSchema,
  IndexerStargateTotalVetStakedSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const IndexerGetStargateTotalVetStakedOutputSchema = createIndexerStructuredOutputSchema(
  IndexerStargateTotalVetStakedSchema,
)
export const IndexerGetStargateTotalVetStakedResponseSchema = createIndexerToolResponseSchema(
  IndexerStargateTotalVetStakedSchema,
)
export type IndexerGetStargateTotalVetStakedResponse = z.infer<
  typeof IndexerGetStargateTotalVetStakedResponseSchema
>

export const getStargateTotalVetStaked: MCPTool = {
  name: 'getStargateTotalVetStaked',
  title: 'Indexer: Total VET staked (with per-level breakdown)',
  description:
    'Get total VET staked in Stargate at latest or at a specific block via /api/v1/stargate/total-vet-staked. Returns block metadata, total, and byLevel breakdown.',
  inputSchema: IndexerGetStargateTotalVetStakedParamsSchema.shape,
  outputSchema: IndexerGetStargateTotalVetStakedOutputSchema.shape,
  annotations: { idempotentHint: true, openWorldHint: true, readOnlyHint: true, destructiveHint: false },
  handler: async (
    params: z.infer<typeof IndexerGetStargateTotalVetStakedParamsSchema>,
  ): Promise<IndexerGetStargateTotalVetStakedResponse> => {
    try {
      const parsed = IndexerGetStargateTotalVetStakedParamsSchema.parse(params ?? {})
      const data = await veworldIndexerGetSingle<unknown>({
        endPoint: '/api/v1/stargate/total-vet-staked',
        params: parsed as any,
      })
      if (data == null) {
        return indexerErrorResponse('Failed to fetch total VET staked from VeWorld Indexer')
      }
      const payload = IndexerStargateTotalVetStakedSchema.parse(
        (data && typeof data === 'object' && 'data' in (data as any)) ? (data as any).data : data,
      )
      return {
        content: [{ type: 'text', text: JSON.stringify(payload) }],
        structuredContent: { ok: true, network: getThorNetworkType(), data: payload },
      }
    } catch (error) {
      logger.warn(`Error fetching total VET staked: ${String(error)}`)
      return indexerErrorResponse(`Error fetching total VET staked: ${String(error)}`)
    }
  },
}


