import { vnsUtils } from '@vechain/sdk-network'
import { z } from 'zod'
import { getThorClient, ThorAddressSchema } from '@/services/thor'

/**
 * Schema for a VNS name ending in .vet (case-insensitive)
 */
export const VnsNameSchema = z
  .string()
  .regex(/\.vet$/i, 'VNS name must end with .vet')
  .describe('VNS name ending in .vet')

/**
 * Resolve a VNS name (ending in .vet) to a Thor address, or return the input
 * unchanged (validated) if it is already a Thor address.
 *
 * - If the value ends with `.vet` (case-insensitive), it is treated as a VNS name.
 * - If the name cannot be resolved, an Error is thrown.
 * - Otherwise, the original value is validated as a Thor address and returned.
 */
export async function resolveVnsOrAddress(
  value: z.infer<typeof ThorAddressSchema> | z.infer<typeof VnsNameSchema>,
): Promise<`0x${string}`> {
  const normalized = value.trim()

  if (!normalized.toLowerCase().endsWith('.vet')) {
    // Already a Thor address: validate and return typed
    return ThorAddressSchema.parse(normalized)
  }

  const thorClient = getThorClient()
  const resolved = await vnsUtils.resolveName(thorClient, normalized)

  if (!resolved) {
    throw new Error(`Unknown VNS name: ${normalized}`)
  }

  // Ensure the resolved value is a valid Thor address
  return ThorAddressSchema.parse(resolved)
}
