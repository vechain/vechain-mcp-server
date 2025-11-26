import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import {
  IndexerB3TRActionSchema,
  IndexerB3TRActionsListResponseSchema,
  IndexerGetB3TRActionsForAppParamsSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const OutputSchema = createIndexerStructuredOutputSchema(IndexerB3TRActionsListResponseSchema)
export const ResponseSchema = createIndexerToolResponseSchema(IndexerB3TRActionsListResponseSchema)
export type GetB3TRActionsForAppResponse = z.infer<typeof ResponseSchema>

const InputSchema = z
  .object({
    appId: z.string().describe('veBetterDaoId of the app (required)'),
    after: z.number().optional().describe('Return actions after (inclusive) this timestamp in milliseconds'),
    before: z.number().optional().describe('Return actions before (inclusive) this timestamp in milliseconds'),
    page: z.number().optional(),
    size: z.number().optional(),
    direction: z.enum(['ASC', 'DESC']).optional(),
  })
  .describe('Parameters for querying B3TR actions for an app')

export const getB3TRActionsForApp: MCPTool = {
  name: 'getB3TRActionsForApp',
  title: 'B3TR: Actions for an app',
  description:
    'Fetch B3TR actions for a VeBetterDAO app via /api/v1/b3tr/actions/apps/{appId}. Requires appId (if coming from app-hub from name or description, use veBetterDaoId).',
  inputSchema: InputSchema.shape,
  outputSchema: OutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (params: z.infer<typeof InputSchema>): Promise<GetB3TRActionsForAppResponse> => {
    try {
      const parsed = InputSchema.parse(params ?? {})

      const response = await veworldIndexerGet<typeof IndexerB3TRActionSchema>({
        endPoint: `/api/v1/b3tr/actions/apps/${parsed.appId}`,
        params: {
          after: parsed.after,
          before: parsed.before,
          page: parsed.page,
          size: parsed.size,
          direction: parsed.direction,
        } as any,
      })

      if (!response?.data) return indexerErrorResponse('Failed to fetch B3TR actions for app')

      // Wrap with list response schema (data + pagination)
      const list = {
        data: response.data,
        pagination: response.pagination,
      }
      const validated = IndexerB3TRActionsListResponseSchema.parse(list)
      return {
        content: [{ type: 'text', text: JSON.stringify(validated) }],
        structuredContent: {
          ok: true,
          network: getThorNetworkType(),
          data: validated,
        },
      }
    } catch (error) {
      logger.warn(`Error fetching B3TR actions for app: ${String(error)}`)
      return indexerErrorResponse(`Error fetching B3TR actions for app: ${String(error)}`)
    }
  },
}


