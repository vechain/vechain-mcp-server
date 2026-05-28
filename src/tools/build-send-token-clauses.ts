import { z } from 'zod'
import {
  type Clause,
  buildErrorResponse,
  buildSuccessResponse,
  type BuildResponse,
  BuildResultOutputSchema,
  encoders,
  parseUnits,
  resolveTokenOrThrow,
  toHex,
  WalletAddressInputSchema,
} from '@/services/clause-builder'
import { getThorNetworkType } from '@/services/thor'
import { resolveVnsOrAddress } from '@/services/vns'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

const InputSchema = z.object({
  walletAddress: WalletAddressInputSchema,
  tokenSymbolOrAddress: z
    .string()
    .min(1)
    .describe('Token symbol (VET, VTHO, B3TR, …) or 0x ERC20 address.'),
  amount: z
    .string()
    .describe('Human-readable amount (e.g. "1.5"). Decimals are inferred from the token registry.'),
  to: z
    .string()
    .min(1)
    .describe(
      "Recipient: a 0x address OR a VNS name ending in .vet (e.g. 'davus.vet'). VNS names are resolved server-side.",
    ),
})

type Input = z.infer<typeof InputSchema>

export const buildSendTokenClauses: MCPTool = {
  name: 'buildSendTokenClauses',
  title: 'Build clauses for a token transfer (VET native or ERC20)',
  description:
    'Build the multi-clause transaction payload for sending a token from `walletAddress` to a recipient. Handles native VET transfers (single clause with `value`) AND ERC20 `transfer(to, amount)`. Resolves the token symbol via the builtin set + VeChain token registry, and resolves VNS recipient names (e.g. "davus.vet") to their 0x address. Returns the same `{clauses, summary, gasHint}` shape every build*Clauses tool emits — pass `clauses` straight to VeWorld / dApp Kit / vechain-kit. Server NEVER signs or broadcasts.',
  inputSchema: InputSchema.shape,
  outputSchema: BuildResultOutputSchema.shape,
  annotations: {
    idempotentHint: false,
    openWorldHint: true,
    readOnlyHint: false,
    destructiveHint: true,
  },
  handler: async (params: Input): Promise<BuildResponse> => {
    const network = getThorNetworkType()
    try {
      const parsed = InputSchema.parse(params ?? {})
      const token = await resolveTokenOrThrow(parsed.tokenSymbolOrAddress)
      const amount = parseUnits(parsed.amount, token.decimals)
      if (amount <= 0n) throw new Error('Amount must be > 0')

      const recipient = (await resolveVnsOrAddress(parsed.to)) as string
      const display =
        recipient.toLowerCase() === parsed.to.toLowerCase()
          ? recipient
          : `${parsed.to} (${recipient})`

      if (token.isNative) {
        const clauses: Clause[] = [
          {
            to: recipient,
            value: toHex(amount),
            data: '0x',
            comment: `Send ${parsed.amount} VET to ${display}`,
          },
        ]
        return buildSuccessResponse({
          network,
          clauses,
          summary: `Send ${parsed.amount} VET to ${display}`,
          gasHint: 21_000,
        })
      }

      const clauses: Clause[] = [
        {
          to: token.address,
          value: '0x0',
          data: encoders.erc20.transfer(recipient, amount),
          comment: `Send ${parsed.amount} ${token.symbol} to ${display}`,
        },
      ]
      return buildSuccessResponse({
        network,
        clauses,
        summary: `Send ${parsed.amount} ${token.symbol} to ${display}`,
        gasHint: 70_000,
      })
    } catch (error) {
      logger.warn(`Error in buildSendTokenClauses: ${String(error)}`)
      return buildErrorResponse(network, String(error))
    }
  },
}
