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

const APP_ID_REGEX = /^0x[0-9a-fA-F]{64}$/

const VoteEntrySchema = z.object({
  appId: z
    .string()
    .regex(APP_ID_REGEX, 'appId must be 0x + 64 hex chars (bytes32)')
    .describe('VeBetterDAO app id (32-byte hex, NOT a 20-byte address).'),
  weight: z
    .string()
    .describe(
      "Vote weight in human-readable units (e.g. '1' = 1 VOT3 of voting power). Sum across votes must be <= the user's voting power at the round snapshot.",
    ),
})

const InputSchema = z.object({
  walletAddress: WalletAddressInputSchema,
  roundId: z
    .string()
    .regex(/^[0-9]+$/, 'roundId must be a numeric string')
    .describe('X-allocation round id (decimal string). Read it from `getCurrentRound`.'),
  votes: z.array(VoteEntrySchema).min(1).describe('List of {appId, weight} pairs (entries with weight 0 are dropped).'),
})

type Input = z.infer<typeof InputSchema>

export const buildB3trCastAllocationVotesClauses: MCPTool = {
  name: 'buildB3trCastAllocationVotesClauses',
  title: 'Build clauses to cast x-allocation votes for the current round',
  description:
    'Build the single-clause payload that calls `XAllocationVoting.castVote(roundId, appIds, weights)` to distribute B3TR rewards to VeBetterDAO apps for the chosen round. Drops entries with weight 0, enforces unique appIds, and parses weights as 18-decimal VOT3 units. Pre-checks the agent should run BEFORE calling: `getCurrentRound`, `getB3TRRoundVotingState` (hasVoted=false, votingPower>0), and `getVOT3Delegate` (smart-account users must self-delegate first). Server NEVER signs.',
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

      const filtered = parsed.votes.filter(v => Number(v.weight) > 0)
      if (filtered.length === 0) {
        throw new Error('At least one vote with weight > 0 is required')
      }

      const seen = new Set<string>()
      for (const v of filtered) {
        const lower = v.appId.toLowerCase()
        if (seen.has(lower)) throw new Error(`Duplicate appId: ${v.appId}`)
        seen.add(lower)
      }

      const appIds = filtered.map(v => v.appId)
      const weights = filtered.map(v => parseUnits(v.weight, 18))
      if (weights.some(w => w <= 0n)) {
        throw new Error('All vote weights must be > 0 after parsing')
      }

      const xAllocationVotingAddr = resolveAddress('xAllocationVoting')
      const data = encoders.xAllocationVoting.castVote(BigInt(parsed.roundId), appIds, weights)
      const clauses: Clause[] = [
        {
          to: xAllocationVotingAddr,
          value: '0x0',
          data,
          comment: `Cast x-allocation vote on round ${parsed.roundId} for ${filtered.length} app(s)`,
        },
      ]
      const totalWeight = filtered.reduce((acc, v) => acc + Number(v.weight), 0)
      return buildSuccessResponse({
        network,
        clauses,
        summary: `Cast x-allocation vote on round ${parsed.roundId}: ${filtered.length} app(s), total weight ${totalWeight}`,
        gasHint: 200_000 + filtered.length * 60_000,
      })
    } catch (error) {
      logger.warn(`Error in buildB3trCastAllocationVotesClauses: ${String(error)}`)
      return buildErrorResponse(network, String(error))
    }
  },
}
