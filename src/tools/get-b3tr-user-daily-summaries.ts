import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import {
  IndexerB3TRUserDailySummarySchema,
  IndexerB3TRUserDailySummariesResponseSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import { resolveVnsOrAddress } from '@/services/vns'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const OutputSchema = createIndexerStructuredOutputSchema(IndexerB3TRUserDailySummariesResponseSchema)
export const ResponseSchema = createIndexerToolResponseSchema(IndexerB3TRUserDailySummariesResponseSchema)
export type GetB3TRUserDailySummariesResponse = z.infer<typeof ResponseSchema>

const InputSchema = z
  .object({
    wallet: z.string().describe('User wallet address (0x...) or VNS name'),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be in yyyy-MM-dd format (UTC)'),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be in yyyy-MM-dd format (UTC)'),
    page: z.number().optional(),
    size: z.number().optional(),
    direction: z.enum(['ASC', 'DESC']).optional(),
  })
  .describe('Parameters for querying B3TR user daily summaries within a date range')

export const getB3TRUserDailySummaries: MCPTool = {
  name: 'getB3TRUserDailySummaries',
  title: 'B3TR: User daily summaries',
  description:
    'Get daily action summaries for a specific user within a date range via /api/v1/b3tr/actions/users/{wallet}/daily-summaries. Returns total B3TR rewards, number of rewarded actions, sustainability impact totals for each day. Dates must be UTC in yyyy-MM-dd.',
  inputSchema: InputSchema.shape,
  outputSchema: OutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (params: z.infer<typeof InputSchema>): Promise<GetB3TRUserDailySummariesResponse> => {
    try {
      const parsed = InputSchema.parse(params ?? {})
      const wallet = await resolveVnsOrAddress(parsed.wallet)

      const response = await veworldIndexerGet<typeof IndexerB3TRUserDailySummarySchema>({
        endPoint: `/api/v1/b3tr/actions/users/${wallet}/daily-summaries`,
        params: {
          startDate: parsed.startDate,
          endDate: parsed.endDate,
          page: parsed.page,
          size: parsed.size,
          direction: parsed.direction,
        } as any,
      })

      if (!response?.data) return indexerErrorResponse('Failed to fetch B3TR user daily summaries')

      const list = {
        data: response.data,
        pagination: response.pagination,
      }
      const validated = IndexerB3TRUserDailySummariesResponseSchema.parse(list)
      return {
        content: [{ type: 'text', text: JSON.stringify(validated) }],
        structuredContent: {
          ok: true,
          network: getThorNetworkType(),
          data: validated,
        },
      }
    } catch (error) {
      logger.warn(`Error fetching B3TR user daily summaries: ${String(error)}`)
      return indexerErrorResponse(`Error fetching B3TR user daily summaries: ${String(error)}`)
    }
  },
}


