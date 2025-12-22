import { z } from 'zod'
import { indexerResponseSchema } from '@/services/veworld-indexer'
import {
  HexStringSchema,
  ThorAddressSchema,
  ThorBlockIdSchema,
  ThorBlockNumberSchema,
  ThorTransactionIdSchema,
} from '../thor'
import { VnsNameSchema } from '../vns'

// ***************************** Indexer API params schemas *****************************/

const paginationParamsSchema = z
  .object({
    page: z.number().optional().describe('Zero-based results page number (0 is the first page)'),
    size: z.number().optional().describe('Results per page (1..150); API default is typically 20'),
    direction: z
      .enum(['ASC', 'DESC'])
      .optional()
      .describe("Sort direction for time-based queries; defaults to 'DESC' (newest first)"),
    cursor: z.string().optional().describe('Opaque cursor for fetching the next page when provided by the API'),
  })
  .describe('Pagination parameters for Indexer endpoints')

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
    eventName: z
      .union([HistoryEventNameSchema, z.array(HistoryEventNameSchema)])
      .nullable()
      .optional()
      .describe('Optional filter by event name(s). Can be a single event or an array of events'),
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

// ***************************** Transfer schemas *****************************/

export const IndexerGetTransfersParamsBaseSchema = z
  .object({
    address: ThorAddressSchema.optional().describe('Optional wallet address to filter specific address'),
    tokenAddress: ThorAddressSchema.optional().describe('Optional token address to filter specific token'),
  })
  .extend(paginationParamsSchema.shape)
  .describe(
    "Base parameters for transfers queries. Use either 'address' (wallet) or 'tokenAddress' (ERC-20/721 contract) plus optional pagination.",
  )

export const IndexerGetTransfersParamsSchema = IndexerGetTransfersParamsBaseSchema.refine(
  data => data.address || data.tokenAddress,
  {
    message: "At least one of 'address' or 'tokenAddress' must be provided.",
  },
).describe('Validated parameters for GET /api/v1/transfers')

export const IndexerGetTransfersToParamsSchema = z
  .object({
    address: ThorAddressSchema.describe('Recipient address'),
    tokenAddress: ThorAddressSchema.optional().describe('Optional token address to filter specific token'),
  })
  .extend(paginationParamsSchema.shape)
  .describe(
    "Parameters for GET /api/v1/transfers/to. Required 'address' is the recipient; optional 'tokenAddress' to filter specific token; supports pagination.",
  )

export const IndexerGetTransfersFromParamsSchema = z
  .object({
    address: ThorAddressSchema.describe('Sender address'),
    tokenAddress: ThorAddressSchema.optional().describe('Optional token address to filter specific token'),
  })
  .extend(paginationParamsSchema.shape)
  .describe(
    "Parameters for GET /api/v1/transfers/from. Required 'address' is the sender; optional 'tokenAddress' to filter specific token; supports pagination.",
  )

export const IndexerGetTransfersForBlockParamsSchema = z
  .object({
    blockNumber: ThorBlockNumberSchema,
    tokenAddress: ThorAddressSchema.optional(),
  })
  .extend(paginationParamsSchema.shape)
  .describe(
    "Parameters for GET /api/v1/transfers/forBlock. Required 'blockNumber'; optional 'tokenAddress' to filter specific token; supports pagination.",
  )

export const IndexerFungibleTokenContractSchema = ThorAddressSchema.describe(
  'Fungible token (VIP-180/ERC-20-like) contract address',
)

export const IndexerGetFungibleTokenContractsParamsSchema = z
  .object({
    address: ThorAddressSchema.describe('Owner wallet address whose fungible token contracts should be listed'),
    officialTokens: z.boolean().default(true).describe('Return only official tokens when true'),
  })
  .extend(paginationParamsSchema.shape)
  .describe(
    'Parameters for GET /api/v1/transfers/fungible-tokens-contracts. Required address; optional officialTokens filter (defaults true) and pagination.',
  )

export const IndexerTransferSchema = z
  .object({
    id: z.string(),
    blockId: ThorBlockIdSchema.optional(),
    blockNumber: ThorBlockNumberSchema,
    blockTimestamp: z.number(),
    txId: ThorTransactionIdSchema.optional(),
    from: ThorAddressSchema,
    to: ThorAddressSchema,
    value: z.string().describe('Transfer amount as a string (may be large)'),
    tokenAddress: ThorAddressSchema.nullable().optional(),
    topics: z.array(HexStringSchema),
    tokenId: z.string().nullable().optional(),
    eventType: z.enum(['FUNGIBLE_TOKEN', 'NFT', 'VET']),
  })
  .describe('A normalized transfer event (VET, fungible token, or NFT) returned by the Indexer')

// ***************************** NFT schemas *****************************/
export const IndexerNFTAssetSchema = z
  .object({
    id: z.string().describe('Unique identifier for this NFT index record'),
    tokenId: z.string().describe('NFT token identifier as a string'),
    contractAddress: ThorAddressSchema.describe('NFT contract address (VIP‑721/VIP‑181)'),
    owner: ThorAddressSchema.describe('Current owner wallet address'),
    txId: ThorTransactionIdSchema.describe('Transaction id that produced/last moved the NFT'),
    blockNumber: ThorBlockNumberSchema.describe('Block number associated with txId'),
    blockId: ThorBlockIdSchema.describe('Block id (hash) associated with txId'),
    blockTimestamp: z.number().describe('Block timestamp (Unix seconds)'),
  })
  .passthrough()
  .describe(
    'An NFT asset as returned by the VeWorld Indexer. Additional fields may be present and are preserved via passthrough.',
  )

export const IndexerGetNFTsParamsBaseSchema = z
  .object({
    address: ThorAddressSchema.optional().describe(
      'Wallet address that owns NFTs to query (0x-prefixed, 40 hex chars)',
    ),
    contractAddress: ThorAddressSchema.optional().describe(
      'Optional NFT contract address to filter results (VIP‑721/VIP‑181)',
    ),
  })
  .extend(paginationParamsSchema.shape)
  .describe('Base parameters for GET /api/v1/nfts (address optional for handler validation)')

export const IndexerGetNFTsParamsSchema = IndexerGetNFTsParamsBaseSchema.required({
  address: true,
}).describe("Parameters for GET /api/v1/nfts. Requires 'address'.")

export const IndexerGetNFTContractsParamsBaseSchema = z
  .object({
    owner: ThorAddressSchema.optional().describe('The address of the NFTs owner'),
    excludeCollections: z
      .array(ThorAddressSchema)
      .max(20)
      .optional()
      .describe('Optional list of NFT collection addresses to exclude (max 20)'),
  })
  .extend(paginationParamsSchema.shape)
  .describe('Base parameters for GET /api/v1/nfts/contracts (owner optional for handler validation)')

export const IndexerGetNFTContractsParamsSchema = IndexerGetNFTContractsParamsBaseSchema.required({
  owner: true,
}).describe("Parameters for GET /api/v1/nfts/contracts. Requires 'owner'.")

// ***************************** Transactions schemas *****************************/

export const IndexerTransactionClauseSchema = z
  .object({
    to: ThorAddressSchema.nullable().optional(),
    value: z.coerce.string(),
    data: z.coerce.string(),
  })
  .describe(
    'A single VeChain transaction clause: target address (nullable for contract creation), value (hex wei), and call data.',
  )

