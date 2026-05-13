/**
 * Central registry that maps a contract `name` to its ABI, addresses and
 * category. Consumed by the generic contract tools (`listKnownContracts`,
 * `getContractAbi`, `callContract`, `buildContractTransaction`).
 *
 * - VeBetterDAO and Stargate contracts have a fixed address per network.
 * - `erc20` and `erc721` are open standards: the caller must always provide
 *   an explicit address for them.
 */
import type { Abi } from 'viem'
import { getThorNetworkType } from '@/services/thor'
import {
  B3TR_ABI,
  B3TR_GOVERNOR_ABI,
  DBA_POOL_ABI,
  EMISSIONS_ABI,
  ERC20_ABI,
  ERC721_ABI,
  GALAXY_MEMBER_ABI,
  GRANTS_MANAGER_ABI,
  NODE_MANAGEMENT_ABI,
  STARGATE_ABI,
  STARGATE_DELEGATION_ABI,
  STARGATE_NFT_ABI,
  TIMELOCK_ABI,
  TREASURY_ABI,
  VEBETTER_PASSPORT_ABI,
  VOT3_ABI,
  VOTER_REWARDS_ABI,
  X_ALLOCATION_POOL_ABI,
  X_ALLOCATION_VOTING_ABI,
  X2EARN_APPS_ABI,
  X2EARN_REWARDS_POOL_ABI,
} from './abis'
import { CONTRACT_ADDRESSES, type NetworkName, type RegistryContractName } from './addresses'

export type ContractCategory = 'vebetterdao' | 'stargate' | 'standard'

export type ContractEntry = {
  name: RegistryContractName
  displayName: string
  category: ContractCategory
  abi: Abi
  /** Address per network. Undefined for `erc20` / `erc721` (caller supplies it). */
  addresses: Partial<Record<NetworkName, string>>
  /** True when the caller MUST pass an explicit `address` override. */
  requiresAddress: boolean
}

