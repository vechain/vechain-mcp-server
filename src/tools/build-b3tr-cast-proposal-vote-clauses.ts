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
  proposalId: z
    .string()
    .regex(/^[0-9]+$/, 'proposalId must be a numeric string')
    .describe('B3TR Governor proposal id (decimal string).'),
  support: z
    .number()
    .int()
    .min(0)
    .max(2)
    .describe('Vote choice: 0 = Against, 1 = For, 2 = Abstain (Bravo enum).'),
  reason: z.string().optional().default('').describe('Optional comment recorded with the vote.'),
})

const SUPPORT_LABEL: Record<number, string> = { 0: 'Against', 1: 'For', 2: 'Abstain' }

type Input = z.infer<typeof InputSchema>

export const buildB3trCastProposalVoteClauses: MCPTool = {
  name: 'buildB3trCastProposalVoteClauses',
  title: 'Build clauses to cast a vote on a B3TR Governor proposal',
  description:
    'Build the single-clause payload that calls `B3TRGovernor.castVoteWithReason(proposalId, support, reason)`. `support` is the Bravo enum: 0=Against, 1=For, 2=Abstain. Pre-check: verify proposal state is Active and the user has voting power and has not voted via `getB3TRProposalUserState`. Server NEVER signs.',
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
      const governorAddr = resolveAddress('b3trGovernor')
      const data = encoders.b3trGovernor.castVoteWithReason(
        BigInt(parsed.proposalId),
        parsed.support,
        parsed.reason,
      )
      const label = SUPPORT_LABEL[parsed.support]
      const clauses: Clause[] = [
        {
          to: governorAddr,
          value: '0x0',
          data,
          comment: `Vote ${label} on proposal ${parsed.proposalId}${parsed.reason ? ` (reason: ${parsed.reason})` : ''}`,
        },
      ]
      return buildSuccessResponse({
        network,
        clauses,
        summary: `Vote ${label} on B3TR Governor proposal ${parsed.proposalId}`,
        gasHint: 250_000,
      })
    } catch (error) {
      logger.warn(`Error in buildB3trCastProposalVoteClauses: ${String(error)}`)
      return buildErrorResponse(network, String(error))
    }
  },
}
