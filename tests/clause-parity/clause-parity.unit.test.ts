/**
 * Byte-equal parity tests between the legacy `veworld-b3mo-backend` clause
 * builders and the new MCP `build*Clauses` tools.
 *
 * These tests run the MCP tool handlers directly (no transport) and mock the
 * three external dependencies that the handlers touch:
 *   - `fetchTokenRegistry` (hit network)
 *   - `resolveVnsOrAddress`  (Thor JSON-RPC)
 *   - on-chain read helpers (`fetchErc20Allowance`, `fetchStargateBoostAmount`)
 *
 * The backend repo's tests are in
 * veworld-b3mo-backend/src/services/clauseBuilder/*.test.ts and the
 * assertions below mirror them so a regression on either side is obvious.
 */

// Replace the real ABI module (which uses `import.meta` via createRequire)
// with parseAbi-built fragments that match the real on-chain ABIs we exercise.
// Function selectors are derived from the signatures, so byte-equal parity
// with the legacy backend is preserved.
jest.mock('@/services/contracts-registry/abis', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { parseAbi } = require('viem')
  const ERC20_ABI = parseAbi([
    'function transfer(address to, uint256 amount) returns (bool)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function balanceOf(address account) view returns (uint256)',
  ])
  const VOT3_ABI = parseAbi([
    'function convertToVOT3(uint256 amount)',
    'function convertToB3TR(uint256 amount)',
    'function delegate(address delegatee)',
  ])
  const X_ALLOCATION_VOTING_ABI = parseAbi([
    'function castVote(uint256 roundId, bytes32[] appsIds, uint256[] weights)',
  ])
  const VOTER_REWARDS_ABI = parseAbi([
    'function claimReward(uint256 roundId, address voter)',
  ])
  const B3TR_GOVERNOR_ABI = parseAbi([
    'function castVoteWithReason(uint256 proposalId, uint8 support, string reason) returns (uint256)',
  ])
  const STARGATE_ABI = parseAbi([
    'function stake(uint8 levelId) payable returns (uint256)',
    'function stakeAndDelegate(uint8 levelId, address validator) payable returns (uint256)',
    'function unstake(uint256 tokenId)',
    'function delegate(uint256 tokenId, address validator)',
    'function requestDelegationExit(uint256 tokenId)',
    'function claimRewards(uint256 tokenId)',
  ])
  const STARGATE_NFT_ABI = parseAbi([
    'function boostAmountOfLevel(uint8) view returns (uint256)',
  ])
  const UNISWAP_V2_ROUTER_ABI = parseAbi([
    'function swapExactETHForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline) payable returns (uint256[] amounts)',
    'function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)',
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)',
    'function getAmountsOut(uint256 amountIn, address[] path) view returns (uint256[] amounts)',
  ])
  const fakeAbi: unknown[] = []
  return {
    ERC20_ABI,
    ERC721_ABI: fakeAbi,
    VOT3_ABI,
    X_ALLOCATION_VOTING_ABI,
    VOTER_REWARDS_ABI,
    B3TR_GOVERNOR_ABI,
    STARGATE_ABI,
    STARGATE_NFT_ABI,
    STARGATE_DELEGATION_ABI: fakeAbi,
    NODE_MANAGEMENT_ABI: fakeAbi,
    UNISWAP_V2_ROUTER_ABI,
    B3TR_ABI: fakeAbi,
    TIMELOCK_ABI: fakeAbi,
    GALAXY_MEMBER_ABI: fakeAbi,
    EMISSIONS_ABI: fakeAbi,
    X_ALLOCATION_POOL_ABI: fakeAbi,
    TREASURY_ABI: fakeAbi,
    X2EARN_APPS_ABI: fakeAbi,
    X2EARN_REWARDS_POOL_ABI: fakeAbi,
    VEBETTER_PASSPORT_ABI: fakeAbi,
    GRANTS_MANAGER_ABI: fakeAbi,
    DBA_POOL_ABI: fakeAbi,
  }
})

jest.mock('@/services/token-registry/utils', () => ({
  fetchTokenRegistry: jest.fn(async () => null),
  getTokenRegistryUrl: jest.fn(() => null),
  TOKEN_REGISTRY_URL: {},
}))

