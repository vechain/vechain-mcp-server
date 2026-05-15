import { timingSafeEqual } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

/**
 * Extract a bearer token from the request's `Authorization` header.
 *
 * Returns the empty string when the header is missing or does not start
 * with the literal `Bearer ` prefix.
 */
export function extractBearer(req: Pick<Request, 'headers'>): string {
  const header = req.headers.authorization
  if (typeof header !== 'string') return ''
  const prefix = 'Bearer '
  if (!header.startsWith(prefix)) return ''
  return header.slice(prefix.length).trim()
}

/**
 * Constant-time string comparison.
 *
 * Wraps `crypto.timingSafeEqual` so callers can pass strings of any length
 * without it throwing on length mismatch (in which case the result is
 * always false).
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export interface CreateAuthMiddlewareOptions {
  /**
   * When true, the middleware short-circuits and lets every request through.
   * Intended only for local development and the integration-test harness;
   * the entry point that wires this option is expected to refuse to start
   * when it is true in a production environment.
   */
  disabled?: boolean
}

/**
 * Build an Express middleware that enforces a single bearer API key.
 *
 * - If `options.disabled` is true, the middleware passes every request
 *   through unauthenticated. The caller is responsible for refusing to
 *   enable this in production.
 * - Otherwise if `apiKey` is empty, the middleware fails closed and
 *   responds with 503 — every request to a protected route is rejected.
 *   There is no anonymous-allowed mode in production; operators must wire
 *   the env.
 * - Otherwise the middleware reads `Authorization: Bearer <token>` and
 *   compares the token against `apiKey` in constant time. A missing,
 *   malformed, or mismatched token gets a 401.
 *
 * `/health` and `/ready` are intentionally not wired to this middleware
 * so the load balancer's health probe can run unauthenticated.
 */
export function createAuthMiddleware(
  apiKey: string,
  options: CreateAuthMiddlewareOptions = {},
) {
  const disabled = Boolean(options.disabled)

  return function authMiddleware(req: Request, res: Response, next: NextFunction): void {
    if (disabled) {
      next()
      return
    }

    if (!apiKey) {
      res.status(503).json({ error: 'Server misconfigured: API key not set' })
      return
    }

    const presented = extractBearer(req)
    if (!presented || !safeEqual(presented, apiKey)) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    next()
  }
}
