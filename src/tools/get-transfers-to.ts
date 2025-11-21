import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import { IndexerGetTransfersToParamsSchema, IndexerTransferSchema } from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import { resolveVnsOrAddress } from '@/services/vns'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const IndexerGetTransfersToOutputSchema = createIndexerStructuredOutputSchema(z.array(IndexerTransferSchema))
export const IndexerGetTransfersToResponseSchema = createIndexerToolResponseSchema(z.array(IndexerTransferSchema))
export type IndexerGetTransfersToResponse = z.infer<typeof IndexerGetTransfersToResponseSchema>

/**
 * Input schema that accepts VNS names and token symbols
 */
const GetTransfersToInputSchema = z
  .object({
    address: z.string().describe('Recipient wallet address (0x...) or VNS name (*.vet)'),
    tokenAddress: z.string().optional().describe('Token contract address (0x...) or token symbol (VET, VTHO, B3TR, etc.)'),
  })
  .extend(IndexerGetTransfersToParamsSchema.omit({ address: true, tokenAddress: true }).shape)
  .describe('Input parameters accepting VNS names and token symbols')

/**
 * Fetch token registry and cache it
 */
let tokenRegistryCache: any[] | null = null
async function getTokenRegistryData(): Promise<any[]> {
  if (tokenRegistryCache) return tokenRegistryCache
  
  try {
    const response = await fetch(
      `https://vechain.github.io/token-registry/${getThorNetworkType() === 'mainnet' ? 'main' : 'test'}.json`
    )
    if (response.ok) {
      tokenRegistryCache = await response.json()
      return tokenRegistryCache || []
    }
  } catch (error) {
    logger.warn(`Error fetching token registry: ${String(error)}`)
  }
  return []
}

/**
 * Enrich transfers with token symbol and name from registry
 */
async function enrichTransfersWithTokenInfo(transfers: z.infer<typeof IndexerTransferSchema>[]) {
  const registry = await getTokenRegistryData()
  
  return transfers.map(transfer => {
    if (transfer.tokenAddress) {
      const token = registry.find((t: any) => 
        t.address?.toLowerCase() === transfer.tokenAddress?.toLowerCase()
      )
      if (token) {
        return {
          ...transfer,
          tokenSymbol: token.symbol,
          tokenName: token.name,
          tokenDecimals: token.decimals,
        }
      }
    }
    return transfer
  })
}

export const getTransfersTo: MCPTool = {
  name: 'getTransfersTo',
  title: 'Indexer: Transfers to address (incoming) (v1)',
  description:
    "Query VeWorld Indexer /api/v1/transfers/to for incoming transfers. " +
    "Required 'address' (recipient, accepts BOTH VNS names like roisin.vet AND 0x hex addresses). " +
    "Optional 'tokenAddress' (accepts token symbol like VET, VTHO, B3TR OR 0x hex address) to scope to a specific VIP‑180/ERC-20 contract and pagination. " +
    "Use for 'incoming transfers' or 'receipts to wallet'. " +
    "NOTE: This is a directional filter of getTransfersOfAccount - prefer using getTransfersOfAccount unless you specifically need only incoming transfers.",
  inputSchema: GetTransfersToInputSchema.shape,
  outputSchema: IndexerGetTransfersToOutputSchema.shape,
  annotations: {
    idempotentHint: false,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (
    params: z.infer<typeof GetTransfersToInputSchema>,
  ): Promise<IndexerGetTransfersToResponse> => {
    try {
      const { address, tokenAddress, ...rest } = params

      // Resolve VNS name to hex for address
      const resolvedAddress = await resolveVnsOrAddress(address)

      // Resolve token symbol to address if needed
      let resolvedTokenAddress: `0x${string}` | undefined
      if (tokenAddress) {
        if (tokenAddress.startsWith('0x')) {
          resolvedTokenAddress = tokenAddress as `0x${string}`
        } else {
          // Look up token by symbol in registry
          try {
            const tokenRegistryResponse = await fetch(
              `https://vechain.github.io/token-registry/${getThorNetworkType() === 'mainnet' ? 'main' : 'test'}.json`
            )
            if (tokenRegistryResponse.ok) {
              const registry = await tokenRegistryResponse.json()
              const token = registry.find((t: any) => t.symbol?.toLowerCase() === tokenAddress.toLowerCase())
              if (token?.address) {
                resolvedTokenAddress = token.address as `0x${string}`
              } else {
                return indexerErrorResponse(`Token symbol '${tokenAddress}' not found in registry`)
              }
            } else {
              return indexerErrorResponse(`Failed to fetch token registry`)
            }
          } catch (error) {
            logger.warn(`Error fetching token registry: ${String(error)}`)
            return indexerErrorResponse(`Error resolving token symbol '${tokenAddress}'`)
          }
        }
      }

      // Validate with strict schema for API
      const validatedParams = IndexerGetTransfersToParamsSchema.parse({
        address: resolvedAddress,
        tokenAddress: resolvedTokenAddress,
        ...rest,
      })

      const response = await veworldIndexerGet<typeof IndexerTransferSchema, typeof IndexerGetTransfersToParamsSchema>({
        endPoint: '/api/v1/transfers/to',
        params: validatedParams,
      })

      if (!response?.data) {
        return indexerErrorResponse('Failed to fetch transfers (to) from VeWorld Indexer')
      }

      // Enrich transfers with token symbols from registry
      const enrichedTransfers = await enrichTransfersWithTokenInfo(response.data)

      return {
        content: [{ type: 'text', text: JSON.stringify(enrichedTransfers) }],
        structuredContent: {
          ok: true,
          network: getThorNetworkType(),
          data: enrichedTransfers,
        },
      }
    } catch (error) {
      logger.warn(`Error getting Transfers to ${params.address} from VeWorld Indexer: ${String(error)}`)
      return indexerErrorResponse(`Error getting Transfers to ${params.address} from VeWorld Indexer: ${String(error)}`)
    }
  },
}


