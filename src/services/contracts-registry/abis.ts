/**
 * Centralized ABI imports for VeBetterDAO, Stargate and standard ERC20/ERC721.
 *
 * Both `@vechain/vebetterdao-contracts@9` and
 * `@vechain/stargate-contracts-artifacts@4` ship an ESM dist that is broken on
 * Node 22: it does directory imports without an `index.js` and imports `.json`
 * files without the required `with { type: "json" }` attribute. We therefore
 * load them through the CJS entry point via `createRequire`: `require()` of
 * JSON works natively on the CJS path. This keeps `tsx --watch` (no bundling)
 * happy AND lets esbuild inline `require(stringLiteral)` calls in the tsup
 * build.
 */

import { createRequire } from 'node:module'
import type { Abi } from 'viem'

const requireCJS = createRequire(import.meta.url)

type AbiJson = { abi: Abi }

const vbd = requireCJS('@vechain/vebetterdao-contracts') as Record<string, AbiJson>

const StargateJson = requireCJS(
  '@vechain/stargate-contracts-artifacts/artifacts/contracts/Stargate.sol/Stargate.json',
) as AbiJson
const StargateNFTJson = requireCJS(
  '@vechain/stargate-contracts-artifacts/artifacts/contracts/StargateNFT/StargateNFT.sol/StargateNFT.json',
) as AbiJson
const StargateDelegationJson = requireCJS(
  '@vechain/stargate-contracts-artifacts/artifacts/contracts/deprecated/StargateDelegation/V4/StargateDelegation.sol/StargateDelegation.json',
) as AbiJson
const NodeManagementJson = requireCJS(
  '@vechain/stargate-contracts-artifacts/artifacts/contracts/deprecated/NodeManagement/NodeManagementV4.sol/NodeManagementV4.json',
) as AbiJson

export const B3TR_ABI = vbd.B3trContractJson.abi
export const VOT3_ABI = vbd.Vot3ContractJson.abi
export const B3TR_GOVERNOR_ABI = vbd.B3TRGovernorJson.abi
export const TIMELOCK_ABI = vbd.TimeLockContractJson.abi
export const GALAXY_MEMBER_ABI = vbd.GalaxyMemberContractJson.abi
export const EMISSIONS_ABI = vbd.EmissionsContractJson.abi
export const VOTER_REWARDS_ABI = vbd.VoterRewardsContractJson.abi
export const X_ALLOCATION_POOL_ABI = vbd.XAllocationPoolJson.abi
export const X_ALLOCATION_VOTING_ABI = vbd.XAllocationVotingJson.abi
export const TREASURY_ABI = vbd.TreasuryContractJson.abi
export const X2EARN_APPS_ABI = vbd.X2EarnAppsJson.abi
export const X2EARN_REWARDS_POOL_ABI = vbd.X2EarnRewardsPoolJson.abi
export const VEBETTER_PASSPORT_ABI = vbd.VeBetterPassportJson.abi
export const GRANTS_MANAGER_ABI = vbd.GrantsManagerJson.abi
export const DBA_POOL_ABI = vbd.DBAPoolJson.abi

export const STARGATE_ABI = StargateJson.abi
export const STARGATE_NFT_ABI = StargateNFTJson.abi
export const STARGATE_DELEGATION_ABI = StargateDelegationJson.abi
export const NODE_MANAGEMENT_ABI = NodeManagementJson.abi

/**
 * Canonical ERC20 ABI (read + write subset).
 * Hand-written to keep the bundle lean and to provide a stable surface for
 * arbitrary ERC20 tokens identified by address.
 */
export const ERC20_ABI: Abi = [
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string', name: '' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string', name: '' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8', name: '' }],
  },
  {
    type: 'function',
    name: 'totalSupply',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256', name: '' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ type: 'address', name: 'account' }],
    outputs: [{ type: 'uint256', name: '' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { type: 'address', name: 'owner' },
      { type: 'address', name: 'spender' },
    ],
    outputs: [{ type: 'uint256', name: '' }],
  },
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { type: 'address', name: 'to' },
      { type: 'uint256', name: 'amount' },
    ],
    outputs: [{ type: 'bool', name: '' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { type: 'address', name: 'spender' },
      { type: 'uint256', name: 'amount' },
    ],
    outputs: [{ type: 'bool', name: '' }],
  },
  {
    type: 'function',
    name: 'transferFrom',
    stateMutability: 'nonpayable',
    inputs: [
      { type: 'address', name: 'from' },
      { type: 'address', name: 'to' },
      { type: 'uint256', name: 'amount' },
    ],
    outputs: [{ type: 'bool', name: '' }],
  },
]

/**
 * Canonical ERC721 ABI (including Enumerable + Metadata extensions).
 */
export const ERC721_ABI: Abi = [
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string', name: '' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string', name: '' }],
  },
  {
    type: 'function',
    name: 'tokenURI',
    stateMutability: 'view',
    inputs: [{ type: 'uint256', name: 'tokenId' }],
    outputs: [{ type: 'string', name: '' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ type: 'address', name: 'owner' }],
    outputs: [{ type: 'uint256', name: '' }],
  },
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ type: 'uint256', name: 'tokenId' }],
    outputs: [{ type: 'address', name: '' }],
  },
  {
    type: 'function',
    name: 'getApproved',
    stateMutability: 'view',
    inputs: [{ type: 'uint256', name: 'tokenId' }],
    outputs: [{ type: 'address', name: '' }],
  },
  {
    type: 'function',
    name: 'isApprovedForAll',
    stateMutability: 'view',
    inputs: [
      { type: 'address', name: 'owner' },
      { type: 'address', name: 'operator' },
    ],
    outputs: [{ type: 'bool', name: '' }],
  },
  {
    type: 'function',
    name: 'totalSupply',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256', name: '' }],
  },
  {
    type: 'function',
    name: 'tokenOfOwnerByIndex',
    stateMutability: 'view',
    inputs: [
      { type: 'address', name: 'owner' },
      { type: 'uint256', name: 'index' },
    ],
    outputs: [{ type: 'uint256', name: '' }],
  },
  {
    type: 'function',
    name: 'tokenByIndex',
    stateMutability: 'view',
    inputs: [{ type: 'uint256', name: 'index' }],
    outputs: [{ type: 'uint256', name: '' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { type: 'address', name: 'to' },
      { type: 'uint256', name: 'tokenId' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'setApprovalForAll',
    stateMutability: 'nonpayable',
    inputs: [
      { type: 'address', name: 'operator' },
      { type: 'bool', name: 'approved' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'transferFrom',
    stateMutability: 'nonpayable',
    inputs: [
      { type: 'address', name: 'from' },
      { type: 'address', name: 'to' },
      { type: 'uint256', name: 'tokenId' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'safeTransferFrom',
    stateMutability: 'nonpayable',
    inputs: [
      { type: 'address', name: 'from' },
      { type: 'address', name: 'to' },
      { type: 'uint256', name: 'tokenId' },
    ],
    outputs: [],
  },
]
