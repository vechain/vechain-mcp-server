import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import { IndexedHistoryEventSchema, IndexerGetHistoryParamsSchema } from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'

import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

/**
 * Schemas for get history of account tool outputs
 */

const IndexerGetHistoryQueryParamsSchema = IndexerGetHistoryParamsSchema.omit({ address: true })

export const IndexerGetHistoryOfAccountDataSchema = z.array(IndexedHistoryEventSchema)

export const IndexerGetHistoryOfAccountOutputSchema = createIndexerStructuredOutputSchema(
  IndexerGetHistoryOfAccountDataSchema,
)
export const IndexerGetHistoryOfAccountResponseSchema = createIndexerToolResponseSchema(
  IndexerGetHistoryOfAccountDataSchema,
)
type IndexerGetHistoryOfAccountResponse = z.infer<typeof IndexerGetHistoryOfAccountResponseSchema>

/**
 * Tool for getting transaction history of a given account
 * NOTE: Address is a url parameter, other params are query params
 */
export const getHistoryOfAccount: MCPTool = {
  name: 'getHistoryOfAccount',
  title: 'Get History of account',
  description: `
  Retrieve transaction history for a VeChain address with filtering support.

  **IMPORTANT: Pass ARRAYS of event names to fetch multiple event types in ONE call - this is much more efficient than separate calls.**
  
  **Available Event Types:**
  
  STARGATE STAKING (Current - Post-Hayabusa):
  - STARGATE_STAKE: User stakes VET and mints Stargate NFT
  - STARGATE_UNSTAKE: User unstakes VET and burns NFT
  - STARGATE_DELEGATE_REQUEST: User requests to delegate NFT to validator
  - STARGATE_DELEGATE_ACTIVE: Delegation becomes active with validator
  - STARGATE_DELEGATE_EXIT_REQUEST: User requests to exit delegation
  - STARGATE_DELEGATION_EXITED: Delegation fully exited, can unstake
  - STARGATE_DELEGATION_EXITED_VALIDATOR: Validator-side exit event
  - STARGATE_DELEGATE_REQUEST_CANCELLED: Delegation request cancelled before activation
  - STARGATE_CLAIM_REWARDS: User claims VTHO staking rewards
  - STARGATE_BOOST: User boosts NFT maturity with VTHO payment
  - STARGATE_MANAGER_ADDED: User adds manager address to control NFT
  - STARGATE_MANAGER_REMOVED: Manager address removed from NFT
  
  STARGATE LEGACY (Pre-Hayabusa - Historical only):
  - STARGATE_DELEGATE_LEGACY: Old delegation system
  - STARGATE_CLAIM_REWARDS_BASE_LEGACY: Old base rewards
  - STARGATE_CLAIM_REWARDS_DELEGATE_LEGACY: Old delegation rewards
  - STARGATE_UNDELEGATE_LEGACY: Old undelegation
  
  TRANSFERS:
  - TRANSFER_VET: Native VET token transfers
  - TRANSFER_FT: Fungible token (VIP-180) transfers - includes VTHO, other tokens
  - TRANSFER_NFT: NFT (VIP-181/VIP-721) transfers
  - TRANSFER_SF: Semi-fungible token transfers
  
  SWAPS (DEX Activity):
  - SWAP_VET_TO_FT: Swapping VET for tokens
  - SWAP_FT_TO_VET: Swapping tokens for VET
  - SWAP_FT_TO_FT: Token-to-token swaps
  
  VEBETTERDAO (B3TR Ecosystem):
  - B3TR_SWAP_VOT3_TO_B3TR: Converting VOT3 governance token to B3TR
  - B3TR_SWAP_B3TR_TO_VOT3: Converting B3TR to VOT3
  - B3TR_PROPOSAL_SUPPORT: Supporting a proposal with B3TR
  - B3TR_PROPOSAL_VOTE: Voting on governance proposal
  - B3TR_XALLOCATION_VOTE: Voting on X-Allocation distribution
  - B3TR_CLAIM_REWARD: Claiming B3TR ecosystem rewards
  - B3TR_UPGRADE_GM: Upgrading governance model
  - B3TR_ACTION: General B3TR ecosystem action
  
  GOVERNANCE:
  - VEVOTE_VOTE_CAST: Vote cast in VeVote governance system
  
  OTHER:
  - NFT_SALE: NFT marketplace sale transaction
  - UNKNOWN_TX: Unclassified transaction type
  
  **Common Query Patterns:**
  
  Complete Stargate history:
  ["STARGATE_STAKE", "STARGATE_UNSTAKE", "STARGATE_DELEGATE_REQUEST", "STARGATE_DELEGATE_ACTIVE", "STARGATE_DELEGATE_EXIT_REQUEST", "STARGATE_DELEGATION_EXITED", "STARGATE_CLAIM_REWARDS", "STARGATE_BOOST", "STARGATE_MANAGER_ADDED", "STARGATE_MANAGER_REMOVED"]
  
  All asset transfers:
  ["TRANSFER_VET", "TRANSFER_FT", "TRANSFER_NFT", "TRANSFER_SF"]
  
  Trading activity:
  ["SWAP_VET_TO_FT", "SWAP_FT_TO_VET", "SWAP_FT_TO_FT"]
  
  **Filters:**
  - eventName: Single string OR array (ALWAYS prefer arrays for related events)
  - searchBy: 'to' | 'from' | 'origin' | 'gasPayer' - filter by address role
  - contractAddress: Filter by specific contract interactions
  - after/before: Unix timestamps (seconds) for time range
  - Pagination: page, size, cursor, direction (ASC/DESC)
  
  Returns paginated array of events with full transaction details.`,
  inputSchema: IndexerGetHistoryParamsSchema.shape,
  outputSchema: IndexerGetHistoryOfAccountOutputSchema.shape,
  annotations: {
    idempotentHint: false,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (
    params: z.infer<typeof IndexerGetHistoryParamsSchema>,
  ): Promise<IndexerGetHistoryOfAccountResponse> => {
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