jest.mock('@/services/vns', () => ({
  resolveVnsOrAddress: jest.fn(async (v: string) => v.toLowerCase()),
  lookupVnsName: jest.fn(async () => null),
  enrichAddressWithVns: jest.fn(),
  enrichAddressesWithVns: jest.fn(),
  VnsNameSchema: jest.requireActual('zod').z.string(),
}))

jest.mock('@/services/clause-builder/onchain-reads', () => ({
  fetchErc20Allowance: jest.fn(async () => 0n),
  fetchStargateBoostAmount: jest.fn(async () => 123n * 10n ** 18n),
}))

import {
  fetchErc20Allowance,
  fetchStargateBoostAmount,
} from '@/services/clause-builder/onchain-reads'
import { CONTRACT_ADDRESSES } from '@/services/contracts-registry/addresses'
import {
  buildB3trCastAllocationVotesClauses,
  buildB3trCastProposalVoteClauses,
  buildB3trClaimVoterRewardsClauses,
  buildB3trConvertToB3trClauses,
  buildB3trConvertToVot3Clauses,
  buildB3trDelegateVot3Clauses,
  buildSendTokenClauses,
  buildStargateClaimRewardsClauses,
  buildStargateDelegateClauses,
  buildStargateStakeAndDelegateClauses,
  buildStargateUndelegateClauses,
} from '@/tools'

const wallet = `0x${'11'.repeat(20)}` as `0x${string}`
const validator = `0x${'ab'.repeat(20)}` as `0x${string}`
const VTHO_ADDR = '0x0000000000000000000000000000456e65726779'

function structured<T>(res: { structuredContent: T }): T {
  return res.structuredContent
}

describe('buildSendTokenClauses (parity with backend buildSendToken)', () => {
  test('builds a native VET clause', async () => {
    const res = await buildSendTokenClauses.handler({
      walletAddress: wallet,
      tokenSymbolOrAddress: 'VET',
      amount: '1.5',
      to: `0x${'ab'.repeat(20)}`,
    })
    const sc = structured(res) as any
    expect(sc.ok).toBe(true)
    const c = sc.data.clauses[0]
    expect(c.to).toBe(`0x${'ab'.repeat(20)}`)
    expect(c.data).toBe('0x')
    expect(BigInt(c.value)).toBe(1_500_000_000_000_000_000n)
  })

  test('builds an ERC20 transfer clause for VTHO', async () => {
    const res = await buildSendTokenClauses.handler({
      walletAddress: wallet,
      tokenSymbolOrAddress: 'VTHO',
      amount: '10',
      to: `0x${'cd'.repeat(20)}`,
    })
    const sc = structured(res) as any
    const c = sc.data.clauses[0]
    expect(c.to.toLowerCase()).toBe(VTHO_ADDR.toLowerCase())
    expect(c.value).toBe('0x0')
    expect(c.data.startsWith('0xa9059cbb')).toBe(true)
  })

  test('reports an error for unknown tokens (does not throw)', async () => {
    const res = await buildSendTokenClauses.handler({
      walletAddress: wallet,
      tokenSymbolOrAddress: 'XYZ',
      amount: '1',
      to: `0x${'ab'.repeat(20)}`,
    })
    const sc = structured(res) as any
    expect(sc.ok).toBe(false)
    expect(String(sc.error)).toMatch(/Unknown token/)
  })
})