export const IndexerTransactionEventSchema = z
  .object({
    address: ThorAddressSchema,
    topics: z.array(HexStringSchema).describe('Topics array for the log/event'),
    data: z.coerce.string(),
    name: z.string().optional().describe('Decoded event name (when ABI is known)'),
    params: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Decoded event arguments as a key/value map (when ABI is known)'),
  })
  .describe('A decoded log event emitted by a transaction')

export const IndexerTransactionTransferSchema = z
  .object({
    sender: ThorAddressSchema,
    recipient: ThorAddressSchema,
    amount: z.coerce.string(),
  })
  .describe('A normalized transfer extracted by the Indexer')

export const IndexerTransactionOutputSchema = z
  .object({
    contractAddress: ThorAddressSchema,
    events: z.array(IndexerTransactionEventSchema),
    transfers: z.array(IndexerTransactionTransferSchema),
  })
  .describe('Per-clause outputs including decoded events and detected transfers')

export const IndexerTransactionSchema = z
  .object({
    id: z.string().describe('Transaction hash (id)'),
    blockId: ThorBlockIdSchema.describe('Block hash containing this transaction'),
    blockNumber: ThorBlockNumberSchema,
    blockTimestamp: z.number().describe('Block timestamp (Unix seconds)'),
    type: z.number(),
    size: z.number().describe('Raw transaction size in bytes'),
    chainTag: z.number().optional().describe('Thor chain tag (network identifier)'),
    blockRef: z.coerce.string().describe('Block reference used to compute expiration'),
    expiration: z.number().describe('Number of blocks after blockRef before the transaction expires'),
    clauses: z.array(IndexerTransactionClauseSchema).describe('Clauses executed by this transaction'),
    gasPriceCoef: z.number().optional().describe('Gas price coefficient used in effective gas price calculation'),
    gas: z.number().describe('Gas limit for the transaction'),
    maxFeePerGas: z.coerce.string().optional().describe('Max fee per gas (hex wei)'),
    maxPriorityFeePerGas: z.coerce.string().optional().describe('Max priority fee per gas (hex wei)'),
    dependsOn: z.coerce.string().nullable().optional().describe('Optional dependency transaction id'),
    nonce: z.coerce.string().describe('Arbitrary nonce'),
    gasUsed: z.number().describe('Actual gas used by the transaction'),
    gasPayer: ThorAddressSchema.describe('Address that paid for gas (delegator)'),
    paid: z.coerce.string().describe('Total fee paid (hex wei)'),
    reward: z.coerce.string().describe('Authority reward attributed to this transaction (hex wei)'),
    reverted: z.boolean().describe('Whether the transaction was reverted'),
    origin: ThorAddressSchema.describe('Origin address that initiated the transaction'),
    outputs: z.array(IndexerTransactionOutputSchema),
  })
  .describe('A decoded VeChain transaction as returned by the VeWorld Indexer')

// List response for transactions endpoints (reuse generic Indexer wrapper)
export const IndexerTransactionListResponseSchema = indexerResponseSchema(IndexerTransactionSchema).describe(
  'List response for transactions endpoints',
)

// Params: GET /api/v1/transactions (by origin or delegator)
export const IndexerGetTransactionsParamsBaseSchema = z
  .object({
    origin: ThorAddressSchema.optional().describe('Origin address, the address that initiated the transaction'),
    delegator: ThorAddressSchema.optional().describe('Delegator address, the address that paid for the transaction'),
    after: z.number().optional().describe('Return txs at or after this Unix timestamp (seconds)'),
    before: z.number().optional().describe('Return txs at or before this Unix timestamp (seconds)'),
    expanded: z.boolean().optional().describe('Include decoded clause outputs/logs for richer results'),
  })
  .extend(paginationParamsSchema.shape)
  .describe('Base params for GET /api/v1/transactions (one of origin or delegator)')

export const IndexerGetTransactionsParamsSchema = IndexerGetTransactionsParamsBaseSchema.refine(
  data => !!data.origin || !!data.delegator,
  { message: "At least one of 'origin' or 'delegator' must be provided." },
).describe("Validated params for GET /api/v1/transactions requiring 'origin' or 'delegator'")

// Params: GET /api/v1/transactions/delegated (by delegator)
export const IndexerGetDelegatedTransactionsParamsSchema = z
  .object({
    delegator: ThorAddressSchema.describe('Delegator (gas payer) address'),
    after: z.number().optional().describe('Return txs at or after this Unix timestamp (seconds)'),
    before: z.number().optional().describe('Return txs at or before this Unix timestamp (seconds)'),
    expanded: z.boolean().optional().describe('Include decoded clause outputs/logs for richer results'),
  })
  .extend(paginationParamsSchema.shape)
  .describe('Params for GET /api/v1/transactions/delegated')

// Params: GET /api/v1/transactions/contract (by contract address)
export const IndexerGetContractTransactionsParamsSchema = z
  .object({
    contractAddress: ThorAddressSchema.describe('Contract address that the transaction interacted with'),
    after: z.number().optional().describe('Return txs at or after this Unix timestamp (seconds)'),
    before: z.number().optional().describe('Return txs at or before this Unix timestamp (seconds)'),
    expanded: z
      .boolean()
      .optional()
      .describe(
        'Include decoded clause outputs/logs for richer results, would recommend to set to true to get the full transaction details',
      ),
  })
  .extend(paginationParamsSchema.shape)
  .describe('Params for GET /api/v1/transactions/contract')

// ***************************** Stargate schemas *****************************/
// GET /api/v1/stargate/total-vtho-claimed
export const IndexerStargateRewardsTypeSchema = z
  .string()
  .describe('Optional rewards type filter. When omitted, total considers all Stargate rewards.')

export const IndexerGetStargateTotalVthoClaimedParamsSchema = z
  .object({
    blockNumber: ThorBlockNumberSchema.optional().describe(
      'Optional block number to query a historical snapshot. Defaults to latest.',
    ),
    rewardsType: IndexerStargateRewardsTypeSchema.optional().describe(
      'Type of rewards to include. If omitted, all Stargate rewards are counted. `LEGACY` refers to rewards claimed before the Hayabusa upgrade and is generally only useful for historical analysis. `DELEGATED` refers to rewards claimed after the Hayabusa upgrade and is the relevant type for current rewards.',
    ),
  })
  .describe('Params for GET /api/v1/stargate/total-vtho-claimed')

export const IndexerStargateTotalVthoClaimedSchema = z
  .string()
  .describe('Total VTHO claimed by Stargate users represented as a JSON string (API returns plain string).')

// GET /api/v1/stargate/total-vtho-generated
export const IndexerGetStargateTotalVthoGeneratedParamsSchema = z
  .object({
    blockNumber: ThorBlockNumberSchema.optional().describe(
      'Optional block number to query a historical snapshot. Defaults to latest.',
    ),
  })
  .describe('Params for GET /api/v1/stargate/total-vtho-generated')

export const IndexerStargateTotalVthoGeneratedSchema = z
  .string()
  .describe('Total VTHO generated by Stargate delegations represented as a JSON string (API returns plain string).')

