import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { fetchValidatorRegistry, ValidatorRegistryItemSchema, ValidatorRegistrySchema } from '@/services/validator-hub'
import { createIndexerStructuredOutputSchema, createIndexerToolResponseSchema, indexerErrorResponse } from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

const OutputSchema = createIndexerStructuredOutputSchema(ValidatorRegistrySchema)
const ResponseSchema = createIndexerToolResponseSchema(ValidatorRegistrySchema)
type Response = z.infer<typeof ResponseSchema>

const InputSchema = z
  .object({
    address: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/, 'Validator address must be 0x-prefixed 40 hex chars')
      .optional()
      .describe('Optional: filter by validator address'),
  })
  .partial()
  .describe('Optional filter by validator address; omit to return the full validator registry for the current network.')

export const getValidatorRegistry: MCPTool = {
  name: 'getValidatorRegistry',
  title: 'Validator Registry: list validator metadata (mainnet/testnet)',
  description:
    'Fetch validator metadata (name, location, description, website, logo) for the current network. Data source: validator-hub. Supports optional filtering by address.',
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
      const registry = await fetchValidatorRegistry()
      if (!registry) {
        return indexerErrorResponse('Failed to fetch validator registry')
      }
      let filtered = registry
      if (parsed.address) {
        const addr = parsed.address.toLowerCase()
        filtered = filtered.filter(v => v.address.toLowerCase() === addr)
      }
      // Validate result array
      const items = z.array(ValidatorRegistryItemSchema).parse(filtered)
      return {
        content: [{ type: 'text', text: JSON.stringify(items) }],
        structuredContent: {
          ok: true,
          network: getThorNetworkType(),
          data: items,
        },
      }
    } catch (error) {
      logger.warn(`Error fetching validator registry: ${String(error)}`)
      return indexerErrorResponse(`Error fetching validator registry: ${String(error)}`)
    }
  },
}


