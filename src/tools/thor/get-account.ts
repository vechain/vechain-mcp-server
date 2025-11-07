import { Address } from '@vechain/sdk-core'
import { z } from 'zod'
import { getThorClient, getThorNetworkType } from '../../config/network'
import { logger } from '../../utils/logger'
import type { VeChainTool } from '../VeChainTool'
import { createThorStructuredOutputSchema, createThorToolResponseSchema } from './ThorResponse'
import { ThorAddresstSchema } from './ThorSchemas'
import { thorErrorResponse } from './utils'

/**
 * Schema for Thor account return data
 */
const ThorAccountDataSchema = z.object({
  address: ThorAddresstSchema,
  VET: z.bigint().describe('The balance of VET in the account'),
  VTHO: z.bigint().describe('The balance of VTHO in the account'),
  type: z.enum(['wallet', 'contract']).describe('The type of the account'),
})

const ThorGetAccountOutputSchema = createThorStructuredOutputSchema(ThorAccountDataSchema.nullable())
const ThorGetAccountResponseSchema = createThorToolResponseSchema(ThorAccountDataSchema.nullable())
type ThorGetAccountResponse = z.infer<typeof ThorGetAccountResponseSchema>

/**
 * Tool for getting account details from Thor network
 */
export const getAccount: VeChainTool = {
  name: 'thorGetAccount',
  title: 'Thor Get Account',
  description: 'Get account details from Thor network',
  inputSchema: { address: ThorAddresstSchema },
  outputSchema: ThorGetAccountOutputSchema.shape,
  annotations: {
    idempotentHint: false,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async ({ address }: { address: z.infer<typeof ThorAddresstSchema> }): Promise<ThorGetAccountResponse> => {
    try {
      logger.debug(`Getting account ${address} from Thor network`)
      const thorClient = getThorClient()
      const account = await thorClient.accounts.getAccount(Address.of(address))
      if (account === null) {
        logger.warn(`Account ${address} not found on Thor network`)
        return thorErrorResponse('Account not found')
      }

      const data = {
        address,
        VET: BigInt(account.balance) / 10n ** 18n,
        VTHO: BigInt(account.energy) / 10n ** 18n,
        type: account.hasCode === true ? 'contract' : 'wallet',
      } satisfies z.infer<typeof ThorAccountDataSchema>

      return {
        content: [{ type: 'text', text: JSON.stringify(data) }],
        structuredContent: {
          ok: true,
          network: getThorNetworkType(),
          data,
        },
      }
    } catch (error) {
      logger.warn(`Error getting account ${address} from Thor network:`, error)
      return thorErrorResponse(`Error getting account ${address} from Thor network: ${error}`)
    }
  },
}
