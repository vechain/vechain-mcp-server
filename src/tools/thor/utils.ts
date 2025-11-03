import { getThorNetworkType } from '../../config/network'
import type { ThorToolResponseType } from './ThorResponse'

/**
 * Create a Thor tool response with an error message
 * @param message - The error message
 * @returns A Thor tool response with an error message
 */
function thorErrorResponse(message: string): ThorToolResponseType {
  return {
    content: [{ type: 'text', text: message }],
    structuredContent: {
      ok: false,
      network: getThorNetworkType(),
      error: message,
    },
  }
}

export { thorErrorResponse }
