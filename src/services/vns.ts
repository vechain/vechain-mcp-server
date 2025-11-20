import { vnsUtils } from '@vechain/sdk-network'
import { z } from 'zod'
import { getThorClient } from '@/services/thor'

/**
 * Schema for a VNS name ending in .vet (case-insensitive)
 */
export const VnsNameSchema = z
  .string()
  .regex(/\.vet$/i, 'VNS name must end with .vet')
  .describe('VNS name ending in .vet')

/**
 * Resolve a VNS name (ending in .vet) to a Thor address, or return the input
 * unchanged if it is already an address.
 *
 * - If the value ends with `.vet` (case-insensitive), it is treated as a VNS name.
 * - If the name cannot be resolved, an Error is thrown.
 * - Otherwise, the original value is returned.
 */
export async function resolveVnsOrAddress(value: string): Promise<string> {
  const normalized = value.trim()

  if (!normalized.toLowerCase().endsWith('.vet')) {
    return normalized
  }

  const thorClient = getThorClient()
  const resolved = await vnsUtils.resolveName(thorClient, normalized)

  if (!resolved) {
    throw new Error(`Unknown VNS name: ${normalized}`)
  }

  return resolved
}
