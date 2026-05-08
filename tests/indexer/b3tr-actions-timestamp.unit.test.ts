/**
 * Unit tests for B3TR actions tools.
 *
 * CONTEXT: The veworld-indexer B3TR actions API (/api/v1/b3tr/actions/...)
 * accepts `after`/`before` query params in **Unix seconds** — see
 * https://indexer.mainnet.vechain.org/api-docs:
 *   "Return records after this time (Unix time in seconds)."
 *
 * Both `getB3TRActionsForApp` and `getB3TRActionsForUser` expose seconds in
 * their user-facing schema and pass them through unchanged. These tests
 * verify schema validation, that passthrough, and (for the user variant)
 * that VNS names are resolved to a Thor address before the HTTP call.
 */

import { z } from 'zod'

// Provide indexerResponseSchema in the mock so schemas.ts can initialise correctly
jest.mock('@/services/veworld-indexer', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { z: zod } = require('zod')
  const paginationSchema = zod.object({
    hasNext: zod.boolean(),
    cursor: zod.string().optional(),
    hasCount: zod.boolean().optional(),
    countLimit: zod.number().optional(),
    totalPages: zod.number().nullable().optional(),
    totalElements: zod.number().nullable().optional(),
  })
  const indexerResponseSchema = <T extends z.ZodSchema>(schema: T) =>
    zod.object({ data: zod.array(schema), pagination: paginationSchema })
  return {
    veworldIndexerGet: jest.fn(),
    veworldIndexerGetSingle: jest.fn(),
    indexerResponseSchema,
    paginationSchema,
  }
})

// Mock VNS resolution (no external calls in unit tests)
jest.mock('@/services/vns', () => ({
  resolveVnsOrAddress: jest.fn(async (addr: string) => addr),
}))

// Now import after mocks are set up
import { getB3TRActionsForApp } from '@/tools/get-b3tr-actions-for-app'
import { getB3TRActionsForUser } from '@/tools/get-b3tr-actions-for-user'
import { veworldIndexerGet } from '@/services/veworld-indexer'
import { resolveVnsOrAddress } from '@/services/vns'

const mockGet = veworldIndexerGet as jest.MockedFunction<typeof veworldIndexerGet>
const mockResolveVns = resolveVnsOrAddress as jest.MockedFunction<typeof resolveVnsOrAddress>

/** A minimal valid B3TR actions list response from the indexer */
const MOCK_RESPONSE = {
  data: [],
  pagination: {
    hasNext: false,
    cursor: undefined,
    hasCount: false,
    totalPages: 0,
    totalElements: 0,
  },
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGet.mockResolvedValue(MOCK_RESPONSE as any)
})

// ---------------------------------------------------------------------------
// Schema-level validation tests
// ---------------------------------------------------------------------------

describe('getB3TRActionsForApp — InputSchema', () => {
  const schema = z.object((getB3TRActionsForApp as any).inputSchema)

  test('accepts valid appId without timestamps', () => {
    expect(() => schema.parse({ appId: '0xabc' })).not.toThrow()
  })

  test('accepts valid Unix second timestamps', () => {
    expect(() =>
      schema.parse({ appId: '0xabc', after: 1754179200, before: 1754265600 }),
    ).not.toThrow()
  })

  test('rejects negative after timestamp', () => {
    expect(() => schema.parse({ appId: '0xabc', after: -1 })).toThrow()
  })

  test('rejects non-integer (float) after timestamp', () => {
    expect(() => schema.parse({ appId: '0xabc', after: 1754179200.5 })).toThrow()
  })

  test('rejects missing required appId', () => {
    expect(() => schema.parse({ after: 1754179200 })).toThrow()
  })

  test('accepts ASC and DESC direction', () => {
    expect(() => schema.parse({ appId: '0xabc', direction: 'ASC' })).not.toThrow()
    expect(() => schema.parse({ appId: '0xabc', direction: 'DESC' })).not.toThrow()
  })

  test('rejects invalid direction', () => {
    expect(() => schema.parse({ appId: '0xabc', direction: 'asc' })).toThrow()
  })

  test('after/before descriptions specify seconds, NOT milliseconds', () => {
    const inputSchema = (getB3TRActionsForApp as any).inputSchema as Record<string, z.ZodTypeAny>
    const afterDesc = inputSchema.after._def.description as string
    const beforeDesc = inputSchema.before._def.description as string
    expect(afterDesc).toMatch(/seconds/i)
    expect(afterDesc).toMatch(/NOT milliseconds/i)
    expect(beforeDesc).toMatch(/seconds/i)
    expect(beforeDesc).toMatch(/NOT milliseconds/i)
  })
})

