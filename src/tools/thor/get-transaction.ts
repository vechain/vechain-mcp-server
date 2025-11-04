import { z } from 'zod'
import { getThorClient, getThorNetworkType } from '../../config/network'
import { logger } from '../../utils/logger'
import type { VeChainTool } from '../VeChainTool'
import { createThorStructuredOutputSchema, createThorToolResponseSchema } from './ThorResponse'
import { ThorTransactionIdSchema } from './ThorSchemas'
import { thorErrorResponse } from './utils'

/**
 * Schemas for get transaction tool outputs
 */
// TODO: Define a schema for the transaction
const ThorTransactionSchema = z.unknown()

const ThorGetTransactionOutputSchema = createThorStructuredOutputSchema(ThorTransactionSchema.nullable())
const ThorGetTransactionResponseSchema = createThorToolResponseSchema(ThorTransactionSchema.nullable())
type ThorGetTransactionResponse = z.infer<typeof ThorGetTransactionResponseSchema>

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
  outputSchema: ThorGetTransactionOutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async ({ transactionId }: { transactionId: string }): Promise<ThorGetTransactionResponse> => {
    try {
      logger.debug(`Getting transaction ${transactionId} from Thor network`)
      const thorClient = getThorClient()
      const transaction = await thorClient.transactions.getTransaction(transactionId)
      if (transaction === null) {
        logger.warn(`Transaction ${transactionId} not found on Thor network`)
        return thorErrorResponse('Transaction not found')
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(transaction) }],
        structuredContent: {
          ok: true,
          network: getThorNetworkType(),
          data: transaction,
        },
      }
    } catch (error) {
      logger.warn(`Error getting transaction ${transactionId} from Thor network:`, error)
      return thorErrorResponse(`Error getting transaction ${transactionId} from Thor network: ${error}`)
    }
  },
}
