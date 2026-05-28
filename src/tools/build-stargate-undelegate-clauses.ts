import { z } from 'zod'
import {
  type Clause,
  buildErrorResponse,
  buildSuccessResponse,
  type BuildResponse,
  BuildResultOutputSchema,
  encoders,
  WalletAddressInputSchema,
} from '@/services/clause-builder'
import { resolveAddress } from '@/services/contracts-registry'
import { getThorNetworkType } from '@/services/thor'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

const InputSchema = z.object({
  walletAddress: WalletAddressInputSchema,
  tokenId: z
    .string()
    .describe('Stargate NFT tokenId (decimal string) to request delegation exit for.'),
})

type Input = z.infer<typeof InputSchema>

export const buildStargateUndelegateClauses: MCPTool = {
  name: 'buildStargateUndelegateClauses',
  title: 'Build clauses to request delegation exit for a Stargate NFT',
  description:
    'Build the single-clause payload that calls `Stargate.requestDelegationExit(tokenId)`. This is the formal undelegate flow — the actual exit completes after the cooldown window managed by the Stargate contract. Server NEVER signs.',
  inputSchema: InputSchema.shape,
  outputSchema: BuildResultOutputSchema.shape,
  annotations: {
    idempotentHint: false,
    openWorldHint: true,
    readOnlyHint: false,
    destructiveHint: true,
  },
  handler: async (params: Input): Promise<BuildResponse> => {
    const network = getThorNetworkType()
    try {
      const parsed = InputSchema.parse(params ?? {})
      const tokenId = BigInt(parsed.tokenId)
      const stargateAddr = resolveAddress('stargate')
      const clauses: Clause[] = [
        {
          to: stargateAddr,
          value: '0x0',
          data: encoders.stargate.requestDelegationExit(tokenId),
          comment: `Request delegation exit for NFT #${parsed.tokenId}`,
        },
      ]
      return buildSuccessResponse({
        network,
        clauses,
        summary: `Request delegation exit for Stargate NFT #${parsed.tokenId}`,
        gasHint: 180_000,
      })
    } catch (error) {
      logger.warn(`Error in buildStargateUndelegateClauses: ${String(error)}`)
      return buildErrorResponse(network, String(error))
    }
  },
}
