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
  title: 'Indexer: Stargate NFT held by users (total)',
  description:
    'Get the total number of Stargate NFTs held by users via /api/v1/stargate/nft-holders. Returns a numeric value encoded as a JSON string.',
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
      const data = await veworldIndexerGetSingle<string>({
        endPoint: '/api/v1/stargate/nft-holders',
      })
      if (data == null) {
        return indexerErrorResponse('Failed to fetch total NFT holders from VeWorld Indexer')
      }
      IndexerStargateNftHoldersTotalSchema.parse(data)
      return {
        content: [{ type: 'text', text: data }],
        structuredContent: { ok: true, network: getThorNetworkType(), data },
      }
    } catch (error) {
      logger.warn(`Error fetching Stargate NFT holders total: ${String(error)}`)
      return indexerErrorResponse(`Error fetching Stargate NFT holders total: ${String(error)}`)
    }
  },
}


