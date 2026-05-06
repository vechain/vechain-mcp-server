/**
 * Unit tests for IndexerValidatorSchema.
 *
 * The veworld indexer returns validator VET/TVL amounts as JSON numbers
 * (not strings). Unlike Stargate BigInteger fields (which are string-serialized),
 * validator metrics are computed/scaled values returned as IEEE-754 doubles.
 *
 * No .finite() guards are applied to IndexerValidatorSchema fields. The live API
 * returns NaN/Infinity for computed fields (e.g. yields, TVL) when the price oracle
 * is unavailable or a validator has no history. Matching upstream main: all validator
 * numeric fields are plain z.number() to avoid schema validation failures.
 *
 * These tests confirm the correct types so schema drift is caught immediately
 * rather than at runtime against the live API.
 */

import { IndexerValidatorSchema } from '@/services/veworld-indexer/schemas'

/** Minimal valid validator payload as returned by the live indexer */
const BASE_VALIDATOR = {
  id: '0x311E811cd3fC29Ba17D45B04c882245FA69DC776',
  endorser: '0x311E811cd3fC29Ba17D45B04c882245FA69DC776',
  status: 'ACTIVE',
  // VET staked amounts — returned as JSON numbers (not strings) by the indexer
  vetStaked: 25000000,
  validatorVetStaked: 25000000,
  delegatorVetStaked: 0,
  queuedVetStaked: 0,
  exitingVetStaked: 0,
  totalWeight: 50000000,
  // Computed floats
  blockProbability: 0.042,
  blocksPerEpoch: 100,
  cycleEndBlock: 22000000,
  totalTvl: 580000.5,
  validatorTvl: 580000.5,
  delegatorTvl: 0,
  tvlBasedYield: 0.0712,
  // Metadata
  online: true,
  completedPeriods: 3,
  startBlock: 21900000,
  cyclePeriodLength: 100000,
  blocksPerYear: 5256000,
  percentageOffline: 0.0,
  offlineBlocks: 0,
  nftYields: {
    Strength: 0.04,
    Thunder: 0.05,
    Mjolnir: 0.06,
    VeThorX: 0.07,
    StrengthX: 0.08,
    ThunderX: 0.09,
    MjolnirX: 0.1,
    Dawn: 0.03,
    Lightning: 0.035,
    Flash: 0.04,
  },
  nftYieldsIfDelegatedNextCycle: {
    Strength: 0.05,
    Thunder: 0.06,
    Mjolnir: 0.07,
    VeThorX: 0.08,
    StrengthX: 0.09,
    ThunderX: 0.1,
    MjolnirX: 0.11,
    Dawn: 0.04,
    Lightning: 0.045,
    Flash: 0.05,
  },
}

describe('IndexerValidatorSchema — VET staked fields accept JSON numbers', () => {
  test('parses a fully valid validator payload', () => {
    expect(() => IndexerValidatorSchema.parse(BASE_VALIDATOR)).not.toThrow()
  })

  test('vetStaked accepts a JSON number', () => {
    expect(() => IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, vetStaked: 25000000 })).not.toThrow()
  })

  test('vetStaked rejects a string (the API does NOT return strings for this field)', () => {
    const bad = { ...BASE_VALIDATOR, vetStaked: '25000000' }
    expect(() => IndexerValidatorSchema.parse(bad)).toThrow()
  })

  test('validatorVetStaked accepts a JSON number', () => {
    expect(() =>
      IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, validatorVetStaked: 25000000 }),
    ).not.toThrow()
  })

  test('validatorVetStaked rejects a string', () => {
    expect(() =>
      IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, validatorVetStaked: '25000000' }),
    ).toThrow()
  })

  test('delegatorVetStaked accepts zero as a number', () => {
    expect(() => IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, delegatorVetStaked: 0 })).not.toThrow()
  })

  test('queuedVetStaked accepts a JSON number', () => {
    expect(() => IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, queuedVetStaked: 0 })).not.toThrow()
  })

  test('exitingVetStaked accepts a JSON number', () => {
    expect(() => IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, exitingVetStaked: 0 })).not.toThrow()
  })

  test('totalWeight accepts a JSON number', () => {
    expect(() => IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, totalWeight: 50000000 })).not.toThrow()
  })

  test('totalWeight rejects a string', () => {
    expect(() =>
      IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, totalWeight: '50000000' }),
    ).toThrow()
  })
})

describe('IndexerValidatorSchema — Infinity vs NaN behaviour (no .finite())', () => {
  // Zod v3 z.number() assigns parsedType "number" to Infinity (typeof Infinity === 'number'
  // and !isNaN(Infinity)), so Infinity passes. The .finite() guard is what blocks it.
  // NaN is different: Zod assigns parsedType "nan" and always rejects it even without
  // .finite(). If the live API ever returns NaN for these fields the MCP framework will
  // strip structuredContent; handle that at the transport/integration layer, not here.
  test('vetStaked accepts Infinity (no .finite() guard)', () => {
    expect(() => IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, vetStaked: Infinity })).not.toThrow()
  })

  test('blockProbability rejects NaN (Zod z.number() always rejects NaN)', () => {
    expect(() => IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, blockProbability: NaN })).toThrow()
  })

  test('tvlBasedYield rejects NaN (Zod z.number() always rejects NaN)', () => {
    expect(() => IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, tvlBasedYield: NaN })).toThrow()
  })
})

