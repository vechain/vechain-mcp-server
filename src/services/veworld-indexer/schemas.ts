import { z } from 'zod'
import {
  HexStringSchema,
  ThorAddressSchema,
  ThorBlockIdSchema,
  ThorBlockNumberSchema,
  ThorTransactionIdSchema,
} from '../thor'
import { VnsNameSchema } from '../vns'

// ***************************** Indexer API params schemas *****************************/

const paginationParamsSchema = z.object({
  page: z.number().optional().describe('Optional page number (1-based)'),
  size: z.number().optional().describe('Optional page size'),
  direction: z.enum(['ASC', 'DESC']).optional().describe('Optional sort direction (ASC or DESC)'),
})

// ***************************** Transfer schemas *****************************/

export const IndexerGetTransfersParamsBaseSchema = z
  .object({
    address: z.union([ThorAddressSchema, VnsNameSchema]).optional(),
    tokenAddress: ThorAddressSchema.optional(),
  })
  .extend(paginationParamsSchema.shape)

export const IndexerGetTransfersParamsSchema = IndexerGetTransfersParamsBaseSchema.refine(
  data => data.address || data.tokenAddress,
  {
    message: "At least one of 'address' or 'tokenAddress' must be provided.",
  },
)

export const IndexerTransferSchema = z.object({
  id: z.string(),
  blockId: ThorBlockIdSchema.optional(),
  blockNumber: ThorBlockNumberSchema,
  blockTimestamp: z.number(),
  txId: ThorTransactionIdSchema.optional(),
  from: ThorAddressSchema,
  to: ThorAddressSchema,
  value: z.coerce.bigint(),
  tokenAddress: ThorAddressSchema.nullable().optional(),
  topics: z.array(HexStringSchema),
  tokenId: z.string().nullable().optional(),
  eventType: z.enum(['FUNGIBLE_TOKEN', 'NFT', 'VET']),
})

// ***************************** Indexer History schemas *****************************/

// basic types
const UnixTimestamp = z.number().int().nonnegative()
const NumericString = z.string().regex(/^\d+$/)

// history event names
const HistoryEventNameSchema = z.enum([
  'B3TR_SWAP_VOT3_TO_B3TR',
  'B3TR_SWAP_B3TR_TO_VOT3',
  'B3TR_PROPOSAL_SUPPORT',
  'B3TR_CLAIM_REWARD',
  'B3TR_UPGRADE_GM',
  'B3TR_ACTION',
  'B3TR_PROPOSAL_VOTE',
  'B3TR_XALLOCATION_VOTE',
  'TRANSFER_VET',
  'TRANSFER_FT',
  'TRANSFER_NFT',
  'TRANSFER_SF',
  'SWAP_VET_TO_FT',
  'SWAP_FT_TO_VET',
  'SWAP_FT_TO_FT',
  'UNKNOWN_TX',
  'NFT_SALE',
  'STARGATE_DELEGATE_LEGACY',
  'STARGATE_CLAIM_REWARDS_BASE_LEGACY',
  'STARGATE_CLAIM_REWARDS_DELEGATE_LEGACY',
  'STARGATE_UNDELEGATE_LEGACY',
  'STARGATE_STAKE',
  'STARGATE_UNSTAKE',
  'STARGATE_DELEGATE_ACTIVE',
  'STARGATE_DELEGATE_REQUEST',
  'STARGATE_DELEGATE_EXIT_REQUEST',
  'STARGATE_DELEGATION_EXITED_VALIDATOR',
  'STARGATE_DELEGATION_EXITED',
  'STARGATE_DELEGATE_REQUEST_CANCELLED',
  'STARGATE_CLAIM_REWARDS',
  'STARGATE_BOOST',
  'STARGATE_MANAGER_ADDED',
  'STARGATE_MANAGER_REMOVED',
  'VEVOTE_VOTE_CAST',
])

const HistoryEventSearchBySchema = z.enum(['to', 'from', 'origin', 'gasPayer'])

// indexer get history params schema
export const IndexerGetHistoryParamsSchema = z
  .object({
    address: z.union([ThorAddressSchema, VnsNameSchema]).describe('The account address or VNS (.vet) name to retrieve'),
    eventName: HistoryEventNameSchema.nullable().optional().describe('Optional filter by event name'),
    searchBy: HistoryEventSearchBySchema.nullable()
      .optional()
      .describe('Optional filter by search by (to, from, origin, gasPayer)'),
    contractAddress: ThorAddressSchema.nullable().optional().describe('Optional filter by contract address'),
    after: UnixTimestamp.nullable().optional().describe('Optional filter by after timestamp (unix timestamp)'),
    before: UnixTimestamp.nullable().optional().describe('Optional filter by before timestamp (unix timestamp)'),
  })
  .extend(paginationParamsSchema.shape)

