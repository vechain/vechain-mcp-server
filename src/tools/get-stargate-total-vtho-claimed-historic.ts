import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGetSingle } from '@/services/veworld-indexer'
import {
  IndexerGetTotalVthoClaimedHistoricParamsSchema,
  IndexerHistoricPointSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const IndexerTotalVthoClaimedHistoricOutputSchema =
  createIndexerStructuredOutputSchema(z.array(IndexerHistoricPointSchema))
export const IndexerTotalVthoClaimedHistoricResponseSchema =
  createIndexerToolResponseSchema(z.array(IndexerHistoricPointSchema))
export type IndexerTotalVthoClaimedHistoricResponse = z.infer<
  typeof IndexerTotalVthoClaimedHistoricResponseSchema
>

export const getStargateTotalVthoClaimedHistoric: MCPTool = {
  name: 'getStargateTotalVthoClaimedHistoric',
  title: 'Indexer: Historic total VTHO claimed',
  description:
    'Running-total time series of total VTHO claimed across Stargate. Endpoint: /api/v1/stargate/total-vtho-claimed/historic/{range}.',
  inputSchema: IndexerGetTotalVthoClaimedHistoricParamsSchema.shape,
  outputSchema: IndexerTotalVthoClaimedHistoricOutputSchema.shape,
  annotations: { idempotentHint: true, openWorldHint: true, readOnlyHint: true, destructiveHint: false },
  handler: async (params: z.infer<typeof IndexerGetTotalVthoClaimedHistoricParamsSchema>) => {
    try {
      const { range } = IndexerGetTotalVthoClaimedHistoricParamsSchema.parse(params)
      const endpoint = `/api/v1/stargate/total-vtho-claimed/historic/${range}`
      const data = await veworldIndexerGetSingle<unknown[]>({ endPoint: endpoint })
      if (!data) return indexerErrorResponse(`Failed to fetch ${endpoint} from VeWorld Indexer`)
      const points = z.array(IndexerHistoricPointSchema).parse(data)
      return {
        content: [{ type: 'text', text: JSON.stringify(points) }],
        structuredContent: { ok: true, network: getThorNetworkType(), data: points },
      }
    } catch (error) {
      logger.warn(`Error fetching historic VTHO claimed: ${String(error)}`)
      return indexerErrorResponse(`Error fetching historic VTHO claimed: ${String(error)}`)
    }
  },
}


