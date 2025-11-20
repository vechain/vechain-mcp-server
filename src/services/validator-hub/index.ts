import { z } from 'zod'
import { getThorNetworkType, ThorNetworkType } from '@/services/thor'
import { logger } from '@/utils/logger'

export const ValidatorRegistryItemSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Validator address must be 0x-prefixed 40 hex chars'),
  name: z.string().optional().describe('Validator name'),
  location: z.string().optional().describe('Validator location, should be aclear geographical label such as City, Country or Region, Country'),
  desc: z.string().optional().describe('Validator description is optional, and must be a fully-qualified URL if provided.'),
  website: z.string().url().optional().describe('Validator website'),
  logo: z.string().optional().describe('Validator logo'),
})

export const ValidatorRegistrySchema = z.array(ValidatorRegistryItemSchema)

function getValidatorRegistryUrl(): string {
  const network = getThorNetworkType()
  if (network === ThorNetworkType.MAINNET) {
    return 'https://vechain.github.io/validator-hub/main.json'
  }
  if (network === ThorNetworkType.TESTNET) {
    return 'https://vechain.github.io/validator-hub/test.json'
  }
  // For SOLO default to test list (useful for local dev)
  return 'https://vechain.github.io/validator-hub/test.json'
}

export async function fetchValidatorRegistry(): Promise<z.infer<typeof ValidatorRegistrySchema> | null> {
  try {
    const url = getValidatorRegistryUrl()
    const res = await fetch(url, { method: 'GET' })
    if (!res.ok) {
      logger.warn(`Failed to fetch validator registry: ${res.status} ${res.statusText}`)
      return null
    }
    const json = await res.json()
    const parsed = ValidatorRegistrySchema.parse(json)
    return parsed
  } catch (err) {
    logger.warn(`Error fetching validator registry: ${String(err)}`)
    return null
  }
}


