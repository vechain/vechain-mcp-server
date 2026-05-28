import { z } from 'zod'
import { getThorNetworkType, ThorAddressSchema } from '@/services/thor'
import { lookupVnsName, resolveVnsOrAddress, VnsNameSchema } from '@/services/vns'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

const InputSchema = z.object({
  value: z
    .union([VnsNameSchema, ThorAddressSchema])
    .describe(
      'Either a VNS name ending in .vet (e.g. "davus.vet") or a 0x address. When an address is passed the tool returns the reverse lookup (address -> name).',
    ),
})

const DataSchema = z.object({
  network: z.string(),
  input: z.string(),
  inputKind: z.enum(['vns', 'address']),
  address: z
    .string()
    .nullable()
    .describe('Resolved 0x address. Null only when reverse lookup is requested and there is no name set.'),
  vnsName: z
    .string()
    .nullable()
    .describe('Reverse-resolved VNS name when input is an address (null if none registered).'),
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

export const resolveVnsName: MCPTool = {
  name: 'resolveVnsName',
  title: 'VNS: resolve a name or reverse-lookup an address',
  description:
    'Resolve a VNS name (e.g. "davus.vet") to its 0x address, or reverse-lookup a 0x address to find its registered VNS name. Caches results for 5 minutes. Use this whenever an agent input contains a `.vet` name that needs to become an address before encoding a clause, or whenever you want to display a friendly handle for a recipient.',
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
      const trimmed = parsed.value.trim()
      const isVns = trimmed.toLowerCase().endsWith('.vet')

      if (isVns) {
        const address = await resolveVnsOrAddress(trimmed)
        const data = {
          network,
          input: trimmed,
          inputKind: 'vns' as const,
          address: address as string,
          vnsName: trimmed,
        }
        const result = { ok: true, network, data }
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
        }
      }

      const addr = trimmed.toLowerCase() as `0x${string}`
      const name = await lookupVnsName(addr)
      const data = {
        network,
        input: trimmed,
        inputKind: 'address' as const,
        address: addr,
        vnsName: name,
      }
      const result = { ok: true, network, data }
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result,
      }
    } catch (error) {
      logger.warn(`Error in resolveVnsName: ${String(error)}`)
      const result = { ok: false, network, error: String(error) }
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result,
      }
    }
  },
}