// GET /api/v1/stargate/total-vtho-claimed/{account}
export const IndexerGetStargateTotalVthoClaimedByAccountParamsSchema = z
  .object({
    account: ThorAddressSchema.describe('Account address to query total VTHO claimed for'),
    rewardsType: IndexerStargateRewardsTypeSchema.optional().describe(
      'Optional rewards type filter. LEGACY refers to pre‑Hayabusa (bootstrap) rewards; DELEGATION refers to post‑Hayabusa delegated rewards. If omitted, all types are included.',
    ),
  })
  .describe('Params for GET /api/v1/stargate/total-vtho-claimed/{account}')

export const IndexerStargateTotalVthoClaimedByAccountSchema = z
  .string()
  .describe('Total VTHO claimed for an account as a string (API returns plain string).')

// GET /api/v1/stargate/total-vtho-claimed/{account}/{tokenId}
export const IndexerGetStargateTotalVthoClaimedByAccountTokenParamsSchema = z
  .object({
    account: ThorAddressSchema.describe('Account address to query'),
    tokenId: z
      .string()
      .regex(/^[0-9]+$/, 'tokenId must be a numeric string')
      .describe('Stargate token id to query'),
    rewardsType: IndexerStargateRewardsTypeSchema.optional().describe(
      'Optional rewards type filter. LEGACY refers to pre‑Hayabusa (bootstrap) rewards; DELEGATION refers to post‑Hayabusa delegated rewards. If omitted, all types are included.',
    ),
  })
  .describe('Params for GET /api/v1/stargate/total-vtho-claimed/{account}/{tokenId}')

export const IndexerStargateTotalVthoClaimedByAccountTokenSchema = z
  .string()
  .describe('Total VTHO claimed for an account+token as a string (API returns plain string).')

// Generic period-based Stargate metrics
export const IndexerStargatePeriodSchema = z
  .string()
  .transform(p => p.toUpperCase())
  .pipe(z.enum(['DAY', 'WEEK', 'MONTH', 'YEAR', 'ALL']))
  .describe('Time period granularity for Stargate metrics')
  .describe(
    'Time period granularity for Stargate metrics. Accepted values: DAY, WEEK, MONTH, YEAR, ALL (case-insensitive).',
  )

export const IndexerGetStargateMetricsByPeriodParamsSchema = z
  .object({
    period: IndexerStargatePeriodSchema.describe(
      'Time period to aggregate by; determines the granularity of the returned time‑series.',
    ),
  })
  .describe('Params for GET /api/v1/stargate/*/{period} metrics endpoints')

export const IndexerStargateMetricsByPeriodSchema = z
  .array(z.unknown())
  .describe(
    'Array of metric points for the requested period (exact shape varies per endpoint). Each element corresponds to one interval at the selected granularity.',
  )

// (dedicated total-vtho-generated schemas are defined above)

// ***************************** Stargate tokens *****************************/
export const IndexerGetStargateTokensParamsSchema = z
  .object({
    owner: ThorAddressSchema.optional().describe('Filter stargate nfts by current owner address'),
    manager: ThorAddressSchema.optional().describe('Filter stargate nft tokens by manager address'),
    tokenId: z
      .string()
      .regex(/^[0-9]+$/, 'tokenId must be a numeric string')
      .optional()
      .describe('Filter by specific tokenId'),
  })
  .extend(paginationParamsSchema.shape)
  .describe('Params for GET /api/v1/stargate/tokens')

export const IndexerStargateTokenSchema = z
  .object({
    tokenId: z.string().describe('Stargate token id (stringified number)'),
    level: z.string().describe('Stargate NFT level'),
    owner: ThorAddressSchema.describe('Current owner wallet address'),
    manager: ThorAddressSchema.nullable().describe(
      'Optional manager address, a manager is a wallet that can manage the token',
    ),
    delegationStatus: z
      .string()
      .describe('Delegation status for the token, can be "QUEUED", "ACTIVE", "EXITING" or "EXITED"'),
    validatorId: z
      .string()
      .nullable()
      .describe('Validator id if delegated, the validator that the token is delegated to'),
    totalRewardsClaimed: z
      .string()
      .describe('Total VTHO claimed (string format), the total amount of VTHO claimed by the token, post hayabusa'),
    totalBootstrapRewardsClaimed: z
      .string()
      .describe(
        'Total bootstrap VTHO claimed (string format), the total amount of VTHO claimed by the token, pre hayabusa',
      ),
    vetStaked: z.string().describe('VET staked amount (string format, wei)'),
    migrated: z.boolean().describe('Whether the token was migrated from old vechain nodes staking platform'),
    boosted: z.boolean().describe('Whether the token was boosted to skip the maturity period'),
  })
  .describe('Stargate token summary record')

// ***************************** Stargate token rewards *****************************/
export const IndexerStargateRewardPeriodSchema = z
  .string()
  .transform(p => p.toUpperCase())
  .pipe(z.enum(['CYCLE', 'DAY', 'WEEK', 'MONTH', 'YEAR', 'ALL']))
  .describe('Reward period type to aggregate rewards by')

export const IndexerGetStargateTokenRewardsParamsSchema = z
  .object({
    tokenId: z
      .string()
      .regex(/^[0-9]+$/, 'tokenId must be a numeric string')
      .describe('The tokenId to query for rewards'),
    validator: ThorAddressSchema.optional().describe('Optional validator address filter'),
    periodType: IndexerStargateRewardPeriodSchema.describe(
      'Reward period to aggregate by (CYCLE, DAY, WEEK, MONTH, YEAR, ALL)',
    ),
  })
  .extend(paginationParamsSchema.shape)
  .describe('Params for GET /api/v1/stargate/token-rewards/{tokenId}')

export const IndexerStargateTokenRewardSchema = z
  .object({
    tokenId: z.string().describe('Stargate token id (stringified number)'),
    cycle: z.number().optional().describe('Validator cycle number'),
    validator: ThorAddressSchema.describe('Validator address'),
    rewards: z.string().describe('Amount as string'),
    rewardPeriod: z
      .string()
      .describe('The type of reward period, can be "CYCLE", "DAY", "WEEK", "MONTH", "YEAR", "ALL"'),
    dayOfMonth: z.number().optional().describe('Day of month'),
    weekOfYear: z.number().optional().describe('Week of year'),
    month: z.number().optional().describe('Month, 1-12'),
    year: z.number().optional().describe('Year'),
  })
  .describe('A single period-based reward entry for a Stargate token')

// ***************************** Stargate NFT holders *****************************/
export const IndexerStargateNftHoldersByLevelSchema = z
  .object({
    Strength: z.number(),
    Thunder: z.number(),
    Mjolnir: z.number(),
    VeThorX: z.number(),
    StrengthX: z.number(),
    ThunderX: z.number(),
    MjolnirX: z.number(),
    Dawn: z.number(),
    Lightning: z.number(),
    Flash: z.number(),
  })
  .describe('Breakdown of total Stargate NFTs by level')

export const IndexerStargateNftHoldersTotalSchema = z
  .object({
    blockId: ThorBlockIdSchema,
    blockNumber: ThorBlockNumberSchema,
    blockTimestamp: z.number(),
    total: z.number(),
    byLevel: IndexerStargateNftHoldersByLevelSchema,
  })
  .describe('Total number of Stargate NFTs with block metadata and breakdown by level')

