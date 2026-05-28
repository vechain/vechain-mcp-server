import { z } from 'zod'
import { ThorAddressSchema } from '@/services/thor'

/**
 * Hex-string clause as expected by VeChain wallets (VeWorld, dApp Kit,
 * vechain-kit). `value` is hex (`0x...`) so the agent doesn't lose precision
 * for native VET amounts; `data` is the encoded calldata for the contract
 * call (or `0x` for plain transfers).
 */
export const ClauseSchema = z.object({
  to: z.string().describe('Recipient or contract address (0x...).'),
  value: z.string().describe('Hex-encoded VET value attached (e.g. "0x0").'),
  data: z.string().describe('Hex-encoded calldata, or "0x" for plain transfers.'),
  comment: z
    .string()
    .optional()
    .describe('Optional human-readable note shown by the wallet at signing time.'),
})

export const BuildResultDataSchema = z.object({
  network: z.string(),
  clauses: z.array(ClauseSchema),
  summary: z.string(),
  gasHint: z.number().int().optional(),
})

export const BuildResultOutputSchema = z.object({
  ok: z.boolean(),
  network: z.string(),
  data: BuildResultDataSchema.nullable().optional(),
  error: z.string().optional(),
})

export type Clause = z.infer<typeof ClauseSchema>
export type BuildResultData = z.infer<typeof BuildResultDataSchema>
export type BuildResultOutput = z.infer<typeof BuildResultOutputSchema>

export type BuildResponse = {
  content: Array<{ type: 'text'; text: string }>
  structuredContent: BuildResultOutput
}

/**
 * Wallet address: every build* tool requires it because the agent loop runs
 * server-side and the connected wallet lives on the mobile client.
 */
export const WalletAddressInputSchema = ThorAddressSchema.describe(
  'Connected wallet address (0x...). The clauses will be built FROM this account; the wallet client signs and broadcasts them after the agent emits them.',
)

/**
 * Build a successful tool response from a `BuildResultData` payload.
 */
export function buildSuccessResponse(data: BuildResultData): BuildResponse {
  const result = { ok: true, network: data.network, data }
  return {
    content: [{ type: 'text', text: JSON.stringify(result) }],
    structuredContent: result,
  }
}

/**
 * Build an error tool response. Used for input validation, simulation
 * failures, and unexpected exceptions inside the handler.
 */
export function buildErrorResponse(network: string, error: string): BuildResponse {
  const result = { ok: false, network, error }
  return {
    content: [{ type: 'text', text: JSON.stringify(result) }],
    structuredContent: result,
  }
}
