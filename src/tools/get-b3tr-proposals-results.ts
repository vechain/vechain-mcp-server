import { z } from 'zod'
import { getThorNetworkType, ThorNetworkType } from '@/services/thor'
import {
  IndexerB3TRProposalEntrySchema,
  IndexerB3TRProposalsResultsResponseSchema,
  IndexerGetB3TRProposalsResultsParamsSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

// Base URLs for proposals endpoint
const PROPOSALS_BASE_URL = {
  [ThorNetworkType.MAINNET]: 'https://indexer.mainnet.vechain.org',
  [ThorNetworkType.TESTNET]: 'https://indexer.testnet.vechain.org',
  [ThorNetworkType.SOLO]: null,
}

export const OutputSchema = createIndexerStructuredOutputSchema(
  IndexerB3TRProposalsResultsResponseSchema,
)
export const ResponseSchema = createIndexerToolResponseSchema(
  IndexerB3TRProposalsResultsResponseSchema,
)
export type GetB3TRProposalsResultsResponse = z.infer<typeof ResponseSchema>

/**
 * Tool to fetch B3TR proposal results from the production indexer.
 * 
 * COMPLETE B3TR PROPOSAL ANALYSIS WORKFLOW:
 * ============================================
 * 1. getB3TRProposalsResults() - Get proposals with basic info and IPFS CID
 * 2. getIPFSContent(cid) - Fetch full proposal description from IPFS
 * 3. Extract Discourse link from description (look for: vechain.discourse.group/t/topic-name/TOPIC_ID)
 * 4. getDiscourseTopic(topicId) - Get community forum discussion thread (OPTIONAL - if not available, provide forum URL)
 * 5. getB3TRProposalComments(proposalId) - Get on-chain voter comments with voting power
 * 
 * This provides complete analysis:
 * - Proposal details & voting results (step 1)
 * - Full description & context (step 2)
 * - Community discussion & broader sentiment (step 4 - via API or manual URL)
 * - On-chain voter rationale with power/weight (step 5)
 * 
 * NOTE: Forum tools (step 4) are OPTIONAL. If Discourse MCP server is not running,
 * provide the forum URL for manual viewing instead of throwing errors.
 */
export const getB3TRProposalsResults: MCPTool = {
  name: 'getB3TRProposalsResults',
  title: 'B3TR: Proposal results',
  description:
    'Get B3TR proposal results via /api/v2/b3tr/proposals/results. **IMPORTANT: If user provides a specific proposal ID, pass it as the proposalId parameter to query directly for that single proposal - DO NOT fetch all proposals and filter!** Returns proposals with voting results and IPFS description CIDs. **WORKFLOW: 1) Use this tool with proposalId parameter if specific proposal requested, or browse all proposals if general query, 2) Use getIPFSContent with the description CID to get full proposal details, 3) Extract Discourse forum link from description (format: vechain.discourse.group/t/topic-name/TOPIC_ID), 4) If getDiscourseTopic is available, use it with the topic ID to fetch community discussion; if not available (optional feature), provide the forum URL for manual viewing, 5) Use getB3TRProposalComments to get on-chain voting comments. This gives complete view: proposal data + forum discussion (via API or URL) + on-chain voter comments.**',
  inputSchema: IndexerGetB3TRProposalsResultsParamsSchema.shape,
  outputSchema: OutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (
    params: z.infer<typeof IndexerGetB3TRProposalsResultsParamsSchema>,
  ): Promise<GetB3TRProposalsResultsResponse> => {
    try {
      const parsed = IndexerGetB3TRProposalsResultsParamsSchema.parse(params ?? {})
      const networkType = getThorNetworkType()

      // Get custom base URL for proposals
      const baseUrl = PROPOSALS_BASE_URL[networkType]
      if (!baseUrl) {
        return indexerErrorResponse('Proposals endpoint is not available on solo network')
      }

      // Build URL with query parameters
      const url = new URL('/api/v2/b3tr/proposals/results', baseUrl)
      
      if (parsed.proposalId !== undefined) {
        url.searchParams.set('proposalId', parsed.proposalId)
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
      if (parsed.states && Array.isArray(parsed.states)) {
        // Add multiple state parameters
        parsed.states.forEach((state) => {
          url.searchParams.append('states', state)
        })
      }

      logger.debug(`GET ${url.toString()}`)

      // Fetch from custom proposals endpoint
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        logger.warn(`Failed to fetch proposals: ${response.status} ${response.statusText}`)
        return indexerErrorResponse('Failed to fetch B3TR proposals results')
      }

      const data = await response.json()
      logger.debug(`Proposals fetch success: ${JSON.stringify(data, null, 2)}`)

      const validated = IndexerB3TRProposalsResultsResponseSchema.parse(data)
      return {
        content: [{ type: 'text', text: JSON.stringify(validated) }],
        structuredContent: {
          ok: true,
          network: networkType,
          data: validated,
        },
      }
    } catch (error) {
      logger.warn(`Error fetching B3TR proposals results: ${String(error)}`)
      return indexerErrorResponse(`Error fetching B3TR proposals results: ${String(error)}`)
    }
  },
}

