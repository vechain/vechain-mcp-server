import { lookup as dnsLookup } from 'node:dns'
import * as http from 'node:http'
import * as https from 'node:https'
import { isIP, type LookupFunction } from 'node:net'
import { isAllowedProtocol, isBlockedAddress } from '@/utils/ssrf'

/**
 * DNS lookup wrapper that refuses to resolve a hostname to any blocked
 * (private/loopback/link-local/…) address.
 *
 * Because the HTTP client connects to exactly the address this callback
 * returns, validating here closes the destination for every physical
 * connection — the initial request AND every redirect hop — and leaves no
 * DNS-rebinding gap between the check and the connect.
 */
const safeLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { all: true, verbatim: options?.verbatim !== false }, (err, addresses) => {
    if (err) return callback(err, '', 0)
    for (const a of addresses) {
      if (isBlockedAddress(a.address)) {
        const blocked = new Error(
          `Refused to connect to blocked address ${a.address} for host ${hostname}`,
        ) as NodeJS.ErrnoException
        return callback(blocked, '', 0)
      }
    }
    if (options?.all) return callback(null, addresses)
    const first = addresses[0]
    callback(null, first.address, first.family)
  })
}

type FetchOptions = {
  timeoutMs?: number
  maxRedirects?: number
  maxBytes?: number
}

type GetResult =
  | { type: 'body'; text: string }
  | { type: 'redirect'; location: string }
  | { type: 'error' }

function httpGet(url: URL, timeoutMs: number, maxBytes: number): Promise<GetResult> {
  return new Promise(resolve => {
    let settled = false
    const done = (r: GetResult): void => {
      if (settled) return
      settled = true
      resolve(r)
    }

    const mod = url.protocol === 'https:' ? https : http
    const req = mod.request(
      url,
      {
        method: 'GET',
        lookup: safeLookup,
        headers: { Accept: 'application/json, text/plain, */*' },
      },
      res => {
        const status = res.statusCode ?? 0

        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume()
          done({ type: 'redirect', location: res.headers.location })
          return
        }
        if (status < 200 || status >= 300) {
          res.resume()
          done({ type: 'error' })
          return
        }

        let bytes = 0
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => {
          bytes += chunk.length
          if (bytes > maxBytes) {
            req.destroy()
            done({ type: 'error' })
            return
          }
          chunks.push(chunk)
        })
        res.on('end', () => done({ type: 'body', text: Buffer.concat(chunks).toString('utf8') }))
        res.on('error', () => done({ type: 'error' }))
      },
    )

    req.on('error', () => done({ type: 'error' }))
    req.setTimeout(timeoutMs, () => {
      req.destroy()
      done({ type: 'error' })
    })
    req.end()
  })
}

/**
 * Fetch a URL and parse the response body as JSON.
 *
 * Hardened against SSRF: only `http(s)` is allowed, embedded credentials are
 * rejected, redirects are followed manually (bounded) and re-validated per
 * hop, and every connection is refused if the resolved IP is private,
 * loopback, link-local, or otherwise internal. The URL host is
 * attacker-influenceable (it originates from on-chain xApp metadata), so the
 * destination — not just the input string — is what gets validated.
 *
 * Returns `null` instead of throwing when:
 *  - the URL is malformed, uses a disallowed scheme, or carries credentials,
 *  - the destination resolves to a blocked address,
 *  - the network request fails or times out,
 *  - the response status is not OK, exceeds the size cap, or is not JSON.
 *
 * Designed for best-effort metadata fetches where the caller treats a
 * missing/invalid/refused resource as a soft failure.
 */
export async function fetchJson(url: string, options: FetchOptions = {}): Promise<unknown | null> {
  const timeoutMs = options.timeoutMs ?? 15_000
  const maxRedirects = options.maxRedirects ?? 5
  const maxBytes = options.maxBytes ?? 5_000_000

  try {
    let current = url
    for (let hop = 0; hop <= maxRedirects; hop++) {
      let parsed: URL
      try {
        parsed = new URL(current)
      } catch {
        return null
      }

      if (!isAllowedProtocol(parsed.protocol)) return null
      if (parsed.username || parsed.password) return null

      // When the host is already an IP literal, the network layer connects
      // directly and never invokes `lookup`, so validate it here. Hostnames
      // are validated in `safeLookup` at resolve/connect time.
      const host = parsed.hostname.replace(/^\[|\]$/g, '')
      if (isIP(host) !== 0 && isBlockedAddress(host)) return null

      const result = await httpGet(parsed, timeoutMs, maxBytes)

      if (result.type === 'redirect') {
        if (hop === maxRedirects) return null
        try {
          current = new URL(result.location, parsed).toString()
        } catch {
          return null
        }
        continue
      }

      if (result.type === 'body') {
        try {
          return JSON.parse(result.text)
        } catch {
          return null
        }
      }

      return null
    }
    return null
  } catch {
    return null
  }
}
