import { z } from 'zod'
import { indexerResponseSchema } from '@/services/veworld-indexer'
import {
  HexStringSchema,
  ThorAddressSchema,
  ThorBlockIdSchema,
  ThorBlockNumberSchema,
  ThorTransactionIdSchema,
} from '../thor'

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
).describe("Validated parameters for GET /api/v1/transfers")

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
    
export const IndexerTransferSchema = z.object({
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
}).describe('A normalized transfer event (VET, fungible token, or NFT) returned by the Indexer')

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
    expiration: z
      .number()
      .describe('Number of blocks after blockRef before the transaction expires'),
    clauses: z.array(IndexerTransactionClauseSchema).describe('Clauses executed by this transaction'),
    gasPriceCoef: z
      .number()
      .optional()
      .describe('Gas price coefficient used in effective gas price calculation'),
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
    expanded: z.boolean().optional().describe('Include decoded clause outputs/logs for richer results, would recommend to set to true to get the full transaction details'),
  })
  .extend(paginationParamsSchema.shape)
  .describe('Params for GET /api/v1/transactions/contract')

// ***************************** Stargate schemas *****************************/
// GET /api/v1/stargate/total-vtho-claimed
export const IndexerStargateRewardsTypeSchema = z
  .string()
  .describe(
    'Optional rewards type filter. When omitted, total considers all Stargate rewards.',
  )

export const IndexerGetStargateTotalVthoClaimedParamsSchema = z
  .object({
    blockNumber: ThorBlockNumberSchema.optional().describe(
      'Optional block number to query a historical snapshot. Defaults to latest.',
    ),
    rewardsType: IndexerStargateRewardsTypeSchema.optional().describe(
      'Type of rewards to include. If omitted, all Stargate rewards are counted. `LEGACY` refers to rewards claimed before the Hayabusa upgrade and is generally only useful for historical analysis. `DELEGATED` refers to rewards claimed after the Hayabusa upgrade and is the relevant type for current rewards.'
    ),    
  })
  .describe('Params for GET /api/v1/stargate/total-vtho-claimed')

export const IndexerStargateTotalVthoClaimedSchema = z
  .string()
  .describe(
    'Total VTHO claimed by Stargate users represented as a JSON string (API returns plain string).',
  )

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
  .describe(
    'Total VTHO generated by Stargate delegations represented as a JSON string (API returns plain string).',
  )

// Generic period-based Stargate metrics
export const IndexerStargatePeriodSchema = z
  .string()
  .transform(p => p.toUpperCase())
  .pipe(z.enum(['DAY', 'WEEK', 'MONTH', 'YEAR', 'ALL'])).describe('Time period granularity for Stargate metrics')
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
    manager: ThorAddressSchema.nullable().describe('Optional manager address, a manager is a wallet that can manage the token'),
    delegationStatus: z.string().describe('Delegation status for the token, can be "QUEUED", "ACTIVE", "EXITING" or "EXITED"'),
    validatorId: z.string().nullable().describe('Validator id if delegated, the validator that the token is delegated to'),
    totalRewardsClaimed: z.string().describe('Total VTHO claimed (string format), the total amount of VTHO claimed by the token, post hayabusa'),
    totalBootstrapRewardsClaimed: z
      .string()
      .describe('Total bootstrap VTHO claimed (string format), the total amount of VTHO claimed by the token, pre hayabusa'),
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
    rewardPeriod: z.string().describe('The type of reward period, can be "CYCLE", "DAY", "WEEK", "MONTH", "YEAR", "ALL"'),
    dayOfMonth: z.number().optional().describe('Day of month'),
    weekOfYear: z.number().optional().describe('Week of year'),
    month: z.number().optional().describe('Month, 1-12'),
    year: z.number().optional().describe('Year'),
  })
  .describe('A single period-based reward entry for a Stargate token')

// ***************************** Stargate NFT holders *****************************/
export const IndexerStargateNftHoldersTotalSchema = z
  .string()
  .describe('Total number of Stargate NFTs held by users represented as a JSON string (API returns plain string)')

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
    value: z.number(),
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
