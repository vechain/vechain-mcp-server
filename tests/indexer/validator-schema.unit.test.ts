/**
 * Unit tests for IndexerValidatorSchema.
 *
 * The veworld indexer returns validator VET/TVL amounts as JSON numbers
 * (not strings). Unlike Stargate BigInteger fields (which are string-serialized),
 * validator metrics are computed/scaled values returned as IEEE-754 doubles.
 *
 * .finite() guards are applied only to fields confirmed safe by integration tests:
 * VET staked amounts, TVL, tvlBasedYield, blockProbability, and projected yields.
 * Fields like percentageOffline, offlineBlocks, and nftYieldsNextCycle are left
 * as plain z.number() because the live API returns NaN or non-integer values for
 * some validators (e.g. new validators with no history).
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
  nftYieldsNextCycle: {
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

describe('IndexerValidatorSchema — finite() guards on VET and float fields', () => {
  test('vetStaked rejects Infinity', () => {
    expect(() => IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, vetStaked: Infinity })).toThrow()
  })

  test('vetStaked rejects NaN', () => {
    expect(() => IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, vetStaked: NaN })).toThrow()
  })

  test('totalWeight rejects Infinity', () => {
    expect(() => IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, totalWeight: Infinity })).toThrow()
  })

  test('blockProbability rejects Infinity (non-finite)', () => {
    expect(() =>
      IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, blockProbability: Infinity }),
    ).toThrow()
  })

  test('tvlBasedYield rejects NaN (non-finite)', () => {
    expect(() =>
      IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, tvlBasedYield: NaN }),
    ).toThrow()
  })

  test('totalTvl rejects Infinity', () => {
    expect(() => IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, totalTvl: Infinity })).toThrow()
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

  test('totalRewards rejects Infinity', () => {
    expect(() => IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, totalRewards: Infinity })).toThrow()
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

describe('IndexerValidatorSchema — nftYieldsNextCycle', () => {
  // Plain z.number().optional() — no .finite() because the live API may return
  // null/NaN for validators with no yield history for a given NFT level.
  test('nftYieldsNextCycle entries accept floats', () => {
    expect(() =>
      IndexerValidatorSchema.parse({
        ...BASE_VALIDATOR,
        nftYieldsNextCycle: { ...BASE_VALIDATOR.nftYieldsNextCycle, Dawn: 0.08 },
      }),
    ).not.toThrow()
  })

  test('nftYieldsNextCycle entries are optional (can be omitted)', () => {
    const { Dawn: _omit, ...rest } = BASE_VALIDATOR.nftYieldsNextCycle
    expect(() =>
      IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, nftYieldsNextCycle: rest }),
    ).not.toThrow()
  })
})
