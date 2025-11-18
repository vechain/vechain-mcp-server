import { z } from 'zod'
import {
  HexStringSchema,
  ThorAddressSchema,
  ThorBlockIdSchema,
  ThorBlockNumberSchema,
  ThorTransactionIdSchema,
} from '../thor'

// ***************************** Indexer API params schemas *****************************/

const paginationParamsSchema = z.object({
  page: z.number().optional(),
  size: z.number().optional(),
  direction: z.enum(['ASC', 'DESC']).optional(),
}).describe('Pagination parameters for Indexer endpoints')

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
      address: ThorAddressSchema.describe('Wallet address'),
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
  value: z.coerce.bigint(),
  tokenAddress: ThorAddressSchema.nullable().optional(),
  topics: z.array(HexStringSchema),
  tokenId: z.string().nullable().optional(),
  eventType: z.enum(['FUNGIBLE_TOKEN', 'NFT', 'VET']),
}).describe('A normalized transfer event (VET, fungible token, or NFT) returned by the Indexer')


