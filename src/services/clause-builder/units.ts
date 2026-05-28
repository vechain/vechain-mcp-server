/**
 * Parse a human-readable decimal amount into a `bigint` of base units.
 *
 * Mirrors viem's `parseUnits` but keeps the implementation local (no extra
 * import) and provides clearer error messages tailored to agent-driven
 * inputs (e.g. "12.5", "1000000").
 */
export function parseUnits(amount: string, decimals: number): bigint {
  const trimmed = amount.trim()
  if (!/^[0-9]+(\.[0-9]+)?$/.test(trimmed)) {
    throw new Error(`Invalid amount: ${amount}`)
  }
  const [whole, fraction = ''] = trimmed.split('.')
  if (fraction.length > decimals) {
    throw new Error(`Too many fractional digits for ${decimals}-decimal token`)
  }
  const padded = fraction.padEnd(decimals, '0')
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(padded || '0')
}

export function toHex(value: bigint): `0x${string}` {
  return `0x${value.toString(16)}`
}

/**
 * Apply a slippage tolerance (basis points, max 10_000) to a base amount,
 * returning the floor-rounded "minimum out" used by Uniswap-style routers.
 */
export function applySlippage(amount: bigint, slippageBps: number): bigint {
  const bps = BigInt(Math.max(0, Math.min(10_000, slippageBps)))
  return (amount * (10_000n - bps)) / 10_000n
}

/**
 * Format a wei-denominated VTHO/B3TR amount back to a trimmed decimal
 * string (no trailing zeros) for use in clause comments.
 */
export function formatWei(wei: bigint, decimals = 18): string {
  const denom = 10n ** BigInt(decimals)
  const whole = wei / denom
  const frac = wei % denom
  if (frac === 0n) return whole.toString()
  return `${whole}.${frac.toString().padStart(decimals, '0').replace(/0+$/, '')}`
}
