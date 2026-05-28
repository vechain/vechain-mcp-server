import { decodeFunctionResult, encodeFunctionData } from 'viem'
import { z } from 'zod'
import { resolveAddress } from '@/services/contracts-registry'
import { ERC20_ABI } from '@/services/contracts-registry/abis'
import { getThorNetworkType, getThorNodeUrl } from '@/services/thor'
import { fetchTokenRegistry } from '@/services/token-registry'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

const NATIVE_VET_SENTINEL = '0x0000000000000000000000000000000000000000'

const InputSchema = z.object({
  symbolOrAddress: z
    .string()
    .min(1)
    .describe(
      'Token identifier: a symbol (case-insensitive, e.g. "VET", "VTHO", "B3TR", "WVET") OR a 0x ERC20 contract address (40 hex chars).',
    ),
  onChainFallback: z
    .boolean()
    .optional()
    .describe(
      'When true and a 0x address is not found in the token registry, query the chain (`symbol()` + `decimals()`) to fill metadata. Default false.',
    ),
})

const TokenSchema = z.object({
  symbol: z.string(),
  address: z.string(),
  decimals: z.number(),
  isNative: z.boolean().describe('True for native VET (sentinel address 0x000…000).'),
  source: z.enum(['builtin', 'registry', 'on-chain']),
})

const DataSchema = z.object({
  network: z.string(),
  token: TokenSchema.nullable(),
})

const OutputSchema = z.object({
  ok: z.boolean(),
  network: z.string(),
  data: DataSchema.nullable().optional(),
  error: z.string().optional(),
})

type Input = z.infer<typeof InputSchema>
type ResolvedToken = z.infer<typeof TokenSchema>
type Response = {
  content: Array<{ type: 'text'; text: string }>
  structuredContent: z.infer<typeof OutputSchema>
}

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/

function builtinTokenForSymbol(sym: string): ResolvedToken | null {
  const s = sym.toUpperCase()
  if (s === 'VET') {
    return {
      symbol: 'VET',
      address: NATIVE_VET_SENTINEL,
      decimals: 18,
      isNative: true,
      source: 'builtin',
    }
  }
  if (s === 'VTHO') {
    return {
      symbol: 'VTHO',
      address: resolveAddress('vtho'),
      decimals: 18,
      isNative: false,
      source: 'builtin',
    }
  }
  if (s === 'WVET') {
    return {
      symbol: 'WVET',
      address: resolveAddress('wvet'),
      decimals: 18,
      isNative: false,
      source: 'builtin',
    }
  }
  return null
}

function builtinTokenForAddress(addr: string): ResolvedToken | null {
  const lower = addr.toLowerCase()
  if (lower === NATIVE_VET_SENTINEL) {
    return {
      symbol: 'VET',
      address: NATIVE_VET_SENTINEL,
      decimals: 18,
      isNative: true,
      source: 'builtin',
    }
  }
  try {
    if (lower === resolveAddress('vtho').toLowerCase()) {
      return {
        symbol: 'VTHO',
        address: resolveAddress('vtho'),
        decimals: 18,
        isNative: false,
        source: 'builtin',
      }
    }
  } catch {
    /* network may not have vtho registered */
  }
  try {
    if (lower === resolveAddress('wvet').toLowerCase()) {
      return {
        symbol: 'WVET',
        address: resolveAddress('wvet'),
        decimals: 18,
        isNative: false,
        source: 'builtin',
      }
    }
  } catch {
    /* network may not have wvet registered */
  }
  return null
}

