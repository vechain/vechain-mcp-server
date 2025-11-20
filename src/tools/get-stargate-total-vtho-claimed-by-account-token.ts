import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGetSingle } from '@/services/veworld-indexer'
import {
  IndexerGetStargateTotalVthoClaimedByAccountTokenParamsSchema,
  IndexerStargateTotalVthoClaimedByAccountTokenSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const IndexerGetStargateTotalVthoClaimedByAccountTokenOutputSchema =
  createIndexerStructuredOutputSchema(IndexerStargateTotalVthoClaimedByAccountTokenSchema)
export const IndexerGetStargateTotalVthoClaimedByAccountTokenResponseSchema =
  createIndexerToolResponseSchema(IndexerStargateTotalVthoClaimedByAccountTokenSchema)
export type IndexerGetStargateTotalVthoClaimedByAccountTokenResponse = z.infer<
  typeof IndexerGetStargateTotalVthoClaimedByAccountTokenResponseSchema
>

export const getStargateTotalVthoClaimedByAccountToken: MCPTool = {
  name: 'getStargateTotalVthoClaimedByAccountToken',
  title: 'Stargate: Total VTHO claimed by account and token',
  description:
    'Get total VTHO claimed by a given account and token via /api/v1/stargate/total-vtho-claimed/{account}/{tokenId}. Optional rewardsType filter: LEGACY (pre‑Hayabusa bootstrap) or DELEGATION (post‑Hayabusa delegated).',
  inputSchema: IndexerGetStargateTotalVthoClaimedByAccountTokenParamsSchema.shape,
  outputSchema: IndexerGetStargateTotalVthoClaimedByAccountTokenOutputSchema.shape,
  annotations: { idempotentHint: true, openWorldHint: true, readOnlyHint: true, destructiveHint: false },
  handler: async (
    params: z.infer<typeof IndexerGetStargateTotalVthoClaimedByAccountTokenParamsSchema>,
  ): Promise<IndexerGetStargateTotalVthoClaimedByAccountTokenResponse> => {
    try {
      const parsed = IndexerGetStargateTotalVthoClaimedByAccountTokenParamsSchema.parse(params)
      const endpoint = `/api/v1/stargate/total-vtho-claimed/${parsed.account}/${parsed.tokenId}`
      const data = await veworldIndexerGetSingle<unknown>({
        endPoint: endpoint,
        params: parsed.rewardsType ? { rewardsType: parsed.rewardsType } : {},
      })
      if (data == null) {
        return indexerErrorResponse(
          'Failed to fetch total VTHO claimed by account and token from VeWorld Indexer',
        )
      }
      const value =
        typeof data === 'object' && data !== null && 'data' in (data as any)
          ? (data as any).data
          : data
      const total = IndexerStargateTotalVthoClaimedByAccountTokenSchema.parse(value)
      return {
        content: [{ type: 'text', text: JSON.stringify(total) }],
        structuredContent: { ok: true, network: getThorNetworkType(), data: total },
      }
    } catch (error) {
      logger.warn(`Error fetching total VTHO claimed by account and token: ${String(error)}`)
      return indexerErrorResponse(
        `Error fetching total VTHO claimed by account and token: ${String(error)}`,
      )
    }
  },
}


