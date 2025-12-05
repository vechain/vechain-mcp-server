import { logger } from '@/utils/logger'
import { getThorNetworkType, getThorNodeUrl } from '@/services/thor'
import { encodeFunctionData, decodeFunctionResult } from 'viem'
import type { Abi } from 'viem'

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
 * Re-export getThorNetworkType as getNetworkType for backwards compatibility
 */
export const getNetworkType = getThorNetworkType

// ERC20 ABI for token operations
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const satisfies Abi

/**
 * Get ERC20 token balance for an address
 */
export async function getTokenBalance(params: {
  tokenAddress: string
  holderAddress: string
}): Promise<{ balance: string; decimals: number } | null> {
  try {
    logger.debug(`Fetching token balance for ${params.holderAddress} from ${params.tokenAddress}`)
    
    const baseUrl = getThorNodeUrl()
    
    // Encode balanceOf call
    const balanceData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [params.holderAddress as `0x${string}`],
    })
    
    // Call balanceOf
    const balanceUrl = `${baseUrl}/accounts/${params.tokenAddress}`
    const balanceResponse = await fetch(balanceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: balanceData }),
    })
    
    if (!balanceResponse.ok) {
      logger.warn(`Balance call failed: ${balanceResponse.status}`)
      return null
    }
    
    const balanceResult = await balanceResponse.json()
    logger.debug(`Balance result: ${JSON.stringify(balanceResult)}`)
    
    // Encode decimals call
    const decimalsData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'decimals',
    })
    
    // Call decimals
    const decimalsUrl = `${baseUrl}/accounts/${params.tokenAddress}`
    const decimalsResponse = await fetch(decimalsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: decimalsData }),
    })
    
    if (!decimalsResponse.ok) {
      logger.warn(`Decimals call failed: ${decimalsResponse.status}`)
      return null
    }
    
    const decimalsResult = await decimalsResponse.json()
    logger.debug(`Decimals result: ${JSON.stringify(decimalsResult)}`)
    
    if (!balanceResult?.data || !decimalsResult?.data) {
      logger.warn('Balance or decimals result data is null')
      return null
    }
    
    // Decode the results
    const balance = decodeFunctionResult({
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      data: balanceResult.data,
    })
    
    const decimals = decodeFunctionResult({
      abi: ERC20_ABI,
      functionName: 'decimals',
      data: decimalsResult.data,
    })
    
    logger.debug(`Parsed balance: ${balance}, decimals: ${decimals}`)
    
    return {
      balance: balance.toString(),
      decimals: Number(decimals),
    }
  } catch (error) {
    logger.warn(`Error getting token balance: ${String(error)}`)
    logger.error(error)
    return null
  }
}

// X Allocation Voting ABI
const X_ALLOCATION_VOTING_ABI = [
  {
    name: 'currentRoundId',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const satisfies Abi

/**
 * Get current round ID from X Allocation Voting contract
 */
export async function getCurrentRound(): Promise<number | null> {
  try {
    const baseUrl = getThorNodeUrl()
    
    const data = encodeFunctionData({
      abi: X_ALLOCATION_VOTING_ABI,
      functionName: 'currentRoundId',
    })
    
    const url = `${baseUrl}/accounts/${VEBETTERDAO_CONTRACTS.X_ALLOCATION_VOTING}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    })
    
    if (!response.ok) {
      logger.warn(`Current round call failed: ${response.status}`)
      return null
    }
    
    const result = await response.json()
    
    if (!result?.data) {
      return null
    }
    
    const roundId = decodeFunctionResult({
      abi: X_ALLOCATION_VOTING_ABI,
      functionName: 'currentRoundId',
      data: result.data,
    })
    
    return Number(roundId)
  } catch (error) {
    logger.warn(`Error getting current round: ${String(error)}`)
    return null
  }
}

// ERC721 Enumerable ABI for NFT operations
const ERC721_ENUMERABLE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
  },
  {
    name: 'tokenOfOwnerByIndex',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'index', type: 'uint256' }
    ],
    outputs: [{ name: 'tokenId', type: 'uint256' }],
  },
] as const satisfies Abi

/**
 * Get GM NFT level/tier for an address
 * Returns the highest tier GM NFT owned by the address
 */
export async function getGMNFTLevel(address: string): Promise<{
  hasGM: boolean
  level?: string
  tokenId?: string
} | null> {
  try {
    const baseUrl = getThorNodeUrl()
    
    // Encode balanceOf call
    const balanceData = encodeFunctionData({
      abi: ERC721_ENUMERABLE_ABI,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    })
    
    // Call balanceOf to see if user has any GM NFTs
    const balanceUrl = `${baseUrl}/accounts/${VEBETTERDAO_CONTRACTS.GALAXY_MEMBER}`
    
    const balanceResponse = await fetch(balanceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: balanceData }),
    })
    
    if (!balanceResponse.ok) {
      logger.warn(`GM NFT balance call failed: ${balanceResponse.status}`)
      return null
    }
    
    const balanceResult = await balanceResponse.json()
    
    if (!balanceResult?.data) {
      return null
    }
    
    const balanceValue = decodeFunctionResult({
      abi: ERC721_ENUMERABLE_ABI,
      functionName: 'balanceOf',
      data: balanceResult.data,
    })
    
    const balance = Number(balanceValue)
    
    if (balance === 0) {
      return { hasGM: false }
    }
    
    // User has GM NFTs - try to get the first token ID and its level
    // Note: This is a simplified version. Full implementation would enumerate all tokens
    try {
      const tokenIdData = encodeFunctionData({
        abi: ERC721_ENUMERABLE_ABI,
        functionName: 'tokenOfOwnerByIndex',
        args: [address as `0x${string}`, BigInt(0)],
      })
      
      const tokenIdUrl = `${baseUrl}/accounts/${VEBETTERDAO_CONTRACTS.GALAXY_MEMBER}`
      
      const tokenIdResponse = await fetch(tokenIdUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: tokenIdData }),
      })
      
      if (tokenIdResponse.ok) {
        const tokenIdResult = await tokenIdResponse.json()
        if (tokenIdResult?.data) {
          const tokenIdValue = decodeFunctionResult({
            abi: ERC721_ENUMERABLE_ABI,
            functionName: 'tokenOfOwnerByIndex',
            data: tokenIdResult.data,
          })
          
          const tokenId = tokenIdValue.toString()
          
          // Try to get token URI or level (contract-specific)
          // This is a placeholder - actual implementation depends on GM NFT contract interface
          return {
            hasGM: true,
            tokenId,
            level: 'GM', // Would need to query actual level from contract
          }
        }
      }
    } catch (error) {
      logger.debug(`Could not fetch GM NFT details: ${String(error)}`)
    }
    
    return { hasGM: true }
  } catch (error) {
    logger.warn(`Error getting GM NFT level: ${String(error)}`)
    return null
  }
}