// sustainability proof v2 schema
const ProofV2Schema = z.object({
  image: z.string().optional().describe('Link of Image of the sustainability action'),
  link: z.string().optional().describe('Link of the sustainability action'),
  text: z.string().optional().describe('Text of the sustainability action'),
  video: z.string().optional().describe('Video of the sustainability action'),
})

// sustainability action impact schema
const ImpactSchema = z.object({
  carbon: z.number().int().nonnegative().optional().describe('Grams of CO2 reduced'),
  water: z.number().int().nonnegative().optional().describe('ml of water saved'),
  energy: z.number().int().nonnegative().optional().describe('Wh of energy saved'),
  waste_mass: z.number().int().nonnegative().optional().describe('Grams of waste mass saved'),
  waste_items: z.number().int().nonnegative().optional().describe('Grams of waste items saved'),
  waste_reduction: z.number().int().nonnegative().optional().describe('Grams of waste reduction'),
  biodiversity: z.number().int().nonnegative().optional().describe('m² of land restored'),
  people: z.number().int().nonnegative().optional().describe('Community members benefited'),
  timber: z.number().int().nonnegative().optional().describe('Grams of timber saved'),
  plastic: z.number().int().nonnegative().optional().describe('Grams of plastic saved'),
  education_time: z.number().int().nonnegative().optional().describe('Minutes of education'),
  trees_planted: z.number().int().nonnegative().optional().describe('Number of trees planted'),
  calories_burned: z.number().int().nonnegative().optional().describe('kcal burned'),
  clean_energy_production_wh: z.number().int().nonnegative().optional().describe('Wh of clean energy produced'),
  sleep_quality_percentage: z.number().int().nonnegative().optional().describe('Percentage of sleep quality'),
})

// sustainability action proof v2 schema
const SustainabilityProofV2Schema = z.object({
  version: z.number().int().positive(),
  description: z.string().optional().describe('Description of the sustainability action'),
  proof: ProofV2Schema.optional().describe('Proof of the sustainability action'),
  impact: ImpactSchema.optional().describe('Impact of the sustainability action'),
})

// schema for a VBD app vote
const AppVoteSchema = z.object({
  appId: HexStringSchema,
  voteWeight: NumericString,
})

// schema for VeVote support
const SupportSchema = z.enum(['FOR', 'AGAINST', 'ABSTAIN'])

// indexed history event schema
export const IndexedHistoryEventSchema = z.object({
  id: z.string(),
  blockId: ThorBlockIdSchema.describe('The block id of the history event'),
  blockNumber: z.number().int().positive().describe('The block number of the history event'),
  blockTimestamp: UnixTimestamp.describe('The timestamp of the block of the history event'),
  txId: ThorTransactionIdSchema.describe('The transaction id of the history event'),
  origin: ThorAddressSchema.optional().describe('The origin address of the history event transaction'),
  gasPayer: ThorAddressSchema.optional().describe('The gas payer address of the history event transaction'),
  reverted: z.boolean().optional().describe('Whether the transaction was reverted'),
  contractAddress: ThorAddressSchema.optional().describe('The contract address of the history event'),
  tokenId: z.string().optional(),
  eventName: HistoryEventNameSchema.describe('The name of the history event'),
  to: ThorAddressSchema.optional().describe('The to address of the history event'),
  from: ThorAddressSchema.optional().describe('The from address of the history event'),
  value: NumericString.optional().describe('The value of the history event in wei'),
  appId: HexStringSchema.optional().describe('The VeBetterDAO app id of the history event'),
  proof: SustainabilityProofV2Schema.optional().describe('The proof of the sustainability action of the history event'),
  roundId: NumericString.optional().describe('The VeBetterDAO round id of the history event'),
  appVotes: z.array(AppVoteSchema).optional().describe('The VeBetterDAO app votes of the history event'),
  support: SupportSchema.optional(),
  votePower: NumericString.optional(),
  voteWeight: NumericString.optional(),
  reason: z.string().optional(),
  proposalId: NumericString.optional(),
  oldLevel: z.string().optional(),
  newLevel: z.string().optional(),
  inputToken: z.string().optional(),
  outputToken: z.string().optional(),
  inputValue: z.string().optional(),
  outputValue: z.string().optional(),
  tokenAddress: ThorAddressSchema.optional(),
  levelId: z.string().optional(),
  owner: ThorAddressSchema.optional(),
  vetGeneratedVthoRewards: z.string().optional(),
  delegationRewards: z.string().optional(),
  migrated: z.boolean().optional(),
  autorenew: z.boolean().optional(),
  tokenIds: z.array(z.string()).optional(),
  validator: HexStringSchema.optional(),
  delegationId: z.string().optional(),
  periodClaimed: z.number().int().optional(),
  boostedBlocks: z.string().optional(),
})
