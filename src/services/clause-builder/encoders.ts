import { encodeFunctionData } from 'viem'
import {
  B3TR_GOVERNOR_ABI,
  ERC20_ABI,
  STARGATE_ABI,
  STARGATE_NFT_ABI,
  UNISWAP_V2_ROUTER_ABI,
  VOT3_ABI,
  VOTER_REWARDS_ABI,
  X_ALLOCATION_VOTING_ABI,
} from '@/services/contracts-registry/abis'

export const erc20 = {
  transfer(to: string, amount: bigint): `0x${string}` {
    return encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [to as `0x${string}`, amount],
    })
  },
  approve(spender: string, amount: bigint): `0x${string}` {
    return encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender as `0x${string}`, amount],
    })
  },
}

export const stargate = {
  stake(levelId: number): `0x${string}` {
    return encodeFunctionData({
      abi: STARGATE_ABI,
      functionName: 'stake',
      args: [levelId],
    })
  },
  stakeAndDelegate(levelId: number, validator: string): `0x${string}` {
    return encodeFunctionData({
      abi: STARGATE_ABI,
      functionName: 'stakeAndDelegate',
      args: [levelId, validator as `0x${string}`],
    })
  },
  unstake(tokenId: bigint): `0x${string}` {
    return encodeFunctionData({
      abi: STARGATE_ABI,
      functionName: 'unstake',
      args: [tokenId],
    })
  },
  delegate(tokenId: bigint, validator: string): `0x${string}` {
    return encodeFunctionData({
      abi: STARGATE_ABI,
      functionName: 'delegate',
      args: [tokenId, validator as `0x${string}`],
    })
  },
  requestDelegationExit(tokenId: bigint): `0x${string}` {
    return encodeFunctionData({
      abi: STARGATE_ABI,
      functionName: 'requestDelegationExit',
      args: [tokenId],
    })
  },
  claimRewards(tokenId: bigint): `0x${string}` {
    return encodeFunctionData({
      abi: STARGATE_ABI,
      functionName: 'claimRewards',
      args: [tokenId],
    })
  },
}

export const stargateNft = {
  boostAmountOfLevel(levelId: number): `0x${string}` {
    return encodeFunctionData({
      abi: STARGATE_NFT_ABI,
      functionName: 'boostAmountOfLevel',
      args: [levelId],
    })
  },
}

export const vot3 = {
  convertToVOT3(amount: bigint): `0x${string}` {
    return encodeFunctionData({
      abi: VOT3_ABI,
      functionName: 'convertToVOT3',
      args: [amount],
    })
  },
  convertToB3TR(amount: bigint): `0x${string}` {
    return encodeFunctionData({
      abi: VOT3_ABI,
      functionName: 'convertToB3TR',
      args: [amount],
    })
  },
  delegate(delegatee: string): `0x${string}` {
    return encodeFunctionData({
      abi: VOT3_ABI,
      functionName: 'delegate',
      args: [delegatee as `0x${string}`],
    })
  },
}

export const xAllocationVoting = {
  castVote(roundId: bigint, appIds: string[], weights: bigint[]): `0x${string}` {
    return encodeFunctionData({
      abi: X_ALLOCATION_VOTING_ABI,
      functionName: 'castVote',
      args: [roundId, appIds as `0x${string}`[], weights],
    })
  },
}

export const voterRewards = {
  claimReward(roundId: bigint, voter: string): `0x${string}` {
    return encodeFunctionData({
      abi: VOTER_REWARDS_ABI,
      functionName: 'claimReward',
      args: [roundId, voter as `0x${string}`],
    })
  },
}

export const b3trGovernor = {
  castVoteWithReason(proposalId: bigint, support: number, reason: string): `0x${string}` {
    return encodeFunctionData({
      abi: B3TR_GOVERNOR_ABI,
      functionName: 'castVoteWithReason',
      args: [proposalId, support, reason],
    })
  },
}

export const router = {
  swapExactETHForTokens(
    amountOutMin: bigint,
    path: string[],
    to: string,
    deadline: bigint,
  ): `0x${string}` {
    return encodeFunctionData({
      abi: UNISWAP_V2_ROUTER_ABI,
      functionName: 'swapExactETHForTokens',
      args: [amountOutMin, path as `0x${string}`[], to as `0x${string}`, deadline],
    })
  },
  swapExactTokensForETH(
    amountIn: bigint,
    amountOutMin: bigint,
    path: string[],
    to: string,
    deadline: bigint,
  ): `0x${string}` {
    return encodeFunctionData({
      abi: UNISWAP_V2_ROUTER_ABI,
      functionName: 'swapExactTokensForETH',
      args: [amountIn, amountOutMin, path as `0x${string}`[], to as `0x${string}`, deadline],
    })
  },
  swapExactTokensForTokens(
    amountIn: bigint,
    amountOutMin: bigint,
    path: string[],
    to: string,
    deadline: bigint,
  ): `0x${string}` {
    return encodeFunctionData({
      abi: UNISWAP_V2_ROUTER_ABI,
      functionName: 'swapExactTokensForTokens',
      args: [amountIn, amountOutMin, path as `0x${string}`[], to as `0x${string}`, deadline],
    })
  },
}
