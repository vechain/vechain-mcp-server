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
  roundIds: z
    .array(z.string().regex(/^[0-9]+$/, 'roundId must be a numeric string'))
    .min(1)
    .describe(
      'Round ids (decimal strings) with non-zero claimable amounts. Submitting a round with zero reward will revert.',
    ),
})

type Input = z.infer<typeof InputSchema>

export const buildB3trClaimVoterRewardsClauses: MCPTool = {
  name: 'buildB3trClaimVoterRewardsClauses',
  title: 'Build clauses to claim B3TR voter rewards for completed rounds',
  description:
    'Build a multi-clause payload that calls `VoterRewards.claimReward(roundId, voter)` once per round. Pre-check: ALWAYS call `getB3TRClaimableVoterRewards` first and pass only the roundIds with `amount > 0`. Submitting a round with zero reward will revert. Server NEVER signs.',
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

      const seen = new Set<string>()
      for (const id of parsed.roundIds) {
        if (seen.has(id)) throw new Error(`Duplicate roundId: ${id}`)
        seen.add(id)
      }

      const voterRewardsAddr = resolveAddress('voterRewards')
      const clauses: Clause[] = parsed.roundIds.map(id => ({
        to: voterRewardsAddr,
        value: '0x0',
        data: encoders.voterRewards.claimReward(BigInt(id), parsed.walletAddress),
        comment: `Claim voter rewards for round ${id}`,
      }))

      return buildSuccessResponse({
        network,
        clauses,
        summary: `Claim voter rewards for round(s) ${parsed.roundIds.join(', ')}`,
        gasHint: 90_000 * parsed.roundIds.length,
      })
    } catch (error) {
      logger.warn(`Error in buildB3trClaimVoterRewardsClauses: ${String(error)}`)
      return buildErrorResponse(network, String(error))
    }
  },
}