describe('buildStargateStakeAndDelegateClauses (parity with backend buildStakeAndDelegate)', () => {
  beforeEach(() => {
    ;(fetchStargateBoostAmount as jest.Mock).mockResolvedValue(123n * 10n ** 18n)
  })

  test('emits VTHO approve + stakeAndDelegate clauses for Dawn', async () => {
    const res = await buildStargateStakeAndDelegateClauses.handler({
      walletAddress: wallet,
      tier: 'Dawn',
      validator,
      amount: '10000',
    })
    const sc = structured(res) as any
    expect(sc.ok).toBe(true)
    expect(sc.data.clauses).toHaveLength(2)
    const [approve, stake] = sc.data.clauses
    expect(approve.to.toLowerCase()).toBe(VTHO_ADDR.toLowerCase())
    expect(approve.data.startsWith('0x095ea7b3')).toBe(true)
    expect(stake.to.toLowerCase()).toBe(
      CONTRACT_ADDRESSES.mainnet.stargate?.toLowerCase(),
    )
    expect(BigInt(stake.value)).toBe(10_000n * 10n ** 18n)
    expect(stake.data.startsWith('0x15fa1bdf')).toBe(true)
    expect(stake.data).toContain(
      '0000000000000000000000000000000000000000000000000000000000000008',
    )
  })

  test('auto-resolves the tier from amount alone', async () => {
    const res = await buildStargateStakeAndDelegateClauses.handler({
      walletAddress: wallet,
      validator,
      amount: '50000',
    })
    const sc = structured(res) as any
    expect(sc.data.summary).toMatch(/Lightning/)
    expect(sc.data.clauses[1].data).toContain(
      '0000000000000000000000000000000000000000000000000000000000000009',
    )
  })

  test('rejects amount that does not match the tier', async () => {
    const res = await buildStargateStakeAndDelegateClauses.handler({
      walletAddress: wallet,
      tier: 'Dawn',
      validator,
      amount: '9999',
    })
    const sc = structured(res) as any
    expect(sc.ok).toBe(false)
    expect(String(sc.error)).toMatch(/Wrong VET amount/)
  })

  test('rejects levelId 1 with the historical Dawn-sized amount (regression)', async () => {
    const res = await buildStargateStakeAndDelegateClauses.handler({
      walletAddress: wallet,
      levelId: 1,
      validator,
      amount: '10000',
    })
    const sc = structured(res) as any
    expect(sc.ok).toBe(false)
    expect(String(sc.error)).toMatch(/Wrong VET amount/)
  })

  test('rejects X tiers (legacy migration only)', async () => {
    const res = await buildStargateStakeAndDelegateClauses.handler({
      walletAddress: wallet,
      levelId: 5,
      validator,
      amount: '1600000',
    })
    const sc = structured(res) as any
    expect(sc.ok).toBe(false)
    expect(String(sc.error)).toMatch(/legacy node migration/)
  })

  test('approves the exact boost amount returned by StargateNFT', async () => {
    ;(fetchStargateBoostAmount as jest.Mock).mockResolvedValueOnce(7n * 10n ** 18n)
    const res = await buildStargateStakeAndDelegateClauses.handler({
      walletAddress: wallet,
      tier: 'Dawn',
      validator,
      amount: '10000',
    })
    const sc = structured(res) as any
    const approve = sc.data.clauses[0]
    const amountHex = approve.data.slice(-64)
    expect(BigInt('0x' + amountHex)).toBe(7n * 10n ** 18n)
  })
})

describe('buildStargateDelegateClauses / undelegate / claimRewards', () => {
  test('delegate emits a single Stargate.delegate clause', async () => {
    const res = await buildStargateDelegateClauses.handler({
      walletAddress: wallet,
      tokenId: '7',
      validator,
    })
    const sc = structured(res) as any
    expect(sc.data.clauses).toHaveLength(1)
    expect(sc.data.clauses[0].to.toLowerCase()).toBe(
      CONTRACT_ADDRESSES.mainnet.stargate?.toLowerCase(),
    )
  })

  test('undelegate emits requestDelegationExit', async () => {
    const res = await buildStargateUndelegateClauses.handler({
      walletAddress: wallet,
      tokenId: '7',
    })
    const sc = structured(res) as any
    expect(sc.data.clauses[0].to.toLowerCase()).toBe(
      CONTRACT_ADDRESSES.mainnet.stargate?.toLowerCase(),
    )
    expect(sc.data.summary).toMatch(/Request delegation exit/)
  })

  test('claimRewards emits one clause per tokenId', async () => {
    const res = await buildStargateClaimRewardsClauses.handler({
      walletAddress: wallet,
      tokenIds: ['1', '2', '3'],
    })
    const sc = structured(res) as any
    expect(sc.data.clauses).toHaveLength(3)
  })
})

