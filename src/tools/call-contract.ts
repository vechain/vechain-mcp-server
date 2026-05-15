/** biome-ignore-all lint/suspicious/noExplicitAny: <SDK proxy access requires any> */
import type { ContractClause } from '@vechain/sdk-core'
import { z } from 'zod'
import {
  getContractEntry,
  isContractName,
  type RegistryContractName,
  resolveAddress,
} from '@/services/contracts-registry'
import { getThorClient, getThorNetworkType } from '@/services/thor'
import { executeMulticall } from '@/services/vebetterdao-contracts'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

const ClauseInputSchema = z.object({
  name: z
    .string()
    .describe(
      'Contract name from listKnownContracts. For arbitrary tokens use "erc20" / "erc721" with an explicit address.',
    ),
  address: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/)
    .optional()
    .describe('Override the registry address. Required for "erc20" / "erc721".'),
  method: z.string().describe('View / pure function name to call (e.g. "balanceOf").'),
  args: z.array(z.unknown()).optional().default([]).describe('Positional arguments matching the ABI fragment.'),
})

const InputSchema = z.object({
  clauses: z
    .array(ClauseInputSchema)
    .min(1)
    .max(50)
    .describe('Array of read-only calls to execute in a single multicall.'),
})

const ResultSchema = z.object({
  success: z.boolean(),
  decoded: z.unknown().nullable().describe('Decoded primary return value (or first one when there are multiple).'),
  decodedArray: z.array(z.unknown()).nullable().describe('All decoded return values as an array.'),
  errorMessage: z.string().nullable(),
})

const DataSchema = z.object({
  network: z.string(),
  clauses: z.array(
    z.object({
      name: z.string(),
      address: z.string(),
      method: z.string(),
    }),
  ),
  results: z.array(ResultSchema),
})

const OutputSchema = z.object({
  ok: z.boolean(),
  network: z.string(),
  data: DataSchema.nullable().optional(),
  error: z.string().optional(),
})

type Input = z.infer<typeof InputSchema>
type Response = {
  content: Array<{ type: 'text'; text: string }>
  structuredContent: z.infer<typeof OutputSchema>
}

function jsonSafe(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString()
  if (Array.isArray(value)) return value.map(jsonSafe)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = jsonSafe(v)
    return out
  }
  return value
}

export const callContract: MCPTool = {
  name: 'callContract',
  title: 'Read state from one or many contracts via a single multicall',
  description:
    'Execute one or more read-only contract calls (view / pure methods) in a single multicall round-trip. Each clause is `{ name, method, args, address? }` where `name` is a registry contract from listKnownContracts. Pass `address` only to override the registry default or when calling `erc20` / `erc721` on an arbitrary token. Returns one result per clause with `success`, the decoded primary value and the full decoded array. bigint values are stringified. Use this instead of one call per round-trip whenever you need multiple values.',
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
      const thor = getThorClient()

      const resolved: Array<{ name: RegistryContractName; address: string; method: string }> = []
      const clauseObjects: ContractClause[] = []

      for (const c of parsed.clauses) {
        if (!isContractName(c.name)) {
          return errorResp(`Unknown contract "${c.name}". Use listKnownContracts to discover valid names.`)
        }
        const entry = getContractEntry(c.name as RegistryContractName)
        const address = resolveAddress(c.name as RegistryContractName, c.address)

        const contract = thor.contracts.load(address, entry.abi)
        const clauseFn = (contract.clause as Record<string, (...a: unknown[]) => ContractClause>)[c.method]
        if (typeof clauseFn !== 'function') {
          return errorResp(`Method "${c.method}" not found on contract "${c.name}"`)
        }
        let clause: ContractClause
        try {
          clause = clauseFn(...(c.args ?? []))
        } catch (e) {
          return errorResp(`Error building clause for "${c.name}.${c.method}": ${String(e)}`)
        }
        clauseObjects.push(clause)
        resolved.push({ name: c.name as RegistryContractName, address, method: c.method })
      }

      const callResults = (await executeMulticall(clauseObjects)) ?? []

      const results = callResults.map(r => {
        if (!r) return { success: false, decoded: null, decodedArray: null, errorMessage: 'No result from multicall' }
        if (!r.success) {
          return {
            success: false,
            decoded: null,
            decodedArray: null,
            errorMessage: r.result?.errorMessage ?? 'Call reverted',
          }
        }
        const plain = r.result?.plain
        const array = r.result?.array
        return {
          success: true,
          decoded: plain !== undefined ? jsonSafe(plain) : null,
          decodedArray: array !== undefined ? (jsonSafe(array) as unknown[]) : null,
          errorMessage: null,
        }
      })

      const data = { network, clauses: resolved, results }
      const result = { ok: true, network, data }
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result,
      }
    } catch (error) {
      logger.warn(`Error in callContract: ${String(error)}`)
      return errorResp(`Error in callContract: ${String(error)}`)
    }

    function errorResp(msg: string): Response {
      const r = { ok: false, network, error: msg }
      return {
        content: [{ type: 'text', text: JSON.stringify(r) }],
        structuredContent: r,
      }
    }
  },
}
