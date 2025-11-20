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
import { resolveVnsOrAddress, VnsNameSchema } from '@/services/vns'
import type { MCPTool } from '@/types'
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
export const ThorGetAccountResponseSchema = createThorToolResponseSchema(ThorAccountDataSchema)
type ThorGetAccountResponse = z.infer<typeof ThorGetAccountResponseSchema>

const ThorGetAccountInputSchema = z.object({
  address: z.union([ThorAddressSchema, VnsNameSchema]).describe('Thor address (0x...) or VNS (.vet) name'),
})

/**
 * Tool for getting account details from Thor network
 */
export const getAccount: MCPTool = {
  name: 'thorGetAccount',
  title: 'Thor Get Account',
  description: 'Get account details from Thor network',
  inputSchema: ThorGetAccountInputSchema.shape,
  outputSchema: ThorGetAccountOutputSchema.shape,
  annotations: {
    idempotentHint: false,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async ({ address }: z.infer<typeof ThorGetAccountInputSchema>): Promise<ThorGetAccountResponse> => {
    try {
      const inputAddress = String(address)
      const resolvedAddress = await resolveVnsOrAddress(inputAddress)
      const resolvedAddressHex = resolvedAddress as `0x${string}`

      logger.debug(`Getting account ${inputAddress} (resolved: ${resolvedAddressHex}) from Thor network`)
      const thorClient = getThorClient()
      const account = await thorClient.accounts.getAccount(Address.of(resolvedAddressHex))
      if (account === null) {
        logger.warn(`Account ${resolvedAddressHex} (input: ${address}) not found on Thor network`)
        return thorErrorResponse('Account not found')
      }

      const VET = HexStringSchema.parse(account.balance)
      const VTHO = HexStringSchema.parse(account.energy)

      const data = {
        address: resolvedAddressHex,
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
