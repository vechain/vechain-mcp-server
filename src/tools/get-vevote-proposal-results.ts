import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import {
  VevoteProposalResultSchema,
  VevoteProposalResultsParamsBaseSchema,
  VevoteProposalResultsParamsSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const VevoteProposalResultsOutputSchema = createIndexerStructuredOutputSchema(
  z.array(VevoteProposalResultSchema),
)
export const VevoteProposalResultsToolResponseSchema = createIndexerToolResponseSchema(
  z.array(VevoteProposalResultSchema),
)
export type VevoteProposalResultsToolResponse = z.infer<
  typeof VevoteProposalResultsToolResponseSchema
>

export const getVevoteProposalResults: MCPTool = {
  name: 'getVevoteProposalResults',
  title: 'VeVote: proposal results (current governance)',
  description:
    'Fetch aggregated voting results per support from /api/v1/vevote/proposal/results. Optional filters: proposalId, support; supports pagination.',
  inputSchema: VevoteProposalResultsParamsBaseSchema.shape,
  outputSchema: VevoteProposalResultsOutputSchema.shape,
  annotations: { idempotentHint: true, openWorldHint: true, readOnlyHint: true, destructiveHint: false },
  handler: async (
    params: z.infer<typeof VevoteProposalResultsParamsBaseSchema>,
  ): Promise<VevoteProposalResultsToolResponse> => {
    try {
      const parsed = VevoteProposalResultsParamsBaseSchema.parse(params ?? {})
      const response = await veworldIndexerGet<
        typeof VevoteProposalResultSchema,
        typeof VevoteProposalResultsParamsBaseSchema
      >({
        endPoint: '/api/v1/vevote/proposal/results',
        params: parsed as any,
      })
      if (!response?.data) return indexerErrorResponse('Failed to fetch VeVote proposal results')
      return {
        content: [{ type: 'text', text: JSON.stringify(response.data) }],
        structuredContent: { ok: true, network: getThorNetworkType(), data: response.data },
      }
    } catch (error) {
      logger.warn(`Error fetching VeVote proposal results: ${String(error)}`)
      return indexerErrorResponse(`Error fetching VeVote proposal results: ${String(error)}`)
    }
  },
}


