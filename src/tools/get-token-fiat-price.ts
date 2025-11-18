import { z } from 'zod'
import { getTokenFiatPriceFromCoinGecko, type SupportedFiat, type SupportedToken } from '@/services/coingecko'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

const TokenSchema = z.enum(['vet', 'vtho'])
const FiatSchema = z.enum(['usd', 'eur', 'jpy', 'chf'])

const TokenFiatPriceDataSchema = z.object({
  token: TokenSchema,
  fiat: FiatSchema,
  price: z.number().describe('Current price of the token in the selected fiat currency'),
  source: z.literal('coingecko'),
  error: z.string().optional().describe('Optional error message if the price could not be fetched'),
})

export const getTokenFiatPrice: MCPTool = {
  name: 'getTokenFiatPrice',
  title: 'Get token price in fiat (VET/VTHO)',
  description: 'Get the current price of VET or VTHO in a given fiat currency using CoinGecko.',
  inputSchema: {
    token: TokenSchema.describe('Token symbol to query (vet or vtho)'),
    fiat: FiatSchema.describe('Fiat currency to return the price in (usd, eur, jpy, chf)'),
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
    token: SupportedToken
    fiat: SupportedFiat
  }): Promise<{
    content: { type: 'text'; text: string }[]
    structuredContent: z.infer<typeof TokenFiatPriceDataSchema>
  }> => {
    try {
      const price = await getTokenFiatPriceFromCoinGecko({ token, fiat })

      const data: z.infer<typeof TokenFiatPriceDataSchema> = {
        token,
        fiat,
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
        token,
        fiat,
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