// Historic totals (running totals time-series)
export const IndexerHistoricRangeSchema = z
  .enum(['1-hour', '1-day', '1-week', '1-month', '1-year', 'all'])
  .describe('Preset time range to consider for historic totals: 1-hour | 1-day | 1-week | 1-month | 1-year | all')

export const IndexerStargateLevelSchema = z
  .enum([
    'Strength',
    'Thunder',
    'Mjolnir',
    'VeThorX',
    'StrengthX',
    'ThunderX',
    'MjolnirX',
    'Dawn',
    'Lightning',
    'Flash',
  ])
  .describe('Stargate NFT level')

export const IndexerHistoricPointSchema = z
  .object({
    timestamp: z.number(),
    value: z.coerce.number(),
  })
  .describe('Historic running-total point')

export const IndexerGetTotalVthoGeneratedHistoricParamsSchema = z
  .object({
    range: IndexerHistoricRangeSchema,
  })
  .describe('Params for GET /api/v1/stargate/total-vtho-generated/historic/{range}')

export const IndexerGetTotalVthoClaimedHistoricParamsSchema = z
  .object({
    range: IndexerHistoricRangeSchema,
  })
  .describe('Params for GET /api/v1/stargate/total-vtho-claimed/historic/{range}')

export const IndexerGetTotalVetStakedHistoricParamsSchema = z
  .object({
    range: IndexerHistoricRangeSchema,
    level: IndexerStargateLevelSchema.optional(),
  })
  .describe('Params for GET /api/v1/stargate/total-vet-staked/historic/{range}')

export const IndexerGetNftHoldersHistoricParamsSchema = z
  .object({
    range: IndexerHistoricRangeSchema,
    level: IndexerStargateLevelSchema.optional(),
  })
  .describe('Params for GET /api/v1/stargate/nft-holders/historic/{range}')

// Current total VET staked (with breakdown)
export const IndexerGetStargateTotalVetStakedParamsSchema = z
  .object({
    blockNumber: ThorBlockNumberSchema.optional().describe(
      'Optional block number to query a historical snapshot. Defaults to latest.',
    ),
  })
  .describe('Params for GET /api/v1/stargate/total-vet-staked')

export const IndexerStargateVetStakedByLevelSchema = z
  .object({
    Strength: z.number(),
    Thunder: z.number(),
    Mjolnir: z.number(),
    VeThorX: z.number(),
    StrengthX: z.number(),
    ThunderX: z.number(),
    MjolnirX: z.number(),
    Dawn: z.number(),
    Lightning: z.number(),
    Flash: z.number(),
  })
  .describe('Breakdown of total VET staked by Stargate NFT level')

export const IndexerStargateTotalVetStakedSchema = z
  .object({
    blockId: ThorBlockIdSchema,
    blockNumber: ThorBlockNumberSchema,
    blockTimestamp: z.number(),
    total: z.number(),
    byLevel: IndexerStargateVetStakedByLevelSchema,
  })
  .describe('Total VET staked in Stargate with block metadata and per-level breakdown')

// ***************************** VeVote historic proposals *****************************/
export const VevoteHistoricProposalSchema = z
  .object({
    id: z.string().describe('Unique identifier for the proposal made up of the contract address and the proposal id'),
    proposalId: z.string().describe('Legacy proposal id'),
    contractAddress: ThorAddressSchema.describe(
      'Legacy smart contract address, there are two main contracts for governance: 0xa6416a72f816d3a69f33d0814700545c8e3fe4be (Stakeholder Governance) and 0x7e54f0790153647ec0651c35ced28171adb5d44a (Steering Committee Governance)',
    ),
    createdDate: z.string().optional().describe('Date the proposal was created'),
    proposer: ThorAddressSchema.describe('Address of the proposer'),
    title: z.string().describe('Title of the proposal'),
    description: z.string().describe('Description of the proposal'),
    choices: z.array(z.string()).describe('Choices for the proposal'),
    createTime: z.number().describe('Unix timestamp when the proposal was created'),
    votingStartTime: z.number().describe('Unix timestamp when voting starts'),
    votingEndTime: z.number().describe('Unix timestamp when voting ends'),
    voteTallies: z.array(z.number()).describe('Per-choice vote tallies'),
    totalVotes: z.number().describe('Total number of votes cast'),
    blockId: ThorBlockIdSchema.describe('Block id of creation'),
    blockNumber: ThorBlockNumberSchema.describe('Block number of creation'),
    blockTimestamp: z.number().describe('Block timestamp (Unix seconds) of creation'),
  })
  .passthrough()
  .describe('Legacy VeVote/ VeChain governance historic proposal entry')

export const VevoteHistoricProposalsParamsSchema = z
  .object({
    proposalId: z.string().optional().describe('Filter by legacy proposal id'),
    contractAddress: ThorAddressSchema.optional().describe(
      'Filter by legacy smart contract address, there are two main contracts for governance: 0xa6416a72f816d3a69f33d0814700545c8e3fe4be (Stakeholder Governance) and 0x7e54f0790153647ec0651c35ced28171adb5d44a (Steering Committee Governance)',
    ),
    testProposals: z.boolean().default(false).describe('Include test proposals when true'),
  })
  .extend(paginationParamsSchema.shape)
  .describe('Params for GET /api/v1/vevote/historic-proposals')

export const VevoteHistoricProposalsResponseSchema = indexerResponseSchema(VevoteHistoricProposalSchema).describe(
  'List response for legacy VeVote historic proposals',
)

// ***************************** VeVote proposal results (current governance) *****************************/
export const VevoteSupportEnumSchema = z
  .enum(['AGAINST', 'FOR', 'ABSTAIN'])
  .describe('Support enum for the proposal, can be "AGAINST", "FOR" or "ABSTAIN"')

export const VevoteProposalResultSchema = z
  .object({
    blockNumber: ThorBlockNumberSchema,
    blockTimestamp: z.number(),
    proposalId: z.string(),
    support: VevoteSupportEnumSchema,
    totalWeight: z.number().describe('Total weight of votes for the support'),
    totalVoters: z.number().describe('Total number of voters'),
  })
  .describe('Aggregate voting result per support for a proposal or overall support')

export const VevoteProposalResultsParamsBaseSchema = z
  .object({
    proposalId: z.string().optional().describe('Proposal ID to filter by'),
    support: VevoteSupportEnumSchema.optional().describe('Filter by support'),
  })
  .extend(paginationParamsSchema.shape)
  .describe('Base params for /api/v1/vevote/proposal/results')

export const VevoteProposalResultsParamsSchema = VevoteProposalResultsParamsBaseSchema.refine(
  v => !!v.proposalId || !!v.support,
  { message: "At least one of 'proposalId' or 'support' must be provided." },
).describe('Validated params for /api/v1/vevote/proposal/results')

export const VevoteProposalResultsResponseSchema = indexerResponseSchema(VevoteProposalResultSchema).describe(
  'List response for VeVote proposal results',
)

