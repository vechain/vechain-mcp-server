import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGetSingle } from '@/services/veworld-indexer'
import {
  IndexerGetStargateTotalVthoClaimedByAccountParamsSchema,
  IndexerStargateTotalVthoClaimedByAccountSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const IndexerGetStargateTotalVthoClaimedByAccountOutputSchema =
  createIndexerStructuredOutputSchema(IndexerStargateTotalVthoClaimedByAccountSchema)
export const IndexerGetStargateTotalVthoClaimedByAccountResponseSchema =
  createIndexerToolResponseSchema(IndexerStargateTotalVthoClaimedByAccountSchema)
export type IndexerGetStargateTotalVthoClaimedByAccountResponse = z.infer<
  typeof IndexerGetStargateTotalVthoClaimedByAccountResponseSchema
>

export const getStargateTotalVthoClaimedByAccount: MCPTool = {
  name: 'getStargateTotalVthoClaimedByAccount',
  title: 'Stargate: Total VTHO claimed by account',
  description:
    'Get total VTHO claimed by a given account via /api/v1/stargate/total-vtho-claimed/{account}. Optional rewardsType filter: LEGACY (pre‑Hayabusa bootstrap) or DELEGATION (post‑Hayabusa delegated) if not provided, all rewards ever claimed are included.',
  inputSchema: IndexerGetStargateTotalVthoClaimedByAccountParamsSchema.shape,
  outputSchema: IndexerGetStargateTotalVthoClaimedByAccountOutputSchema.shape,
  annotations: { idempotentHint: true, openWorldHint: true, readOnlyHint: true, destructiveHint: false },
  handler: async (
    params: z.infer<typeof IndexerGetStargateTotalVthoClaimedByAccountParamsSchema>,
  ): Promise<IndexerGetStargateTotalVthoClaimedByAccountResponse> => {
    try {
      const parsed = IndexerGetStargateTotalVthoClaimedByAccountParamsSchema.parse(params)
      const endpoint = `/api/v1/stargate/total-vtho-claimed/${parsed.account}`
      const data = await veworldIndexerGetSingle<unknown>({
        endPoint: endpoint,
        params: parsed.rewardsType ? { rewardsType: parsed.rewardsType } : {},
      })
      if (data == null) {
        return indexerErrorResponse('Failed to fetch total VTHO claimed by account from VeWorld Indexer')
      }
      const value =
        typeof data === 'object' && data !== null && 'data' in (data as any)
          ? (data as any).data
          : data
      const total = IndexerStargateTotalVthoClaimedByAccountSchema.parse(value)
      return {
        content: [{ type: 'text', text: JSON.stringify(total) }],
        structuredContent: { ok: true, network: getThorNetworkType(), data: total },
      }
    } catch (error) {
      logger.warn(`Error fetching total VTHO claimed by account: ${String(error)}`)
      return indexerErrorResponse(`Error fetching total VTHO claimed by account: ${String(error)}`)
    }
  },
}


