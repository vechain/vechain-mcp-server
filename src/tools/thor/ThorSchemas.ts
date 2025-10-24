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
  .regex(/^0x[a-fA-F0-9]+$/, 'Transaction hash must be a 0x-prefixed hash.')
  .describe('The transaction hash to retrieve')
