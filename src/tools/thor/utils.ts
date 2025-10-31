import { getThorNetworkConfig } from '../../config/network'
import type { ThorToolResponse } from './ThorResponse'

/**
 * Create a Thor tool response with an error message
 * @param message - The error message
 * @returns A Thor tool response with an error message
 */
function thorErrorResponse(message: string): ThorToolResponse {
  return {
    content: [{ type: 'text', text: message }],
    structuredContent: {
      ok: false,
      network: getThorNetworkConfig().type,
      error: message,
    },
  }
}

export { thorErrorResponse }