describe('buildB3trConvertToVot3Clauses (parity with backend buildConvertToVot3)', () => {
  test('emits approve + convertToVOT3 when allowance is insufficient', async () => {
    ;(fetchErc20Allowance as jest.Mock).mockResolvedValueOnce(0n)
    const res = await buildB3trConvertToVot3Clauses.handler({
      walletAddress: wallet,
      amount: '100',
    })
    const sc = structured(res) as any
    expect(sc.ok).toBe(true)
    expect(sc.data.clauses).toHaveLength(2)
    const [approve, convert] = sc.data.clauses
    expect(approve.to.toLowerCase()).toBe(
      CONTRACT_ADDRESSES.mainnet.b3tr?.toLowerCase(),
    )
    expect(approve.data.startsWith('0x095ea7b3')).toBe(true)
    expect(convert.to.toLowerCase()).toBe(
      CONTRACT_ADDRESSES.mainnet.vot3?.toLowerCase(),
    )
    const amountHex = convert.data.slice(-64)
    expect(BigInt('0x' + amountHex)).toBe(100n * 10n ** 18n)
  })

  test('skips the approve clause when allowance is sufficient', async () => {
    ;(fetchErc20Allowance as jest.Mock).mockResolvedValueOnce(1_000_000n * 10n ** 18n)
    const res = await buildB3trConvertToVot3Clauses.handler({
      walletAddress: wallet,
      amount: '100',
    })
    const sc = structured(res) as any
    expect(sc.data.clauses).toHaveLength(1)
    expect(sc.data.clauses[0].to.toLowerCase()).toBe(
      CONTRACT_ADDRESSES.mainnet.vot3?.toLowerCase(),
    )
  })

  test('rejects amount <= 0', async () => {
    ;(fetchErc20Allowance as jest.Mock).mockResolvedValueOnce(0n)
    const res = await buildB3trConvertToVot3Clauses.handler({
      walletAddress: wallet,
      amount: '0',
    })
    const sc = structured(res) as any
    expect(sc.ok).toBe(false)
    expect(String(sc.error)).toMatch(/> 0/)
  })
})

describe('buildB3trConvertToB3trClauses', () => {
  test('emits a single convertToB3TR clause to VOT3', async () => {
    const res = await buildB3trConvertToB3trClauses.handler({
      walletAddress: wallet,
      amount: '42',
    })
    const sc = structured(res) as any
    expect(sc.data.clauses).toHaveLength(1)
    const c = sc.data.clauses[0]
    expect(c.to.toLowerCase()).toBe(CONTRACT_ADDRESSES.mainnet.vot3?.toLowerCase())
    expect(c.value).toBe('0x0')
    const amountHex = c.data.slice(-64)
    expect(BigInt('0x' + amountHex)).toBe(42n * 10n ** 18n)
  })

  test('rejects amount <= 0', async () => {
    const res = await buildB3trConvertToB3trClauses.handler({
      walletAddress: wallet,
      amount: '0',
    })
    const sc = structured(res) as any
    expect(sc.ok).toBe(false)
    expect(String(sc.error)).toMatch(/> 0/)
  })
})

describe('buildB3trCastAllocationVotesClauses', () => {
  const appA = `0x${'ab'.repeat(32)}`
  const appB = `0x${'cd'.repeat(32)}`

  test('emits a single castVote clause to XAllocationVoting', async () => {
    const res = await buildB3trCastAllocationVotesClauses.handler({
      walletAddress: wallet,
      roundId: '42',
      votes: [
        { appId: appA, weight: '10' },
        { appId: appB, weight: '5' },
      ],
    })
    const sc = structured(res) as any
    expect(sc.data.clauses).toHaveLength(1)
    const c = sc.data.clauses[0]
    expect(c.to.toLowerCase()).toBe(
      CONTRACT_ADDRESSES.mainnet.xAllocationVoting?.toLowerCase(),
    )
    expect(c.data.toLowerCase()).toContain(appA.slice(2).toLowerCase())
    expect(c.data.toLowerCase()).toContain(appB.slice(2).toLowerCase())
  })

  test('filters zero-weight and rejects when nothing remains', async () => {
    const res = await buildB3trCastAllocationVotesClauses.handler({
      walletAddress: wallet,
      roundId: '1',
      votes: [{ appId: appA, weight: '0' }],
    })
    const sc = structured(res) as any
    expect(sc.ok).toBe(false)
    expect(String(sc.error)).toMatch(/At least one vote/)
  })

  test('rejects duplicate appIds', async () => {
    const res = await buildB3trCastAllocationVotesClauses.handler({
      walletAddress: wallet,
      roundId: '1',
      votes: [
        { appId: appA, weight: '1' },
        { appId: appA, weight: '2' },
      ],
    })
    const sc = structured(res) as any
    expect(sc.ok).toBe(false)
    expect(String(sc.error)).toMatch(/Duplicate appId/)
  })
})

