import { z } from 'zod'
import {
  type Clause,
  buildErrorResponse,
  buildSuccessResponse,
  type BuildResponse,
  BuildResultOutputSchema,
  encoders,
  fetchErc20Allowance,
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
    .describe('Human-readable B3TR amount to convert into VOT3 (1 B3TR = 1 VOT3, no swap pricing).'),
})

type Input = z.infer<typeof InputSchema>

export const buildB3trConvertToVot3Clauses: MCPTool = {
  name: 'buildB3trConvertToVot3Clauses',
  title: 'Build clauses to convert B3TR into VOT3',
  description:
    'Build the multi-clause payload that converts `amount` B3TR into VOT3 (1:1). Reads the current allowance and prepends an `approve(vot3, amount)` clause only if the existing allowance is insufficient, then calls `VOT3.convertToVOT3(amount)`. Use this whenever the user wants voting power. Server NEVER signs.',
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

      const b3trAddr = resolveAddress('b3tr')
      const vot3Addr = resolveAddress('vot3')
      const allowance = await fetchErc20Allowance({
        tokenAddress: b3trAddr,
        owner: parsed.walletAddress,
        spender: vot3Addr,
      })

      const clauses: Clause[] = []
      if (allowance < amount) {
        clauses.push({
          to: b3trAddr,
          value: '0x0',
          data: encoders.erc20.approve(vot3Addr, amount),
          comment: `Approve VOT3 contract to spend ${parsed.amount} B3TR`,
        })
      }
      clauses.push({
        to: vot3Addr,
        value: '0x0',
        data: encoders.vot3.convertToVOT3(amount),
        comment: `Convert ${parsed.amount} B3TR to VOT3`,
      })

      return buildSuccessResponse({
        network,
        clauses,
        summary: `Convert ${parsed.amount} B3TR to VOT3${clauses.length === 2 ? ' (with approve)' : ''}`,
        gasHint: clauses.length === 2 ? 220_000 : 130_000,
      })
    } catch (error) {
      logger.warn(`Error in buildB3trConvertToVot3Clauses: ${String(error)}`)
      return buildErrorResponse(network, String(error))
    }
  },
}
