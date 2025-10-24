import { type CompressedBlockDetail, ThorClient } from '@vechain/sdk-network'
import type { z } from 'zod'
import { THOR_NETWORK_CONFIG } from '../../config/network'
import { logger } from '../../utils/logger'
import type { VeChainTool } from '../VeChainTool'
import { ThorStructuredOutputSchema, type ThorToolResponse } from './ThorResponse'
import { ThorBlockRevisionSchema } from './ThorSchemas'

/**
 * Tool for getting block details from Thor network
 */
export const getBlock: VeChainTool = {
  name: 'thorGetBlock',
  title: 'Thor Get Block',
  description: 'Get block details from Thor network',
  inputSchema: {
    blockRevision: ThorBlockRevisionSchema,
  },
  outputSchema: ThorStructuredOutputSchema.shape as z.ZodRawShape,
  handler: async ({ blockRevision }: { blockRevision: string }): Promise<ThorToolResponse<CompressedBlockDetail>> => {
    try {
      logger.debug(`Getting block ${blockRevision} from Thor network`)
      const thorClient = ThorClient.at(THOR_NETWORK_CONFIG.url)
      const block = await thorClient.blocks.getBlockCompressed(blockRevision)
      if (block === null) {
        logger.warn(`Block ${blockRevision} not found on Thor network`)
        return {
          content: [{ type: 'text', text: 'Block not found' }],
          structuredContent: {
            ok: false,
            network: THOR_NETWORK_CONFIG.type,
            error: 'Block not found',
          },
        }
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(block) }],
        structuredContent: {
          ok: true,
          network: THOR_NETWORK_CONFIG.type,
          data: block,
        },
      }
    } catch (error) {
      logger.warn(`Error getting block ${blockRevision} from Thor network:`, error)
      return {
        content: [{ type: 'text', text: `Error getting block ${blockRevision} from Thor network: ${error}` }],
        structuredContent: {
          ok: false,
          network: THOR_NETWORK_CONFIG.type,
          error: `Error getting block ${blockRevision} from Thor network: ${error}`,
        },
      }
    }
  },
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
}
