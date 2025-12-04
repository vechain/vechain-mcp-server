import { z } from 'zod'
import { ThorAddressSchema } from '@/services/thor/schemas'
import { VnsNameSchema, resolveVnsOrAddress } from '@/services/vns'
import { getGMNFTLevel, getNetworkType, VEBETTERDAO_CONTRACTS } from '@/services/vebetterdao-contracts'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import { IndexerNFTAssetSchema } from '@/services/veworld-indexer/schemas'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

const InputSchema = z.object({
  address: z.union([ThorAddressSchema, VnsNameSchema]).describe('Wallet address or VNS name to check GM NFT status for'),
})

const OutputSchema = z.object({
  ok: z.boolean(),
  network: z.string(),
  address: ThorAddressSchema.optional(),
  gmNFT: z.object({
    hasGM: z.boolean().describe('Whether the address owns any Galaxy Member NFTs'),
    level: z.string().optional().describe('GM NFT level/tier if available'),
    tokenId: z.string().optional().describe('Token ID of the GM NFT if available'),
  }).optional(),
  error: z.string().optional(),
})

export type GetGMNFTStatusResponse = {
  content: Array<{ type: 'text'; text: string }>
  structuredContent: z.infer<typeof OutputSchema>
}

export const getGMNFTStatus: MCPTool = {
  name: 'getGMNFTStatus',
  title: 'VeBetterDAO: Get Galaxy Member NFT status',
  description:
    'Check if a wallet address owns a Galaxy Member (GM) NFT and get its details. **Uses hybrid approach: 1) Indexer to quickly check IF user has GM NFT (cached, fast), 2) Smart contract to get precise level/tier details.** Galaxy Member NFTs provide special governance rights and benefits in VeBetterDAO. Returns whether the address holds a GM NFT, token ID(s), and level/tier.',
  inputSchema: InputSchema.shape,
  outputSchema: OutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (params: z.infer<typeof InputSchema>): Promise<GetGMNFTStatusResponse> => {
    try {
      const parsed = InputSchema.parse(params)
      const resolvedAddress = await resolveVnsOrAddress(parsed.address as string)
      
      // Step 1: Use indexer to quickly check if user has ANY GM NFTs (fast, cached)
      logger.debug(`Checking indexer for GM NFTs owned by ${resolvedAddress}`)
      const indexerResponse = await veworldIndexerGet<typeof IndexerNFTAssetSchema>({
        endPoint: '/api/v1/nfts',
        params: {
          address: resolvedAddress,
          contractAddress: VEBETTERDAO_CONTRACTS.GALAXY_MEMBER,
          page: 0,
          size: 1, // We only need to know if they have at least one
        } as any,
      })
      
      if (!indexerResponse?.data || indexerResponse.data.length === 0) {
        // User has no GM NFTs according to indexer
        logger.debug(`No GM NFTs found in indexer for ${resolvedAddress}`)
        const result = {
          ok: true,
          network: getNetworkType(),
          address: resolvedAddress,
          gmNFT: { hasGM: false },
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
        }
      }
      
      // Step 2: User has GM NFT(s) - now use smart contract to get precise level/tier details
      logger.debug(`GM NFT found in indexer, fetching details from smart contract`)
      const gmData = await getGMNFTLevel(resolvedAddress)
      
      if (!gmData) {
        // Indexer said they have GM but SC call failed - return what we know from indexer
        const result = {
          ok: true,
          network: getNetworkType(),
          address: resolvedAddress,
          gmNFT: {
            hasGM: true,
            tokenId: indexerResponse.data[0]?.tokenId,
            level: undefined, // Could not fetch from SC
          },
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
        }
      }
      
      const result = {
        ok: true,
        network: getNetworkType(),
        address: resolvedAddress,
        gmNFT: gmData,
      }
      
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result,
      }
    } catch (error) {
      logger.warn(`Error getting GM NFT status: ${String(error)}`)
      const errorResult = {
        ok: false,
        network: getNetworkType(),
        error: `Error getting GM NFT status: ${String(error)}`,
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(errorResult) }],
        structuredContent: errorResult,
      }
    }
  },
}

