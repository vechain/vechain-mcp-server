import { z } from 'zod'
import { getThorClient, getThorNetworkType, ThorNetworkType } from '@/services/thor'
import { logger } from '@/utils/logger'

/**
 * Generic function to create an Indexer structured output schema with typed data
 * @param dataSchema - Zod schema for the data field
 * @returns Zod schema for Indexer structured output
 */
function createIndexerStructuredOutputSchema<T extends z.ZodType>(dataSchema: T) {
  return z
    .object({
      ok: z.boolean(),
      network: z.nativeEnum(ThorNetworkType),
      data: dataSchema.optional().nullable(),
      error: z.string().optional(),
    })
    .describe('VeWorld Indexer structured output payload used by MCP tools')
}

/**
 * Generic function to create a Indexer tool response schema with typed data
 * @param dataSchema - Zod schema for the data field
 * @returns Zod schema for Indexer tool response
 */
function createIndexerToolResponseSchema<T extends z.ZodType>(dataSchema: T) {
  return z
    .object({
      content: z.array(z.object({ type: z.string(), text: z.string() })),
      structuredContent: createIndexerStructuredOutputSchema<T>(dataSchema),
    })
    .describe('MCP tool response wrapper for VeWorld Indexer queries')
}

/**
 * Create a Indexer tool response with an error message
 * @param message - The error message
 * @returns A Indexer tool response with an error message
 */
function indexerErrorResponse(message: string) {
  logger.warn(message)
  return {
    content: [{ type: 'text', text: message }],
    structuredContent: {
      ok: false,
      network: getThorNetworkType(),
      error: message,
      data: null,
    },
  }
}

export { indexerErrorResponse, createIndexerStructuredOutputSchema, createIndexerToolResponseSchema }

/**
 * Feature gate for validator-related Indexer endpoints which are not
 * available on mainnet until after the Hayabusa upgrade.
 * To override on mainnet for testing, set ENABLE_VALIDATOR_ENDPOINTS_ON_MAINNET=true
 */
const HAYABUSA_ACTIVATION_BLOCK: Record<ThorNetworkType, number | null> = {
  [ThorNetworkType.MAINNET]: 23423040, // available on mainnet
  [ThorNetworkType.TESTNET]: 23230440, // available on testnet
  [ThorNetworkType.SOLO]: null,
}

export async function validatorEndpointsAvailable(): Promise<boolean> {
  const network = getThorNetworkType()
  const activation = HAYABUSA_ACTIVATION_BLOCK[network]
  // If explicitly allowed (0) or SOLO, return true
  if (activation === 0) return true
  // If activation is unknown/null, conservatively disable
  if (activation == null) return false
  try {
    const best = (await getThorClient().blocks.getBlockCompressed('best')) as any
    const bestNumber = typeof best?.number === 'number' ? best.number : Number(best?.number)
    if (Number.isFinite(bestNumber)) {
      return bestNumber >= activation
    }
    return false
  } catch {
    return false
  }
}

export function validatorEndpointsUnavailableMessage(): string {
  return 'Validator endpoints are not available on mainnet until after the Hayabusa upgrade. Switch to testnet or set ENABLE_VALIDATOR_ENDPOINTS_ON_MAINNET=true to override (use with caution).'
}
