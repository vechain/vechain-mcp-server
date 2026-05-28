import { z } from 'zod'
import {
  type Clause,
  buildErrorResponse,
  buildSuccessResponse,
  type BuildResponse,
  BuildResultOutputSchema,
  encoders,
  parseUnits,
  WalletAddressInputSchema,
} from '@/services/clause-builder'
import { resolveAddress } from '@/services/contracts-registry'
import { getThorNetworkType } from '@/services/thor'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

const InputSchema = z.object({
  walletAddress: WalletAddressInputSchema,
  amount: z
    .string()
    .describe(
      'Human-readable VOT3 amount to convert back to B3TR. Cap is `swappableVot3` (only VOT3 obtained via convertToVOT3, not via transfer).',
    ),
})

type Input = z.infer<typeof InputSchema>

export const buildB3trConvertToB3trClauses: MCPTool = {
  name: 'buildB3trConvertToB3trClauses',
  title: 'Build clauses to convert VOT3 back into B3TR',
  description:
    'Build the single-clause payload that calls `VOT3.convertToB3TR(amount)` to swap `amount` VOT3 back to B3TR. The Vot3 contract enforces the `swappableVot3` cap (only VOT3 obtained via convertToVOT3 is convertible — VOT3 received via transfer is not). Server NEVER signs.',
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
      const amount = parseUnits(parsed.amount, 18)
      if (amount <= 0n) throw new Error('Amount must be > 0')
      const vot3Addr = resolveAddress('vot3')
      const clauses: Clause[] = [
        {
          to: vot3Addr,
          value: '0x0',
          data: encoders.vot3.convertToB3TR(amount),
          comment: `Convert ${parsed.amount} VOT3 back to B3TR`,
        },
      ]
      return buildSuccessResponse({
        network,
        clauses,
        summary: `Convert ${parsed.amount} VOT3 back to B3TR`,
        gasHint: 130_000,
      })
    } catch (error) {
      logger.warn(`Error in buildB3trConvertToB3trClauses: ${String(error)}`)
      return buildErrorResponse(network, String(error))
    }
  },
}
