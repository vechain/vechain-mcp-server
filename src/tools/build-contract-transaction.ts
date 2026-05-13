/** biome-ignore-all lint/suspicious/noExplicitAny: <SDK proxy access requires any> */
import type { ContractClause, TransactionClause } from '@vechain/sdk-core'
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
  method: z
    .string()
    .describe('Function name to call. Can be a write (nonpayable / payable) or even a view if you want to bundle it.'),
  args: z.array(z.unknown()).optional().default([]).describe('Positional arguments matching the ABI fragment.'),
  valueWei: z
    .string()
    .regex(/^([0-9]+|0x[0-9a-fA-F]+)$/)
    .optional()
    .describe('VET to attach in wei, as a decimal or hex string. Default "0".'),
  comment: z.string().optional().describe('Human-readable note shown by the wallet at signing time.'),
})

const InputSchema = z.object({
  clauses: z
    .array(ClauseInputSchema)
    .min(1)
    .max(50)
    .describe('Array of clauses to bundle into a single multi-clause transaction.'),
  simulate: z
    .boolean()
    .optional()
    .default(true)
    .describe('When true (default) every clause is simulated via Thor multicall to surface reverts before signing.'),
})

const ClauseOutputSchema = z.object({
  to: z.string(),
  value: z.string().describe('Hex-encoded VET value attached to the clause.'),
  data: z.string().describe('Hex-encoded calldata.'),
  comment: z.string().optional(),
  abi: z
    .string()
    .optional()
    .describe('Function ABI fragment (JSON string) — useful for wallets that pre-decode the call.'),
})

const SimulationResultSchema = z.object({
  index: z.number().int(),
  success: z.boolean(),
  errorMessage: z.string().nullable(),
})

const DataSchema = z.object({
  network: z.string(),
  clauses: z.array(ClauseOutputSchema),
  simulation: z
    .object({
      ok: z.boolean(),
      results: z.array(SimulationResultSchema),
    })
    .nullable(),
  signingHints: z.object({
    note: z.string(),
    walletFormats: z.array(z.string()),
  }),
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

function toHexWei(input: string | undefined): bigint {
  if (!input) return 0n
  if (input.startsWith('0x')) return BigInt(input)
  return BigInt(input)
}

export const buildContractTransaction: MCPTool = {
  name: 'buildContractTransaction',
  title: 'Build a multi-clause transaction ready for the wallet to sign',
  description:
    'Build (but never sign or broadcast) a multi-clause VeChainThor transaction. Each clause is `{ name, method, args, valueWei?, comment?, address? }`; for `erc20` / `erc721` an explicit address is mandatory. Returns the array of `{ to, value, data, comment? }` clauses ready to be passed to VeWorld, the dApp Kit or vechain-kit for signing. By default every clause is simulated via Thor multicall first (using a generic signer): reverts are surfaced in `simulation.results` so the agent can fix the request before asking the user to sign. The server NEVER holds private keys and NEVER broadcasts.',
  inputSchema: InputSchema.shape,
  outputSchema: OutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: false,
    destructiveHint: true,
  },
  handler: async (params: Input): Promise<Response> => {
    const network = getThorNetworkType()
    try {
      const parsed = InputSchema.parse(params ?? {})
      const thor = getThorClient()

      const clauseObjects: ContractClause[] = []
      const transactionClauses: TransactionClause[] = []

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
        const value = toHexWei(c.valueWei)
        const callArgs: unknown[] = [...(c.args ?? [])]
        if (value > 0n || c.comment) {
          callArgs.push({ value, comment: c.comment })
        }
        let built: ContractClause
        try {
          built = clauseFn(...callArgs)
        } catch (e) {
          return errorResp(`Error building clause for "${c.name}.${c.method}": ${String(e)}`)
        }
        clauseObjects.push(built)
        transactionClauses.push(built.clause)
      }

      let simulation: z.infer<typeof DataSchema>['simulation'] = null
      if (parsed.simulate) {
        const results = (await executeMulticall(clauseObjects)) ?? []
        const sim = results.map((r, i) => ({
          index: i,
          success: r ? r.success : false,
          errorMessage: r && !r.success ? (r.result?.errorMessage ?? 'Call reverted') : null,
        }))
        simulation = {
          ok: sim.every(r => r.success),
          results: sim,
        }
      }

      const data = {
        network,
        clauses: transactionClauses.map(c => ({
          to: c.to ?? '',
          value: typeof c.value === 'string' ? c.value : String(c.value),
          data: c.data ?? '0x',
          ...(c.comment ? { comment: c.comment } : {}),
          ...(c.abi ? { abi: c.abi } : {}),
        })),
        simulation,
        signingHints: {
          note: 'Server does NOT sign. Pass the `clauses` array to VeWorld, dApp Kit or vechain-kit to sign and broadcast.',
          walletFormats: ['vechain-kit', '@vechain/dapp-kit', 'veworld-deeplink'],
        },
      }

      const result = { ok: true, network, data }
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result,
      }
    } catch (error) {
      logger.warn(`Error in buildContractTransaction: ${String(error)}`)
      return errorResp(`Error in buildContractTransaction: ${String(error)}`)
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
