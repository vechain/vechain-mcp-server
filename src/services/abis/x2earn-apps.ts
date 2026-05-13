import type { Abi } from 'viem'

/**
 * X2EarnApps view ABI (subset needed to enumerate apps + status + roles).
 */
export const X2EARN_APPS_VIEW_ABI = [
  {
    name: 'apps',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        type: 'tuple[]',
        name: '',
        components: [
          { name: 'id', type: 'bytes32' },
          { name: 'teamWalletAddress', type: 'address' },
          { name: 'name', type: 'string' },
          { name: 'metadataURI', type: 'string' },
          { name: 'createdAtTimestamp', type: 'uint256' },
          { name: 'appAvailableForAllocationVoting', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'unendorsedApps',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        type: 'tuple[]',
        name: '',
        components: [
          { name: 'id', type: 'bytes32' },
          { name: 'teamWalletAddress', type: 'address' },
          { name: 'name', type: 'string' },
          { name: 'metadataURI', type: 'string' },
          { name: 'createdAtTimestamp', type: 'uint256' },
          { name: 'appAvailableForAllocationVoting', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'baseURI',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'endorsementScoreThreshold',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'gracePeriod',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'cooldownPeriod',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'endorsementsPaused',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'app',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'appId', type: 'bytes32' }],
    outputs: [
      {
        type: 'tuple',
        name: '',
        components: [
          { name: 'id', type: 'bytes32' },
          { name: 'teamWalletAddress', type: 'address' },
          { name: 'name', type: 'string' },
          { name: 'metadataURI', type: 'string' },
          { name: 'createdAtTimestamp', type: 'uint256' },
          { name: 'appAvailableForAllocationVoting', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'appExists',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'appId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'appAdmin',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'appId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'appModerators',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'appId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    name: 'appCreators',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'appId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    name: 'rewardDistributors',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'appId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    name: 'isBlacklisted',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'appId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'isAppUnendorsed',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'appId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'isEligibleNow',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'appId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getScore',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'appId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getEndorsers',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'appId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address[]' }],
  },
] as const satisfies Abi
