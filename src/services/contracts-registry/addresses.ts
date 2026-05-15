/**
 * Network-aware addresses for all contracts known to the registry.
 *
 * Mainnet sources:
 *  - VeBetterDAO: ~/vechain/vebetterdao-contracts/packages/config/mainnet.ts
 *  - Stargate:    ~/vechain/stargate/packages/config/mainnet.ts
 *
 * Testnet sources are the matching `testnet.ts` files in those repos.
 */
export type NetworkName = 'mainnet' | 'testnet'

export type RegistryContractName =
  | 'b3tr'
  | 'vot3'
  | 'b3trGovernor'
  | 'timelock'
  | 'galaxyMember'
  | 'emissions'
  | 'voterRewards'
  | 'xAllocationPool'
  | 'xAllocationVoting'
  | 'treasury'
  | 'x2EarnApps'
  | 'x2EarnRewardsPool'
  | 'veBetterPassport'
  | 'grantsManager'
  | 'dbaPool'
  | 'stargate'
  | 'stargateNft'
  | 'stargateDelegation'
  | 'nodeManagement'
  | 'erc20'
  | 'erc721'

export type NetworkAddressMap = Partial<Record<RegistryContractName, string>>

export const CONTRACT_ADDRESSES: Record<NetworkName, NetworkAddressMap> = {
  mainnet: {
    b3tr: '0x5ef79995FE8a89e0812330E4378eB2660ceDe699',
    vot3: '0x76Ca782B59C74d088C7D2Cce2f211BC00836c602',
    b3trGovernor: '0x1c65C25fABe2fc1bCb82f253fA0C916a322f777C',
    timelock: '0x7B7EaF620d88E38782c6491D7Ce0B8D8cF3227e4',
    galaxyMember: '0x93B8cD34A7Fc4f53271b9011161F7A2B5fEA9D1F',
    emissions: '0xDf94739bd169C84fe6478D8420Bb807F1f47b135',
    voterRewards: '0x838A33AF756a6366f93e201423E1425f67eC0Fa7',
    xAllocationPool: '0x4191776F05f4bE4848d3f4d587345078B439C7d3',
    xAllocationVoting: '0x89A00Bb0947a30FF95BEeF77a66AEdE3842Fe5B7',
    treasury: '0xD5903BCc66e439c753e525F8AF2FeC7be2429593',
    x2EarnApps: '0x8392B7CCc763dB03b47afcD8E8f5e24F9cf0554D',
    x2EarnRewardsPool: '0x6Bee7DDab6c99d5B2Af0554EaEA484CE18F52631',
    veBetterPassport: '0x35a267671d8EDD607B2056A9a13E7ba7CF53c8b3',
    grantsManager: '0x055d20914657834c914d7c44bf65b566ab4b45a2',
    dbaPool: '0x98c1d097c39969bb5de754266f60d22bd105b368',
    stargate: '0x03C557bE98123fdb6faD325328AC6eB77de7248C',
    stargateNft: '0x1856c533ac2d94340aaa8544d35a5c1d4a21dee7',
    stargateDelegation: '0x4cb1c9ef05b529c093371264fab2c93cc6cddb0e',
    nodeManagement: '0xB0EF9D89C6b49CbA6BBF86Bf2FDf0Eee4968c6AB',
  },
  testnet: {
    b3tr: '0x849cB24E22e86d964a3fF956796d9555FB382900',
    vot3: '0x8D7993A68Db714ACfCdFf05f82B5e953462D30c0',
    b3trGovernor: '0x5e297d07CEa07A02C7b8391244f4E85E90d51506',
    timelock: '0xC9a7095aEFbDDe886B4B4E3A583E80bE6b9c3b4a',
    galaxyMember: '0x399ECc33f89CB62D31C81322CF96904C1D1b2A43',
    emissions: '0x506a2fC32f3385322aD91C3DFD1Da89ca3b404BB',
    voterRewards: '0x6d9C71d822C15e01490B82D2Bf9E80FD2a634229',
    xAllocationPool: '0x35CC9c8350F473C37bFA460F5b627909730365b7',
    xAllocationVoting: '0x119a46c34910fA9cF03c4F35e20D3E25b511Ab50',
    treasury: '0x3dB617e4ad9180ae507A56B777f8c6b4F5854855',
    x2EarnApps: '0x0b54a094b877a25bdc95b4431eaa1e2206b1ddfe',
    x2EarnRewardsPool: '0x3B32C6e1892efEF917e5e630d45d898227F61166',
    veBetterPassport: '0xB08939f434Ac5610D3847063bABd1F8833a66d75',
    stargateNft: '0x887d9102f0003f1724d8fd5d4fe95a11572fcd77',
    stargateDelegation: '0x32cb945dc25f4fc4214df63e3825045d6088b096',
    stargate: '0x1E02B2953AdEfEC225cF0Ec49805b1146a4429C1',
    nodeManagement: '0xde17d0a516c38c168d37685bb71465f656aa256e',
  },
}
