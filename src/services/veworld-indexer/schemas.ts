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
})

// ***************************** Transfer schemas *****************************/

export const IndexerGetTransfersParamsSchema = z
  .object({
    address: ThorAddressSchema.optional(),
    tokenAddress: ThorAddressSchema.optional(),
  })
  .extend(paginationParamsSchema.shape)
  .refine(data => data.address || data.tokenAddress, {
    message: "At least one of 'address' or 'tokenAddress' must be provided.",
  })

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
