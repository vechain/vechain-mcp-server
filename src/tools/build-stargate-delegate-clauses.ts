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
  tokenId: z.string().describe('Stargate NFT tokenId (decimal string).'),
  validator: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/)
    .describe('Validator address to delegate the NFT to.'),
})

type Input = z.infer<typeof InputSchema>

export const buildStargateDelegateClauses: MCPTool = {
  name: 'buildStargateDelegateClauses',
  title: 'Build clauses to delegate an existing Stargate NFT',
  description:
    'Build the single-clause payload that calls `Stargate.delegate(tokenId, validator)` to assign or move a previously minted Stargate NFT to a validator. The wallet must own `tokenId`. Server NEVER signs.',
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
          data: encoders.stargate.delegate(tokenId, parsed.validator),
          comment: `Delegate Stargate NFT #${parsed.tokenId} to ${parsed.validator}`,
        },
      ]
      return buildSuccessResponse({
        network,
        clauses,
        summary: `Delegate NFT #${parsed.tokenId} to ${parsed.validator}`,
        gasHint: 200_000,
      })
    } catch (error) {
      logger.warn(`Error in buildStargateDelegateClauses: ${String(error)}`)
      return buildErrorResponse(network, String(error))
    }
  },
}
