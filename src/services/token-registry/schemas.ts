import { z } from 'zod'
import { ThorAddressSchema } from '@/services/thor/schemas'

export const TokenRegistryLinksSchema = z
  .object({
    twitter: z.string().url().optional().describe('Official X/Twitter profile URL'),
    telegram: z.string().url().optional().describe('Official Telegram channel URL'),
    medium: z.string().url().optional().describe('Official Medium blog URL'),
    github: z.string().url().optional().describe('Official GitHub organization or repository URL'),
  })
  .partial()
  .describe('Optional social/media links for the token')

export const TokenRegistryCrossChainProviderSchema = z
  .object({
    name: z.string().describe('Name of the bridge/cross‑chain provider'),
    url: z.string().url().describe('Provider page describing the bridged asset'),
  })
  .optional()
  .describe('Optional cross-chain provider metadata (e.g., Wanchain bridge)')

export const TokenRegistryItemSchema = z
  .object({
    name: z.string().describe('Human‑readable token name'),
    symbol: z.string().describe('Ticker symbol (case‑sensitive as registered)'),
    decimals: z.number().describe('Number of decimal places for on‑chain amounts'),
    address: ThorAddressSchema.describe('VIP‑180 contract address (0x…)'),
    desc: z.string().optional().describe('Short description or purpose of the token'),
    icon: z.string().optional().describe('Filename or path to token icon within the registry repo'),
    totalSupply: z.string().optional().describe('Total supply as a string (may be very large or “Infinite”)'),
    website: z.string().url().optional().describe('Official website'),
    whitePaper: z.string().url().optional().describe('Whitepaper document URL'),
    links: TokenRegistryLinksSchema.optional().describe('Optional social links'),
    crossChainProvider: TokenRegistryCrossChainProviderSchema.describe('If present, indicates a bridged asset'),
  })
  .describe('One token entry from the VeChain token registry')

export const TokenRegistrySchema = z
  .array(TokenRegistryItemSchema)
  .describe('List of official tokens for the active VeChain network (mainnet/testnet)')
export type TokenRegistry = z.infer<typeof TokenRegistrySchema>


