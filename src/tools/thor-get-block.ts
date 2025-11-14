import type { z } from 'zod'
import {
  createThorStructuredOutputSchema,
  createThorToolResponseSchema,
  getThorClient,
  getThorNetworkType,
  ThorBlockCompressedSchema,
  ThorBlockRevisionSchema,
  thorErrorResponse,
} from '@/services/thor'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

/**
 * Schemas for get block tool outputs
 */
const ThorGetBlockOutputSchema = createThorStructuredOutputSchema(ThorBlockCompressedSchema)
const ThorGetBlockResponseSchema = createThorToolResponseSchema(ThorBlockCompressedSchema)
type ThorGetBlockResponse = z.infer<typeof ThorGetBlockResponseSchema>

/**
 * Tool for getting block details from Thor network
 */
export const getBlock: MCPTool = {
  name: 'thorGetBlock',
  title: 'Thor Get Block',
  description: 'Get block details from Thor network',
  inputSchema: { blockRevision: ThorBlockRevisionSchema },
  outputSchema: ThorGetBlockOutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async ({ blockRevision }: { blockRevision: string }): Promise<ThorGetBlockResponse> => {
    try {
      logger.debug(`Getting block ${blockRevision} from Thor network`)
      const thorClient = getThorClient()
      const block = await thorClient.blocks.getBlockCompressed(blockRevision)
      if (block === null) {
        logger.warn(`Block ${blockRevision} not found on Thor network`)
        return thorErrorResponse('Block not found')
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(block) }],
        structuredContent: {
          ok: true,
          network: getThorNetworkType(),
          data: block,
        },
      }
    } catch (error) {
      logger.warn(`Error getting block ${blockRevision} from Thor network:`, error)
      return thorErrorResponse(`Error getting block ${blockRevision} from Thor network: ${error}`)
    }
  },
}
