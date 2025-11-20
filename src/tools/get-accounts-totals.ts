import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import {
  AccountsTotalsItemSchema,
  AccountsTotalsParamsSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const AccountsTotalsOutputSchema = createIndexerStructuredOutputSchema(
  z.array(AccountsTotalsItemSchema),
)
export const AccountsTotalsResponseSchema = createIndexerToolResponseSchema(
  z.array(AccountsTotalsItemSchema),
)
export type AccountsTotalsResponse = z.infer<typeof AccountsTotalsResponseSchema>

export const getAccountsTotals: MCPTool = {
  name: 'getAccountsTotals',
  title: 'Accounts: totals/time-series',
  description:
    'Retrieve total unique VeChain accounts by timeframe via /api/v1/accounts/totals. Provide timeFrame (DAY, WEEK, MONTH, YEAR) to get per-interval totals; omit timeFrame to get cumulative ALL. Supports pagination.',
  inputSchema: AccountsTotalsParamsSchema.shape,
  outputSchema: AccountsTotalsOutputSchema.shape,
  annotations: { idempotentHint: true, openWorldHint: true, readOnlyHint: true, destructiveHint: false },
  handler: async (params: z.infer<typeof AccountsTotalsParamsSchema>): Promise<AccountsTotalsResponse> => {
    try {
      const parsed = AccountsTotalsParamsSchema.parse(params ?? {})
      const response = await veworldIndexerGet<
        typeof AccountsTotalsItemSchema,
        typeof AccountsTotalsParamsSchema
      >({
        endPoint: '/api/v1/accounts/totals',
        params: parsed as any,
      })
      if (!response?.data) return indexerErrorResponse('Failed to fetch Accounts totals')
      return {
        content: [{ type: 'text', text: JSON.stringify(response.data) }],
        structuredContent: { ok: true, network: getThorNetworkType(), data: response.data },
      }
    } catch (error) {
      logger.warn(`Error fetching Accounts totals: ${String(error)}`)
      return indexerErrorResponse(`Error fetching Accounts totals: ${String(error)}`)
    }
  },
}


