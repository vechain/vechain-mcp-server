import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import { ThorAddressSchema } from '@/services/thor/schemas'
import {
  IndexerGetNFTContractsParamsBaseSchema,
  IndexerGetNFTContractsParamsSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const IndexerGetNFTContractsOutputSchema = createIndexerStructuredOutputSchema(z.array(ThorAddressSchema))
export const IndexerGetNFTContractsResponseSchema = createIndexerToolResponseSchema(z.array(ThorAddressSchema))
export type IndexerGetNFTContractsResponse = z.infer<typeof IndexerGetNFTContractsResponseSchema>

export const getNFTContracts: MCPTool = {
  name: 'getNFTContracts',
  title: 'Indexer: List NFT contract addresses by owner',
  description:
    'Get all NFT contract addresses for a given owner using VeWorld Indexer. Endpoint: /api/v1/nfts/contracts. Accepts address and pagination (page/size/direction or cursor).',
  inputSchema: IndexerGetNFTContractsParamsBaseSchema.shape,
  outputSchema: IndexerGetNFTContractsOutputSchema.shape,
  annotations: {
    idempotentHint: false,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (params: z.infer<typeof IndexerGetNFTContractsParamsBaseSchema>): Promise<IndexerGetNFTContractsResponse> => {
    try {
      const parsed = IndexerGetNFTContractsParamsSchema.parse(params)
      const response = await veworldIndexerGet<typeof ThorAddressSchema>({
        endPoint: '/api/v1/nfts/contracts',
        params: {
          owner: parsed.owner,
          excludeCollections: parsed.excludeCollections,
          page: parsed.page,
          size: parsed.size,
          direction: parsed.direction,
          cursor: parsed.cursor,
        } as any,
      })

      if (!response?.data) {
        return indexerErrorResponse('Failed to fetch NFT contract addresses from VeWorld Indexer')
      }

      const contracts = response.data
      return {
        content: [{ type: 'text', text: JSON.stringify(contracts) }],
        structuredContent: {
          ok: true,
          network: getThorNetworkType(),
          data: contracts,
        },
      }
    } catch (error) {
      logger.warn(`Error getting NFT contracts from VeWorld Indexer: ${String(error)}`)
      return indexerErrorResponse(`Error getting NFT contracts from VeWorld Indexer: ${String(error)}`)
    }
  },
}


