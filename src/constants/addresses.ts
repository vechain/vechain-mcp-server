/**
 * VeBetterDAO Smart Contract Addresses (Mainnet)
 */
export const VEBETTERDAO_CONTRACTS = {
  // Tokens
  B3TR: '0x5ef79995FE8a89e0812330E4378eB2660ceDe699',
  VOT3: '0x76Ca782B59C74d088C7D2Cce2f211BC00836c602',

  // NFTs
  GALAXY_MEMBER: '0x93b8cd34a7fc4f53271b9011161f7a2b5fea9d1f',

  // Governance contracts (add as needed)
  X_ALLOCATION_VOTING: '0x89A00Bb0947a30FF95BEeF77a66AEdE3842Fe5B7',
} as const

/**
 * Network-aware VeBetterDAO contract addresses.
 * Source: vebetterdao frontend `packages/config/{mainnet,testnet}.ts`.
 */
export const VEBETTERDAO_NETWORK_ADDRESSES = {
  mainnet: {
    x2EarnApps: '0x8392B7CCc763dB03b47afcD8E8f5e24F9cf0554D',
    xAllocationVoting: '0x89A00Bb0947a30FF95BEeF77a66AEdE3842Fe5B7',
  },
  testnet: {
    x2EarnApps: '0x1ae6eee231bcf8229d42626b4d663d45a6abd889',
    xAllocationVoting: '0xe3c043786e991bd446be5242e79dff757fbda348',
  },
} as const

export type VeBetterDaoNetwork = keyof typeof VEBETTERDAO_NETWORK_ADDRESSES
