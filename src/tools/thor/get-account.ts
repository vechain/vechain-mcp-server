import { ThorClient, type AccountData } from "@vechain/sdk-network";
import { z } from "zod";
import { THOR_NETWORK_CONFIG } from "../../config/network";
import { logger } from "../../utils/logger";
import type { VeChainTool } from "../VeChainTool";
import { ThorStructuredOutputSchema, type ThorToolResponse } from "./ThorResponse";
import { ThorAccountSchema } from "./ThorSchemas";
import { Address } from "@vechain/sdk-core";

/**
 * Schema for Thor account return data
 */
export const ThorAccountDataSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]+$/, 'Account address must be a 0x-prefixed hash.').min(42).max(42),
  balance: z.bigint().describe('The balance of VET in the account'),
  energy: z.bigint().describe('The energy of VTHO in the account'),
  type: z.enum(['wallet', 'contract']).describe('The type of the account'),
})

export type ThorAccountData = z.infer<typeof ThorAccountDataSchema>

/**
 * Tool for getting account details from Thor network
 */
export const getAccount: VeChainTool = {
  name: "thorGetAccount",
  title: "Thor Get Account",
  description: "Get account details from Thor network",
  inputSchema: {
    address: ThorAccountSchema,
  },
  outputSchema: ThorStructuredOutputSchema.shape as z.ZodRawShape,
  handler: async ({ address }: { address: string }): Promise<ThorToolResponse<ThorAccountData>> => {
    try {
      logger.debug(`Getting account ${address} from Thor network`)
      const thorClient = ThorClient.at(THOR_NETWORK_CONFIG.url)
      const account = await thorClient.accounts.getAccount(Address.of(address))
      if (account === null) {
        logger.warn(`Account ${address} not found on Thor network`)
        return {
          content: [{ type: 'text', text: 'Account not found' }],
          structuredContent: {
            ok: false,
            network: THOR_NETWORK_CONFIG.type,
            error: 'Account not found',
          },
        }
      }
      const structuredAccount: ThorAccountData = {
        address: address,
        balance: BigInt(account.balance) / 10n ** 18n,
        energy: BigInt(account.energy) / 10n ** 18n,
        type: account.hasCode === true ? 'contract' : 'wallet',
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(structuredAccount) }],
        structuredContent: {
          ok: true,
          network: THOR_NETWORK_CONFIG.type,
          data: structuredAccount as ThorAccountData,
        },
      }
    } catch (error) {
      logger.warn(`Error getting account ${address} from Thor network:`, error)
      return {
        content: [{ type: 'text', text: `Error getting account ${address} from Thor network: ${error}` }],
        structuredContent: {
          ok: false,
          network: THOR_NETWORK_CONFIG.type,
          error: `Error getting account ${address} from Thor network: ${error}`,
        },
      }
    }
  },
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
  },
}