// ***************************** Explorer: Block usage *****************************/
export const IndexerExplorerBlockUsageParamsSchema = z
  .object({
    startTimestamp: z.coerce
      .number()
      .describe('Starting timestamp (Unix seconds, inclusive; coerced from string if needed)'),
    endTimestamp: z.coerce
      .number()
      .describe('Ending timestamp (Unix seconds, inclusive; >= startTimestamp; coerced from string if needed)'),
  })
  .describe('Params for GET /api/v1/explorer/block-usage')

export const IndexerExplorerBlockUsageItemSchema = z
  .object({
    blockId: ThorBlockIdSchema,
    blockNumber: ThorBlockNumberSchema,
    blockTimestamp: z.number(),
    // API returns cumulative counters as JSON strings; coerce not used to preserve precision
    cumulativeGasLimit: z.string(),
    cumulativeGasUsed: z.string(),
    cumulativeBaseFeePerGas: z.string().optional(),
    cumulativeNumTransactions: z.string(),
    cumulativeNumClauses: z.string(),
  })
  .describe('Cumulative block usage counters at a point in time')

// ***************************** B3TR Actions *****************************/
// Reuse the SustainabilityProofV2Schema so all impact metric keys are explicitly typed and documented
export const IndexerB3TRActionProofSchema = SustainabilityProofV2Schema

export const IndexerB3TRActionSchema = z
  .object({
    blockNumber: ThorBlockNumberSchema,
    blockTimestamp: z.number(),
    blockId: ThorBlockIdSchema,
    appId: z.string().describe('App identifier (veBetterDaoId)'),
    distributor: ThorAddressSchema,
    amount: z.number(),
    receiver: ThorAddressSchema,
    proof: IndexerB3TRActionProofSchema.optional(),
  })
  .describe('Single B3TR action entry')

export const IndexerGetB3TRActionsForAppParamsSchema = z
  .object({
    appId: z.string().describe('veBetterDaoId of the app'),
    after: z.number().optional().describe('Return actions after (inclusive) this timestamp in milliseconds'),
    before: z.number().optional().describe('Return actions before (inclusive) this timestamp in milliseconds'),
    page: z.number().optional(),
    size: z.number().optional(),
    direction: z.enum(['ASC', 'DESC']).optional(),
  })
  .describe('Params for GET /api/v1/b3tr/actions/apps/{appId}')

export const IndexerB3TRActionsListResponseSchema = indexerResponseSchema(IndexerB3TRActionSchema).describe(
  'List response for B3TR actions for an app',
)

// Params for user actions endpoint
export const IndexerGetB3TRActionsForUserParamsSchema = z
  .object({
    wallet: ThorAddressSchema.describe('User wallet address (path parameter)'),
    appId: z.string().optional().describe('Optional app ID to filter interactions'),
    after: z.number().optional().describe('Return records after this time (Unix time in milliseconds)'),
    before: z.number().optional().describe('Return records before this time (Unix time in milliseconds)'),
    page: z.number().optional().describe('Zero-based page number'),
    size: z.number().optional().describe('Page size'),
    direction: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
  })
  .describe('Params for GET /api/v1/b3tr/actions/users/{wallet}')

// User overview (totals) endpoint
export const IndexerGetB3TRUserOverviewParamsSchema = z
  .object({
    wallet: ThorAddressSchema.describe('User wallet address (path parameter)'),
    roundId: z.number().optional().describe('Optional round id to filter by'),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in yyyy-MM-dd format (UTC)')
      .optional()
      .describe('Optional date (UTC) to filter by, format yyyy-MM-dd'),
  })
  .describe('Params for GET /api/v1/b3tr/actions/users/{wallet}/overview')

export const IndexerB3TRUserOverviewSchema = z
  .object({
    wallet: ThorAddressSchema,
    totalRewardAmount: z.number(),
    actionsRewarded: z.number(),
    totalImpact: ImpactSchema.optional().describe(
      'Aggregated sustainability impact totals across all rewarded actions for the user. Metrics include: carbon (g CO2), water (ml), energy (Wh), waste_mass (g), waste_items (count), waste_reduction (g), biodiversity (m² restored), people (beneficiaries), timber (g), plastic (g), education_time (minutes), trees_planted (count), calories_burned (kcal), clean_energy_production_wh (Wh), sleep_quality_percentage (%).',
    ),
    rankByReward: z.number().optional(),
    rankByActionsRewarded: z.number().optional(),
    uniqueXAppInteractions: z.array(z.string()).optional(),
  })
  .describe('B3TR user overview (totals and rankings)')

// User daily summaries
export const IndexerGetB3TRUserDailySummariesParamsSchema = z
  .object({
    wallet: ThorAddressSchema.describe('User wallet address (path parameter)'),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be in yyyy-MM-dd format (UTC)')
      .describe('Start date (UTC), format: yyyy-MM-dd'),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be in yyyy-MM-dd format (UTC)')
      .describe('End date (UTC), format: yyyy-MM-dd'),
    page: z.number().optional().describe('Zero-based page number'),
    size: z.number().optional().describe('Page size'),
    direction: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
  })
  .describe('Params for GET /api/v1/b3tr/actions/users/{wallet}/daily-summaries')

export const IndexerB3TRUserDailySummarySchema = z
  .object({
    entity: ThorAddressSchema.describe('Wallet address the daily summary pertains to'),
    date: z.string().describe('Date of the summary (UTC, yyyy-MM-dd)'),
    actionsRewarded: z.number().describe('Number of rewarded actions on this date'),
    totalRewardAmount: z.number().describe('Total B3TR rewarded on this date'),
    totalImpact: ImpactSchema.optional().describe('Aggregated sustainability impact totals for this date'),
  })
  .describe('Single daily summary entry for a user')

export const IndexerB3TRUserDailySummariesResponseSchema = indexerResponseSchema(
  IndexerB3TRUserDailySummarySchema,
).describe('List response for B3TR user daily summaries')

// B3TR app overview
export const IndexerGetB3TRAppOverviewParamsSchema = z
  .object({
    appId: z.string().describe('veBetterDaoId of the app'),
    roundId: z.number().optional().describe('Optional round id to filter by'),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in yyyy-MM-dd format (UTC)')
      .optional()
      .describe('Optional date (UTC) to filter by, format yyyy-MM-dd'),
  })
  .describe('Params for GET /api/v1/b3tr/actions/apps/{appId}/overview')

export const IndexerB3TRAppOverviewSchema = z
  .object({
    appId: z.string(),
    totalRewardAmount: z.number().describe('Total B3TR rewards on this app'),
    actionsRewarded: z.number().describe('Total number of rewarded actions on this app'),
    totalImpact: ImpactSchema.optional().describe('Aggregated sustainability impact totals on this app'),
    rankByReward: z.number().optional().describe('Ranking of the app by total reward amount'),
    rankByActionsRewarded: z.number().optional().describe('Ranking of the app by number of rewarded actions'),
    totalUniqueUserInteractions: z.number().optional().describe('Total unique users interacting with this app'),
  })
  .describe('B3TR app overview (totals and rankings)')

// User overview for a specific app
export const IndexerGetB3TRUserAppOverviewParamsSchema = z
  .object({
    wallet: ThorAddressSchema.describe('User wallet address (path parameter)'),
    appId: z.string().describe('App ID (veBetterDaoId) to query by'),
    roundId: z.number().optional().describe('Optional round id to filter by'),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in yyyy-MM-dd format (UTC)')
      .optional()
      .describe('Optional date (UTC) to filter by, format yyyy-MM-dd'),
  })
  .describe('Params for GET /api/v1/b3tr/actions/users/{wallet}/app/{appId}/overview')

