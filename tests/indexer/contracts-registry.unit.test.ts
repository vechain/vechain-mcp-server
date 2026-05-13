/**
 * Unit tests for the contracts registry helpers.
 *
 * No network. Two things are mocked to keep this suite a true CJS unit test:
 *  - `@/services/thor` so `resolveAddress` can pick the right network map
 *    without hitting an env variable
 *  - `@/services/contracts-registry/abis` because the real implementation uses
 *    `createRequire(import.meta.url)` to side-step a broken ESM dist; jest+
 *    ts-jest run in CJS so `import.meta` doesn't parse. Fake ABIs cover what
 *    the registry tests actually need (a list of fragments per contract).
 */
const mockNetwork = { value: 'mainnet' as 'mainnet' | 'testnet' | 'solo' }

jest.mock('@/services/thor', () => ({
  getThorNetworkType: () => mockNetwork.value,
}))

jest.mock('@/services/contracts-registry/abis', () => {
  const fakeAbi = [
    { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [], outputs: [] },
    { type: 'function', name: 'transfer', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  ]
  return {
    B3TR_ABI: fakeAbi,
    VOT3_ABI: fakeAbi,
    B3TR_GOVERNOR_ABI: fakeAbi,
    TIMELOCK_ABI: fakeAbi,
    GALAXY_MEMBER_ABI: fakeAbi,
    EMISSIONS_ABI: fakeAbi,
    VOTER_REWARDS_ABI: fakeAbi,
    X_ALLOCATION_POOL_ABI: fakeAbi,
    X_ALLOCATION_VOTING_ABI: fakeAbi,
    TREASURY_ABI: fakeAbi,
    X2EARN_APPS_ABI: fakeAbi,
    X2EARN_REWARDS_POOL_ABI: fakeAbi,
    VEBETTER_PASSPORT_ABI: fakeAbi,
    GRANTS_MANAGER_ABI: fakeAbi,
    DBA_POOL_ABI: fakeAbi,
    STARGATE_ABI: fakeAbi,
    STARGATE_NFT_ABI: fakeAbi,
    STARGATE_DELEGATION_ABI: fakeAbi,
    NODE_MANAGEMENT_ABI: fakeAbi,
    ERC20_ABI: fakeAbi,
    ERC721_ABI: fakeAbi,
  }
})

import {
  CONTRACT_NAMES,
  getContractEntry,
  isContractName,
  listContracts,
  networkKey,
  resolveAddress,
} from '@/services/contracts-registry'

describe('contracts-registry', () => {
  afterEach(() => {
    mockNetwork.value = 'mainnet'
  })

  test('listContracts returns all entries by default and filters by category', () => {
    const all = listContracts()
    expect(all.length).toBe(CONTRACT_NAMES.length)
    expect(all.length).toBeGreaterThanOrEqual(20)

    const vbd = listContracts('vebetterdao')
    expect(vbd.length).toBeGreaterThan(0)
    for (const e of vbd) expect(e.category).toBe('vebetterdao')

    const std = listContracts('standard')
    expect(std.length).toBeGreaterThanOrEqual(2)
    for (const e of std) expect(e.category).toBe('standard')
  })

  test('isContractName guards against unknown names', () => {
    expect(isContractName('b3tr')).toBe(true)
    expect(isContractName('erc20')).toBe(true)
    expect(isContractName('not-a-contract')).toBe(false)
  })

  test('getContractEntry returns ABI and metadata', () => {
    const b3tr = getContractEntry('b3tr')
    expect(b3tr.category).toBe('vebetterdao')
    expect(b3tr.requiresAddress).toBe(false)
    expect(Array.isArray(b3tr.abi)).toBe(true)
    expect(b3tr.abi.length).toBeGreaterThan(0)
  })

  test('resolveAddress returns mainnet address on mainnet', () => {
    mockNetwork.value = 'mainnet'
    expect(resolveAddress('b3tr').toLowerCase()).toBe(
      '0x5ef79995FE8a89e0812330E4378eB2660ceDe699'.toLowerCase(),
    )
  })

  test('resolveAddress returns testnet address on testnet', () => {
    mockNetwork.value = 'testnet'
    expect(resolveAddress('b3tr').toLowerCase()).toBe(
      '0x849cB24E22e86d964a3fF956796d9555FB382900'.toLowerCase(),
    )
  })

  test('networkKey collapses solo to testnet', () => {
    mockNetwork.value = 'solo'
    expect(networkKey()).toBe('testnet')
  })

  test('resolveAddress throws when override is missing for erc20 / erc721', () => {
    expect(() => resolveAddress('erc20')).toThrow(/explicit address/)
    expect(() => resolveAddress('erc721')).toThrow(/explicit address/)
  })

  test('resolveAddress accepts explicit override', () => {
    expect(resolveAddress('erc20', '0xabc0000000000000000000000000000000000abc')).toBe(
      '0xabc0000000000000000000000000000000000abc',
    )
    // override on a known contract still works
    expect(resolveAddress('b3tr', '0xabc0000000000000000000000000000000000abc')).toBe(
      '0xabc0000000000000000000000000000000000abc',
    )
  })
})
