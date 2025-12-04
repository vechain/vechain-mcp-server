import { z } from 'zod'
import { ABIContract, VIP180_ABI } from '@vechain/sdk-core'
import { ThorAddressSchema } from '@/services/thor/schemas'
import { VnsNameSchema, resolveVnsOrAddress } from '@/services/vns'
import { getThorClient, getThorNetworkType } from '@/services/thor'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

// Create ABI contract instance for VIP-180/ERC-20 tokens
const vip180Abi = new ABIContract(VIP180_ABI)

const InputSchema = z.object({
  address: z.union([ThorAddressSchema, VnsNameSchema]).describe('Wallet address or VNS name to check token balance for'),
  tokenAddress: ThorAddressSchema.describe('Token contract address (VIP-180/ERC-20)'),
})

const TokenBalanceSchema = z.object({
  raw: z.string().describe('Raw balance in smallest unit (wei)'),
  formatted: z.string().describe('Human-readable balance with decimals applied'),
  decimals: z.number().describe('Token decimals'),
  symbol: z.string().optional().describe('Token symbol'),
  name: z.string().optional().describe('Token name'),
  tokenAddress: ThorAddressSchema.describe('Token contract address'),
})

const OutputSchema = z.object({
  ok: z.boolean(),
  network: z.string(),
  walletAddress: ThorAddressSchema.optional().describe('Resolved wallet address'),
  balance: TokenBalanceSchema.optional(),
  error: z.string().optional(),
})

export type GetTokenBalancesResponse = {
  content: Array<{ type: 'text'; text: string }>
  structuredContent: z.infer<typeof OutputSchema>
}

/**
 * Format token balance from smallest unit to human-readable format
 */
function formatBalance(raw: string, decimals: number): string {
  const value = BigInt(raw)
  const divisor = BigInt(10 ** decimals)
  const intPart = value / divisor
  const fracPart = value % divisor
  const fracStr = fracPart.toString().padStart(decimals, '0').replace(/0+$/, '') || '0'
  return fracStr === '0' ? `${intPart}` : `${intPart}.${fracStr}`
}

/**
 * Get token balance and metadata for a wallet by calling the smart contract
 */
async function getTokenInfo(
  tokenAddress: string,
  walletAddress: string
): Promise<{
  balance: string
  decimals: number
  symbol?: string
  name?: string
} | null> {
  try {
    const thorClient = getThorClient()
    
    // Get ABI functions for the calls we need
    const balanceOfFn = vip180Abi.getFunction('balanceOf')
    const decimalsFn = vip180Abi.getFunction('decimals')
    
    // Fetch balance and decimals (required)
    const [balanceResult, decimalsResult] = await Promise.all([
      thorClient.contracts.executeCall(tokenAddress, balanceOfFn, [walletAddress]),
      thorClient.contracts.executeCall(tokenAddress, decimalsFn, []),
    ])
    
    if (!balanceResult.success || !decimalsResult.success) {
      logger.warn(`Contract call failed for ${tokenAddress}: balance=${balanceResult.success}, decimals=${decimalsResult.success}`)
      return null
    }
    
    const balance = String(balanceResult.result.plain ?? balanceResult.result.array?.[0] ?? '0')
    const decimals = Number(decimalsResult.result.plain ?? decimalsResult.result.array?.[0] ?? 18)
    
    // Fetch symbol and name (optional, some tokens may not have these)
    let symbol: string | undefined
    let name: string | undefined
    
    try {
      const symbolFn = vip180Abi.getFunction('symbol')
      const nameFn = vip180Abi.getFunction('name')
      
      const [symbolResult, nameResult] = await Promise.all([
        thorClient.contracts.executeCall(tokenAddress, symbolFn, []),
        thorClient.contracts.executeCall(tokenAddress, nameFn, []),
      ])
      
      if (symbolResult.success) {
        symbol = String(symbolResult.result.plain ?? symbolResult.result.array?.[0] ?? '')
      }
      if (nameResult.success) {
        name = String(nameResult.result.plain ?? nameResult.result.array?.[0] ?? '')
      }
    } catch (metadataError) {
      logger.debug(`Could not fetch token metadata for ${tokenAddress}: ${String(metadataError)}`)
    }
    
    return { balance, decimals, symbol, name }
  } catch (error) {
    logger.warn(`Error fetching token info for ${tokenAddress}: ${String(error)}`)
    return null
  }
}

export const getTokenBalances: MCPTool = {
  name: 'getTokenBalances',
  title: 'Get Token Balance',
  description:
    'Get the balance of any VIP-180/ERC-20 token for a wallet address by querying the smart contract directly. Returns the raw balance (smallest unit), formatted balance (human-readable), decimals, and token metadata (symbol, name) if available. Requires the token contract address.',
  inputSchema: InputSchema.shape,
  outputSchema: OutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (params: z.infer<typeof InputSchema>): Promise<GetTokenBalancesResponse> => {
    try {
      const parsed = InputSchema.parse(params)
      
      // Resolve VNS if needed, but gracefully handle failures
      let resolvedAddress: `0x${string}`
      try {
        resolvedAddress = await resolveVnsOrAddress(parsed.address as string)
      } catch (vnsError) {
        logger.warn(`VNS resolution failed: ${String(vnsError)}`)
        if (parsed.address.startsWith('0x')) {
          resolvedAddress = parsed.address as `0x${string}`
        } else {
          throw new Error(`Could not resolve address: ${parsed.address}. VNS resolution failed: ${String(vnsError)}`)
        }
      }
      
      logger.info(`Fetching token balance for wallet ${resolvedAddress} on token ${parsed.tokenAddress}`)
      
      const tokenInfo = await getTokenInfo(parsed.tokenAddress, resolvedAddress)
      
      if (!tokenInfo) {
        const errorResult = {
          ok: false,
          network: getThorNetworkType(),
          walletAddress: resolvedAddress,
          error: `Failed to fetch token balance. Ensure ${parsed.tokenAddress} is a valid VIP-180/ERC-20 token contract.`,
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult) }],
          structuredContent: errorResult,
        }
      }
      
      const balance = {
        raw: tokenInfo.balance,
        formatted: formatBalance(tokenInfo.balance, tokenInfo.decimals),
        decimals: tokenInfo.decimals,
        symbol: tokenInfo.symbol,
        name: tokenInfo.name,
        tokenAddress: parsed.tokenAddress,
      }
      
      const result = {
        ok: true,
        network: getThorNetworkType(),
        walletAddress: resolvedAddress,
        balance,
      }
      
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result,
      }
    } catch (error) {
      logger.warn(`Error getting token balance: ${String(error)}`)
      const errorResult = {
        ok: false,
        network: getThorNetworkType(),
        error: `Error getting token balance: ${String(error)}`,
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(errorResult) }],
        structuredContent: errorResult,
      }
    }
  },
}
