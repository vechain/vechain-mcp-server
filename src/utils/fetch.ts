import { lookup as dnsLookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { isAllowedProtocol, isBlockedAddress } from '@/utils/ssrf'

type FetchOptions = {
  timeoutMs?: number
  maxRedirects?: number
}

/**
 * True when `url` may be fetched: the scheme is http(s), it carries no
 * embedded credentials, and its host does not resolve to an internal
 * (private/loopback/link-local/reserved) address.
 *
 * Literal-IP hosts are checked directly; hostnames are resolved and every
 * returned address must be acceptable, so a name that maps to both a public
 * and an internal address is refused rather than raced.
 */
async function isAllowedDestination(url: URL): Promise<boolean> {
  if (!isAllowedProtocol(url.protocol)) return false
  if (url.username || url.password) return false

  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (isIP(host) !== 0) return !isBlockedAddress(host)

  try {
    const addresses = await dnsLookup(host, { all: true })
    if (addresses.length === 0) return false
    return addresses.every(a => !isBlockedAddress(a.address))
  } catch {
    return false
  }
}

/**
 * Fetch a URL and parse the response body as JSON.
 *
 * The URL is attacker-influenceable — it originates from on-chain xApp
 * metadata, where an app admin/moderator can set an arbitrary absolute
 * `http(s)` URL — so the destination is validated, not just the input
 * string: only http(s), no embedded credentials, and no host that resolves
 * to a private/loopback/link-local/reserved address. Redirects are followed
 * manually (bounded) so every hop is validated the same way rather than
 * letting a public first hop bounce the request inward.
 *
 * Note: validation resolves the hostname and the subsequent request resolves
 * it again, so a DNS entry that changes between the two could still be
 * followed (classic DNS-rebinding). Closing that would require pinning the
 * connection to the validated address via a custom dispatcher; the checks
 * here block the practical vector, which is a URL pointing straight at an
 * internal host.
 *
 * Returns `null` instead of throwing when:
 *  - the URL is malformed, uses a disallowed scheme, or carries credentials,
 *  - the destination resolves to a blocked address,
 *  - the network request fails or times out,
 *  - too many redirects are followed,
 *  - the response status is not OK, or the body cannot be parsed as JSON.
 *
 * Designed for best-effort metadata fetches where the caller treats a
 * missing/invalid/refused resource as a soft failure.
 */
export async function fetchJson(url: string, options: FetchOptions = {}): Promise<unknown | null> {
  const timeoutMs = options.timeoutMs ?? 30_000
  const maxRedirects = options.maxRedirects ?? 5

  try {
    let current = url

    for (let hop = 0; ; hop++) {
      let parsed: URL
      try {
        parsed = new URL(current)
      } catch {
        return null
      }

      if (!(await isAllowedDestination(parsed))) return null

      const res = await fetch(parsed, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: 'application/json, text/plain, */*' },
      })

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location')
        if (!location || hop >= maxRedirects) return null
        try {
          current = new URL(location, parsed).toString()
        } catch {
          return null
        }
        continue
      }

      if (!res.ok) return null

      const text = await res.text()
      try {
        return JSON.parse(text)
      } catch {
        return null
      }
    }
  } catch {
    return null
  }
}
