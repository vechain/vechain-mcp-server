import { z } from 'zod'
import {
  type Clause,
  buildErrorResponse,
  buildSuccessResponse,
  type BuildResponse,
  BuildResultOutputSchema,
  encoders,
  WalletAddressInputSchema,
} from '@/services/clause-builder'
import { resolveAddress } from '@/services/contracts-registry'
import { getThorNetworkType } from '@/services/thor'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

const InputSchema = z.object({
  walletAddress: WalletAddressInputSchema,
  delegatee: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/)
    .optional()
    .describe(
      'Optional delegate address. When omitted, defaults to `walletAddress` (self-delegation).',
    ),
})

type Input = z.infer<typeof InputSchema>

export const buildB3trDelegateVot3Clauses: MCPTool = {
  name: 'buildB3trDelegateVot3Clauses',
  title: 'Build clauses to delegate VOT3 voting power',
  description:
    'Build the single-clause payload that calls `VOT3.delegate(delegatee)`. Self-delegation is REQUIRED for smart-account / Privy users to capture VOT3 voting power at the round snapshot. Pre-check: call `getVOT3Delegate` first; emit this only when `isSelfDelegated=false`. Server NEVER signs.',
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
      const target = (parsed.delegatee ?? parsed.walletAddress).toLowerCase()
      const isSelf = target === parsed.walletAddress.toLowerCase()

      const vot3Addr = resolveAddress('vot3')
      const clauses: Clause[] = [
        {
          to: vot3Addr,
          value: '0x0',
          data: encoders.vot3.delegate(target),
          comment: isSelf
            ? `Self-delegate VOT3 voting power (required for snapshot capture)`
            : `Delegate VOT3 voting power to ${target}`,
        },
      ]
      return buildSuccessResponse({
        network,
        clauses,
        summary: isSelf
          ? `Self-delegate VOT3 (activate voting power)`
          : `Delegate VOT3 voting power to ${target}`,
        gasHint: 120_000,
      })
    } catch (error) {
      logger.warn(`Error in buildB3trDelegateVot3Clauses: ${String(error)}`)
      return buildErrorResponse(network, String(error))
    }
  },
}
