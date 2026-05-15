import type { ContractClause } from '@vechain/sdk-core'
import type { Contract, ContractCallResult } from '@vechain/sdk-network'
import { decodeFunctionResult, encodeFunctionData } from 'viem'
import { ERC20_ABI, ERC721_ENUMERABLE_ABI, X_ALLOCATION_VOTING_VIEW_ABI, X2EARN_APPS_VIEW_ABI } from '@/services/abis'
import { type NetworkName, networkKey, resolveAddress } from '@/services/contracts-registry'
import { getThorClient, getThorNetworkType, getThorNodeUrl } from '@/services/thor'
import { logger } from '@/utils/logger'

export { X_ALLOCATION_VOTING_VIEW_ABI, X2EARN_APPS_VIEW_ABI }

export type VeBetterDaoNetwork = NetworkName

export function getVeBetterDaoContractAddresses(): {
  network: VeBetterDaoNetwork
  x2EarnApps: string
  xAllocationVoting: string
} {
  return {
    network: networkKey(),
    x2EarnApps: resolveAddress('x2EarnApps'),
    xAllocationVoting: resolveAddress('xAllocationVoting'),
  }
}

/**
 * Re-export getThorNetworkType as getNetworkType for backwards compatibility
 */
export const getNetworkType = getThorNetworkType

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

/**
 * Network-aware `Contract<typeof X2EARN_APPS_VIEW_ABI>` loaded via the VeChain SDK.
 */
export function getX2EarnAppsContract(): Contract<typeof X2EARN_APPS_VIEW_ABI> {
  const { x2EarnApps } = getVeBetterDaoContractAddresses()
  return getThorClient().contracts.load(x2EarnApps, X2EARN_APPS_VIEW_ABI)
}

/**
 * Network-aware `Contract<typeof X_ALLOCATION_VOTING_VIEW_ABI>` loaded via the VeChain SDK.
 */
export function getXAllocationVotingContract(): Contract<typeof X_ALLOCATION_VOTING_VIEW_ABI> {
  const { xAllocationVoting } = getVeBetterDaoContractAddresses()
  return getThorClient().contracts.load(xAllocationVoting, X_ALLOCATION_VOTING_VIEW_ABI)
}

/**
 * Execute many read-only contract clauses through Thor's `simulateTransaction`
 * multicall, splitting into chunks to keep request bodies reasonable.
 *
 * Returns one `ContractCallResult` per input clause, in order, or `null` on
 * unrecoverable transport failure.
 */
export async function executeMulticall(
  clauses: ContractClause[],
  chunkSize = 50,
): Promise<ContractCallResult[] | null> {
  if (clauses.length === 0) return []
  try {
    const thor = getThorClient()
    const out: ContractCallResult[] = []
    for (let i = 0; i < clauses.length; i += chunkSize) {
      const chunk = clauses.slice(i, i + chunkSize)
      const res = await thor.contracts.executeMultipleClausesCall(chunk)
      out.push(...res)
    }
    return out
  } catch (error) {
    logger.warn(`Error in executeMulticall: ${String(error)}`)
    return null
  }
}

/**
 * Extract the decoded `plain` value from a successful `ContractCallResult`,
 * falling back to `fallback` when the clause is missing, reverted, or empty.
 */
export function unwrapPlain<T>(result: ContractCallResult | undefined, fallback: T): T {
  if (!result || !result.success) {
    if (result?.result.errorMessage) {
      logger.debug(`call reverted: ${result.result.errorMessage}`)
    }
    return fallback
  }
  return (result.result.plain as T) ?? fallback
}

/**
 * Get current round ID from X Allocation Voting contract
 */
export async function getCurrentRound(): Promise<number | null> {
  try {
    const baseUrl = getThorNodeUrl()

    const data = encodeFunctionData({
      abi: X_ALLOCATION_VOTING_VIEW_ABI,
      functionName: 'currentRoundId',
    })

    const url = `${baseUrl}/accounts/${resolveAddress('xAllocationVoting')}`

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
      abi: X_ALLOCATION_VOTING_VIEW_ABI,
      functionName: 'currentRoundId',
      data: result.data,
    })

    return Number(roundId)
  } catch (error) {
    logger.warn(`Error getting current round: ${String(error)}`)
    return null
  }
}

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
    const galaxyMemberAddress = resolveAddress('galaxyMember')
    const balanceUrl = `${baseUrl}/accounts/${galaxyMemberAddress}`

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

      const tokenIdUrl = `${baseUrl}/accounts/${galaxyMemberAddress}`

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
