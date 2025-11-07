import type { AbiParameter } from 'viem'
import { z } from 'zod'

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

/**
 * Schema for Thor transaction id
 */
export const ThorTransactionIdSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, 'Transaction hash must be a 0x-prefixed hash of 64 hex characters.')
  .describe('The transaction hash to retrieve')

/**
 * Schema for Thor account address
 */
export const ThorAddresstSchema = z
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
  address: ThorAddresstSchema.describe('The address of the contract that emitted the event'),
  topics: z.array(HexStringSchema).describe('The topics to decode as hex string starting with 0x'),
  data: HexStringSchema.describe('The data to decode as hex string starting with 0x'),
})

export const AbiParameterSchema = z.object({
  internalType: z.string(),
  name: z.string(),
  type: z.string(),
}) as z.ZodType<AbiParameter>

export const ThorDecodedEventSchema = z.object({
  address: ThorAddresstSchema,
  signature: z.string(),
  signatureHash: z.string(),
  args: z.record(z.string(), z.coerce.string()),
  name: z.string(),
  inputs: z.array(AbiParameterSchema),
})
