/**
 * Unit tests for IndexerValidatorSchema.
 *
 * The veworld indexer serializes:
 * - VET/VTHO on-chain amounts (BigInteger wei) as numeric strings
 * - Computed floating-point values (USD TVL, yield %, probabilities) as JSON numbers
 *
 * These tests document and enforce the correct types so schema drift is caught
 * immediately rather than at runtime against the live API.
 */

import { IndexerValidatorSchema } from '@/services/veworld-indexer/schemas'

/** Minimal valid validator payload from the indexer */
const BASE_VALIDATOR = {
  id: '0x311E811cd3fC29Ba17D45B04c882245FA69DC776',
  endorser: '0x311E811cd3fC29Ba17D45B04c882245FA69DC776',
  status: 'ACTIVE',
  // VET amounts as numeric strings (BigInteger wei precision)
  vetStaked: '25000000000000000000000000',       // 25 M VET in wei
  validatorVetStaked: '25000000000000000000000000',
  delegatorVetStaked: '0',
  queuedVetStaked: '0',
  exitingVetStaked: '0',
  totalWeight: '50000000000000000000000000',     // 2× because delegations exist
  // Computed floats (JSON numbers)
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

describe('IndexerValidatorSchema — VET amount fields accept numeric strings', () => {
  test('parses a fully valid validator payload', () => {
    expect(() => IndexerValidatorSchema.parse(BASE_VALIDATOR)).not.toThrow()
  })

  test('vetStaked must be a numeric string, not a number', () => {
    const withNumber = { ...BASE_VALIDATOR, vetStaked: 25000000 }
    expect(() => IndexerValidatorSchema.parse(withNumber)).toThrow()
  })

  test('validatorVetStaked must be a numeric string', () => {
    const bad = { ...BASE_VALIDATOR, validatorVetStaked: 25000000 }
    expect(() => IndexerValidatorSchema.parse(bad)).toThrow()
  })

  test('delegatorVetStaked must be a numeric string', () => {
    const bad = { ...BASE_VALIDATOR, delegatorVetStaked: 0 }
    expect(() => IndexerValidatorSchema.parse(bad)).toThrow()
  })

  test('queuedVetStaked must be a numeric string', () => {
    const bad = { ...BASE_VALIDATOR, queuedVetStaked: 0 }
    expect(() => IndexerValidatorSchema.parse(bad)).toThrow()
  })

  test('exitingVetStaked must be a numeric string', () => {
    const bad = { ...BASE_VALIDATOR, exitingVetStaked: 0 }
    expect(() => IndexerValidatorSchema.parse(bad)).toThrow()
  })

  test('totalWeight must be a numeric string', () => {
    const bad = { ...BASE_VALIDATOR, totalWeight: 50000000 }
    expect(() => IndexerValidatorSchema.parse(bad)).toThrow()
  })

  test('vetStaked rejects non-numeric strings', () => {
    const bad = { ...BASE_VALIDATOR, vetStaked: 'twenty-five million' }
    expect(() => IndexerValidatorSchema.parse(bad)).toThrow()
  })

  test('vetStaked rejects decimal strings', () => {
    // Decimal strings are not valid BigInteger representation
    const bad = { ...BASE_VALIDATOR, vetStaked: '25000000.5' }
    expect(() => IndexerValidatorSchema.parse(bad)).toThrow()
  })
})

describe('IndexerValidatorSchema — optional VET amount fields', () => {
  test('validatorQueuedVetStaked is optional', () => {
    const noQueued = { ...BASE_VALIDATOR }
    delete (noQueued as any).validatorQueuedVetStaked
    expect(() => IndexerValidatorSchema.parse(noQueued)).not.toThrow()
  })

  test('validatorQueuedVetStaked must be numeric string when present', () => {
    const bad = { ...BASE_VALIDATOR, validatorQueuedVetStaked: 1000 }
    expect(() => IndexerValidatorSchema.parse(bad)).toThrow()
  })

  test('delegatorQueuedVetStaked must be numeric string when present', () => {
    const bad = { ...BASE_VALIDATOR, delegatorQueuedVetStaked: 0 }
    expect(() => IndexerValidatorSchema.parse(bad)).toThrow()
  })

  test('validatorExitingVetStaked must be numeric string when present', () => {
    const bad = { ...BASE_VALIDATOR, validatorExitingVetStaked: 0 }
    expect(() => IndexerValidatorSchema.parse(bad)).toThrow()
  })

  test('delegatorExitingVetStaked must be numeric string when present', () => {
    const bad = { ...BASE_VALIDATOR, delegatorExitingVetStaked: 0 }
    expect(() => IndexerValidatorSchema.parse(bad)).toThrow()
  })

  test('totalRewards is optional', () => {
    const noRewards = { ...BASE_VALIDATOR }
    delete (noRewards as any).totalRewards
    expect(() => IndexerValidatorSchema.parse(noRewards)).not.toThrow()
  })

  test('totalRewards must be numeric string when present', () => {
    const bad = { ...BASE_VALIDATOR, totalRewards: 9999.99 }
    expect(() => IndexerValidatorSchema.parse(bad)).toThrow()
  })

  test('totalRewards accepts a valid VTHO numeric string', () => {
    const good = { ...BASE_VALIDATOR, totalRewards: '1000000000000000000' } // 1 VTHO in wei
    expect(() => IndexerValidatorSchema.parse(good)).not.toThrow()
  })
})

describe('IndexerValidatorSchema — float fields remain JSON numbers', () => {
  test('blockProbability accepts a float', () => {
    expect(() => IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, blockProbability: 0.042 })).not.toThrow()
  })

  test('blockProbability rejects a numeric string', () => {
    const bad = { ...BASE_VALIDATOR, blockProbability: '0.042' }
    expect(() => IndexerValidatorSchema.parse(bad)).toThrow()
  })

  test('tvlBasedYield accepts a float', () => {
    expect(() => IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, tvlBasedYield: 0.0712 })).not.toThrow()
  })

  test('totalTvl accepts a float', () => {
    expect(() => IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, totalTvl: 1234567.89 })).not.toThrow()
  })

  test('totalTvl rejects a numeric string', () => {
    const bad = { ...BASE_VALIDATOR, totalTvl: '1234567' }
    expect(() => IndexerValidatorSchema.parse(bad)).toThrow()
  })

  test('blockProbability rejects Infinity (non-finite)', () => {
    const bad = { ...BASE_VALIDATOR, blockProbability: Infinity }
    expect(() => IndexerValidatorSchema.parse(bad)).toThrow()
  })

  test('tvlBasedYield rejects NaN (non-finite)', () => {
    const bad = { ...BASE_VALIDATOR, tvlBasedYield: NaN }
    expect(() => IndexerValidatorSchema.parse(bad)).toThrow()
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
    expect(() => IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, beneficiary: null })).not.toThrow()
    expect(() => IndexerValidatorSchema.parse({ ...BASE_VALIDATOR, beneficiary: undefined })).not.toThrow()
  })
})
