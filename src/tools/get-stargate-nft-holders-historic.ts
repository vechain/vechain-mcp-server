import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGetSingle } from '@/services/veworld-indexer'
import {
  IndexerGetNftHoldersHistoricParamsSchema,
  IndexerHistoricPointSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const IndexerNftHoldersHistoricOutputSchema = createIndexerStructuredOutputSchema(
  z.array(IndexerHistoricPointSchema),
)
export const IndexerNftHoldersHistoricResponseSchema = createIndexerToolResponseSchema(
  z.array(IndexerHistoricPointSchema),
)
export type IndexerNftHoldersHistoricResponse = z.infer<
  typeof IndexerNftHoldersHistoricResponseSchema
>

export const getStargateNftHoldersHistoric: MCPTool = {
  name: 'getStargateNftHoldersHistoric',
  title: 'Indexer: Historic total NFT holders',
  description:
    'Running-total time series of total NFT holders in Stargate, optionally filtered by NFT level. Endpoint: /api/v1/stargate/nft-holders/historic/{range}.',
  inputSchema: IndexerGetNftHoldersHistoricParamsSchema.shape,
  outputSchema: IndexerNftHoldersHistoricOutputSchema.shape,
  annotations: { idempotentHint: true, openWorldHint: true, readOnlyHint: true, destructiveHint: false },
  handler: async (params: z.infer<typeof IndexerGetNftHoldersHistoricParamsSchema>) => {
    try {
      const { range, level } = IndexerGetNftHoldersHistoricParamsSchema.parse(params)
      const endpoint = `/api/v1/stargate/nft-holders/historic/${range}`
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
      logger.warn(`Error fetching historic NFT holders: ${String(error)}`)
      return indexerErrorResponse(`Error fetching historic NFT holders: ${String(error)}`)
    }
  },
}