describe('getB3TRActionsForUser — InputSchema', () => {
  const schema = z.object((getB3TRActionsForUser as any).inputSchema)

  test('accepts valid wallet without timestamps', () => {
    expect(() =>
      schema.parse({ wallet: '0x311E811cd3fC29Ba17D45B04c882245FA69DC776' }),
    ).not.toThrow()
  })

  test('accepts valid Unix second timestamps', () => {
    expect(() =>
      schema.parse({
        wallet: '0x311E811cd3fC29Ba17D45B04c882245FA69DC776',
        after: 1754179200,
        before: 1754265600,
      }),
    ).not.toThrow()
  })

  test('rejects negative timestamps', () => {
    expect(() =>
      schema.parse({ wallet: '0x311E811cd3fC29Ba17D45B04c882245FA69DC776', before: -100 }),
    ).toThrow()
  })

  test('rejects non-integer timestamps', () => {
    expect(() =>
      schema.parse({
        wallet: '0x311E811cd3fC29Ba17D45B04c882245FA69DC776',
        after: 1754179200.9,
      }),
    ).toThrow()
  })

  test('rejects missing required wallet', () => {
    expect(() => schema.parse({ after: 1754179200 })).toThrow()
  })

  test('after/before descriptions specify seconds, NOT milliseconds', () => {
    const inputSchema = (getB3TRActionsForUser as any).inputSchema as Record<string, z.ZodTypeAny>
    const afterDesc = inputSchema.after._def.description as string
    const beforeDesc = inputSchema.before._def.description as string
    expect(afterDesc).toMatch(/seconds/i)
    expect(afterDesc).toMatch(/NOT milliseconds/i)
    expect(beforeDesc).toMatch(/seconds/i)
    expect(beforeDesc).toMatch(/NOT milliseconds/i)
  })
})

// ---------------------------------------------------------------------------
// Seconds passthrough tests (the indexer expects Unix time in SECONDS, see
// /api-docs at https://indexer.mainnet.vechain.org/api-docs — the handler
// must NOT multiply by 1000).
// ---------------------------------------------------------------------------

describe('getB3TRActionsForApp — seconds passthrough', () => {
  const APP_ID = '0x3a66df25581b931b27557101b2d93f87e43c550d0675599f7a6029e9943a1566'

  test('passes after through unchanged (seconds)', async () => {
    await getB3TRActionsForApp.handler({ appId: APP_ID, after: 1754179200 } as any)
    expect(mockGet).toHaveBeenCalledTimes(1)
    const [callArg] = mockGet.mock.calls[0]
    expect((callArg.params as any).after).toBe(1754179200)
  })

  test('passes before through unchanged (seconds)', async () => {
    await getB3TRActionsForApp.handler({ appId: APP_ID, before: 1754265600 } as any)
    const [callArg] = mockGet.mock.calls[0]
    expect((callArg.params as any).before).toBe(1754265600)
  })

  test('passes both after and before unchanged (seconds)', async () => {
    const AFTER_S = 1754179200
    const BEFORE_S = 1754265600
    await getB3TRActionsForApp.handler({ appId: APP_ID, after: AFTER_S, before: BEFORE_S } as any)
    const [callArg] = mockGet.mock.calls[0]
    expect((callArg.params as any).after).toBe(AFTER_S)
    expect((callArg.params as any).before).toBe(BEFORE_S)
  })

  test('passes undefined for after/before when not provided', async () => {
    await getB3TRActionsForApp.handler({ appId: APP_ID } as any)
    const [callArg] = mockGet.mock.calls[0]
    expect((callArg.params as any).after).toBeUndefined()
    expect((callArg.params as any).before).toBeUndefined()
  })

  test('passes other params (page, size, direction) unchanged', async () => {
    await getB3TRActionsForApp.handler({
      appId: APP_ID,
      page: 2,
      size: 25,
      direction: 'ASC',
    } as any)
    const [callArg] = mockGet.mock.calls[0]
    expect((callArg.params as any).page).toBe(2)
    expect((callArg.params as any).size).toBe(25)
    expect((callArg.params as any).direction).toBe('ASC')
  })

  test('returns error response when indexer returns null data', async () => {
    mockGet.mockResolvedValueOnce(null as any)
    const result = await getB3TRActionsForApp.handler({ appId: APP_ID } as any)
    expect(result.structuredContent).toMatchObject({ ok: false })
  })
})

