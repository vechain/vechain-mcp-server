import { z } from 'zod'
import { getCurrentRound, getNetworkType } from '@/services/vebetterdao-contracts'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

const OutputSchema = z.object({
  ok: z.boolean(),
  network: z.string(),
  currentRoundId: z.number().optional().describe('Current VeBetterDAO round ID'),
  error: z.string().optional(),
})

export type GetCurrentRoundResponse = {
  content: Array<{ type: 'text'; text: string }>
  structuredContent: z.infer<typeof OutputSchema>
}

export const getCurrentRoundTool: MCPTool = {
  name: 'getCurrentRound',
  title: 'VeBetterDAO: Get current round ID',
  description:
    'Get the current VeBetterDAO round ID by querying the X Allocation Voting smart contract directly. Rounds are time periods for voting cycles and reward distribution. Use this round ID to filter other queries (e.g., getB3TRGlobalOverview, getB3TRAppOverview) to see data for the current active round. Returns real-time on-chain value.',
  inputSchema: {},
  outputSchema: OutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (): Promise<GetCurrentRoundResponse> => {
    try {
      const currentRoundId = await getCurrentRound()
      
      if (currentRoundId === null) {
        const errorResult = {
          ok: false,
          network: getNetworkType(),
          error: 'Failed to fetch current round ID',
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult) }],
          structuredContent: errorResult,
        }
      }
      
      const result = {
        ok: true,
        network: getNetworkType(),
        currentRoundId,
      }
      
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result,
      }
    } catch (error) {
      logger.warn(`Error getting current round: ${String(error)}`)
      const errorResult = {
        ok: false,
        network: getNetworkType(),
        error: `Error getting current round: ${String(error)}`,
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(errorResult) }],
        structuredContent: errorResult,
      }
    }
  },
}

