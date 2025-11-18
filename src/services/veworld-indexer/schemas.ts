import { z } from 'zod'
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