const ENTRIES: Record<RegistryContractName, ContractEntry> = {
  b3tr: {
    name: 'b3tr',
    displayName: 'B3TR',
    category: 'vebetterdao',
    abi: B3TR_ABI,
    addresses: pick('b3tr'),
    requiresAddress: false,
  },
  vot3: {
    name: 'vot3',
    displayName: 'VOT3',
    category: 'vebetterdao',
    abi: VOT3_ABI,
    addresses: pick('vot3'),
    requiresAddress: false,
  },
  b3trGovernor: {
    name: 'b3trGovernor',
    displayName: 'B3TRGovernor',
    category: 'vebetterdao',
    abi: B3TR_GOVERNOR_ABI,
    addresses: pick('b3trGovernor'),
    requiresAddress: false,
  },
  timelock: {
    name: 'timelock',
    displayName: 'TimeLock',
    category: 'vebetterdao',
    abi: TIMELOCK_ABI,
    addresses: pick('timelock'),
    requiresAddress: false,
  },
  galaxyMember: {
    name: 'galaxyMember',
    displayName: 'GalaxyMember (GM NFT)',
    category: 'vebetterdao',
    abi: GALAXY_MEMBER_ABI,
    addresses: pick('galaxyMember'),
    requiresAddress: false,
  },
  emissions: {
    name: 'emissions',
    displayName: 'Emissions',
    category: 'vebetterdao',
    abi: EMISSIONS_ABI,
    addresses: pick('emissions'),
    requiresAddress: false,
  },
  voterRewards: {
    name: 'voterRewards',
    displayName: 'VoterRewards',
    category: 'vebetterdao',
    abi: VOTER_REWARDS_ABI,
    addresses: pick('voterRewards'),
    requiresAddress: false,
  },
  xAllocationPool: {
    name: 'xAllocationPool',
    displayName: 'XAllocationPool',
    category: 'vebetterdao',
    abi: X_ALLOCATION_POOL_ABI,
    addresses: pick('xAllocationPool'),
    requiresAddress: false,
  },
  xAllocationVoting: {
    name: 'xAllocationVoting',
    displayName: 'XAllocationVoting',
    category: 'vebetterdao',
    abi: X_ALLOCATION_VOTING_ABI,
    addresses: pick('xAllocationVoting'),
    requiresAddress: false,
  },
  treasury: {
    name: 'treasury',
    displayName: 'Treasury',
    category: 'vebetterdao',
    abi: TREASURY_ABI,
    addresses: pick('treasury'),
    requiresAddress: false,
  },
  x2EarnApps: {
    name: 'x2EarnApps',
    displayName: 'X2EarnApps',
    category: 'vebetterdao',
    abi: X2EARN_APPS_ABI,
    addresses: pick('x2EarnApps'),
    requiresAddress: false,
  },
  x2EarnRewardsPool: {
    name: 'x2EarnRewardsPool',
    displayName: 'X2EarnRewardsPool',
    category: 'vebetterdao',
    abi: X2EARN_REWARDS_POOL_ABI,
    addresses: pick('x2EarnRewardsPool'),
    requiresAddress: false,
  },
  veBetterPassport: {
    name: 'veBetterPassport',
    displayName: 'VeBetterPassport',
    category: 'vebetterdao',
    abi: VEBETTER_PASSPORT_ABI,
    addresses: pick('veBetterPassport'),
    requiresAddress: false,
  },
  grantsManager: {
    name: 'grantsManager',
    displayName: 'GrantsManager',
    category: 'vebetterdao',
    abi: GRANTS_MANAGER_ABI,
    addresses: pick('grantsManager'),
    requiresAddress: false,
  },
  dbaPool: {
    name: 'dbaPool',
    displayName: 'DBAPool',
    category: 'vebetterdao',
    abi: DBA_POOL_ABI,
    addresses: pick('dbaPool'),
    requiresAddress: false,
  },
  stargate: {
    name: 'stargate',
    displayName: 'Stargate',
    category: 'stargate',
    abi: STARGATE_ABI,
    addresses: pick('stargate'),
    requiresAddress: false,
  },
  stargateNft: {
    name: 'stargateNft',
    displayName: 'StargateNFT',
    category: 'stargate',
    abi: STARGATE_NFT_ABI,
    addresses: pick('stargateNft'),
    requiresAddress: false,
  },
  stargateDelegation: {
    name: 'stargateDelegation',
    displayName: 'StargateDelegation',
    category: 'stargate',
    abi: STARGATE_DELEGATION_ABI,
    addresses: pick('stargateDelegation'),
    requiresAddress: false,
  },
  nodeManagement: {
    name: 'nodeManagement',
    displayName: 'NodeManagement',
    category: 'stargate',
    abi: NODE_MANAGEMENT_ABI,
    addresses: pick('nodeManagement'),
    requiresAddress: false,
  },
  erc20: {
    name: 'erc20',
    displayName: 'ERC20 (standard)',
    category: 'standard',
    abi: ERC20_ABI,
    addresses: {},
    requiresAddress: true,
  },
  erc721: {
    name: 'erc721',
    displayName: 'ERC721 (standard)',
    category: 'standard',
    abi: ERC721_ABI,
    addresses: {},
    requiresAddress: true,
  },
}

function pick(name: RegistryContractName): Partial<Record<NetworkName, string>> {
  return {
    mainnet: CONTRACT_ADDRESSES.mainnet[name],
    testnet: CONTRACT_ADDRESSES.testnet[name],
  }
}

export const CONTRACT_NAMES = Object.keys(ENTRIES) as RegistryContractName[]

export function isContractName(value: string): value is RegistryContractName {
  return Object.hasOwn(ENTRIES, value)
}

export function getContractEntry(name: RegistryContractName): ContractEntry {
  const entry = ENTRIES[name]
  if (!entry) throw new Error(`Unknown contract: ${name}`)
  return entry
}

export function listContracts(category?: ContractCategory): ContractEntry[] {
  const all = Object.values(ENTRIES)
  return category ? all.filter(e => e.category === category) : all
}

/**
 * Resolve the on-chain address for a registry contract on the currently
 * configured network. For `erc20`/`erc721` the caller MUST pass `override`.
 *
 * Throws when the address is unknown for the active network (e.g. Stargate
 * contracts on solo) or when an override is required but missing.
 */
export function resolveAddress(name: RegistryContractName, override?: string): string {
  const entry = getContractEntry(name)
  if (entry.requiresAddress) {
    if (!override) throw new Error(`Contract "${name}" requires an explicit address`)
    return override
  }
  if (override) return override
  const network = networkKey()
  const address = entry.addresses[network]
  if (!address) {
    throw new Error(`No address known for contract "${name}" on network "${network}"`)
  }
  return address
}

/**
 * Translate the Thor network type into our 2-value `NetworkName` (mainnet | testnet).
 * Solo defaults to testnet addresses since solo deployments use ephemeral ones.
 */
export function networkKey(): NetworkName {
  return getThorNetworkType() === 'mainnet' ? 'mainnet' : 'testnet'
}

export type { NetworkName, RegistryContractName }
