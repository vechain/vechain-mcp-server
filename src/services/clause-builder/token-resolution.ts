import { resolveAddress } from '@/services/contracts-registry'
import { fetchTokenRegistry } from '@/services/token-registry'

const NATIVE_VET_SENTINEL = '0x0000000000000000000000000000000000000000'
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/

export type ResolvedToken = {
  symbol: string
  address: string
  decimals: number
  isNative: boolean
}

function nativeVet(): ResolvedToken {
  return { symbol: 'VET', address: NATIVE_VET_SENTINEL, decimals: 18, isNative: true }
}

function builtinTokenForSymbol(sym: string): ResolvedToken | null {
  const s = sym.toUpperCase()
  if (s === 'VET') return nativeVet()
  if (s === 'VTHO') {
    return { symbol: 'VTHO', address: resolveAddress('vtho'), decimals: 18, isNative: false }
  }
  if (s === 'WVET') {
    return { symbol: 'WVET', address: resolveAddress('wvet'), decimals: 18, isNative: false }
  }
  return null
}

function builtinTokenForAddress(addr: string): ResolvedToken | null {
  const lower = addr.toLowerCase()
  if (lower === NATIVE_VET_SENTINEL) return nativeVet()
  try {
    if (lower === resolveAddress('vtho').toLowerCase()) {
      return { symbol: 'VTHO', address: resolveAddress('vtho'), decimals: 18, isNative: false }
    }
  } catch {
    /* network may not have vtho registered */
  }
  try {
    if (lower === resolveAddress('wvet').toLowerCase()) {
      return { symbol: 'WVET', address: resolveAddress('wvet'), decimals: 18, isNative: false }
    }
  } catch {
    /* network may not have wvet registered */
  }
  return null
}

/**
 * Resolve a token identifier (symbol or 0x address) to `{address, decimals,
 * symbol, isNative}` against the currently active network. Throws if the
 * token cannot be found in either the builtin set or the public token
 * registry — clause builders rely on this to fail fast before encoding.
 */
export async function resolveTokenOrThrow(symbolOrAddress: string): Promise<ResolvedToken> {
  const trimmed = symbolOrAddress.trim()
  if (ADDRESS_RE.test(trimmed) || trimmed.toLowerCase() === NATIVE_VET_SENTINEL) {
    const builtin = builtinTokenForAddress(trimmed)
    if (builtin) return builtin
    const registry = (await fetchTokenRegistry()) ?? []
    const match = registry.find(t => t.address.toLowerCase() === trimmed.toLowerCase())
    if (match) {
      return {
        symbol: match.symbol,
        address: match.address,
        decimals: match.decimals,
        isNative: false,
      }
    }
    throw new Error(`Unknown token address ${trimmed} on the active network`)
  }
  const builtin = builtinTokenForSymbol(trimmed)
  if (builtin) return builtin
  const registry = (await fetchTokenRegistry()) ?? []
  const sym = trimmed.toLowerCase()
  const match = registry.find(t => t.symbol.toLowerCase() === sym)
  if (match) {
    return {
      symbol: match.symbol,
      address: match.address,
      decimals: match.decimals,
      isNative: false,
    }
  }
  throw new Error(`Unknown token "${symbolOrAddress}" on the active network`)
}
