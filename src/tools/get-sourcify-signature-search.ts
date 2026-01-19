import { z } from 'zod'
import { searchSignatures, SignatureSearchEntrySchema, SignatureTypeSchema } from '@/services/sourcify'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

const InputSchema = z
  .object({
    query: z.string().min(1).describe('Search query for function/event name (e.g., "transfer", "approve", "Transfer")'),
    type: SignatureTypeSchema.optional().describe(
      'Type of signatures to search: "function" or "event". If not specified, searches both.',
    ),
  })
  .describe('Parameters for searching signatures by name')

const OutputSchema = z
  .object({
    ok: z.boolean().describe('Whether the search was successful'),
    query: z.string().describe('The search query used'),
    signatures: z.array(SignatureSearchEntrySchema).optional().describe('Matching signatures'),
    totalFound: z.number().describe('Number of signatures found'),
    error: z.string().optional().describe('Error message if search failed'),
  })
  .describe('Sourcify signature search result')

export type GetSourcifySignatureSearchResponse = {
  content: Array<{ type: 'text'; text: string }>
  structuredContent: z.infer<typeof OutputSchema>
}

export const getSourcifySignatureSearch: MCPTool = {
  name: 'getSourcifySignatureSearch',
  title: 'Sourcify: Search Signatures by Name',
  description:
    'Search for function or event signatures by name from the Sourcify 4byte signature database. Provide a function or event name (e.g., "transfer", "approve", "Transfer") to find matching signatures with their hashes. Useful for finding the selector/topic hash when you know the function/event name.',
  inputSchema: InputSchema.shape,
  outputSchema: OutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (params: z.infer<typeof InputSchema>): Promise<GetSourcifySignatureSearchResponse> => {
    try {
      const parsed = InputSchema.parse(params)

      const result = await searchSignatures(parsed.query, parsed.type)

      if (!result || !result.ok) {
        const errorResult = {
          ok: false,
          query: parsed.query,
          totalFound: 0,
          error: 'Failed to search signatures from Sourcify 4byte database',
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult) }],
          structuredContent: errorResult,
        }
      }

      const signatures = result.result ?? []

      const successResult = {
        ok: true,
        query: parsed.query,
        signatures: signatures.length > 0 ? signatures : undefined,
        totalFound: signatures.length,
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(successResult) }],
        structuredContent: successResult,
      }
    } catch (error) {
      logger.warn(`Error in getSourcifySignatureSearch: ${String(error)}`)
      const errorResult = {
        ok: false,
        query: params.query,
        totalFound: 0,
        error: `Error searching signatures: ${String(error)}`,
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(errorResult) }],
        structuredContent: errorResult,
      }
    }
  },
}
