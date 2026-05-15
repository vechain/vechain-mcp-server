import { z } from 'zod'
import { getContractEntry, isContractName, type RegistryContractName } from '@/services/contracts-registry'
import { getThorNetworkType } from '@/services/thor'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

const MutabilitySchema = z.enum(['view', 'pure', 'nonpayable', 'payable', 'all'])
const FragmentKindSchema = z.enum(['function', 'event', 'error', 'constructor', 'fallback', 'receive', 'all'])

const InputSchema = z.object({
  name: z
    .string()
    .describe('Contract name from listKnownContracts (e.g. "b3tr", "x2EarnApps", "stargateNft", "erc20")'),
  stateMutability: MutabilitySchema.optional()
    .default('all')
    .describe('Filter function fragments by mutability. Use "view" or "pure" for read-only methods.'),
  fragmentType: FragmentKindSchema.optional()
    .default('function')
    .describe('Restrict to a single fragment kind. Default returns only functions.'),
  methodNames: z
    .array(z.string())
    .optional()
    .describe('When provided, only fragments whose name is in this list are returned.'),
})

const AbiItemSchema = z.unknown()

const DataSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  abi: z.array(AbiItemSchema),
  totalFragments: z.number().int().describe('Total fragments in the original ABI'),
  returnedFragments: z.number().int(),
  filters: z.object({
    stateMutability: MutabilitySchema,
    fragmentType: FragmentKindSchema,
    methodNames: z.array(z.string()).nullable(),
  }),
  truncatedDueToSize: z
    .boolean()
    .describe(
      'True when no filter was applied and the full ABI was too large; only the function names are returned in `methodNames`.',
    ),
  methodNames: z.array(z.string()).optional(),
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

const MAX_FULL_ABI_BYTES = 30_000

export const getContractAbi: MCPTool = {
  name: 'getContractAbi',
  title: 'Get the ABI (or a subset) of a known contract',
  description:
    'Return the ABI of a contract registered in the server, with optional filters to keep the payload small. Always prefer the most specific filters: pass `methodNames: ["balanceOf", "transfer"]` to get just those fragments, or `stateMutability: "view"` to list read-only methods. When called with no filters on a large ABI the server returns only the list of function names and asks you to refine the query (the full ABI would be tens of KB). Use the returned fragments directly in callContract / buildContractTransaction together with the same `name`.',
  inputSchema: InputSchema.shape,
  outputSchema: OutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: false,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (params: Input): Promise<Response> => {
    const network = getThorNetworkType()
    try {
      const parsed = InputSchema.parse(params ?? {})
      if (!isContractName(parsed.name)) {
        return errorResp(`Unknown contract "${parsed.name}". Use listKnownContracts to discover valid names.`)
      }
      const entry = getContractEntry(parsed.name as RegistryContractName)

      const wantedNames = parsed.methodNames && parsed.methodNames.length > 0 ? new Set(parsed.methodNames) : null
      const totalFragments = entry.abi.length

      let filtered = entry.abi.filter(item => {
        if (parsed.fragmentType !== 'all' && item.type !== parsed.fragmentType) return false
        if (item.type === 'function' && parsed.stateMutability !== 'all') {
          const sm = (item as { stateMutability?: string }).stateMutability
          if (sm !== parsed.stateMutability) return false
        }
        if (wantedNames) {
          const n = (item as { name?: string }).name
          if (!n || !wantedNames.has(n)) return false
        }
        return true
      })

      let truncated = false
      let methodNamesList: string[] | undefined
      const filtersApplied =
        wantedNames !== null || parsed.stateMutability !== 'all' || parsed.fragmentType !== 'function'

      if (!filtersApplied) {
        const size = JSON.stringify(filtered).length
        if (size > MAX_FULL_ABI_BYTES) {
          methodNamesList = filtered
            .map(f => (f as { name?: string }).name)
            .filter((n): n is string => typeof n === 'string')
            .sort()
          filtered = []
          truncated = true
        }
      }

      const data = {
        name: entry.name,
        displayName: entry.displayName,
        abi: filtered,
        totalFragments,
        returnedFragments: filtered.length,
        filters: {
          stateMutability: parsed.stateMutability,
          fragmentType: parsed.fragmentType,
          methodNames: parsed.methodNames ?? null,
        },
        truncatedDueToSize: truncated,
        ...(methodNamesList ? { methodNames: methodNamesList } : {}),
      }

      const result = { ok: true, network, data }
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result,
      }
    } catch (error) {
      logger.warn(`Error in getContractAbi: ${String(error)}`)
      return errorResp(`Error in getContractAbi: ${String(error)}`)
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
