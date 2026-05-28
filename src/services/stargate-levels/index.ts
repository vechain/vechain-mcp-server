/**
 * On-chain Stargate level registry. Level IDs come from the deployed
 * `StargateNFT` contract — they are NOT sorted by VET amount. Verified
 * against `StargateNFT.getLevel(uint8)` on mainnet.
 *
 * Only `mintable: true` levels can be entered via `stake` / `stakeAndDelegate`.
 * X tiers (4-7) are reserved for legacy node migration.
 */
export type StargateTier =
  | 'Strength'
  | 'Thunder'
  | 'Mjolnir'
  | 'VeThorX'
  | 'StrengthX'
  | 'ThunderX'
  | 'MjolnirX'
  | 'Dawn'
  | 'Lightning'
  | 'Flash'

export type StargateLevel = {
  /** On-chain `levelId` accepted by `StargateNFT.stake(uint8)`. */
  id: number
  tier: StargateTier
  /** Required VET amount as a decimal string (no decimals). */
  vet: string
  /** VTHO yield multiplier vs base (1.0). */
  multiplier: number
  /** Whether this is an "X" legacy tier (not freshly mintable). */
  isX: boolean
  /** Whether the tier can be minted via `stake` / `stakeAndDelegate`. */
  mintable: boolean
}

export const STARGATE_LEVELS: readonly StargateLevel[] = [
  { id: 1, tier: 'Strength', vet: '1000000', multiplier: 1.5, isX: false, mintable: true },
  { id: 2, tier: 'Thunder', vet: '5000000', multiplier: 2.5, isX: false, mintable: true },
  { id: 3, tier: 'Mjolnir', vet: '15000000', multiplier: 3.5, isX: false, mintable: true },
  { id: 4, tier: 'VeThorX', vet: '600000', multiplier: 2.0, isX: true, mintable: false },
  { id: 5, tier: 'StrengthX', vet: '1600000', multiplier: 3.0, isX: true, mintable: false },
  { id: 6, tier: 'ThunderX', vet: '5600000', multiplier: 4.0, isX: true, mintable: false },
  { id: 7, tier: 'MjolnirX', vet: '15600000', multiplier: 5.0, isX: true, mintable: false },
  { id: 8, tier: 'Dawn', vet: '10000', multiplier: 1.0, isX: false, mintable: true },
  { id: 9, tier: 'Lightning', vet: '50000', multiplier: 1.15, isX: false, mintable: true },
  { id: 10, tier: 'Flash', vet: '200000', multiplier: 1.3, isX: false, mintable: true },
] as const

export const STARGATE_TIERS: readonly StargateTier[] = STARGATE_LEVELS.map(l => l.tier)

export function findStargateLevelById(id: number): StargateLevel | undefined {
  return STARGATE_LEVELS.find(l => l.id === id)
}

export function findStargateLevelByTier(tier: string): StargateLevel | undefined {
  const t = tier.trim().toLowerCase()
  return STARGATE_LEVELS.find(l => l.tier.toLowerCase() === t)
}

/**
 * Look up a mintable level by exact VET amount (decimal string). Returns
 * undefined if no mintable tier matches.
 */
export function findStargateLevelByVet(vet: string): StargateLevel | undefined {
  return STARGATE_LEVELS.find(l => l.vet === vet && l.mintable)
}

/**
 * Resolve a level using the agent-friendly priority order:
 *   1. explicit `tier`
 *   2. explicit `levelId`
 *   3. exact `amount` (mintable only)
 *
 * Throws when nothing resolves — the message lists the valid mintable tiers
 * so the caller can recover.
 */
export function resolveStargateLevel(args: {
  tier?: string
  levelId?: number
  amount?: string
}): StargateLevel {
  if (args.tier) {
    const lvl = findStargateLevelByTier(args.tier)
    if (!lvl) {
      throw new Error(
        `Unknown Stargate tier "${args.tier}". Valid tiers: ${STARGATE_LEVELS.map(l => l.tier).join(', ')}`,
      )
    }
    return lvl
  }
  if (args.levelId !== undefined) {
    const lvl = findStargateLevelById(args.levelId)
    if (!lvl) throw new Error(`Unknown Stargate levelId ${args.levelId}`)
    return lvl
  }
  if (args.amount) {
    const lvl = findStargateLevelByVet(args.amount)
    if (!lvl) {
      const mintable = STARGATE_LEVELS.filter(l => l.mintable)
        .map(l => `${l.tier}=${l.vet} VET`)
        .join(', ')
      throw new Error(
        `Cannot infer Stargate tier from amount "${args.amount}". Pass an exact tier amount (${mintable}) or set "tier"/"levelId".`,
      )
    }
    return lvl
  }
  throw new Error('Provide tier, levelId, or amount so the Stargate level can be resolved.')
}
