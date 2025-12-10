import { z } from 'zod'
import { lookupSignatures, SignatureLookupEntrySchema, SignatureTypeSchema } from '@/services/sourcify'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

const InputSchema = z
  .object({
    hashes: z
      .array(z.string().regex(/^0x[a-fA-F0-9]+$/, 'Must be a 0x-prefixed hex string'))
      .min(1)
      .max(50)
      .describe('Array of signature hashes to look up (4-byte function selectors or 32-byte event topics)'),
    type: SignatureTypeSchema.optional().describe(
      'Type of signatures to look up: "function" or "event". If not specified, looks up both.',
    ),
  })
  .describe('Parameters for looking up signatures by hash')

const OutputSchema = z
  .object({
    ok: z.boolean().describe('Whether the lookup was successful'),
    functions: z
      .record(z.array(SignatureLookupEntrySchema))
      .optional()
      .describe('Function signatures found, keyed by hash'),
    events: z
      .record(z.array(SignatureLookupEntrySchema))
      .optional()
      .describe('Event signatures found, keyed by hash'),
    totalFound: z.number().describe('Total number of signatures found'),
    error: z.string().optional().describe('Error message if lookup failed'),
  })
  .describe('Sourcify signature lookup result')

export type GetSourcifySignatureLookupResponse = {
  content: Array<{ type: 'text'; text: string }>
  structuredContent: z.infer<typeof OutputSchema>
}

export const getSourcifySignatureLookup: MCPTool = {
  name: 'getSourcifySignatureLookup',
  title: 'Sourcify: Lookup Signatures by Hash',
  description:
    'Look up function or event signatures by their hash from the Sourcify 4byte signature database. Provide 4-byte function selectors (e.g., 0xa9059cbb for transfer) or 32-byte event topic hashes to get the corresponding function/event names and parameters. Useful for decoding unknown function calls or events.',
  inputSchema: InputSchema.shape,
  outputSchema: OutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (params: z.infer<typeof InputSchema>): Promise<GetSourcifySignatureLookupResponse> => {
    try {
      const parsed = InputSchema.parse(params)
      const normalizedHashes = parsed.hashes.map((h) => h.toLowerCase())

      const result = await lookupSignatures(normalizedHashes, parsed.type)

      if (!result || !result.ok) {
        const errorResult = {
          ok: false,
          totalFound: 0,
          error: 'Failed to lookup signatures from Sourcify 4byte database',
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult) }],
          structuredContent: errorResult,
        }
      }

      // Count total signatures found
      let totalFound = 0
      if (result.result.function) {
        for (const signatures of Object.values(result.result.function)) {
          totalFound += signatures.length
        }
      }
      if (result.result.event) {
        for (const signatures of Object.values(result.result.event)) {
          totalFound += signatures.length
        }
      }

      const successResult = {
        ok: true,
        functions: result.result.function,
        events: result.result.event,
        totalFound,
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(successResult) }],
        structuredContent: successResult,
      }
    } catch (error) {
      logger.warn(`Error in getSourcifySignatureLookup: ${String(error)}`)
      const errorResult = {
        ok: false,
        totalFound: 0,
        error: `Error looking up signatures: ${String(error)}`,
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(errorResult) }],
        structuredContent: errorResult,
      }
    }
  },
}
