import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGetSingle } from '@/services/veworld-indexer'
import { createIndexerStructuredOutputSchema, createIndexerToolResponseSchema, indexerErrorResponse } from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'
import { IndexerGetStargateTokensParamsSchema, IndexerStargateTokenSchema } from '@/services/veworld-indexer/schemas'

export const IndexerStargateTokensOutputSchema = createIndexerStructuredOutputSchema(
  z.array(IndexerStargateTokenSchema),
)
export const IndexerStargateTokensResponseSchema = createIndexerToolResponseSchema(
  z.array(IndexerStargateTokenSchema),
)
export type IndexerStargateTokensResponse = z.infer<typeof IndexerStargateTokensResponseSchema>

export const getStargateTokens: MCPTool = {
  name: 'getStargateTokens',
  title: 'Indexer: Stargate tokens',
  description:
    'Fetch Stargate NFT information (VET staked, rewards, level, delegation status, validator id, etc.) via /api/v1/stargate/tokens. Supports filtering by owner, manager, or tokenId; supports pagination (page, size, direction).',
  inputSchema: IndexerGetStargateTokensParamsSchema.shape,
  outputSchema: IndexerStargateTokensOutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (
    params: z.infer<typeof IndexerGetStargateTokensParamsSchema>,
  ): Promise<IndexerStargateTokensResponse> => {
    try {
      const validated = IndexerGetStargateTokensParamsSchema.parse(params ?? {})
      const data = await veworldIndexerGetSingle<unknown[]>({
        endPoint: '/api/v1/stargate/tokens',
        params: validated,
      })
      if (!data) {
        return indexerErrorResponse('Failed to fetch Stargate tokens from VeWorld Indexer')
      }
      const tokens = z.array(IndexerStargateTokenSchema).parse(data)
      return {
        content: [{ type: 'text', text: JSON.stringify(tokens) }],
        structuredContent: {
          ok: true,
          network: getThorNetworkType(),
          data: tokens,
        },
      }
    } catch (error) {
      logger.warn(`Error fetching Stargate tokens: ${String(error)}`)
      return indexerErrorResponse(`Error fetching Stargate tokens: ${String(error)}`)
    }
  },
}


