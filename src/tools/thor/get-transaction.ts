import { ThorClient, type TransactionDetailNoRaw } from '@vechain/sdk-network'
import type { z } from 'zod'
import { THOR_NETWORK_CONFIG } from '../../config/network'
import { logger } from '../../utils/logger'
import type { VeChainTool } from '../VeChainTool'
import { ThorStructuredOutputSchema, type ThorToolResponse } from './ThorResponse'
import { ThorTransactionIdSchema } from './ThorSchemas'

/**
 * Tool for getting transaction details from Thor network
 */
export const getTransaction: VeChainTool = {
  name: 'thorGetTransaction',
  title: 'Thor Get Transaction',
  description: 'Get transaction details from Thor network',
  inputSchema: {
    transactionId: ThorTransactionIdSchema,
  },
  outputSchema: ThorStructuredOutputSchema.shape as z.ZodRawShape,
  handler: async ({ transactionId }: { transactionId: string }): Promise<ThorToolResponse<TransactionDetailNoRaw>> => {
    try {
      logger.debug(`Getting transaction ${transactionId} from Thor network`)
      const thorClient = ThorClient.at(THOR_NETWORK_CONFIG.url)
      const transaction = await thorClient.transactions.getTransaction(transactionId)
      if (transaction === null) {
        logger.warn(`Transaction ${transactionId} not found on Thor network`)
        return {
          content: [{ type: 'text', text: 'Transaction not found' }],
          structuredContent: {
            ok: false,
            network: THOR_NETWORK_CONFIG.type,
            error: 'Transaction not found',
          },
        }
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(transaction) }],
        structuredContent: {
          ok: true,
          network: THOR_NETWORK_CONFIG.type,
          data: transaction,
        },
      }
    } catch (error) {
      logger.warn(`Error getting transaction ${transactionId} from Thor network:`, error)
      return {
        content: [{ type: 'text', text: `Error getting transaction ${transactionId} from Thor network: ${error}` }],
        structuredContent: {
          ok: false,
          network: THOR_NETWORK_CONFIG.type,
          error: `Error getting transaction ${transactionId} from Thor network: ${error}`,
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
