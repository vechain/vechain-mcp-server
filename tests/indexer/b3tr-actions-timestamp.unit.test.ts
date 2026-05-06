/**
 * Unit tests for B3TR actions timestamp handling.
 *
 * CONTEXT: The veworld-indexer B3TR actions API (/api/v1/b3tr/actions/...) internally
 * expects `after`/`before` query params in **milliseconds**. All other MCP tools
 * (getHistoryOfAccount, getTransactions, etc.) expose `after`/`before` in **seconds**.
 *
 * To keep the user-facing API consistent, both `getB3TRActionsForApp` and
 * `getB3TRActionsForUser` accept seconds and convert to milliseconds before the
 * HTTP request. These tests verify schema validation and the conversion logic.
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

const mockGet = veworldIndexerGet as jest.MockedFunction<typeof veworldIndexerGet>

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
// Seconds → milliseconds conversion tests (handler calls mock with ms)
// ---------------------------------------------------------------------------

describe('getB3TRActionsForApp — seconds-to-milliseconds conversion', () => {
  const APP_ID = '0x3a66df25581b931b27557101b2d93f87e43c550d0675599f7a6029e9943a1566'

  test('multiplies after by 1000 before calling the indexer', async () => {
    await getB3TRActionsForApp.handler({ appId: APP_ID, after: 1754179200 } as any)
    expect(mockGet).toHaveBeenCalledTimes(1)
    const [callArg] = mockGet.mock.calls[0]
    expect((callArg.params as any).after).toBe(1754179200 * 1000)
  })

  test('multiplies before by 1000 before calling the indexer', async () => {
    await getB3TRActionsForApp.handler({ appId: APP_ID, before: 1754265600 } as any)
    const [callArg] = mockGet.mock.calls[0]
    expect((callArg.params as any).before).toBe(1754265600 * 1000)
  })

  test('converts both after and before simultaneously', async () => {
    const AFTER_S = 1754179200
    const BEFORE_S = 1754265600
    await getB3TRActionsForApp.handler({ appId: APP_ID, after: AFTER_S, before: BEFORE_S } as any)
    const [callArg] = mockGet.mock.calls[0]
    expect((callArg.params as any).after).toBe(AFTER_S * 1000)
    expect((callArg.params as any).before).toBe(BEFORE_S * 1000)
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

describe('getB3TRActionsForUser — seconds-to-milliseconds conversion', () => {
  const WALLET = '0x311E811cd3fC29Ba17D45B04c882245FA69DC776'

  test('multiplies after by 1000 before calling the indexer', async () => {
    await getB3TRActionsForUser.handler({ wallet: WALLET, after: 1754179200 } as any)
    expect(mockGet).toHaveBeenCalledTimes(1)
    const [callArg] = mockGet.mock.calls[0]
    expect((callArg.params as any).after).toBe(1754179200 * 1000)
  })

  test('multiplies before by 1000 before calling the indexer', async () => {
    await getB3TRActionsForUser.handler({ wallet: WALLET, before: 1754265600 } as any)
    const [callArg] = mockGet.mock.calls[0]
    expect((callArg.params as any).before).toBe(1754265600 * 1000)
  })

  test('converts both after and before simultaneously', async () => {
    const AFTER_S = 1754179200
    const BEFORE_S = 1754265600
    await getB3TRActionsForUser.handler({
      wallet: WALLET,
      after: AFTER_S,
      before: BEFORE_S,
    } as any)
    const [callArg] = mockGet.mock.calls[0]
    expect((callArg.params as any).after).toBe(AFTER_S * 1000)
    expect((callArg.params as any).before).toBe(BEFORE_S * 1000)
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
