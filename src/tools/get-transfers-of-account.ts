import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import {
  IndexerGetTransfersParamsBaseSchema,
  IndexerGetTransfersParamsSchema,
  IndexerTransferSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import { resolveVnsOrAddress } from '@/services/vns'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

/**
 * Schemas for get transfers of account tool outputs
 */
const IndexerGetTransfersOfOutputSchema = createIndexerStructuredOutputSchema(z.array(IndexerTransferSchema))
export const IndexerGetTransfersOfResponseSchema = createIndexerToolResponseSchema(z.array(IndexerTransferSchema))
export type IndexerGetTransfersOfResponse = z.infer<typeof IndexerGetTransfersOfResponseSchema>

/**
 * Input schema that accepts VNS names and token symbols
 */
const GetTransfersOfAccountInputSchema = z
  .object({
    address: z.string().optional().describe('Wallet address (0x...) or VNS name (*.vet)'),
    tokenAddress: z.string().optional().describe('Token contract address (0x...) or token symbol (VET, VTHO, B3TR, etc.)'),
  })
  .extend(IndexerGetTransfersParamsBaseSchema.omit({ address: true, tokenAddress: true }).shape)
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

export const getTransfersOfAccount: MCPTool = {
  name: 'getTransfersOfAccount',
  title: 'Indexer: List transfers for wallet or token (v1)',
  description:
    "Query transfer events using VeWorld Indexer /api/v1/transfers. " +
    "Provide either 'address' (wallet, accepts BOTH VNS names like roisin.vet AND 0x hex addresses) " +
    "or 'tokenAddress' (accepts token symbol like VET, VTHO, B3TR OR 0x hex address) plus optional pagination. " +
    "Returns enriched transfers with VNS names and token symbols when available. " +
    "Use for 'wallet transfers', 'token movements', or 'activity for contract/wallet'.",
  inputSchema: GetTransfersOfAccountInputSchema.shape, // ← Permissive input
  outputSchema: IndexerGetTransfersOfOutputSchema.shape,
  annotations: {
    idempotentHint: false,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (
    params: z.infer<typeof GetTransfersOfAccountInputSchema>, // ← Use input schema type
  ): Promise<IndexerGetTransfersOfResponse> => {
    try {
      const { address, tokenAddress, ...rest } = params

      // Resolve VNS name to hex for address
      let resolvedAddress: `0x${string}` | undefined
      if (address) {
        resolvedAddress = await resolveVnsOrAddress(address)
      }

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
      const validatedParams = IndexerGetTransfersParamsSchema.parse({
        address: resolvedAddress,
        tokenAddress: resolvedTokenAddress,
        ...rest,
      })

      const response = await veworldIndexerGet<typeof IndexerTransferSchema, typeof IndexerGetTransfersParamsSchema>({
        endPoint: '/api/v1/transfers',
        params: validatedParams,
      })

      if (!response?.data) {
        return indexerErrorResponse('Failed to fetch transfers from VeWorld Indexer')
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
      if (error instanceof z.ZodError) {
        const messages = error.issues?.map(issue => issue.message).filter(Boolean)
        const validationMessage = messages?.length
          ? messages.join('; ')
          : 'Invalid parameters for getTransfersOfAccount.'

        logger.warn(`Validation error in getTransfersOfAccount: ${validationMessage}`)
        return indexerErrorResponse(validationMessage)
      }

      const identifier = params.address ?? params.tokenAddress ?? 'address or tokenAddress'
      logger.warn(`Error getting Transfers of ${identifier} from VeWorld Indexer: ${String(error)}`)
      return indexerErrorResponse(`Error getting transfers of ${identifier} from VeWorld Indexer.`)
    }
  },
}