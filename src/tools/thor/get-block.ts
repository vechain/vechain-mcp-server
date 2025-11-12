import { z } from 'zod'
import { logger } from '@/utils/logger'
import type { VeChainTool } from '../VeChainTool'
import { getThorClient, getThorNetworkType } from './config'
import { ThorBlockRevisionSchema } from './schemas'
import { createThorStructuredOutputSchema, createThorToolResponseSchema, thorErrorResponse } from './utils'

/**
 * Schemas for get block tool outputs
 */

// TODO: Define a schema for the compressed block
const ThorBlockCompressedSchema = z.unknown()

const ThorGetBlockOutputSchema = createThorStructuredOutputSchema(ThorBlockCompressedSchema)
const ThorGetBlockResponseSchema = createThorToolResponseSchema(ThorBlockCompressedSchema)
type ThorGetBlockResponse = z.infer<typeof ThorGetBlockResponseSchema>

/**
 * Tool for getting block details from Thor network
 */
export const getBlock: VeChainTool = {
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
