import { z } from 'zod'
import { getThorNetworkType, ThorNetworkType } from '@/services/thor'
import {
  IndexerB3TRProposalCommentSchema,
  IndexerB3TRProposalCommentsResponseSchema,
  IndexerGetB3TRProposalCommentsParamsSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

// Base URLs for proposal comments endpoint
const PROPOSALS_BASE_URL = {
  [ThorNetworkType.MAINNET]: 'https://indexer.mainnet.vechain.org',
  [ThorNetworkType.TESTNET]: 'https://indexer.testnet.vechain.org',
  [ThorNetworkType.SOLO]: null,
}

export const OutputSchema = createIndexerStructuredOutputSchema(
  IndexerB3TRProposalCommentsResponseSchema,
)
export const ResponseSchema = createIndexerToolResponseSchema(
  IndexerB3TRProposalCommentsResponseSchema,
)
export type GetB3TRProposalCommentsResponse = z.infer<typeof ResponseSchema>

/**
 * Tool to fetch B3TR proposal comments from the production indexer.
 */
export const getB3TRProposalComments: MCPTool = {
  name: 'getB3TRProposalComments',
  title: 'B3TR: Proposal comments',
  description:
    'Get on-chain voting comments/reasons for a specific B3TR proposal via /api/v1/b3tr/proposals/{proposalId}/comments. Shows comments from users who actually voted on-chain with their voting power and weight. **NOTE: This shows on-chain voter comments. For broader community discussion, extract the Discourse forum link from the proposal\'s IPFS description. If getDiscourseTopic is available, use it to fetch the full forum thread; if not available (optional feature), provide the forum URL for manual viewing. Forum discussions often have more detailed debate and sentiment from the wider community before/during voting.** Supports filtering by support type (FOR, AGAINST, ABSTAIN).',
  inputSchema: IndexerGetB3TRProposalCommentsParamsSchema.shape,
  outputSchema: OutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (
    params: z.infer<typeof IndexerGetB3TRProposalCommentsParamsSchema>,
  ): Promise<GetB3TRProposalCommentsResponse> => {
    try {
      const parsed = IndexerGetB3TRProposalCommentsParamsSchema.parse(params)
      const networkType = getThorNetworkType()

      // Get custom base URL for proposals
      const baseUrl = PROPOSALS_BASE_URL[networkType]
      if (!baseUrl) {
        return indexerErrorResponse('Proposal comments endpoint is not available on solo network')
      }

      // Build URL with query parameters
      const url = new URL(`/api/v1/b3tr/proposals/${parsed.proposalId}/comments`, baseUrl)
      
      if (parsed.support !== undefined) {
        url.searchParams.set('support', parsed.support)
      }
      if (parsed.page !== undefined) {
        url.searchParams.set('page', String(parsed.page))
      }
      if (parsed.size !== undefined) {
        url.searchParams.set('size', String(parsed.size))
      }
      if (parsed.direction !== undefined) {
        url.searchParams.set('direction', parsed.direction)
      }

      logger.debug(`GET ${url.toString()}`)

      // Fetch from custom proposals endpoint
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        logger.warn(`Failed to fetch proposal comments: ${response.status} ${response.statusText}`)
        return indexerErrorResponse('Failed to fetch B3TR proposal comments')
      }

      const data = await response.json()
      logger.debug(`Proposal comments fetch success: ${JSON.stringify(data, null, 2)}`)

      const validated = IndexerB3TRProposalCommentsResponseSchema.parse(data)
      return {
        content: [{ type: 'text', text: JSON.stringify(validated) }],
        structuredContent: {
          ok: true,
          network: networkType,
          data: validated,
        },
      }
    } catch (error) {
      logger.warn(`Error fetching B3TR proposal comments: ${String(error)}`)
      return indexerErrorResponse(`Error fetching B3TR proposal comments: ${String(error)}`)
    }
  },
}

