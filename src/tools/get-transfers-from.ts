import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import { IndexerGetTransfersFromParamsSchema, IndexerTransferSchema } from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import { resolveVnsOrAddress } from '@/services/vns'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

export const IndexerGetTransfersFromOutputSchema = createIndexerStructuredOutputSchema(z.array(IndexerTransferSchema))
export const IndexerGetTransfersFromResponseSchema = createIndexerToolResponseSchema(z.array(IndexerTransferSchema))
export type IndexerGetTransfersFromResponse = z.infer<typeof IndexerGetTransfersFromResponseSchema>

/**
 * Input schema that accepts VNS names and token symbols
 */
const GetTransfersFromInputSchema = z
  .object({
    address: z.string().describe('Sender wallet address (0x...) or VNS name (*.vet)'),
    tokenAddress: z.string().optional().describe('Token contract address (0x...) or token symbol (VET, VTHO, B3TR, etc.)'),
  })
  .extend(IndexerGetTransfersFromParamsSchema.omit({ address: true, tokenAddress: true }).shape)
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

export const getTransfersFrom: MCPTool = {
  name: 'getTransfersFrom',
  title: 'Indexer: Transfers from address (outgoing) (v1)',
  description:
    "Query VeWorld Indexer /api/v1/transfers/from for outgoing transfers. " +
    "Required 'address' (sender, accepts BOTH VNS names like roisin.vet AND 0x hex addresses). " +
    "Optional 'tokenAddress' (accepts token symbol like VET, VTHO, B3TR OR 0x hex address) to scope to a specific VIP‑180/ERC-20 contract and pagination. " +
    "Use for 'outgoing transfers' or 'payments from wallet'. " +
    "NOTE: This is a directional filter of getTransfersOfAccount - prefer using getTransfersOfAccount unless you specifically need only outgoing transfers.",
  inputSchema: GetTransfersFromInputSchema.shape,
  outputSchema: IndexerGetTransfersFromOutputSchema.shape,
  annotations: {
    idempotentHint: false,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (
    params: z.infer<typeof GetTransfersFromInputSchema>,
  ): Promise<IndexerGetTransfersFromResponse> => {
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
      const validatedParams = IndexerGetTransfersFromParamsSchema.parse({
        address: resolvedAddress,
        tokenAddress: resolvedTokenAddress,
        ...rest,
      })

      const response = await veworldIndexerGet<typeof IndexerTransferSchema, typeof IndexerGetTransfersFromParamsSchema>({
        endPoint: '/api/v1/transfers/from',
        params: validatedParams,
      })

      if (!response?.data) {
        return indexerErrorResponse('Failed to fetch transfers (from) from VeWorld Indexer')
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
      logger.warn(`Error getting Transfers from ${params.address} from VeWorld Indexer: ${String(error)}`)
      return indexerErrorResponse(
        `Error getting Transfers from ${params.address} from VeWorld Indexer: ${String(error)}`,
      )
    }
  },
}


