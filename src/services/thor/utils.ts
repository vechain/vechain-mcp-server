import { z } from 'zod'
import { logger } from '@/utils/logger'
import { getThorNetworkType, ThorNetworkType } from './config'

/**
 * Generic function to create a Thor structured output schema with typed data
 * @param dataSchema - Zod schema for the data field
 * @returns Zod schema for Thor structured output
 */
function createThorStructuredOutputSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    ok: z.boolean(),
    network: z.nativeEnum(ThorNetworkType),
    data: dataSchema.optional().nullable(),
    error: z.string().optional(),
  })
}

/**
 * Generic function to create a Thor tool response schema with typed data
 * @param dataSchema - Zod schema for the data field
 * @returns Zod schema for Thor tool response
 */
function createThorToolResponseSchema<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    content: z.array(z.object({ type: z.string(), text: z.string() })),
    structuredContent: createThorStructuredOutputSchema<T>(dataSchema),
  })
}

/**
 * Create a Thor tool response with an error message
 * @param message - The error message
 * @returns A Thor tool response with an error message
 */
function thorErrorResponse(message: string) {
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

export { thorErrorResponse, createThorStructuredOutputSchema, createThorToolResponseSchema }
