import { z } from 'zod'
import { ThorNetworkType } from '../../config/network'

/**
 * Generic function to create a Thor structured output schema with typed data
 * @param dataSchema - Zod schema for the data field
 * @returns Zod schema for Thor structured output
 */
const createThorStructuredOutputSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    ok: z.boolean(),
    network: z.nativeEnum(ThorNetworkType),
    data: dataSchema.optional(),
    error: z.string().optional(),
  })

/**
 * Generic function to create a Thor tool response schema with typed data
 * @param dataSchema - Zod schema for the data field
 * @returns Zod schema for Thor tool response
 */
const createThorToolResponseSchema = <T extends z.ZodType>(dataSchema: T) => {
  const structuredOutputSchema = createThorStructuredOutputSchema(dataSchema)

  return z.object({
    content: z.array(z.object({ type: z.string(), text: z.string() })),
    structuredContent: structuredOutputSchema,
  })
}

export { createThorStructuredOutputSchema, createThorToolResponseSchema }
