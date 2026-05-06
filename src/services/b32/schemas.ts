import { z } from 'zod'

/**
 * Schema for ABI input parameter
 */
export const AbiInputSchema = z.object({
  name: z.string().describe('Parameter name'),
  type: z.string().describe('Parameter type (e.g., address, uint256)'),
  indexed: z.boolean().optional().describe('Whether the parameter is indexed (for events)'),
  internalType: z.string().optional().describe('Internal type'),
  components: z.array(z.any()).optional().describe('Components for tuple types'),
})

/**
 * Schema for ABI output parameter
 */
export const AbiOutputSchema = z.object({
  name: z.string().describe('Output name'),
  type: z.string().describe('Output type'),
  internalType: z.string().optional().describe('Internal type'),
  components: z.array(z.any()).optional().describe('Components for tuple types'),
})

/**
 * Schema for a single ABI item (event, function, etc.)
 */
export const AbiItemSchema = z
  .object({
    type: z.enum(['event', 'function', 'constructor', 'fallback', 'receive', 'error']).describe('ABI item type'),
    name: z.string().optional().describe('Name of the event/function'),
    inputs: z.array(AbiInputSchema).optional().describe('Input parameters'),
    outputs: z.array(AbiOutputSchema).optional().describe('Output parameters (for functions)'),
    stateMutability: z.enum(['pure', 'view', 'nonpayable', 'payable']).optional().describe('State mutability'),
    anonymous: z.boolean().optional().describe('Whether the event is anonymous'),
  })
  .passthrough()

/**
 * Schema for a complete ABI (array of ABI items)
 */
export const AbiSchema = z.array(AbiItemSchema).describe('Contract ABI')

/**
 * Schema for B32 signature lookup response
 */
export const B32SignatureLookupResultSchema = z.object({
  signature: z.string().describe('The signature hash that was looked up'),
  found: z.boolean().describe('Whether an ABI was found for the signature'),
  abi: AbiSchema.optional().describe('The ABI if found'),
  matchingItems: z
    .array(
      z.object({
        type: z.string().describe('Type of ABI item (event, function, etc.)'),
        name: z.string().optional().describe('Name of the item'),
        signature: z.string().optional().describe('Human-readable signature'),
      }),
    )
    .optional()
    .describe('Summary of matching ABI items'),
})

/**
 * Schema for hex signature (4 bytes for functions, 32 bytes for events)
 */
export const SignatureHashSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]+$/, 'Signature must be a 0x-prefixed hex string')
  .describe('Signature hash (0x-prefixed)')

// Type exports
export type AbiInput = z.infer<typeof AbiInputSchema>
export type AbiOutput = z.infer<typeof AbiOutputSchema>
export type AbiItem = z.infer<typeof AbiItemSchema>
export type Abi = z.infer<typeof AbiSchema>
export type B32SignatureLookupResult = z.infer<typeof B32SignatureLookupResultSchema>

