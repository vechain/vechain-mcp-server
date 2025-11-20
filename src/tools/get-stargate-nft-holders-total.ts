import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGetSingle } from '@/services/veworld-indexer'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'
import { IndexerStargateNftHoldersTotalSchema } from '@/services/veworld-indexer/schemas'

export const IndexerStargateNftHoldersTotalOutputSchema =
  createIndexerStructuredOutputSchema(IndexerStargateNftHoldersTotalSchema)
export const IndexerStargateNftHoldersTotalResponseSchema =
  createIndexerToolResponseSchema(IndexerStargateNftHoldersTotalSchema)
export type IndexerStargateNftHoldersTotalResponse = z.infer<
  typeof IndexerStargateNftHoldersTotalResponseSchema
>

export const getStargateNftHoldersTotal: MCPTool = {
  name: 'getStargateNftHoldersTotal',
  title: 'Indexer: Total stargate NFT (total)',
  description:
    'Get the total number of Stargate NFTs and breakdown by level via /api/v1/stargate/nft-holders. Returns an object with block metadata, total, and byLevel.',
  inputSchema: {},
  outputSchema: IndexerStargateNftHoldersTotalOutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (): Promise<IndexerStargateNftHoldersTotalResponse> => {
    try {
      const data = await veworldIndexerGetSingle<unknown>({
        endPoint: '/api/v1/stargate/nft-holders',
      })
      if (data == null) {
        return indexerErrorResponse('Failed to fetch total NFT holders from VeWorld Indexer')
      }
      const parsed = IndexerStargateNftHoldersTotalSchema.parse(
        (data && typeof data === 'object' && 'data' in (data as any)) ? (data as any).data : data,
      )
      return {
        content: [{ type: 'text', text: JSON.stringify(parsed) }],
        structuredContent: { ok: true, network: getThorNetworkType(), data: parsed },
      }
    } catch (error) {
      logger.warn(`Error fetching Stargate NFT holders total: ${String(error)}`)
      return indexerErrorResponse(`Error fetching Stargate NFT holders total: ${String(error)}`)
    }
  },
}


