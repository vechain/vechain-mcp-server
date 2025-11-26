import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { fetchAppHub, AppHubItemSchema, AppHubSchema } from '@/services/app-hub'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

const OutputSchema = createIndexerStructuredOutputSchema(AppHubSchema)
const ResponseSchema = createIndexerToolResponseSchema(AppHubSchema)
export type GetAppHubResponse = z.infer<typeof ResponseSchema>

const InputSchema = z
  .object({
    category: z.string().optional().describe('Filter by category (e.g., defi, utilities, games, marketplaces, collectibles)'),
    tag: z.string().optional().describe('Filter by a single tag (case-insensitive contains)'),
    isVeWorldSupported: z.boolean().optional().describe('Filter by VeWorld support flag'),
    query: z.string().optional().describe('Free-text search in name/desc (case-insensitive contains)'),
  })
  .describe('Optional filters for App Hub list')

export const getAppHubApps: MCPTool = {
  name: 'getAppHubApps',
  title: 'App Hub: official apps on VeChain',
  description:
    'List official apps from VeChain App Hub. Supports filtering by category, tag, VeWorld support and free-text search.',
  inputSchema: InputSchema.shape,
  outputSchema: OutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (params: z.infer<typeof InputSchema>): Promise<GetAppHubResponse> => {
    try {
      const parsed = InputSchema.parse(params ?? {})
      const data = await fetchAppHub()
      if (!data) {
        return indexerErrorResponse('Failed to fetch App Hub apps')
      }
      let apps = data
      if (parsed.category) {
        const cat = parsed.category.toLowerCase()
        apps = apps.filter(a => (a.category ?? '').toLowerCase() === cat)
      }
      if (parsed.tag) {
        const t = parsed.tag.toLowerCase()
        apps = apps.filter(a => (a.tags ?? []).some(x => x.toLowerCase().includes(t)))
      }
      if (parsed.isVeWorldSupported !== undefined) {
        apps = apps.filter(a => (a.isVeWorldSupported ?? false) === parsed.isVeWorldSupported)
      }
      if (parsed.query) {
        const q = parsed.query.toLowerCase()
        apps = apps.filter(
          a =>
            a.name.toLowerCase().includes(q) ||
            (a.desc ?? '').toLowerCase().includes(q) ||
            (a.tags ?? []).some(x => x.toLowerCase().includes(q)),
        )
      }
      // Validate final list
      const items = z.array(AppHubItemSchema).parse(apps)
      return {
        content: [{ type: 'text', text: JSON.stringify(items) }],
        structuredContent: {
          ok: true,
          network: getThorNetworkType(),
          data: items,
        },
      }
    } catch (error) {
      logger.warn(`Error fetching App Hub apps: ${String(error)}`)
      return indexerErrorResponse(`Error fetching App Hub apps: ${String(error)}`)
    }
  },
}




