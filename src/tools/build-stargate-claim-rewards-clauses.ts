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
  tokenIds: z
    .array(z.string())
    .min(1)
    .describe('Stargate NFT tokenIds (decimal strings) to claim accrued VTHO rewards for.'),
})

type Input = z.infer<typeof InputSchema>

export const buildStargateClaimRewardsClauses: MCPTool = {
  name: 'buildStargateClaimRewardsClauses',
  title: 'Build clauses to claim accrued VTHO rewards for Stargate NFTs',
  description:
    'Build a multi-clause payload that calls `Stargate.claimRewards(tokenId)` once per supplied NFT. Each clause is independent so the wallet can drop a failing one without aborting the others. Server NEVER signs.',
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
      const stargateAddr = resolveAddress('stargate')
      const clauses: Clause[] = parsed.tokenIds.map(id => {
        const tokenId = BigInt(id)
        return {
          to: stargateAddr,
          value: '0x0',
          data: encoders.stargate.claimRewards(tokenId),
          comment: `Claim rewards for NFT #${id}`,
        }
      })
      return buildSuccessResponse({
        network,
        clauses,
        summary: `Claim Stargate rewards for NFT(s) ${parsed.tokenIds.join(', ')}`,
        gasHint: 180_000 * parsed.tokenIds.length,
      })
    } catch (error) {
      logger.warn(`Error in buildStargateClaimRewardsClauses: ${String(error)}`)
      return buildErrorResponse(network, String(error))
    }
  },
}
