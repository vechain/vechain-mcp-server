import { z } from 'zod'
import { logger } from '@/utils/logger'

export const AppHubItemSchema = z.object({
  name: z.string(),
  href: z.string().url(),
  desc: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isVeWorldSupported: z.boolean().optional(),
  id: z.string().optional(),
  veBetterDaoId: z.string().optional(),
  iconUri: z.string().optional(),
  repo: z.string().optional(),
  contracts: z.array(z.string()).optional(),
  createAt: z.number().optional(),
})

export const AppHubSchema = z.array(AppHubItemSchema)

const APP_HUB_URL = 'https://vechain.github.io/app-hub/index.json'

export async function fetchAppHub(): Promise<z.infer<typeof AppHubSchema> | null> {
  try {
    const res = await fetch(APP_HUB_URL, { method: 'GET' })
    if (!res.ok) {
      logger.warn(`Failed to fetch App Hub: ${res.status} ${res.statusText}`)
      return null
    }
    const json = await res.json()
    return AppHubSchema.parse(json)
  } catch (err) {
    logger.warn(`Error fetching App Hub: ${String(err)}`)
    return null
  }
}