export const IndexerB3TRUserAppOverviewSchema = z
  .object({
    wallet: ThorAddressSchema,
    appId: z.string(),
    totalRewardAmount: z.number(),
    actionsRewarded: z.number(),
    totalImpact: ImpactSchema.optional().describe('Aggregated sustainability impact totals for the user on this app'),
    rankByReward: z.number().optional(),
    rankByActionsRewarded: z.number().optional(),
  })
  .describe('B3TR user overview for a specific app (totals and rankings)')

// Global overview: GET /api/v1/b3tr/actions/global/overview
export const IndexerGetB3TRGlobalOverviewParamsSchema = z
  .object({
    roundId: z.number().optional().describe('Optional round id to filter by'),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in yyyy-MM-dd format (UTC)')
      .optional()
      .describe('Optional date (UTC) to filter by, format yyyy-MM-dd'),
  })
  .describe('Params for GET /api/v1/b3tr/actions/global/overview')

export const IndexerB3TRGlobalOverviewSchema = z
  .object({
    totalRewardAmount: z.number(),
    actionsRewarded: z.number(),
    totalImpact: ImpactSchema.optional().describe(
      'Aggregated sustainability impact totals across all rewarded actions globally.',
    ),
    totalUniqueUserInteractions: z.number().optional().describe('Total unique users interacting across all apps'),
  })
  .describe('Global B3TR action overview (totals)')

// Users leaderboard: GET /api/v1/b3tr/actions/leaderboards/users
export const IndexerB3TRLeaderboardSortBySchema = z
  .enum(['totalRewardAmount', 'actionsRewarded'])
  .describe('Sort users by totalRewardAmount or actionsRewarded')

export const IndexerGetB3TRUsersLeaderboardParamsSchema = z
  .object({
    roundId: z.number().optional().describe('Optional round id to filter by'),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in yyyy-MM-dd format (UTC)')
      .optional()
      .describe('Optional date (UTC) to filter by, format yyyy-MM-dd'),
    size: z.number().optional().describe('The results page size'),
    direction: z.enum(['ASC', 'DESC']).optional().describe('The sort direction'),
    sortBy: IndexerB3TRLeaderboardSortBySchema.optional().describe('The sort by field'),
    cursor: z.string().optional().describe('The pagination cursor returned by a previous request'),
  })
  .describe('Params for GET /api/v1/b3tr/actions/leaderboards/users')

export const IndexerB3TRUserLeaderboardEntrySchema = z
  .object({
    wallet: ThorAddressSchema,
    totalRewardAmount: z.number(),
    actionsRewarded: z.number(),
    totalImpact: ImpactSchema.optional().describe('Aggregated sustainability impact totals for this user'),
    vnsName: z.string().nullable().optional().describe('VNS name for the wallet address if available'),
  })
  .describe('Leaderboard entry for a user')

export const IndexerB3TRUsersLeaderboardResponseSchema = indexerResponseSchema(
  IndexerB3TRUserLeaderboardEntrySchema,
).describe('List response for users leaderboard')

// Apps leaderboard: GET /api/v1/b3tr/actions/leaderboards/apps
export const IndexerGetB3TRAppsLeaderboardParamsSchema = z
  .object({
    roundId: z.number().optional().describe('Optional round id to filter by'),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in yyyy-MM-dd format (UTC)')
      .optional()
      .describe('Optional date (UTC) to filter by, format yyyy-MM-dd'),
    size: z.number().optional().describe('The results page size'),
    direction: z.enum(['ASC', 'DESC']).optional().describe('The sort direction'),
    sortBy: IndexerB3TRLeaderboardSortBySchema.optional().describe('The sort by field'),
    cursor: z.string().optional().describe('The pagination cursor returned by a previous request'),
  })
  .describe('Params for GET /api/v1/b3tr/actions/leaderboards/apps')

export const IndexerB3TRAppLeaderboardEntrySchema = z
  .object({
    appId: z.string(),
    totalRewardAmount: z.number(),
    actionsRewarded: z.number(),
    totalImpact: ImpactSchema.optional().describe('Aggregated sustainability impact totals for this app'),
  })
  .describe('Leaderboard entry for an app')

export const IndexerB3TRAppsLeaderboardResponseSchema = indexerResponseSchema(
  IndexerB3TRAppLeaderboardEntrySchema,
).describe('List response for apps leaderboard')

// App users leaderboard: GET /api/v1/b3tr/actions/leaderboards/apps/{appId}
export const IndexerGetB3TRAppUsersLeaderboardParamsSchema = z
  .object({
    appId: z.string().describe('App ID (veBetterDaoId) to query by'),
    roundId: z.number().optional().describe('Optional round id to filter by'),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in yyyy-MM-dd format (UTC)')
      .optional()
      .describe('Optional date (UTC) to filter by, format yyyy-MM-dd'),
    size: z.number().optional().describe('The results page size'),
    direction: z.enum(['ASC', 'DESC']).optional().describe('The sort direction'),
    sortBy: IndexerB3TRLeaderboardSortBySchema.optional().describe('The sort by field'),
    cursor: z.string().optional().describe('The pagination cursor returned by a previous request'),
  })
  .describe('Params for GET /api/v1/b3tr/actions/leaderboards/apps/{appId}')

export const IndexerB3TRAppUserLeaderboardEntrySchema = z
  .object({
    appId: z.string(),
    user: ThorAddressSchema,
    totalRewardAmount: z.number(),
    actionsRewarded: z.number(),
    totalImpact: ImpactSchema.optional().describe('Aggregated sustainability impact totals for this user on the app'),
    vnsName: z.string().nullable().optional().describe('VNS name for the user address if available'),
  })
  .describe('Leaderboard entry for a user on a specific app')

export const IndexerB3TRAppUsersLeaderboardResponseSchema = indexerResponseSchema(
  IndexerB3TRAppUserLeaderboardEntrySchema,
).describe('List response for app users leaderboard')

// ***************************** Accounts overview *****************************/
export const AccountsTimeFrameEnumSchema = z
  .enum(['DAY', 'WEEK', 'MONTH', 'YEAR', 'ALL'])
  .describe('Time frame for accounts totals')

export const AccountsTotalsItemSchema = z
  .object({
    total: z.number(),
    timeFrame: AccountsTimeFrameEnumSchema,
    dayOfMonth: z.number().optional(),
    weekOfYear: z.number().optional(),
    month: z.number().optional(),
    year: z.number().optional(),
  })
  .describe('Accounts totals entry for a given timeframe bucket or ALL')

export const AccountsTotalsParamsSchema = z
  .object({
    timeFrame: AccountsTimeFrameEnumSchema.optional().describe('DAY, WEEK, MONTH, YEAR, ALL; omitted defaults to ALL'),
  })
  .extend(paginationParamsSchema.shape)
  .describe('Params for GET /api/v1/accounts/totals')

// B3TR Proposals Results: GET /api/v2/b3tr/proposals/results
export const ProposalStateSchema = z
  .enum([
    'Pending',
    'Active',
    'Canceled',
    'Defeated',
    'Succeeded',
    'Queued',
    'Executed',
    'DepositNotMet',
    'InDevelopment',
    'Completed',
  ])
  .describe('Possible states for a B3TR proposal')

