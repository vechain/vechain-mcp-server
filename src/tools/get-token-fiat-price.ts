import { z } from 'zod'
import { getTokenFiatPriceFromCoinGecko, type SupportedFiat, type SupportedToken } from '@/services/coingecko'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

const TokenSchema = z.enum(['vet', 'vtho'])
const FiatSchema = z.enum(['usd', 'eur', 'jpy', 'chf'])

export const TokenFiatPriceDataSchema = z.object({
  token: TokenSchema,
  fiat: FiatSchema,
  price: z
    .union([z.number(), z.nan()])
    .describe('Current price of the token in the selected fiat currency; NaN when unavailable'),
  source: z.literal('coingecko'),
  error: z.string().optional().describe('Optional error message if the price could not be fetched'),
})

export const getTokenFiatPrice: MCPTool = {
  name: 'getTokenFiatPrice',
  title: 'Get token price in fiat (VET/VTHO)',
  description: 'Get the current price of VET or VTHO in a given fiat currency using CoinGecko.',
  inputSchema: {
    token: z.string().describe('Token symbol to query (VET or VTHO, case-insensitive)'),
    fiat: z.string().describe('Fiat currency to return the price in (USD, EUR, JPY, CHF), case-insensitive'),
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

      const price = await getTokenFiatPriceFromCoinGecko({
        token: parsed.token as SupportedToken,
        fiat: parsed.fiat as SupportedFiat,
      })

      const data: z.infer<typeof TokenFiatPriceDataSchema> = {
        token: parsed.token,
        fiat: parsed.fiat,
        price,
        source: 'coingecko',
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(data) }],
        structuredContent: data,
      }
    } catch (error) {
      const message = `Error fetching ${token.toUpperCase()} price in ${fiat.toUpperCase()} from CoinGecko: ${String(
        error,
      )}`
      logger.warn(message)

      const data: z.infer<typeof TokenFiatPriceDataSchema> = {
        token: token.toLowerCase() as z.infer<typeof TokenSchema>,
        fiat: fiat.toLowerCase() as z.infer<typeof FiatSchema>,
        price: NaN,
        source: 'coingecko',
        error: message,
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(data) }],
        structuredContent: data,
      }
    }
  },
}
