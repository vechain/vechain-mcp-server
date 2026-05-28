import { z } from 'zod'
import { STARGATE_LEVELS } from '@/services/stargate-levels'
import { getThorNetworkType } from '@/services/thor'
import type { MCPTool } from '@/types'

const InputSchema = z.object({})

const StargateLevelSchema = z.object({
  id: z.number().int().min(1).max(10),
  tier: z.enum([
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
  ]),
  vet: z.string().describe('Required VET amount as a decimal string (no decimals)'),
  multiplier: z.number().describe('VTHO yield multiplier vs base 1.0'),
  isX: z.boolean().describe('Legacy X tier (cannot be freshly minted)'),
  mintable: z
    .boolean()
    .describe('Whether the level accepts new stake / stakeAndDelegate calls'),
})

const DataSchema = z.object({
  network: z.string(),
  levels: z.array(StargateLevelSchema),
})

const OutputSchema = z.object({
  ok: z.boolean(),
  network: z.string(),
  data: DataSchema.nullable().optional(),
  error: z.string().optional(),
})

type Response = {
  content: Array<{ type: 'text'; text: string }>
  structuredContent: z.infer<typeof OutputSchema>
}

export const getStargateLevels: MCPTool = {
  name: 'getStargateLevels',
  title: 'Stargate: list NFT level registry',
  description:
    'Return the canonical Stargate NFT level registry (id, tier name, exact VET amount, VTHO multiplier, mintable flag). Use this BEFORE buildStargateStakeAndDelegateClauses to map a user-friendly tier name (Dawn / Lightning / Flash / Strength / Thunder / Mjolnir) to the on-chain `levelId` and the EXACT VET amount required by Stargate. IDs are NOT sorted by VET amount: 1=Strength(1M), 2=Thunder(5M), 3=Mjolnir(15M), 8=Dawn(10K), 9=Lightning(50K), 10=Flash(200K). Levels 4-7 (X tiers) are reserved for legacy node migration and are NOT mintable.',
  inputSchema: InputSchema.shape,
  outputSchema: OutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: false,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (): Promise<Response> => {
    const network = getThorNetworkType()
    const result = {
      ok: true,
      network,
      data: {
        network,
        levels: STARGATE_LEVELS.map(l => ({ ...l })),
      },
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
      structuredContent: result,
    }
  },
}