export const ProposalVoteResultSchema = z
  .object({
    voters: z.number().int().nonnegative().describe('Number of voters'),
    totalWeight: NumericString.describe('Total voting weight as a string'),
    totalPower: NumericString.describe('Total voting power as a string'),
  })
  .describe('Vote result details for a proposal')

export const ProposalResultsSchema = z
  .object({
    forResult: ProposalVoteResultSchema.describe('Votes in favor'),
    againstResult: ProposalVoteResultSchema.describe('Votes against'),
    abstainResult: ProposalVoteResultSchema.describe('Abstain votes'),
  })
  .describe('Aggregated voting results for a proposal')

export const IndexerB3TRProposalEntrySchema = z
  .object({
    proposalId: NumericString.describe('Unique identifier for the proposal'),
    createdAtBlockNumber: z.number().int().nonnegative().describe('Block number when proposal was created'),
    startRoundId: z.number().int().nonnegative().describe('Round ID when proposal voting starts'),
    state: ProposalStateSchema.describe('Current state of the proposal'),
    description: z.string().describe('IPFS hash or description of the proposal'),
    results: ProposalResultsSchema.optional().describe('Voting results (only present if votes have been cast)'),
  })
  .describe('Details of a B3TR proposal')

export const IndexerGetB3TRProposalsResultsParamsSchema = z
  .object({
    proposalId: NumericString.optional().describe(
      'Optional: Filter by specific proposal ID. When provided, returns only the matching proposal. Use this to query a specific proposal directly instead of fetching all proposals.',
    ),
    page: z.number().int().nonnegative().optional().describe('Zero-based results page number (default: 0)'),
    size: z.number().int().positive().optional().describe('Results per page (default: 20)'),
    direction: z.enum(['ASC', 'DESC']).optional().describe('Sort direction (default: DESC)'),
    states: z.array(ProposalStateSchema).optional().describe('Filter by proposal states (optional)'),
  })
  .describe('Params for GET /api/v2/b3tr/proposals/results')

export const IndexerB3TRProposalsResultsResponseSchema = indexerResponseSchema(IndexerB3TRProposalEntrySchema).describe(
  'List response for B3TR proposals results',
)

// ***************************** Accounts Overview (Thor Accounts) *****************************/

// ***************************** Validators *****************************/
export const IndexerValidatorStatusSchema = z
  .enum(['NONE', 'QUEUED', 'ACTIVE', 'EXITED', 'EXITING'])
  .describe('Validator status')

export const IndexerValidatorsSortBySchema = z
  .enum([
    'validatorTvl',
    'totalTvl',
    'blockProbability',
    'delegatorTvl',
    // NFT level-specific APY sort keys
    'nft:Strength',
    'nft:Thunder',
    'nft:Mjolnir',
    'nft:VeThorX',
    'nft:StrengthX',
    'nft:ThunderX',
    'nft:MjolnirX',
    'nft:Dawn',
    'nft:Lightning',
    'nft:Flash',
  ])
  .describe(
    'Supported sort keys for validators, when sorting by nft:<Level> Yield for next cycle take into account ACTIVE and QUEUED validators',
  )

export const IndexerValidatorSchema = z
  .object({
    id: z.string().describe('Validator ID (address-like)'),
    blockId: ThorBlockIdSchema,
    blockNumber: ThorBlockNumberSchema,
    blockTimestamp: z.number(),
    endorser: ThorAddressSchema.describe(
      'Validator endorser address, this address is responsible for endorsing the validator',
    ),
    status: IndexerValidatorStatusSchema,
    vetStaked: z
      .number()
      .describe(
        'Total VET staked by the validator (endorsers VET staked + VET staked from delegations from stargate nfts)',
      ),
    validatorVetStaked: z.number().describe('VET staked by the validator directly'),
    delegatorVetStaked: z.number().describe('VET staked by the delegators (Stargate NFTs) of the validator'),
    queuedVetStaked: z
      .number()
      .describe('Total queued VET staked (endorsers VET staked + VET staked from delegations from stargate nfts)'),
    exitingVetStaked: z
      .number()
      .describe('Total exiting VET staked (endorsers VET staked + VET staked from delegations from stargate nfts)'),
    cycleEndBlock: z.number().describe('Block number of the end of the current cycle'),
    blockProbability: z
      .number()
      .describe(
        'Probability of the validator being selected to produce a block, based on the validator weight which is the total VET staked by the validator if no delegations, otherwise it is the total VET staked by the validator and the delegators (Stargate NFTs) multiplied by 2',
      ),
    blocksPerEpoch: z.number().describe('Number of blocks per epoch'),
    totalTvl: z
      .number()
      .describe('Total value locked (USD) of the validator (endorsers TVL + TVL from delegations from stargate nfts)'),
    validatorTvl: z.number().describe('Value locked (USD) of the validator directly'),
    delegatorTvl: z.number().describe('Value locked (USD) of the delegators (Stargate NFTs) of the validator'),
    tvlBasedYield: z
      .number()
      .describe(
        'Yield of the validator based on the value locked (USD) of the validator and the delegators (Stargate NFTs), yield is effected by block probability of the validator',
      ),
    nftYieldsNextCycle: z
      .object({
        Strength: z
          .number()
          .optional()
          .describe('Projected next-cycle percentage yield for the Strength Stargate NFT level'),
        Thunder: z
          .number()
          .optional()
          .describe('Projected next-cycle percentage yield for the Thunder Stargate NFT level'),
        Mjolnir: z
          .number()
          .optional()
          .describe('Projected next-cycle percentage yield for the Mjolnir Stargate NFT level'),
        VeThorX: z
          .number()
          .optional()
          .describe('Projected next-cycle percentage yield for the VeThorX Stargate NFT level'),
        StrengthX: z
          .number()
          .optional()
          .describe('Projected next-cycle percentage yield for the StrengthX Stargate NFT level'),
        ThunderX: z
          .number()
          .optional()
          .describe('Projected next-cycle percentage yield for the ThunderX Stargate NFT level'),
        MjolnirX: z
          .number()
          .optional()
          .describe('Projected next-cycle percentage yield for the MjolnirX Stargate NFT level'),
        Dawn: z.number().optional().describe('Projected next-cycle percentage yield for the Dawn Stargate NFT level'),
        Lightning: z
          .number()
          .optional()
          .describe('Projected next-cycle percentage yield for the Lightning Stargate NFT level'),
        Flash: z.number().optional().describe('Projected next-cycle percentage yield for the Flash Stargate NFT level'),
      })
      .describe('Projected next-cycle yields per Stargate NFT level, based on the block probability of the validator'),
    totalWeight: z
      .number()
      .describe(
        'Total weight of the validator, which is the total VET staked by the validator if no delegations, otherwise it is the total VET staked by the validator and the delegators (Stargate NFTs) multiplied by 2',
      ),
    online: z.boolean().describe('Whether the validator is online'),
    completedPeriods: z.number().describe('Number of completed periods of the validator'),
    startBlock: z.number().describe('Block number of the start of the current cycle'),
    cyclePeriodLength: z.number().describe('Length of the current cycle in blocks'),
    blocksPerYear: z.number().describe('Number of blocks per year'),
    percentageOffline: z.number().describe('Percentage of time the validator has been offline'),
    offlineBlocks: z.number().describe('Number of blocks the validator has been offline'),
  })
  .passthrough()
  .describe('Validator stats entry as returned by /api/v1/validators')

