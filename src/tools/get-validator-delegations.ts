import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import {
  IndexerDelegationSchema,
  IndexerGetValidatorDelegationsParamsSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
  validatorEndpointsAvailable,
  validatorEndpointsUnavailableMessage,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const IndexerGetValidatorDelegationsOutputSchema = createIndexerStructuredOutputSchema(
  z.array(IndexerDelegationSchema),
)
export const IndexerGetValidatorDelegationsResponseSchema = createIndexerToolResponseSchema(
  z.array(IndexerDelegationSchema),
)
export type IndexerGetValidatorDelegationsResponse = z.infer<
  typeof IndexerGetValidatorDelegationsResponseSchema
>

export const getValidatorDelegations: MCPTool = {
  name: 'getValidatorDelegations',
  title: 'Indexer: Validator delegations (v1)',
  description:
    'Retrieve delegation records via /api/v1/validators/delegations. Filter by validator, tokenId, and one or more statuses. Supports pagination and sort direction. Get information on delegations to a validator and the Stargate NFTs that are delegated to the validator',
  inputSchema: IndexerGetValidatorDelegationsParamsSchema.shape,
  outputSchema: IndexerGetValidatorDelegationsOutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (
    params: z.infer<typeof IndexerGetValidatorDelegationsParamsSchema>,
  ): Promise<IndexerGetValidatorDelegationsResponse> => {
    try {
      if (!(await validatorEndpointsAvailable())) {
        return indexerErrorResponse(validatorEndpointsUnavailableMessage())
      }
      const parsed = IndexerGetValidatorDelegationsParamsSchema.parse(params ?? {})
      const { statuses, ...rest } = parsed as any
      const response = await veworldIndexerGet<typeof IndexerDelegationSchema>({
        endPoint: '/api/v1/validators/delegations',
        // Serialize array filter as comma-separated string for query param
        params: { ...rest, statuses: Array.isArray(statuses) ? statuses.join(',') : statuses } as any,
      })

      if (!response?.data) {
        return indexerErrorResponse('Failed to fetch validator delegations from VeWorld Indexer')
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(response.data) }],
        structuredContent: {
          ok: true,
          network: getThorNetworkType(),
          data: response.data,
        },
      }
    } catch (error) {
      logger.warn(`Error fetching validator delegations: ${String(error)}`)
      return indexerErrorResponse(`Error fetching validator delegations: ${String(error)}`)
    }
  },
}


