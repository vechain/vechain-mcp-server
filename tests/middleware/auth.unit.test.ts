/**
 * Unit tests for the bearer-token auth middleware.
 *
 * The middleware is the only enforcement point that protects the MCP HTTP
 * surface, so the tests cover both the happy path and every common ways a
 * client can fail to authenticate (missing header, wrong scheme, wrong
 * key, server misconfigured).
 */

import type { NextFunction, Request, Response } from 'express'

import { createAuthMiddleware, extractBearer, safeEqual } from '@/middleware/auth'

type MockRes = {
  status: jest.Mock<MockRes, [number]>
  json: jest.Mock<MockRes, [unknown]>
  /** Captured `(status, body)` pairs in the order .status().json() was called. */
  calls: Array<{ status: number; body: unknown }>
}

function makeRes(): MockRes {
  const state: { status?: number } = {}
  const res: Partial<MockRes> & { calls: Array<{ status: number; body: unknown }> } = {
    calls: [],
  }
  res.status = jest.fn((code: number) => {
    state.status = code
    return res as MockRes
  })
  res.json = jest.fn((body: unknown) => {
    res.calls.push({ status: state.status ?? 200, body })
    return res as MockRes
  })
  return res as MockRes
}

function makeReq(headers: Record<string, string | undefined> = {}): Request {
  return { headers } as unknown as Request
}

describe('extractBearer', () => {
  test('returns the token when the header has the Bearer prefix', () => {
    expect(extractBearer(makeReq({ authorization: 'Bearer abc123' }))).toBe('abc123')
  })

  test('trims whitespace around the token', () => {
    expect(extractBearer(makeReq({ authorization: 'Bearer   abc123  ' }))).toBe('abc123')
  })

  test('returns empty when the header is missing', () => {
    expect(extractBearer(makeReq({}))).toBe('')
  })

  test('returns empty when the header uses a different scheme', () => {
    expect(extractBearer(makeReq({ authorization: 'Basic dXNlcjpwYXNz' }))).toBe('')
  })

  test('is case-sensitive on the Bearer prefix (per RFC 6750 strictness here)', () => {
    expect(extractBearer(makeReq({ authorization: 'bearer abc123' }))).toBe('')
  })
})

describe('safeEqual', () => {
  test('returns true for identical strings', () => {
    expect(safeEqual('s3cret', 's3cret')).toBe(true)
  })

  test('returns false for different strings of the same length', () => {
    expect(safeEqual('s3cret', 's3cReT')).toBe(false)
  })

  test('returns false (does not throw) when lengths differ', () => {
    expect(safeEqual('short', 'longer-value')).toBe(false)
  })

  test('returns true for two empty strings', () => {
    expect(safeEqual('', '')).toBe(true)
  })
})

describe('createAuthMiddleware', () => {
  const KEY = 's3cret-bearer-token'
  let next: jest.Mock<void, [unknown?]>

  beforeEach(() => {
    next = jest.fn() as jest.Mock<void, [unknown?]>
  })

  test('fails closed with 503 when the API key is empty', () => {
    const middleware = createAuthMiddleware('')
    const res = makeRes()

    middleware(makeReq({ authorization: 'Bearer anything' }), res as unknown as Response, next as unknown as NextFunction)

    expect(next).not.toHaveBeenCalled()
    expect(res.calls).toEqual([
      { status: 503, body: { error: 'Server misconfigured: API key not set' } },
    ])
  })

  test('returns 401 when the Authorization header is missing', () => {
    const middleware = createAuthMiddleware(KEY)
    const res = makeRes()

    middleware(makeReq({}), res as unknown as Response, next as unknown as NextFunction)

    expect(next).not.toHaveBeenCalled()
    expect(res.calls).toEqual([{ status: 401, body: { error: 'Unauthorized' } }])
  })

  test('returns 401 when the scheme is not Bearer', () => {
    const middleware = createAuthMiddleware(KEY)
    const res = makeRes()

    middleware(
      makeReq({ authorization: `Basic ${KEY}` }),
      res as unknown as Response,
      next as unknown as NextFunction,
    )

    expect(next).not.toHaveBeenCalled()
    expect(res.calls).toEqual([{ status: 401, body: { error: 'Unauthorized' } }])
  })

  test('returns 401 when the token does not match', () => {
    const middleware = createAuthMiddleware(KEY)
    const res = makeRes()

    middleware(
      makeReq({ authorization: 'Bearer wrong-token-same-length-as-expected' }),
      res as unknown as Response,
      next as unknown as NextFunction,
    )

    expect(next).not.toHaveBeenCalled()
    expect(res.calls).toEqual([{ status: 401, body: { error: 'Unauthorized' } }])
  })

  test('returns 401 when the presented token has a different length than the key', () => {
    const middleware = createAuthMiddleware(KEY)
    const res = makeRes()

    middleware(
      makeReq({ authorization: 'Bearer too-short' }),
      res as unknown as Response,
      next as unknown as NextFunction,
    )

    expect(next).not.toHaveBeenCalled()
    expect(res.calls).toEqual([{ status: 401, body: { error: 'Unauthorized' } }])
  })

  test('passes through when the Bearer token matches the configured key', () => {
    const middleware = createAuthMiddleware(KEY)
    const res = makeRes()

    middleware(
      makeReq({ authorization: `Bearer ${KEY}` }),
      res as unknown as Response,
      next as unknown as NextFunction,
    )

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
    expect(res.json).not.toHaveBeenCalled()
  })

  test('returns 401 when only the prefix `Bearer ` is sent without a token', () => {
    const middleware = createAuthMiddleware(KEY)
    const res = makeRes()

    middleware(
      makeReq({ authorization: 'Bearer ' }),
      res as unknown as Response,
      next as unknown as NextFunction,
    )

    expect(next).not.toHaveBeenCalled()
    expect(res.calls).toEqual([{ status: 401, body: { error: 'Unauthorized' } }])
  })

  test('disabled: true passes every request through without inspecting the header', () => {
    const middleware = createAuthMiddleware(KEY, { disabled: true })
    const res = makeRes()

    middleware(makeReq({}), res as unknown as Response, next as unknown as NextFunction)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
    expect(res.json).not.toHaveBeenCalled()
  })

  test('disabled: true also bypasses the empty-key fail-closed branch', () => {
    const middleware = createAuthMiddleware('', { disabled: true })
    const res = makeRes()

    middleware(makeReq({}), res as unknown as Response, next as unknown as NextFunction)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })
})
