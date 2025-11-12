import { Address } from '@vechain/sdk-core'
import { formatUnits, hexToBigInt } from 'viem'
import { z } from 'zod'
import {
  createThorStructuredOutputSchema,
  createThorToolResponseSchema,
  getThorClient,
  getThorNetworkType,
  HexStringSchema,
  ThorAddressSchema,
  thorErrorResponse,
} from '@/services/thor'
import type { VeChainTool } from '@/types'
import { logger } from '@/utils/logger'

/**
 * Schema for Thor account return data
 */
const ThorAccountDataSchema = z.object({
  address: ThorAddressSchema,
  VET: z.string().describe('The balance of VET in the account'),
  VTHO: z.string().describe('The balance of VTHO in the account'),
  type: z.enum(['wallet', 'contract']).describe('The type of the account'),
})

const ThorGetAccountOutputSchema = createThorStructuredOutputSchema(ThorAccountDataSchema)
const ThorGetAccountResponseSchema = createThorToolResponseSchema(ThorAccountDataSchema)
type ThorGetAccountResponse = z.infer<typeof ThorGetAccountResponseSchema>

/**
 * Tool for getting account details from Thor network
 */
export const getAccount: VeChainTool = {
  name: 'thorGetAccount',
  title: 'Thor Get Account',
  description: 'Get account details from Thor network',
  inputSchema: { address: ThorAddressSchema },
  outputSchema: ThorGetAccountOutputSchema.shape,
  annotations: {
    idempotentHint: false,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async ({ address }: { address: z.infer<typeof ThorAddressSchema> }): Promise<ThorGetAccountResponse> => {
    try {
      logger.debug(`Getting account ${address} from Thor network`)
      const thorClient = getThorClient()
      const account = await thorClient.accounts.getAccount(Address.of(address))
      if (account === null) {
        logger.warn(`Account ${address} not found on Thor network`)
        return thorErrorResponse('Account not found')
      }

      const VET = HexStringSchema.parse(account.balance)
      const VTHO = HexStringSchema.parse(account.energy)

      const data = {
        address,
        VET: formatUnits(hexToBigInt(VET), 18),
        VTHO: formatUnits(hexToBigInt(VTHO), 18),
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
