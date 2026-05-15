/**
 * Centralized ABI imports for VeBetterDAO, Stargate and standard ERC20/ERC721.
 *
 * VeBetterDAO ABIs come from `@vechain/vebetterdao-contracts`. The package's
 * ESM dist is broken on Node 22 (directory imports without an `index.js`, JSON
 * imports without the required `with { type: "json" }` attribute), so we load
 * it through the CJS entry point via `createRequire`. `require()` of JSON
 * works natively on the CJS path: this keeps `tsx --watch` (no bundling)
 * happy AND lets esbuild inline `require(stringLiteral)` calls in the tsup
 * build.
 *
 * Stargate ABIs are vendored as local JSON files in `./stargate/*.json` taken
 * from `@vechain/stargate-contracts-artifacts@4` (V4 = currently live on
 * mainnet/testnet). The upstream package buries them under `deprecated/V4/`
 * and has no JSON barrel, so vendoring is the lightest path until they ship
 * a cleaner artifacts layout — at that point swap these imports back to the
 * package. Source paths:
 *  - Stargate.json            ← artifacts/contracts/Stargate.sol/Stargate.json
 *  - StargateNFT.json         ← artifacts/contracts/StargateNFT/StargateNFT.sol/StargateNFT.json
 *  - StargateDelegation.json  ← artifacts/contracts/deprecated/StargateDelegation/V4/StargateDelegation.sol/StargateDelegation.json
 *  - NodeManagement.json      ← artifacts/contracts/deprecated/NodeManagement/NodeManagementV4.sol/NodeManagementV4.json
 */

import { createRequire } from 'node:module'
import type { Abi } from 'viem'
import NodeManagementAbi from './stargate/NodeManagement.json'
import StargateAbi from './stargate/Stargate.json'
import StargateDelegationAbi from './stargate/StargateDelegation.json'
import StargateNFTAbi from './stargate/StargateNFT.json'

const requireCJS = createRequire(import.meta.url)

type AbiJson = { abi: Abi }

const vbd = requireCJS('@vechain/vebetterdao-contracts') as Record<string, AbiJson>

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

export const STARGATE_ABI = StargateAbi as Abi
export const STARGATE_NFT_ABI = StargateNFTAbi as Abi
export const STARGATE_DELEGATION_ABI = StargateDelegationAbi as Abi
export const NODE_MANAGEMENT_ABI = NodeManagementAbi as Abi

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
