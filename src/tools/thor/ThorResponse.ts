import { z } from 'zod'
import { ThorNetworkType } from '../../config/network'

/**
 * Interface for Thor tool response
 */
interface ThorToolResponse<T = unknown> {
  content: { type: string; text: string }[]
  structuredContent: z.infer<typeof ThorStructuredOutputSchema>
}

/**
 * Schema for Thor tool response
 */
const ThorStructuredOutputSchema = z.object({
  ok: z.boolean(),
  network: z.nativeEnum(ThorNetworkType),
  data: z.unknown().optional(),
  error: z.string().optional(),
})

export { type ThorToolResponse, ThorStructuredOutputSchema }
