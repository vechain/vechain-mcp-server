import type { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import {
  type IndexedHistoryEventSchema,
  type IndexerGetHistoryOfAccountResponseType,
  IndexerGetHistoryOfAccountStructuredSchema,
  IndexerGetHistoryParamsSchema,
} from '@/services/veworld-indexer/schemas'
import { indexerErrorResponse } from '@/services/veworld-indexer/utils'

import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

/**
 * Schemas for get history of account tool outputs
 */
const IndexerGetHistoryQueryParamsSchema = IndexerGetHistoryParamsSchema.omit({ address: true })

/**
 * Tool for getting transaction history of a given account
 * NOTE: Address is a url parameter, other params are query params
 */
export const getHistoryOfAccount: MCPTool = {
  name: 'getHistoryOfAccount',
  title: 'Get History of account',
  description: 'Get the transaction history of a given address',
  inputSchema: IndexerGetHistoryParamsSchema.shape,
  outputSchema: IndexerGetHistoryOfAccountStructuredSchema.shape,
  annotations: {
    idempotentHint: false,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (
    params: z.infer<typeof IndexerGetHistoryParamsSchema>,
  ): Promise<IndexerGetHistoryOfAccountResponseType> => {
    try {
      const { address, ...queryParams } = params
      const response = await veworldIndexerGet<
        typeof IndexedHistoryEventSchema,
        typeof IndexerGetHistoryQueryParamsSchema
      >({
        endPoint: `/api/v2/history/${address}`,
        params: queryParams,
      })

      if (!response?.data) {
        return indexerErrorResponse('Failed to fetch history from VeWorld Indexer')
      }

      const history = response.data

      return {
        content: [{ type: 'text', text: JSON.stringify(history) }],
        structuredContent: {
          ok: true,
          network: getThorNetworkType(),
          data: history,
        },
      }
    } catch (error) {
      logger.warn(`Error getting History of ${params.address} from VeWorld Indexer: ${String(error)}`)
      return indexerErrorResponse(`Error getting History of ${params.address} from VeWorld Indexer: ${String(error)}`)
    }
  },
}
