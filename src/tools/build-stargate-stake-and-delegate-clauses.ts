import { z } from 'zod'
import {
  type Clause,
  buildErrorResponse,
  buildSuccessResponse,
  type BuildResponse,
  BuildResultOutputSchema,
  encoders,
  fetchStargateBoostAmount,
  formatWei,
  parseUnits,
  toHex,
  WalletAddressInputSchema,
} from '@/services/clause-builder'
import { resolveAddress } from '@/services/contracts-registry'
import { resolveStargateLevel } from '@/services/stargate-levels'
import { getThorNetworkType } from '@/services/thor'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

const InputShape = {
  walletAddress: WalletAddressInputSchema,
  tier: z
    .enum(['Dawn', 'Lightning', 'Flash', 'Strength', 'Thunder', 'Mjolnir'])
    .optional()
    .describe(
      'Stargate tier name. Preferred way to choose the tier. Mintable tiers and required VET: Dawn=10000, Lightning=50000, Flash=200000, Strength=1000000, Thunder=5000000, Mjolnir=15000000.',
    ),
  levelId: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe(
      'On-chain level id. WARNING: ids are NOT sorted by size. Prefer passing `tier` instead.',
    ),
  validator: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/)
    .describe('Validator address to delegate the freshly minted Stargate NFT to.'),
  amount: z
    .string()
    .describe(
      'Exact VET amount required by Stargate for the chosen tier. Must equal the tier\'s required value (Stargate rejects any other amount).',
    ),
}

const InputSchema = z.object(InputShape).refine(
  a => a.levelId !== undefined || a.tier !== undefined || a.amount !== undefined,
  { message: 'Provide tier, levelId, or amount so the level can be resolved' },
)

type Input = z.infer<typeof InputSchema>

export const buildStargateStakeAndDelegateClauses: MCPTool = {
  name: 'buildStargateStakeAndDelegateClauses',
  title: 'Build clauses to stake VET, mint a Stargate NFT and delegate it',
  description:
    'Build the multi-clause payload to (1) approve VTHO for the per-level boost fee and (2) call `Stargate.stakeAndDelegate(levelId, validator)` with the exact VET attached. Resolves the level from `tier` (preferred), `levelId` or `amount`, validates that the supplied `amount` matches the tier exactly, and reads `StargateNFT.boostAmountOfLevel` to compute the precise VTHO approval. Server NEVER signs.',
  inputSchema: InputShape,
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
      const level = resolveStargateLevel(parsed)
      if (!level.mintable) {
        throw new Error(
          `Stargate tier "${level.tier}" (level ${level.id}) is reserved for legacy node migration and cannot be staked directly.`,
        )
      }
      if (parsed.amount !== level.vet) {
        throw new Error(
          `Wrong VET amount for tier "${level.tier}" (level ${level.id}): required ${level.vet} VET, got ${parsed.amount} VET. Stargate requires the exact tier amount.`,
        )
      }

      const value = parseUnits(level.vet, 18)
      const stargateAddr = resolveAddress('stargate')
      const stargateNftAddr = resolveAddress('stargateNft')
      const vthoAddr = resolveAddress('vtho')

      const boostFee = await fetchStargateBoostAmount({
        stargateNftAddress: stargateNftAddr,
        levelId: level.id,
      })

      const clauses: Clause[] = [
        {
          to: vthoAddr,
          value: '0x0',
          data: encoders.erc20.approve(stargateNftAddr, boostFee),
          comment: `Approve ${formatWei(boostFee)} VTHO to StargateNFT for boost fee`,
        },
        {
          to: stargateAddr,
          value: toHex(value),
          data: encoders.stargate.stakeAndDelegate(level.id, parsed.validator),
          comment: `Stake ${level.vet} VET (${level.tier}, level ${level.id}) and delegate to ${parsed.validator}`,
        },
      ]

      return buildSuccessResponse({
        network,
        clauses,
        summary: `Stake ${level.vet} VET as ${level.tier} (level ${level.id}) and delegate to ${parsed.validator}`,
        gasHint: 750_000,
      })
    } catch (error) {
      logger.warn(`Error in buildStargateStakeAndDelegateClauses: ${String(error)}`)
      return buildErrorResponse(network, String(error))
    }
  },
}
