import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGetSingle } from '@/services/veworld-indexer'
import {
  IndexerGetTotalVetStakedHistoricParamsSchema,
  IndexerHistoricPointSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const IndexerTotalVetStakedHistoricOutputSchema =
  createIndexerStructuredOutputSchema(z.array(IndexerHistoricPointSchema))
export const IndexerTotalVetStakedHistoricResponseSchema =
  createIndexerToolResponseSchema(z.array(IndexerHistoricPointSchema))
export type IndexerTotalVetStakedHistoricResponse = z.infer<
  typeof IndexerTotalVetStakedHistoricResponseSchema
>

export const getStargateTotalVetStakedHistoric: MCPTool = {
  name: 'getStargateTotalVetStakedHistoric',
  title: 'Indexer: Historic total VET staked',
  description:
    'Running-total time series of total VET staked in Stargate, optionally filtered by NFT level. Endpoint: /api/v1/stargate/total-vet-staked/historic/{range}.',
  inputSchema: IndexerGetTotalVetStakedHistoricParamsSchema.shape,
  outputSchema: IndexerTotalVetStakedHistoricOutputSchema.shape,
  annotations: { idempotentHint: true, openWorldHint: true, readOnlyHint: true, destructiveHint: false },
  handler: async (params: z.infer<typeof IndexerGetTotalVetStakedHistoricParamsSchema>) => {
    try {
      const { range, level } = IndexerGetTotalVetStakedHistoricParamsSchema.parse(params)
      const endpoint = `/api/v1/stargate/total-vet-staked/historic/${range}`
      const data = await veworldIndexerGetSingle<unknown[]>({
        endPoint: endpoint,
        params: level ? { level } : undefined,
      })
      if (!data) return indexerErrorResponse(`Failed to fetch ${endpoint} from VeWorld Indexer`)
      const points = z.array(IndexerHistoricPointSchema).parse(data)
      return {
        content: [{ type: 'text', text: JSON.stringify(points) }],
        structuredContent: { ok: true, network: getThorNetworkType(), data: points },
      }
    } catch (error) {
      logger.warn(`Error fetching historic VET staked: ${String(error)}`)
      return indexerErrorResponse(`Error fetching historic VET staked: ${String(error)}`)
    }
  },
}


