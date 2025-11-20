import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGetSingle } from '@/services/veworld-indexer'
import {
  IndexerGetTotalVthoGeneratedHistoricParamsSchema,
  IndexerHistoricPointSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const IndexerTotalVthoGeneratedHistoricOutputSchema =
  createIndexerStructuredOutputSchema(z.array(IndexerHistoricPointSchema))
export const IndexerTotalVthoGeneratedHistoricResponseSchema =
  createIndexerToolResponseSchema(z.array(IndexerHistoricPointSchema))
export type IndexerTotalVthoGeneratedHistoricResponse = z.infer<
  typeof IndexerTotalVthoGeneratedHistoricResponseSchema
>

export const getStargateTotalVthoGeneratedHistoric: MCPTool = {
  name: 'getStargateTotalVthoGeneratedHistoric',
  title: 'Indexer: Historic total VTHO generated',
  description:
    'Running-total time series of total VTHO generated across Stargate. Endpoint: /api/v1/stargate/total-vtho-generated/historic/{range}.',
  inputSchema: IndexerGetTotalVthoGeneratedHistoricParamsSchema.shape,
  outputSchema: IndexerTotalVthoGeneratedHistoricOutputSchema.shape,
  annotations: { idempotentHint: true, openWorldHint: true, readOnlyHint: true, destructiveHint: false },
  handler: async (params: z.infer<typeof IndexerGetTotalVthoGeneratedHistoricParamsSchema>) => {
    try {
      const { range } = IndexerGetTotalVthoGeneratedHistoricParamsSchema.parse(params)
      const endpoint = `/api/v1/stargate/total-vtho-generated/historic/${range}`
      const data = await veworldIndexerGetSingle<unknown[]>({ endPoint: endpoint })
      if (!data) return indexerErrorResponse(`Failed to fetch ${endpoint} from VeWorld Indexer`)
      const points = z.array(IndexerHistoricPointSchema).parse(data)
      return {
        content: [{ type: 'text', text: JSON.stringify(points) }],
        structuredContent: { ok: true, network: getThorNetworkType(), data: points },
      }
    } catch (error) {
      logger.warn(`Error fetching historic VTHO generated: ${String(error)}`)
      return indexerErrorResponse(`Error fetching historic VTHO generated: ${String(error)}`)
    }
  },
}


