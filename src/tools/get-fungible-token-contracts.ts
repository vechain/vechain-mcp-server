import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import {
  IndexerFungibleTokenContractSchema,
  IndexerGetFungibleTokenContractsParamsSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const IndexerGetFungibleTokenContractsOutputSchema = createIndexerStructuredOutputSchema(
  z.array(IndexerFungibleTokenContractSchema),
)
export const IndexerGetFungibleTokenContractsResponseSchema = createIndexerToolResponseSchema(
  z.array(IndexerFungibleTokenContractSchema),
)
export type IndexerGetFungibleTokenContractsResponse = z.infer<
  typeof IndexerGetFungibleTokenContractsResponseSchema
>

export const getFungibleTokenContracts: MCPTool = {
  name: 'getFungibleTokenContracts',
  title: 'Indexer: List wallet fungible tokens (VIP-180/ERC‑20‑like)',
  description:
    'List fungible token contract addresses for a wallet via Indexer. Use with getTokenRegistry for metadata. Endpoint: /api/v1/transfers/fungible-tokens-contracts.',
  inputSchema: IndexerGetFungibleTokenContractsParamsSchema.shape,
  outputSchema: IndexerGetFungibleTokenContractsOutputSchema.shape,
  annotations: {
    idempotentHint: false,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (
    params: z.infer<typeof IndexerGetFungibleTokenContractsParamsSchema>,
  ): Promise<IndexerGetFungibleTokenContractsResponse> => {
    try {
      const parsed = IndexerGetFungibleTokenContractsParamsSchema.parse(params)
      const response = await veworldIndexerGet<
        typeof IndexerFungibleTokenContractSchema,
        typeof IndexerGetFungibleTokenContractsParamsSchema
      >({
        endPoint: '/api/v1/transfers/fungible-tokens-contracts',
        params: parsed,
      })

      if (!response?.data) {
        return indexerErrorResponse('Failed to fetch fungible token contracts from VeWorld Indexer')
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
      logger.warn(`Error getting fungible token contracts of ${params.address} from VeWorld Indexer: ${String(error)}`)
      return indexerErrorResponse(
        `Error getting fungible token contracts of ${params.address} from VeWorld Indexer: ${String(error)}`,
      )
    }
  },
}


