import { decodeFunctionResult, encodeFunctionData } from 'viem'
import { ERC20_ABI, STARGATE_NFT_ABI } from '@/services/contracts-registry/abis'
import { getThorNodeUrl } from '@/services/thor'

/**
 * Single-clause Thor view call. Returns the raw return data (`0x...`).
 * Throws when the upstream node returns non-2xx or the call reverts.
 */
async function thorView(to: string, data: string, caller?: string): Promise<`0x${string}`> {
  const body: Record<string, unknown> = { clauses: [{ to, data }] }
  if (caller) body.caller = caller
  const url = `${getThorNodeUrl()}/accounts/*`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`Thor view call failed: ${res.status} ${res.statusText}`)
  }
  const out = (await res.json()) as Array<{
    data: string
    reverted: boolean
    vmError: string
    gasUsed: number
  }>
  const r = out[0]
  if (!r) throw new Error('Empty response from Thor')
  if (r.reverted) {
    throw new Error(`View call reverted (${r.vmError || 'no reason'}): ${r.data}`)
  }
  return r.data as `0x${string}`
}

/**
 * Read `allowance(owner, spender)` from an ERC20 token contract on the
 * currently active network. Used by clause builders that need to decide
 * whether to prepend an `approve` clause.
 */
export async function fetchErc20Allowance(args: {
  tokenAddress: string
  owner: string
  spender: string
}): Promise<bigint> {
  const data = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [args.owner as `0x${string}`, args.spender as `0x${string}`],
  })
  const ret = await thorView(args.tokenAddress, data)
  return decodeFunctionResult({
    abi: ERC20_ABI,
    functionName: 'allowance',
    data: ret,
  }) as bigint
}

/**
 * Read `StargateNFT.boostAmountOfLevel(levelId)` for the per-level VTHO
 * boost fee that `stakeAndDelegate` will pull from the user.
 */
export async function fetchStargateBoostAmount(args: {
  stargateNftAddress: string
  levelId: number
}): Promise<bigint> {
  const data = encodeFunctionData({
    abi: STARGATE_NFT_ABI,
    functionName: 'boostAmountOfLevel',
    args: [args.levelId],
  })
  const ret = await thorView(args.stargateNftAddress, data)
  return decodeFunctionResult({
    abi: STARGATE_NFT_ABI,
    functionName: 'boostAmountOfLevel',
    data: ret,
  }) as bigint
}
