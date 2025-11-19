import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import {
  VevoteHistoricProposalsParamsSchema,
  VevoteHistoricProposalsResponseSchema,
  VevoteHistoricProposalSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

const OutputSchema = createIndexerStructuredOutputSchema(z.array(VevoteHistoricProposalSchema))
export const VevoteHistoricProposalsToolResponseSchema =
  createIndexerToolResponseSchema(z.array(VevoteHistoricProposalSchema))
export type VevoteHistoricProposalsToolResponse = z.infer<
  typeof VevoteHistoricProposalsToolResponseSchema
>

export const getVevoteHistoricProposals: MCPTool = {
  name: 'getVevoteHistoricProposals',
  title: 'VeVote: legacy historic proposals',
  description:
    'Query legacy VeVote (Stakeholder and Steering Committee Governance contracts) historic proposals from /api/v1/vevote/historic-proposals. By default excludes test proposals (testProposals=false). Supports filtering by proposalId or legacy contractAddress and pagination.',
  inputSchema: VevoteHistoricProposalsParamsSchema.shape,
  outputSchema: OutputSchema.shape,
  annotations: { idempotentHint: true, openWorldHint: true, readOnlyHint: true, destructiveHint: false },
  handler: async (
    params: z.infer<typeof VevoteHistoricProposalsParamsSchema>,
  ): Promise<VevoteHistoricProposalsToolResponse> => {
    try {
      // Default testProposals to false unless explicitly provided; avoid duplicate keys
      const { testProposals, ...rest } = (params ?? {}) as { testProposals?: boolean }
      const parsed = VevoteHistoricProposalsParamsSchema.parse({
        ...rest,
        testProposals: testProposals ?? false,
      })
      const response = await veworldIndexerGet<
        typeof VevoteHistoricProposalSchema,
        typeof VevoteHistoricProposalsParamsSchema
      >({
        endPoint: '/api/v1/vevote/historic-proposals',
        params: parsed as any,
      })
      if (!response?.data) return indexerErrorResponse('Failed to fetch VeVote historic proposals')
      return {
        content: [{ type: 'text', text: JSON.stringify(response.data) }],
        structuredContent: { ok: true, network: getThorNetworkType(), data: response.data },
      }
    } catch (error) {
      logger.warn(`Error fetching VeVote historic proposals: ${String(error)}`)
      return indexerErrorResponse(`Error fetching VeVote historic proposals: ${String(error)}`)
    }
  },
}