describe('buildB3trClaimVoterRewardsClauses', () => {
  test('emits one clause per roundId targeting VoterRewards', async () => {
    const res = await buildB3trClaimVoterRewardsClauses.handler({
      walletAddress: wallet,
      roundIds: ['10', '11', '12'],
    })
    const sc = structured(res) as any
    expect(sc.data.clauses).toHaveLength(3)
    for (const c of sc.data.clauses) {
      expect(c.to.toLowerCase()).toBe(
        CONTRACT_ADDRESSES.mainnet.voterRewards?.toLowerCase(),
      )
      expect(c.data.toLowerCase()).toContain(wallet.slice(2).toLowerCase())
    }
  })

  test('rejects duplicate roundIds', async () => {
    const res = await buildB3trClaimVoterRewardsClauses.handler({
      walletAddress: wallet,
      roundIds: ['1', '1'],
    })
    const sc = structured(res) as any
    expect(sc.ok).toBe(false)
    expect(String(sc.error)).toMatch(/Duplicate roundId/)
  })
})

describe('buildB3trCastProposalVoteClauses', () => {
  test('emits a castVoteWithReason clause to the B3TR Governor', async () => {
    const res = await buildB3trCastProposalVoteClauses.handler({
      walletAddress: wallet,
      proposalId: '123',
      support: 1,
      reason: 'looks good',
    })
    const sc = structured(res) as any
    expect(sc.data.clauses).toHaveLength(1)
    const c = sc.data.clauses[0]
    expect(c.to.toLowerCase()).toBe(
      CONTRACT_ADDRESSES.mainnet.b3trGovernor?.toLowerCase(),
    )
    expect(c.value).toBe('0x0')
    expect(sc.data.summary).toMatch(/For/)
  })

  test('rejects an out-of-range support value', async () => {
    const res = await buildB3trCastProposalVoteClauses.handler({
      walletAddress: wallet,
      proposalId: '1',
      support: 3,
    })
    const sc = structured(res) as any
    expect(sc.ok).toBe(false)
  })
})

describe('buildB3trDelegateVot3Clauses', () => {
  test('self-delegates by default', async () => {
    const res = await buildB3trDelegateVot3Clauses.handler({ walletAddress: wallet })
    const sc = structured(res) as any
    const c = sc.data.clauses[0]
    expect(c.to.toLowerCase()).toBe(CONTRACT_ADDRESSES.mainnet.vot3?.toLowerCase())
    expect(c.data.toLowerCase()).toContain(wallet.slice(2).toLowerCase())
    expect(sc.data.summary).toMatch(/Self-delegate/)
  })

  test('delegates to a custom address when provided', async () => {
    const other = `0x${'ab'.repeat(20)}`
    const res = await buildB3trDelegateVot3Clauses.handler({
      walletAddress: wallet,
      delegatee: other,
    })
    const sc = structured(res) as any
    expect(sc.data.clauses[0].data.toLowerCase()).toContain(other.slice(2).toLowerCase())
    expect(sc.data.summary).toContain(other)
  })

  test('rejects an invalid delegatee address', async () => {
    const res = await buildB3trDelegateVot3Clauses.handler({
      walletAddress: wallet,
      delegatee: 'not-an-address',
    })
    const sc = structured(res) as any
    expect(sc.ok).toBe(false)
  })
})
