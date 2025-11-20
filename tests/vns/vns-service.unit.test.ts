import { resolveVnsOrAddress } from '@/services/vns'

describe('VNS service - resolveVnsOrAddress', () => {
  test('returns the same value when not a .vet name', async () => {
    const input = '0x311E811cd3fC29Ba17D45B04c882245FA69DC776' as `0x${string}`
    const result = await resolveVnsOrAddress(input)
    expect(result).toBe(input)
  })
})


