import { z } from 'zod'
import {
  applySlippage,
  type Clause,
  buildErrorResponse,
  buildSuccessResponse,
  type BuildResponse,
  BuildResultOutputSchema,
  encoders,
  parseUnits,
  resolveTokenOrThrow,
  toHex,
  WalletAddressInputSchema,
} from '@/services/clause-builder'
import { resolveAddress } from '@/services/contracts-registry'
import { getThorNetworkType } from '@/services/thor'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

const InputSchema = z.object({
  walletAddress: WalletAddressInputSchema,
  fromToken: z.string().describe('Source token (symbol or 0x ERC20 address).'),
  toToken: z.string().describe('Destination token (symbol or 0x ERC20 address).'),
  amountIn: z.string().describe('Human-readable amount of `fromToken` to spend.'),
  slippageBps: z
    .number()
    .int()
    .min(0)
    .max(5_000)
    .optional()
    .describe('Slippage tolerance in basis points (default 100 = 1%).'),
  deadlineSeconds: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Deadline window in seconds (default 1200 = 20 min).'),
  minAmountOut: z
    .string()
    .optional()
    .describe(
      'Optional explicit min-out (decimal, in `toToken` units). Overrides `slippageBps` calculation.',
    ),
})

type Input = z.infer<typeof InputSchema>

export const buildSwapClauses: MCPTool = {
  name: 'buildSwapClauses',
  title: 'Build clauses for a token swap (VeChain Swap router)',
  description:
    'Build the multi-clause payload for swapping one token into another via the VeChain Swap UniswapV2-fork router. Routes through WVET when neither side is native VET. For ERC20 -> X swaps an `approve(router, amountIn)` clause is prepended. Defaults: slippage 100 bps (1%), deadline 1200s. Server NEVER signs or broadcasts; the wallet client signs the returned `clauses` array.',
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
      const from = await resolveTokenOrThrow(parsed.fromToken)
      const to = await resolveTokenOrThrow(parsed.toToken)
      if (from.symbol === to.symbol) {
        throw new Error('fromToken and toToken must differ')
      }

      const amountIn = parseUnits(parsed.amountIn, from.decimals)
      if (amountIn <= 0n) throw new Error('amountIn must be > 0')

      const slippageBps = parsed.slippageBps ?? 100
      const minOut = parsed.minAmountOut
        ? parseUnits(parsed.minAmountOut, to.decimals)
        : applySlippage(amountIn, slippageBps)

      const deadline = BigInt(Math.floor(Date.now() / 1000) + (parsed.deadlineSeconds ?? 1_200))
      const wvet = resolveAddress('wvet')
      const routerAddr = resolveAddress('vechainSwapRouter')
      const recipient = parsed.walletAddress

      const clauses: Clause[] = []
      let gasHint = 250_000

      if (from.isNative) {
        const path = [wvet, to.address]
        clauses.push({
          to: routerAddr,
          value: toHex(amountIn),
          data: encoders.router.swapExactETHForTokens(minOut, path, recipient, deadline),
          comment: `Swap ${parsed.amountIn} VET -> ${to.symbol}`,
        })
      } else if (to.isNative) {
        clauses.push({
          to: from.address,
          value: '0x0',
          data: encoders.erc20.approve(routerAddr, amountIn),
          comment: `Approve ${from.symbol} to router`,
        })
        const path = [from.address, wvet]
        clauses.push({
          to: routerAddr,
          value: '0x0',
          data: encoders.router.swapExactTokensForETH(amountIn, minOut, path, recipient, deadline),
          comment: `Swap ${parsed.amountIn} ${from.symbol} -> VET`,
        })
        gasHint = 320_000
      } else {
        clauses.push({
          to: from.address,
          value: '0x0',
          data: encoders.erc20.approve(routerAddr, amountIn),
          comment: `Approve ${from.symbol} to router`,
        })
        const path = [from.address, wvet, to.address]
        clauses.push({
          to: routerAddr,
          value: '0x0',
          data: encoders.router.swapExactTokensForTokens(
            amountIn,
            minOut,
            path,
            recipient,
            deadline,
          ),
          comment: `Swap ${parsed.amountIn} ${from.symbol} -> ${to.symbol}`,
        })
        gasHint = 360_000
      }

      return buildSuccessResponse({
        network,
        clauses,
        summary: `Swap ${parsed.amountIn} ${from.symbol} -> ${to.symbol} (slippage ${slippageBps} bps)`,
        gasHint,
      })
    } catch (error) {
      logger.warn(`Error in buildSwapClauses: ${String(error)}`)
      return buildErrorResponse(network, String(error))
    }
  },
}
