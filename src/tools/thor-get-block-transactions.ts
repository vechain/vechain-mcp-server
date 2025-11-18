import type { z } from 'zod'
import {
  createThorStructuredOutputSchema,
  createThorToolResponseSchema,
  getThorClient,
  getThorNetworkType,
  ThorBlockRevisionSchema,
  ThorBlockTransactionListSchema,
  thorErrorResponse,
} from '@/services/thor'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

/**
 * Schemas for get block tool outputs
 */
const ThorGetBlockTransactionsOutputSchema = createThorStructuredOutputSchema(ThorBlockTransactionListSchema)
const ThorGetBlockTransactionsResponseSchema = createThorToolResponseSchema(ThorBlockTransactionListSchema)
type ThorGetBlockTransactionsResponse = z.infer<typeof ThorGetBlockTransactionsResponseSchema>

/**
 * Tool for getting block details from Thor network
 */
export const getBlockTransactions: MCPTool = {
  name: 'thorGetBlockTransactions',
  title: 'Thor Get Block Transactions',
  description: 'Get the transactions details from a block on Thor network',
  inputSchema: { blockRevision: ThorBlockRevisionSchema },
  outputSchema: ThorGetBlockTransactionsOutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async ({ blockRevision }: { blockRevision: string }): Promise<ThorGetBlockTransactionsResponse> => {
    try {
      logger.debug(`Getting block ${blockRevision} from Thor network`)

      const thorClient = getThorClient()
      const block = await thorClient.blocks.getBlockExpanded(blockRevision)

      if (block === null) {
        logger.warn(`Block ${blockRevision} not found on Thor network`)
        return thorErrorResponse('Block not found')
      }

      const transactions = block.transactions.map(transaction => ({
        ...transaction,
        id: transaction.id as `0x${string}`,
        blockRef: transaction.blockRef as `0x${string}`,
        origin: transaction.origin as `0x${string}`,
        delegator: transaction.delegator as `0x${string}` | null,
        nonce: transaction.nonce as `0x${string}`,
        dependsOn: transaction.dependsOn as `0x${string}` | null,
        gasPayer: transaction.gasPayer as `0x${string}`,
        outputs: transaction.outputs.map(output => ({
          ...output,
          events: output.events.map(event => ({
            ...event,
            data: event.data as `0x${string}`,
            address: event.address as `0x${string}`,
            topics: event.topics.map(t => t as `0x${string}`),
          })),
          transfers: output.transfers.map(transfer => ({
            ...transfer,
            sender: transfer.sender as `0x${string}`,
            recipient: transfer.recipient as `0x${string}`,
            amount: transfer.amount as `0x${string}`,
          })),
        })),
        maxFeePerGas: transaction.maxFeePerGas as `0x${string}` | undefined,
        maxPriorityFeePerGas: transaction.maxPriorityFeePerGas as `0x${string}` | undefined,
        gasPriceCoef: transaction.gasPriceCoef as number | undefined,
        paid: BigInt(transaction.paid),
        reward: BigInt(transaction.reward),
      }))

      return {
        content: [{ type: 'text', text: JSON.stringify(transactions) }],
        structuredContent: {
          ok: true,
          network: getThorNetworkType(),
          data: transactions,
        },
      }
    } catch (error) {
      logger.warn(`Error getting block ${blockRevision} from Thor network:`, error)
      return thorErrorResponse(`Error getting block ${blockRevision} from Thor network: ${error}`)
    }
  },
}
