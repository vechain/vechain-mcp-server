import type { AbiParameter } from 'viem'
import { z } from 'zod'
import { bigint } from 'zod/v4'

/**
 * Schema for Thor block revision
 */
export const ThorBlockRevisionSchema = z
  .string()
  .regex(
    /^(best|finalized|next|justified|0x[a-fA-F0-9]+|\d+)$/,
    'Revision must be "best", "finalized", "next", "justified", a block number, or a 0x-prefixed hash.',
  )
  .describe('The block number, label or id to retrieve')

// TODO: Define a schema for the compressed block
export const ThorBlockCompressedSchema = z.unknown()

/**
 * Schema for Thor transaction id
 */
export const ThorTransactionIdSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, 'Transaction hash must be a 0x-prefixed hash of 64 hex characters.')
  .describe('The transaction hash to retrieve')

// TODO: Define a schema for the transaction
export const ThorTransactionSchema = z.unknown()

/**
 * Schema for Thor account address
 */
export const ThorAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]+$/, 'Account address must be a 0x-prefixed hash.')
  .min(42)
  .max(42)
  .describe('The account address to retrieve') as z.ZodType<`0x${string}`>

/**
 * Schema for Thor hex string
 */
export const HexStringSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]*$/, 'Must be a valid hex string starting with 0x')
  .min(2)
  .describe('A valid hex string starting with 0x') as z.ZodType<`0x${string}`>

/**
 * Schema for Thor raw event
 */
export const ThorRawEventSchema = z.object({
  address: ThorAddressSchema.describe('The address of the contract that emitted the event'),
  topics: z.array(HexStringSchema).describe('The topics to decode as hex string starting with 0x'),
  data: HexStringSchema.describe('The data to decode as hex string starting with 0x'),
})

export const AbiParameterSchema = z.object({
  internalType: z.string(),
  name: z.string(),
  type: z.string(),
}) as z.ZodType<AbiParameter>

export const ThorDecodedEventSchema = z.object({
  address: ThorAddressSchema,
  signature: z.string(),
  signatureHash: z.string(),
  args: z.record(z.string(), z.coerce.string()),
  name: z.string(),
  inputs: z.array(AbiParameterSchema),
})

/**
 * Schema for Thor transfer
 */
export const ThorTransferSchema = z.object({
  sender: ThorAddressSchema.describe('The sender addressof the transfer'),
  recipient: ThorAddressSchema.describe('The recipient address of the transfer'),
  amount: z.string().describe('The amount of the transfer'),
})

/**
 * Schema for Thor transaction output
 */
export const ThorTransactionOutputSchema = z.object({
  contractAddress: z.string().nullable().describe('The contract address of the output'),
  events: z.array(ThorRawEventSchema).describe('A list of events emitted by the contract'),
  transfers: z.array(ThorTransferSchema).describe('A list of transfers made by the transaction'),
})

/**
 * Schema for Thor transaction clause
 */
export const ThorTransactionClauseSchema = z.object({
  to: z.string().nullable().describe('The to address of the clause'),
  value: z.union([z.string(), z.number()]).describe('The value of the clause'),
  data: z.string(),
  comments: z.string().optional(),
  abi: z.string().optional(),
})

/** 
 * Schema for Thor expanded block transaction details
 */
export const ThorTransactionsExpandedBlockDetailSchema = z.object({
  id: HexStringSchema.describe('The id of the transaction'),
  type: z.number().optional(),
  chainTag: z.string().describe('The chain tag of the transaction'),
  blockRef: HexStringSchema.describe('The block reference of the transaction'),
  expiration: z.number(),
  clauses: ThorTransactionClauseSchema.array(),
  maxFeePerGas: z.string().optional().describe('The max fee per gas of the transaction'),
  maxPriorityFeePerGas: z.string().optional().describe('The max priority fee per gas of the transaction'),
  gasPriceCoef: z.number().optional(),
  gas: z.number().describe('The gas of the transaction'),
  origin: ThorAddressSchema,
  delegator: ThorAddressSchema.nullable().describe('The delegator of the transaction'),
  nonce: HexStringSchema,
  dependsOn: HexStringSchema.nullable(),
  size: z.number(),
  gasUsed: z.number(),
  gasPayer: ThorAddressSchema,
  paid: z.bigint().describe('The paid amount of the transaction'),
  reward: z.bigint().describe('The reward amount of the transaction'),
  reverted: z.boolean(),
  outputs: ThorTransactionOutputSchema.array(),
})

export const ThorBlockTransactionListSchema = z.array(ThorTransactionsExpandedBlockDetailSchema)