describe('IndexerValidatorSchema — optional VET staked fields', () => {
  test('validatorQueuedVetStaked is optional', () => {
    const noQueued = { ...BASE_VALIDATOR }
    delete (noQueued as any).validatorQueuedVetStaked
    expect(() => IndexerValidatorSchema.parse(noQueued)).not.toThrow()
  })

  test('validatorQueuedVetStaked accepts a number when present', () => {
    expect(() =>
      IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, validatorQueuedVetStaked: 1000 }),
    ).not.toThrow()
  })

  test('validatorQueuedVetStaked rejects a string', () => {
    expect(() =>
      IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, validatorQueuedVetStaked: '1000' }),
    ).toThrow()
  })

  test('delegatorQueuedVetStaked accepts zero as a number', () => {
    expect(() =>
      IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, delegatorQueuedVetStaked: 0 }),
    ).not.toThrow()
  })

  test('totalRewards is optional', () => {
    const noRewards = { ...BASE_VALIDATOR }
    delete (noRewards as any).totalRewards
    expect(() => IndexerValidatorSchema.parse(noRewards)).not.toThrow()
  })

  test('totalRewards accepts a number when present', () => {
    expect(() => IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, totalRewards: 9999.99 })).not.toThrow()
  })

  test('totalRewards accepts Infinity (no finite guard)', () => {
    expect(() => IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, totalRewards: Infinity })).not.toThrow()
  })
})

describe('IndexerValidatorSchema — float fields remain JSON numbers', () => {
  test('blockProbability accepts a float', () => {
    expect(() => IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, blockProbability: 0.042 })).not.toThrow()
  })

  test('blockProbability rejects a string', () => {
    expect(() => IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, blockProbability: '0.042' })).toThrow()
  })

  test('tvlBasedYield accepts a float', () => {
    expect(() => IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, tvlBasedYield: 0.0712 })).not.toThrow()
  })

  test('totalTvl accepts a float', () => {
    expect(() => IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, totalTvl: 1234567.89 })).not.toThrow()
  })

  test('totalTvl rejects a string', () => {
    expect(() => IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, totalTvl: '1234567' })).toThrow()
  })
})

describe('IndexerValidatorSchema — optional @JsonIgnore fields', () => {
  test('blockId, blockNumber, blockTimestamp are all optional', () => {
    const noBlock = { ...BASE_VALIDATOR }
    delete (noBlock as any).blockId
    delete (noBlock as any).blockNumber
    delete (noBlock as any).blockTimestamp
    expect(() => IndexerValidatorSchema.parse(noBlock)).not.toThrow()
  })

  test('beneficiary is nullable and optional', () => {
    expect(() =>
      IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, beneficiary: null }),
    ).not.toThrow()
    expect(() =>
      IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, beneficiary: undefined }),
    ).not.toThrow()
  })
})

describe('IndexerValidatorSchema — percentageOffline and offlineBlocks', () => {
  // These fields are plain z.number() — no .finite() because the live API
  // can return NaN (e.g. percentageOffline for validators with no history)
  // and non-integer values (e.g. offlineBlocks from computed metrics).
  test('percentageOffline accepts a float', () => {
    expect(() => IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, percentageOffline: 0.05 })).not.toThrow()
  })

  test('offlineBlocks accepts zero', () => {
    expect(() => IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, offlineBlocks: 0 })).not.toThrow()
  })

  test('offlineBlocks accepts a positive number', () => {
    expect(() => IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, offlineBlocks: 42 })).not.toThrow()
  })
})

describe('IndexerValidatorSchema — nftYields and nftYieldsIfDelegatedNextCycle', () => {
  // Plain z.number().optional() — no .finite() because the live API may return
  // null/NaN for validators with no yield history for a given NFT level.
  // Both objects themselves are optional and may be omitted entirely (e.g. for
  // validators with no delegations, the indexer returns `nftYields: {}` or omits it).
  test('nftYieldsIfDelegatedNextCycle entries accept floats', () => {
    expect(() =>
      IndexerValidatorSchema.parse({
        ...BASE_VALIDATOR,
        nftYieldsIfDelegatedNextCycle: { ...BASE_VALIDATOR.nftYieldsIfDelegatedNextCycle, Dawn: 0.08 },
      }),
    ).not.toThrow()
  })

  test('nftYieldsIfDelegatedNextCycle entries are optional (can be omitted)', () => {
    const { Dawn: _omit, ...rest } = BASE_VALIDATOR.nftYieldsIfDelegatedNextCycle
    expect(() =>
      IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, nftYieldsIfDelegatedNextCycle: rest }),
    ).not.toThrow()
  })

  test('nftYields entries accept floats', () => {
    expect(() =>
      IndexerValidatorSchema.parse({
        ...BASE_VALIDATOR,
        nftYields: { ...BASE_VALIDATOR.nftYields, Dawn: 0.07 },
      }),
    ).not.toThrow()
  })

  test('both nftYields and nftYieldsIfDelegatedNextCycle objects are optional', () => {
    const noYields = { ...BASE_VALIDATOR }
    delete (noYields as any).nftYields
    delete (noYields as any).nftYieldsIfDelegatedNextCycle
    expect(() => IndexerValidatorSchema.parse(noYields)).not.toThrow()
  })

  test('nftYields accepts an empty object (validator with no delegations)', () => {
    expect(() => IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, nftYields: {} })).not.toThrow()
  })
})