export const IndexerGetValidatorsParamsSchema = z
  .object({
    endorser: ThorAddressSchema.optional().describe('Filter by endorser address'),
    validatorId: ThorAddressSchema.optional().describe('Filter by validator ID'),
    status: IndexerValidatorStatusSchema.optional().describe('Filter by validator status'),
    sortBy: IndexerValidatorsSortBySchema.optional().describe('Sort field for the results'),
  })
  .extend(paginationParamsSchema.shape)
  .describe('Params for GET /api/v1/validators')

export const IndexerValidatorsResponseSchema =
  indexerResponseSchema(IndexerValidatorSchema).describe('List response for validators')

// ***************************** Validator Delegations *****************************/
export const IndexerDelegationStatusSchema = z
  .enum(['QUEUED', 'ACTIVE', 'EXITED', 'EXITING'])
  .describe('Delegation status')

export const IndexerDelegationSchema = z
  .object({
    id: z.string().describe('Unique delegation id'),
    validator: ThorAddressSchema.describe('Validator address the NFT is/was delegated to'),
    tokenId: z.string().describe('Stargate NFT token id (stringified number)'),
    owner: ThorAddressSchema.describe('Owner wallet address of the NFT at the time of delegation'),
    status: IndexerDelegationStatusSchema,
    tokenLevel: z
      .enum([
        'Strength',
        'Thunder',
        'Mjolnir',
        'VeThorX',
        'StrengthX',
        'ThunderX',
        'MjolnirX',
        'Dawn',
        'Lightning',
        'Flash',
      ])
      .describe('Stargate NFT level at the time of delegation'),
    stakedAmount: z.string().describe('Amount of VET staked (wei, as string)'),
    totalRewardsClaimed: z.string().describe('Total VTHO claimed (as string)'),
  })
  .describe('A delegation record as returned by /api/v1/validators/delegations')

export const IndexerGetValidatorDelegationsParamsSchema = z
  .object({
    validator: ThorAddressSchema.optional().describe('Filter delegations by validator address'),
    tokenId: z
      .string()
      .regex(/^[0-9]+$/, 'tokenId must be a numeric string')
      .optional()
      .describe('Filter by specific tokenId'),
    statuses: z
      .array(z.enum(['QUEUED', 'ACTIVE', 'EXITED', 'EXITING']))
      .max(5)
      .optional()
      .describe('Filter by one or more delegation statuses'),
  })
  .extend(paginationParamsSchema.shape)
  .describe('Params for GET /api/v1/validators/delegations')

export const IndexerValidatorDelegationsResponseSchema = indexerResponseSchema(IndexerDelegationSchema).describe(
  'List response for validator delegations',
)

// ***************************** Validator block rewards *****************************/
export const IndexerValidatorBlockStatusSchema = z
  .enum(['VALIDATED', 'MISSED'])
  .describe('Block result status for the validator')

export const IndexerValidatorBlockRewardSchema = z
  .object({
    blockId: ThorBlockIdSchema.describe('Block hash'),
    blockNumber: ThorBlockNumberSchema,
    blockTimestamp: z.number().describe('Block timestamp (Unix seconds)'),
    validator: ThorAddressSchema.describe('Validator address'),
    blockReward: z.string().describe('Base VTHO reward for producing the block (as string)'),
    priorityReward: z.string().describe('Priority fee rewards from users bidding in mempool (as string)'),
    total: z.string().describe('Sum of blockReward and priorityReward (as string)'),
    status: IndexerValidatorBlockStatusSchema,
    delegatorRewards: z
      .string()
      .describe(
        'Portion of total distributed to delegators (Stargate NFTs). Typically 70% when delegations are present.',
      ),
    validatorRewards: z.string().describe('Portion of total retained by the validator after delegator share.'),
  })
  .describe('Per-block reward breakdown for a validator')

export const IndexerGetValidatorBlockRewardsParamsSchema = z
  .object({
    blockNumber: ThorBlockNumberSchema.optional().describe('Optional specific block number to query'),
    validator: ThorAddressSchema.optional().describe('Optional validator address filter'),
    status: IndexerValidatorBlockStatusSchema.optional().describe("Filter by block status ('VALIDATED' or 'MISSED')"),
  })
  .extend(paginationParamsSchema.shape)
  .describe('Params for GET /api/v1/validators/blocks')

export const IndexerValidatorBlockRewardsResponseSchema = indexerResponseSchema(
  IndexerValidatorBlockRewardSchema,
).describe('List response for validator block rewards')

// ***************************** Validator missed blocks percentage *****************************/
export const IndexerGetValidatorMissedPercentageParamsSchema = z
  .object({
    validator: ThorAddressSchema.describe('Validator address (path parameter)'),
    startBlock: ThorBlockNumberSchema.describe('Start block, inclusive'),
    endBlock: ThorBlockNumberSchema.optional().describe('Optional end block, inclusive; defaults to best/latest'),
  })
  .describe('Params for GET /api/v1/validators/blocks/missed/{validator}')

export const IndexerValidatorMissedPercentageSchema = z
  .number()
  .describe('Percentage of missed blocks in the given range (0..100, not a decimal)')

// B3TR Proposal Comments: GET /api/v1/b3tr/proposals/{proposalId}/comments
export const ProposalSupportSchema = z.enum(['FOR', 'AGAINST', 'ABSTAIN']).describe('Vote support type')

export const IndexerB3TRProposalCommentSchema = z
  .object({
    blockNumber: z.number().int().nonnegative().describe('Block number when the comment was made'),
    blockTimestamp: z.number().int().nonnegative().describe('Unix timestamp when the comment was made'),
    voter: ThorAddressSchema.describe('Address of the voter who made the comment'),
    proposalId: NumericString.describe('Proposal ID this comment is for'),
    support: ProposalSupportSchema.describe('Vote type (FOR, AGAINST, or ABSTAIN)'),
    weight: NumericString.describe('Voting weight as a string'),
    power: NumericString.describe('Voting power as a string'),
    reason: z.string().describe('The comment/reason text provided by the voter'),
  })
  .describe('A comment on a B3TR proposal')

export const IndexerGetB3TRProposalCommentsParamsSchema = z
  .object({
    proposalId: NumericString.describe('Proposal ID to fetch comments for'),
    support: ProposalSupportSchema.optional().describe('Filter by support type (FOR, AGAINST, or ABSTAIN)'),
    page: z.number().int().nonnegative().optional().describe('Zero-based results page number (default: 0)'),
    size: z.number().int().positive().optional().describe('Results per page (default: 20)'),
    direction: z.enum(['ASC', 'DESC']).optional().describe('Sort direction (default: DESC)'),
  })
  .describe('Params for GET /api/v1/b3tr/proposals/{proposalId}/comments')

export const IndexerB3TRProposalCommentsResponseSchema = indexerResponseSchema(
  IndexerB3TRProposalCommentSchema,
).describe('List response for B3TR proposal comments')