async function fetchOnChainErc20Metadata(address: string): Promise<{
  symbol: string
  decimals: number
} | null> {
  const baseUrl = getThorNodeUrl()
  try {
    const symbolData = encodeFunctionData({ abi: ERC20_ABI, functionName: 'symbol' })
    const decimalsData = encodeFunctionData({ abi: ERC20_ABI, functionName: 'decimals' })
    const url = `${baseUrl}/accounts/${address}`
    const [sRes, dRes] = await Promise.all([
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: symbolData }),
      }),
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: decimalsData }),
      }),
    ])
    if (!sRes.ok || !dRes.ok) return null
    const sJson = await sRes.json()
    const dJson = await dRes.json()
    if (!sJson?.data || !dJson?.data) return null
    const symbol = decodeFunctionResult({
      abi: ERC20_ABI,
      functionName: 'symbol',
      data: sJson.data,
    }) as string
    const decimals = decodeFunctionResult({
      abi: ERC20_ABI,
      functionName: 'decimals',
      data: dJson.data,
    }) as number
    return { symbol, decimals: Number(decimals) }
  } catch (err) {
    logger.debug(`On-chain ERC20 metadata lookup failed for ${address}: ${String(err)}`)
    return null
  }
}

export const resolveToken: MCPTool = {
  name: 'resolveToken',
  title: 'Token: resolve symbol or 0x address to {address, decimals, symbol}',
  description:
    'Resolve a token identifier (a symbol like "VET", "VTHO", "B3TR" OR a 0x ERC20 contract address) to its on-chain address, symbol and decimals. Returns the same shape regardless of source. Resolution order: builtin (VET native + VTHO + WVET) -> VeChain token registry (vechain.github.io/token-registry) -> optional on-chain ERC20 view (`symbol()`/`decimals()`) when `onChainFallback=true`. Use this BEFORE buildSendTokenClauses or buildSwapClauses to translate a user-friendly symbol or arbitrary address into the exact `{address, decimals, isNative}` triplet that the clause builder expects.',
  inputSchema: InputSchema.shape,
  outputSchema: OutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (params: Input): Promise<Response> => {
    const network = getThorNetworkType()
    try {
      const parsed = InputSchema.parse(params ?? {})
      const trimmed = parsed.symbolOrAddress.trim()

      if (ADDRESS_RE.test(trimmed) || trimmed.toLowerCase() === NATIVE_VET_SENTINEL) {
        const builtin = builtinTokenForAddress(trimmed)
        if (builtin) {
          const result = { ok: true, network, data: { network, token: builtin } }
          return {
            content: [{ type: 'text', text: JSON.stringify(result) }],
            structuredContent: result,
          }
        }
        const registry = (await fetchTokenRegistry()) ?? []
        const match = registry.find(t => t.address.toLowerCase() === trimmed.toLowerCase())
        if (match) {
          const token: ResolvedToken = {
            symbol: match.symbol,
            address: match.address,
            decimals: match.decimals,
            isNative: false,
            source: 'registry',
          }
          const result = { ok: true, network, data: { network, token } }
          return {
            content: [{ type: 'text', text: JSON.stringify(result) }],
            structuredContent: result,
          }
        }
        if (parsed.onChainFallback) {
          const onChain = await fetchOnChainErc20Metadata(trimmed)
          if (onChain) {
            const token: ResolvedToken = {
              symbol: onChain.symbol,
              address: trimmed,
              decimals: onChain.decimals,
              isNative: false,
              source: 'on-chain',
            }
            const result = { ok: true, network, data: { network, token } }
            return {
              content: [{ type: 'text', text: JSON.stringify(result) }],
              structuredContent: result,
            }
          }
        }
        const result = { ok: true, network, data: { network, token: null } }
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
        }
      }

      const builtin = builtinTokenForSymbol(trimmed)
      if (builtin) {
        const result = { ok: true, network, data: { network, token: builtin } }
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
        }
      }
      const registry = (await fetchTokenRegistry()) ?? []
      const sym = trimmed.toLowerCase()
      const match = registry.find(t => t.symbol.toLowerCase() === sym)
      if (match) {
        const token: ResolvedToken = {
          symbol: match.symbol,
          address: match.address,
          decimals: match.decimals,
          isNative: false,
          source: 'registry',
        }
        const result = { ok: true, network, data: { network, token } }
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
        }
      }
      const result = { ok: true, network, data: { network, token: null } }
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result,
      }
    } catch (error) {
      logger.warn(`Error in resolveToken: ${String(error)}`)
      const result = { ok: false, network, error: String(error) }
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result,
      }
    }
  },
}
