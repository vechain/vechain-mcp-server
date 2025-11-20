import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { fetchTokenRegistry, TokenRegistryItemSchema, TokenRegistrySchema } from '@/services/token-registry'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

const OutputSchema = createIndexerStructuredOutputSchema(TokenRegistrySchema)
const ResponseSchema = createIndexerToolResponseSchema(TokenRegistrySchema)
type Response = z.infer<typeof ResponseSchema>

const InputSchema = z
  .object({
    symbol: z.string().optional().describe('Optional: filter by token symbol (case-insensitive exact match)'),
    address: z.string().optional().describe('Optional: filter by token contract address (0x...)'),
  })
  .partial()
  .describe(
    'Optional filters for token registry results. Provide a symbol or an address to narrow results; omit both to return full registry.',
  )

export const getTokenRegistry: MCPTool = {
  name: 'getTokenRegistry',
  title: 'Token Registry: list known tokens (mainnet/testnet)',
  description:
    'Fetch the VeChain token registry curated list for the current network (VECHAIN_NETWORK=mainnet|testnet). Use this to identify official tokens, metadata (decimals, symbol, website), and bridge provenance. Supports optional filtering by symbol or contract address.',
  inputSchema: InputSchema.shape,
  outputSchema: OutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (params: z.infer<typeof InputSchema>): Promise<Response> => {
    try {
      const parsed = InputSchema.parse(params)
      const registry = await fetchTokenRegistry()
      if (!registry) {
        return indexerErrorResponse('Failed to fetch token registry')
      }
      let filtered = registry
      if (parsed.symbol) {
        const sym = parsed.symbol.toLowerCase()
        filtered = filtered.filter(t => t.symbol.toLowerCase() === sym)
      }
      if (parsed.address) {
        const addr = parsed.address.toLowerCase()
        filtered = filtered.filter(t => t.address.toLowerCase() === addr)
      }
      // Validate filtered subset against item schema to be safe
      const itemsParse = z.array(TokenRegistryItemSchema).safeParse(filtered)
      if (!itemsParse.success) {
        logger.warn('Filtered token registry failed validation')
        return indexerErrorResponse('Token registry validation error after filtering')
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(itemsParse.data) }],
        structuredContent: {
          ok: true,
          network: getThorNetworkType(),
          data: itemsParse.data,
        },
      }
    } catch (error) {
      logger.warn(`Error fetching token registry: ${String(error)}`)
      return indexerErrorResponse(`Error fetching token registry: ${String(error)}`)
    }
  },
}


