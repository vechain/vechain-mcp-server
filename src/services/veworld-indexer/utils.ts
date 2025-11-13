import { z } from 'zod'
import { getThorNetworkType, ThorNetworkType } from '@/services/thor'
import { logger } from '@/utils/logger'

/**
 * Generic function to create an Indexer structured output schema with typed data
 * @param dataSchema - Zod schema for the data field
 * @returns Zod schema for Indexer structured output
 */
function createIndexerStructuredOutputSchema<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    ok: z.boolean(),
    network: z.nativeEnum(ThorNetworkType),
    data: dataSchema.optional().nullable(),
    error: z.string().optional(),
  })
}

/**
 * Generic function to create a Indexer tool response schema with typed data
 * @param dataSchema - Zod schema for the data field
 * @returns Zod schema for Indexer tool response
 */
function createIndexerToolResponseSchema<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    content: z.array(z.object({ type: z.string(), text: z.string() })),
    structuredContent: createIndexerStructuredOutputSchema<T>(dataSchema),
  })
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
