import { z } from 'zod'
import { B32SignatureLookupResultSchema, lookupSignature, SignatureHashSchema } from '@/services/b32'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

const InputSchema = z
  .object({
    signature: SignatureHashSchema.describe(
      'The signature hash to look up (0x-prefixed). Can be a 4-byte function selector or 32-byte event topic hash.',
    ),
  })
  .describe('Parameters for looking up an ABI by signature hash')

const OutputSchema = z
  .object({
    ok: z.boolean().describe('Whether the lookup was successful'),
    result: B32SignatureLookupResultSchema.optional().describe('The lookup result with ABI if found'),
    error: z.string().optional().describe('Error message if lookup failed'),
  })
  .describe('B32 signature lookup result')

export type GetB32SignatureResponse = {
  content: Array<{ type: 'text'; text: string }>
  structuredContent: z.infer<typeof OutputSchema>
}

export const getB32Signature: MCPTool = {
  name: 'getB32Signature',
  title: 'B32: Lookup ABI by Signature',
  description:
    'Look up an ABI definition from the B32 signature database (b32.vecha.in). Provide a function selector (4-byte, e.g., 0xa9059cbb for transfer) or event topic hash (32-byte) to get the corresponding ABI. Useful for decoding unknown function calls or events when you only have the signature hash.',
  inputSchema: InputSchema.shape,
  outputSchema: OutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (params: z.infer<typeof InputSchema>): Promise<GetB32SignatureResponse> => {
    try {
      const parsed = InputSchema.parse(params)
      const signature = parsed.signature.toLowerCase()

      const lookupResult = await lookupSignature(signature)

      const result = {
        signature,
        found: lookupResult.found,
        abi: lookupResult.abi ?? undefined,
        matchingItems: lookupResult.matchingItems.length > 0 ? lookupResult.matchingItems : undefined,
      }

      if (!lookupResult.found) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ ok: true, result }) }],
          structuredContent: {
            ok: true,
            result,
          },
        }
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({ ok: true, result }) }],
        structuredContent: {
          ok: true,
          result,
        },
      }
    } catch (error) {
      logger.warn(`Error in getB32Signature: ${String(error)}`)
      const errorResult = {
        ok: false,
        error: `Error looking up signature: ${String(error)}`,
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(errorResult) }],
        structuredContent: errorResult,
      }
    }
  },
}

