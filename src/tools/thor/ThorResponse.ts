import { z } from 'zod'
import { ThorNetworkType } from '../../config/network'

/**
 * Schema for Thor tool response
 */
const ThorStructuredOutputSchema = z.object({
  ok: z.boolean(),
  network: z.nativeEnum(ThorNetworkType),
  data: z.unknown().optional(),
  error: z.string().optional(),
})

/**
 * Interface for Thor tool response
 */
const ThorToolResponseSchema = z.object({
  content: z.array(z.object({ type: z.string(), text: z.string() })),
  structuredContent: ThorStructuredOutputSchema,
})

/**
 * Type for Thor tool response
 */
type ThorToolResponseType = z.infer<typeof ThorToolResponseSchema>

export { type ThorToolResponseType, ThorToolResponseSchema, ThorStructuredOutputSchema }
