import { z } from 'zod'
import { fetchSourcifyContracts, getSourcifyChainId, SourcifyContractListItemSchema } from '@/services/sourcify'
import { getThorNetworkType } from '@/services/thor'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

const InputSchema = z
  .object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(200)
      .default(50)
      .describe('Number of results to return (1-200, default: 50)'),
    afterMatchId: z
      .string()
      .optional()
      .describe('Cursor for pagination - use the last matchId from previous response to get next page'),
    sort: z
      .enum(['asc', 'desc'])
      .default('desc')
      .describe('Sort order: "desc" for newest first (default), "asc" for oldest first'),
  })
  .describe('Parameters for listing verified contracts from Sourcify')

const OutputSchema = z
  .object({
    ok: z.boolean().describe('Whether the fetch was successful'),
    network: z.string().describe('The VeChain network used'),
    chainId: z.string().describe('The Sourcify chain ID used'),
    contracts: z.array(SourcifyContractListItemSchema).optional().describe('List of verified contracts'),
    totalReturned: z.number().optional().describe('Number of contracts returned'),
    lastMatchId: z.string().optional().describe('Last matchId for pagination - use as afterMatchId for next page'),
    hasMore: z.boolean().optional().describe('Whether there are more results available'),
    error: z.string().optional().describe('Error message if fetch failed'),
  })
  .describe('Sourcify verified contracts list result')

export type GetSourcifyContractsResponse = {
  content: Array<{ type: 'text'; text: string }>
  structuredContent: z.infer<typeof OutputSchema>
}

export const getSourcifyContracts: MCPTool = {
  name: 'getSourcifyContracts',
  title: 'Sourcify: List Verified Contracts',
  description:
    'Fetch a list of verified smart contracts from Sourcify for VeChain. Returns contract addresses, match types, and verification timestamps. Use afterMatchId for pagination. Only works on VeChain mainnet (chainId 100009) and testnet (chainId 100010).',
  inputSchema: InputSchema.shape,
  outputSchema: OutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (params: z.infer<typeof InputSchema>): Promise<GetSourcifyContractsResponse> => {
    const network = getThorNetworkType()
    const chainId = getSourcifyChainId()

    if (!chainId) {
      const errorResult = {
        ok: false,
        network,
        chainId: 'unsupported',
        error: `Sourcify is not supported for the ${network} network. Only mainnet and testnet are supported.`,
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(errorResult) }],
        structuredContent: errorResult,
      }
    }

    try {
      const parsed = InputSchema.parse(params)

      const result = await fetchSourcifyContracts(chainId, parsed.limit, parsed.afterMatchId, parsed.sort)

      if (result === null) {
        const errorResult = {
          ok: false,
          network,
          chainId,
          error: `Failed to fetch verified contracts from Sourcify for chainId ${chainId}`,
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult) }],
          structuredContent: errorResult,
        }
      }

      // Get last matchId for pagination
      const lastContract = result.results[result.results.length - 1]
      const lastMatchId = lastContract?.matchId

      const successResult = {
        ok: true,
        network,
        chainId,
        contracts: result.results,
        totalReturned: result.results.length,
        lastMatchId,
        hasMore: result.results.length === parsed.limit,
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(successResult) }],
        structuredContent: successResult,
      }
    } catch (error) {
      logger.warn(`Error in getSourcifyContracts: ${String(error)}`)
      const errorResult = {
        ok: false,
        network,
        chainId,
        error: `Error fetching Sourcify contracts: ${String(error)}`,
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(errorResult) }],
        structuredContent: errorResult,
      }
    }
  },
}
