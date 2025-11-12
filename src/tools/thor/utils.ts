import { logger } from '@/utils/logger'
import { getThorNetworkType } from './config'

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

export { thorErrorResponse }
