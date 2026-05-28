import { z } from 'zod'
import { resolveStargateLevel, type StargateTier } from '@/services/stargate-levels'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import {
  IndexerGetValidatorsParamsSchema,
  IndexerValidatorSchema,
} from '@/services/veworld-indexer/schemas'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

const TierEnum = z.enum([
  'Strength',
  'Thunder',
  'Mjolnir',
  'VeThorX',
  'StrengthX',
  'ThunderX',
  'MjolnirX',
  'Dawn',
  'Lightning',
  'Flash',
])

const InputSchema = z.object({
  tier: TierEnum.optional().describe(
    "Stargate tier to evaluate APY for. Required to get tier-specific yield. Defaults to 'Dawn' if neither tier nor levelId nor amount is given.",
  ),
  levelId: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe(
      'Alternative to `tier` (resolved via the same on-chain mapping; e.g. 8=Dawn).',
    ),
  amount: z
    .string()
    .optional()
    .describe(
      "Alternative to `tier`: VET amount that maps 1:1 to a tier (e.g. '10000' \u2192 Dawn).",
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .describe('Maximum validators to return, sorted by projected APY (default 5).'),
  includeQueued: z
    .boolean()
    .optional()
    .describe('Include QUEUED validators (not yet active) in addition to ACTIVE. Default false.'),
  maxOfflinePercent: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe('Drop validators whose offline% is above this threshold. Default 30.'),
})

const CuratedValidatorSchema = z.object({
  validator: z.string(),
  status: z.string(),
  projectedApyPercent: z.number().optional(),
  currentApyPercent: z.number().optional(),
  percentageOffline: z.number(),
  blockProbability: z.number().optional(),
  delegatorTvlUsd: z.number().optional(),
  totalTvlUsd: z.number().optional(),
})

const DataSchema = z.object({
  network: z.string(),
  tier: TierEnum,
  count: z.number().int(),
  validators: z.array(CuratedValidatorSchema),
  notes: z.string(),
})

const OutputSchema = z.object({
  ok: z.boolean(),
  network: z.string(),
  data: DataSchema.nullable().optional(),
  error: z.string().optional(),
})

type Input = z.infer<typeof InputSchema>
type Response = {
  content: Array<{ type: 'text'; text: string }>
  structuredContent: z.infer<typeof OutputSchema>
}

function pickTier(args: Input): StargateTier {
  if (!args.tier && args.levelId === undefined && !args.amount) return 'Dawn'
  return resolveStargateLevel(args).tier
}

export const getCuratedStargateValidators: MCPTool = {
  name: 'getCuratedStargateValidators',
  title: 'Stargate: top validators ranked by projected next-cycle APY',
  description:
    'Return the top Stargate validators ranked by projected next-cycle APY for a chosen NFT tier. Use this BEFORE buildStargateStakeAndDelegateClauses to pick the best validator. Wraps the indexer `getValidators` and applies a sane default policy: filter by ACTIVE status (unless `includeQueued=true`), drop validators with offline% above `maxOfflinePercent` (default 30), sort by `nftYieldsIfDelegatedNextCycle[tier]` desc. Output: `{ tier, validators: [{ validator, projectedApyPercent, currentApyPercent, percentageOffline, blockProbability, delegatorTvlUsd, totalTvlUsd, status }] }`. The agent should pass `validators[0].validator` to buildStargateStakeAndDelegateClauses.',
  inputSchema: InputSchema.shape,
  outputSchema: OutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (params: Input): Promise<Response> => {
    const network = getThorNetworkType()
    try {
      const parsed = InputSchema.parse(params ?? {})
      const tier = pickTier(parsed)
      const limit = parsed.limit ?? 5
      const maxOffline = parsed.maxOfflinePercent ?? 30
      const status = parsed.includeQueued ? undefined : 'ACTIVE'

      const indexerParams = IndexerGetValidatorsParamsSchema.parse({
        ...(status ? { status } : {}),
        sortBy: `nft:${tier}`,
        size: Math.max(limit * 2, 10),
        direction: 'DESC',
      })

      const response = await veworldIndexerGet<
        typeof IndexerValidatorSchema,
        typeof IndexerGetValidatorsParamsSchema
      >({
        endPoint: '/api/v1/validators',
        // biome-ignore lint/suspicious/noExplicitAny: indexer adapter accepts the parsed params shape
        params: indexerParams as any,
      })

      if (!response?.data) {
        const err = { ok: false, network, error: 'Failed to fetch validators from indexer' }
        return {
          content: [{ type: 'text', text: JSON.stringify(err) }],
          structuredContent: err,
        }
      }

      const list = response.data
      const curated = list
        .map(v => ({
          validator: v.id,
          status: v.status,
          projectedApyPercent: v.nftYieldsIfDelegatedNextCycle?.[tier],
          currentApyPercent: v.nftYields?.[tier],
          percentageOffline: v.percentageOffline ?? 0,
          blockProbability: v.blockProbability,
          delegatorTvlUsd: v.delegatorTvl,
          totalTvlUsd: v.totalTvl,
        }))
        .filter(v => v.projectedApyPercent !== undefined)
        .filter(v => v.percentageOffline <= maxOffline)
        .sort((a, b) => (b.projectedApyPercent ?? 0) - (a.projectedApyPercent ?? 0))
        .slice(0, limit)

      const notes =
        curated.length === 0
          ? `No active validators found for tier ${tier} with offline% <= ${maxOffline}.`
          : `Sorted by projectedApyPercent (next-cycle). Pass validators[0].validator to buildStargateStakeAndDelegateClauses.`

      const data = { network, tier, count: curated.length, validators: curated, notes }
      const result = { ok: true, network, data }
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result,
      }
    } catch (error) {
      logger.warn(`Error in getCuratedStargateValidators: ${String(error)}`)
      const err = { ok: false, network, error: String(error) }
      return {
        content: [{ type: 'text', text: JSON.stringify(err) }],
        structuredContent: err,
      }
    }
  },
}
