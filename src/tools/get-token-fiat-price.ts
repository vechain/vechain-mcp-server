import { z } from 'zod'
import { 
  getTokenFiatPriceFromOracle, 
  isOracleAvailable,
  type SupportedToken,
  type SupportedFiat,
} from '@/services/price-oracle'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

const TokenSchema = z.enum(['vet', 'vtho', 'b3tr'])
const FiatSchema = z.enum(['usd', 'eur', 'gbp'])

export const TokenFiatPriceDataSchema = z.object({
  token: TokenSchema,
  fiat: FiatSchema,
  price: z
    .union([z.number(), z.nan(), z.null()])
    .transform(val => (val === null ? NaN : val))
    .describe('Current price of the token in the selected fiat currency; NaN when unavailable'),
  source: z.literal('oracle'),
  error: z.string().optional().describe('Optional error message if the price could not be fetched'),
})

export const getTokenFiatPrice: MCPTool = {
  name: 'getTokenFiatPrice',
  title: 'Get token price in fiat (VET/VTHO/B3TR)',
  description: 'Get the current price of VET, VTHO, or B3TR in a given fiat currency using the on-chain VeChain Energy Oracle.',
  inputSchema: {
    token: z.string().describe('Token symbol to query (VET, VTHO, or B3TR, case-insensitive)'),
    fiat: z.string().describe('Fiat currency to return the price in (USD, EUR, GBP), case-insensitive'),
  },
  outputSchema: TokenFiatPriceDataSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async ({
    token,
    fiat,
  }: {
    token: string
    fiat: string
  }): Promise<{
    content: { type: 'text'; text: string }[]
    structuredContent: z.infer<typeof TokenFiatPriceDataSchema>
  }> => {
    try {
      const parsed = z
        .object({
          token: TokenSchema,
          fiat: FiatSchema,
        })
        .parse({
          token: token.toLowerCase(),
          fiat: fiat.toLowerCase(),
        })

      if (!isOracleAvailable()) {
        throw new Error('Oracle not available on this network (solo). Only mainnet and testnet are supported.')
      }

      const price = await getTokenFiatPriceFromOracle({
        token: parsed.token as SupportedToken,
        fiat: parsed.fiat as SupportedFiat,
      })

      const data: z.infer<typeof TokenFiatPriceDataSchema> = {
        token: parsed.token,
        fiat: parsed.fiat,
        price,
        source: 'oracle',
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(data) }],
        structuredContent: data,
      }
    } catch (error) {
      const message = `Error fetching ${token.toUpperCase()} price in ${fiat.toUpperCase()}: ${String(error)}`
      logger.warn(message)

      const data: z.infer<typeof TokenFiatPriceDataSchema> = {
        token: token.toLowerCase() as z.infer<typeof TokenSchema>,
        fiat: fiat.toLowerCase() as z.infer<typeof FiatSchema>,
        price: NaN,
        source: 'oracle',
        error: message,
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(data) }],
        structuredContent: data,
      }
    }
  },
}