describe('getB3TRActionsForUser — seconds passthrough', () => {
  const WALLET = '0x311E811cd3fC29Ba17D45B04c882245FA69DC776'

  test('passes after through unchanged (seconds)', async () => {
    await getB3TRActionsForUser.handler({ wallet: WALLET, after: 1754179200 } as any)
    expect(mockGet).toHaveBeenCalledTimes(1)
    const [callArg] = mockGet.mock.calls[0]
    expect((callArg.params as any).after).toBe(1754179200)
  })

  test('passes before through unchanged (seconds)', async () => {
    await getB3TRActionsForUser.handler({ wallet: WALLET, before: 1754265600 } as any)
    const [callArg] = mockGet.mock.calls[0]
    expect((callArg.params as any).before).toBe(1754265600)
  })

  test('passes both after and before unchanged (seconds)', async () => {
    const AFTER_S = 1754179200
    const BEFORE_S = 1754265600
    await getB3TRActionsForUser.handler({
      wallet: WALLET,
      after: AFTER_S,
      before: BEFORE_S,
    } as any)
    const [callArg] = mockGet.mock.calls[0]
    expect((callArg.params as any).after).toBe(AFTER_S)
    expect((callArg.params as any).before).toBe(BEFORE_S)
  })

  test('passes undefined for timestamps when not provided', async () => {
    await getB3TRActionsForUser.handler({ wallet: WALLET } as any)
    const [callArg] = mockGet.mock.calls[0]
    expect((callArg.params as any).after).toBeUndefined()
    expect((callArg.params as any).before).toBeUndefined()
  })

  test('passes appId filter unchanged', async () => {
    const APP_ID = '0x3a66df25581b931b27557101b2d93f87e43c550d0675599f7a6029e9943a1566'
    await getB3TRActionsForUser.handler({ wallet: WALLET, appId: APP_ID } as any)
    const [callArg] = mockGet.mock.calls[0]
    expect((callArg.params as any).appId).toBe(APP_ID)
  })

  test('returns error response when indexer returns null data', async () => {
    mockGet.mockResolvedValueOnce(null as any)
    const result = await getB3TRActionsForUser.handler({ wallet: WALLET } as any)
    expect(result.structuredContent).toMatchObject({ ok: false })
  })
})

// ---------------------------------------------------------------------------
// VNS resolution path
// ---------------------------------------------------------------------------

describe('getB3TRActionsForUser — VNS resolution', () => {
  const HEX_WALLET = '0x311e811cd3fc29ba17d45b04c882245fa69dc776'

  // Use a generic, app-flavoured VNS placeholder rather than a personal name.
  // The actual on-chain registration is irrelevant — `resolveVnsOrAddress` is
  // mocked, so these tests only exercise the wiring inside the handler.
  const VNS_NAME = 'mugshot.vet'
  const VNS_RESOLVED = '0xa1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2'

  test('does not call the VNS resolver for a hex address', async () => {
    // The default mock is identity (`addr => addr`), so this also confirms
    // that a hex address survives untouched in the indexer URL.
    await getB3TRActionsForUser.handler({ wallet: HEX_WALLET } as any)

    expect(mockResolveVns).toHaveBeenCalledTimes(1)
    expect(mockResolveVns).toHaveBeenCalledWith(HEX_WALLET)

    const [callArg] = mockGet.mock.calls[0]
    expect(callArg.endPoint).toBe(`/api/v1/b3tr/actions/users/${HEX_WALLET}`)
  })

  test('resolves a VNS name and uses the returned address in the URL', async () => {
    mockResolveVns.mockResolvedValueOnce(VNS_RESOLVED as `0x${string}`)

    await getB3TRActionsForUser.handler({ wallet: VNS_NAME } as any)

    expect(mockResolveVns).toHaveBeenCalledTimes(1)
    expect(mockResolveVns).toHaveBeenCalledWith(VNS_NAME)

    expect(mockGet).toHaveBeenCalledTimes(1)
    const [callArg] = mockGet.mock.calls[0]
    expect(callArg.endPoint).toBe(`/api/v1/b3tr/actions/users/${VNS_RESOLVED}`)
    expect(callArg.endPoint).not.toContain(VNS_NAME)
    expect(callArg.endPoint).not.toContain('.vet')
  })

  test('combines VNS resolution with appId and timestamp filters', async () => {
    mockResolveVns.mockResolvedValueOnce(VNS_RESOLVED as `0x${string}`)
    const APP_ID = '0x2fc30c2ad41a2994061efaf218f1d52dc92bc4a31a0f02a4916490076a7a393a'
    const AFTER_S = 1754179200
    const BEFORE_S = 1754265600

    await getB3TRActionsForUser.handler({
      wallet: VNS_NAME,
      appId: APP_ID,
      after: AFTER_S,
      before: BEFORE_S,
    } as any)

    const [callArg] = mockGet.mock.calls[0]
    expect(callArg.endPoint).toBe(`/api/v1/b3tr/actions/users/${VNS_RESOLVED}`)
    expect((callArg.params as any).appId).toBe(APP_ID)
    expect((callArg.params as any).after).toBe(AFTER_S)
    expect((callArg.params as any).before).toBe(BEFORE_S)
  })

  test('propagates a VNS resolution failure as a tool error response', async () => {
    mockResolveVns.mockRejectedValueOnce(new Error(`Unknown VNS name: ${VNS_NAME}`))

    const result = await getB3TRActionsForUser.handler({ wallet: VNS_NAME } as any)

    expect(mockGet).not.toHaveBeenCalled()
    expect(result.structuredContent).toMatchObject({ ok: false })
    const errMsg = (result.structuredContent as any).error as string
    expect(errMsg).toContain('Unknown VNS name')
  })
})
