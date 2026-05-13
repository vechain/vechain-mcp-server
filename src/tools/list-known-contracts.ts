import { z } from 'zod'
import { CONTRACT_NAMES, type ContractCategory, listContracts } from '@/services/contracts-registry'
import { getThorNetworkType } from '@/services/thor'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

const CategorySchema = z.enum(['vebetterdao', 'stargate', 'standard'])

const InputSchema = z.object({
  category: CategorySchema.optional().describe('Filter entries by category'),
})

const EntrySchema = z.object({
  name: z.string().describe('Identifier used by callContract / buildContractTransaction'),
  displayName: z.string(),
  category: CategorySchema,
  addresses: z.object({
    mainnet: z.string().nullable(),
    testnet: z.string().nullable(),
  }),
  methodCount: z.object({
    read: z.number().int(),
    write: z.number().int(),
    events: z.number().int(),
  }),
  requiresAddress: z
    .boolean()
    .describe('When true the caller MUST provide an explicit address per clause (true for erc20/erc721)'),
})

const DataSchema = z.object({
  network: z.string(),
  totalCount: z.number().int(),
  contracts: z.array(EntrySchema),
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

export const listKnownContracts: MCPTool = {
  name: 'listKnownContracts',
  title: 'List contracts available to callContract / buildContractTransaction',
  description:
    'List the contracts the MCP server can talk to via the generic callContract and buildContractTransaction tools. For each entry returns the registry name (use this in clause.name), the on-chain addresses for mainnet and testnet, how many read / write / event fragments the ABI exposes, and whether an explicit address is required. The full ABI is NOT included to keep the context small — fetch it with getContractAbi when needed. Available categories: vebetterdao (B3TR, VOT3, governance, X2EarnApps, …), stargate (Stargate, StargateNFT, StargateDelegation, NodeManagement) and standard (erc20, erc721).',
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
      const entries = listContracts(parsed.category as ContractCategory | undefined)

      const contracts = entries.map(e => {
        let read = 0
        let write = 0
        let events = 0
        for (const item of e.abi) {
          if (item.type === 'function') {
            const sm = (item as { stateMutability?: string }).stateMutability
            if (sm === 'view' || sm === 'pure') read++
            else write++
          } else if (item.type === 'event') {
            events++
          }
        }
        return {
          name: e.name,
          displayName: e.displayName,
          category: e.category,
          addresses: {
            mainnet: e.addresses.mainnet ?? null,
            testnet: e.addresses.testnet ?? null,
          },
          methodCount: { read, write, events },
          requiresAddress: e.requiresAddress,
        }
      })

      const result = {
        ok: true,
        network,
        data: {
          network,
          totalCount: contracts.length,
          contracts,
        },
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result,
      }
    } catch (error) {
      logger.warn(`Error in listKnownContracts: ${String(error)}`)
      const result = { ok: false, network, error: String(error) }
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result,
      }
    }
  },
}

export const KNOWN_CONTRACT_NAMES = CONTRACT_NAMES
