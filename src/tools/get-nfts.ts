import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import {
  IndexerGetNFTsParamsSchema,
  IndexerNFTAssetSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

const OutputSchema = createIndexerToolResponseSchema(z.array(IndexerNFTAssetSchema))
type Response = z.infer<typeof OutputSchema>

export const getNFTs: MCPTool = {
  name: 'getNFTs',
  title: 'Indexer: List NFTs owned by an address',
  description:
    'Get all NFTs owned by an address using VeWorld Indexer. Endpoint: /api/v1/nfts. Accepts address, optional contractAddress, and pagination (page/size/direction or cursor).',
  inputSchema: IndexerGetNFTsParamsSchema.shape,
  outputSchema: OutputSchema.shape,
  annotations: {
    idempotentHint: false,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (params: z.infer<typeof IndexerGetNFTsParamsSchema>): Promise<Response> => {
    try {
      const parsed = IndexerGetNFTsParamsSchema.parse(params)

      const response = await veworldIndexerGet<typeof IndexerNFTAssetSchema>({
        endPoint: '/api/v1/nfts',
        params: {
          address: parsed.address,
          contractAddress: parsed.contractAddress,
          page: parsed.page,
          size: parsed.size,
          direction: parsed.direction,
          cursor: parsed.cursor,
        } as any,
      })

      if (!response?.data) {
        return indexerErrorResponse('Failed to fetch NFTs from VeWorld Indexer')
      }

      const nfts = response.data
      return {
        content: [{ type: 'text', text: JSON.stringify(nfts) }],
        structuredContent: {
          ok: true,
          network: getThorNetworkType(),
          data: nfts,
        },
      }
    } catch (error) {
      logger.warn(`Error getting NFTs from VeWorld Indexer: ${String(error)}`)
      return indexerErrorResponse(`Error getting NFTs from VeWorld Indexer: ${String(error)}`)
    }
  },
}


