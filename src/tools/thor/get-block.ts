import { getThorClient, getThorNetworkType } from '../../config/network'
import { logger } from '../../utils/logger'
import type { VeChainTool } from '../VeChainTool'
import { ThorStructuredOutputSchema, type ThorToolResponseType } from './ThorResponse'
import { ThorBlockRevisionSchema } from './ThorSchemas'
import { thorErrorResponse } from './utils'

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
  outputSchema: ThorStructuredOutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async ({ blockRevision }: { blockRevision: string }): Promise<ThorToolResponseType> => {
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
