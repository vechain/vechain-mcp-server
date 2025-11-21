import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import {
  IndexerB3TRActionSchema,
  IndexerB3TRActionsListResponseSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import { resolveVnsOrAddress } from '@/services/vns'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const OutputSchema = createIndexerStructuredOutputSchema(IndexerB3TRActionsListResponseSchema)
export const ResponseSchema = createIndexerToolResponseSchema(IndexerB3TRActionsListResponseSchema)
export type GetB3TRActionsForUserResponse = z.infer<typeof ResponseSchema>

const InputSchema = z
  .object({
    wallet: z.string().describe('User wallet address (0x...) or VNS name'),
    appId: z.string().optional().describe('Optional app ID to filter interactions'),
    after: z.number().optional().describe('Return records after this time (Unix time in milliseconds)'),
    before: z.number().optional().describe('Return records before this time (Unix time in milliseconds)'),
    page: z.number().optional(),
    size: z.number().optional(),
    direction: z.enum(['ASC', 'DESC']).optional(),
  })
  .describe('Parameters for querying B3TR actions for a user')

export const getB3TRActionsForUser: MCPTool = {
  name: 'getB3TRActionsForUser',
  title: 'B3TR: Actions for a user',
  description:
    'Get B3TR actions for a user and the impacts of those actions via /api/v1/b3tr/actions/users/{wallet}. Optionally filter by appId and time range.',
  inputSchema: InputSchema.shape,
  outputSchema: OutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (params: z.infer<typeof InputSchema>): Promise<GetB3TRActionsForUserResponse> => {
    try {
      const parsed = InputSchema.parse(params ?? {})
      const walletAddress = await resolveVnsOrAddress(parsed.wallet)

      const response = await veworldIndexerGet<typeof IndexerB3TRActionSchema>({
        endPoint: `/api/v1/b3tr/actions/users/${walletAddress}`,
        params: {
          appId: parsed.appId,
          after: parsed.after,
          before: parsed.before,
          page: parsed.page,
          size: parsed.size,
          direction: parsed.direction,
        } as any,
      })

      if (!response?.data) return indexerErrorResponse('Failed to fetch B3TR actions for user')

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
      logger.warn(`Error fetching B3TR actions for user: ${String(error)}`)
      return indexerErrorResponse(`Error fetching B3TR actions for user: ${String(error)}`)
    }
  },
}


