import { BlockList, isIP } from 'node:net'

/**
 * SSRF hardening for outbound metadata fetches.
 *
 * The xApp `metadataURI` is attacker-influenceable on-chain data (an app
 * admin/moderator can set it to any absolute `http(s)://` URL). Fetching it
 * server-side without restriction lets that URL point at loopback, the
 * link-local metadata endpoint, or any private/internal host the server can
 * reach. This module centralises the IP-range policy used to refuse those
 * destinations.
 */

/**
 * Block list of IP ranges that must never be reached by a metadata fetch:
 * loopback, private (RFC1918), carrier-grade NAT, link-local (incl. the cloud
 * metadata endpoint 169.254.169.254 / the ECS task metadata 169.254.170.2),
 * unique-local IPv6, multicast, and other reserved/special-use ranges.
 */
const blockList = new BlockList()

// ---- IPv4 -----------------------------------------------------------------
blockList.addSubnet('0.0.0.0', 8, 'ipv4') // "this host" / unspecified
blockList.addSubnet('10.0.0.0', 8, 'ipv4') // private
blockList.addSubnet('100.64.0.0', 10, 'ipv4') // carrier-grade NAT
blockList.addSubnet('127.0.0.0', 8, 'ipv4') // loopback
blockList.addSubnet('169.254.0.0', 16, 'ipv4') // link-local (cloud/ECS metadata)
blockList.addSubnet('172.16.0.0', 12, 'ipv4') // private
blockList.addSubnet('192.0.0.0', 24, 'ipv4') // IETF protocol assignments
blockList.addSubnet('192.0.2.0', 24, 'ipv4') // TEST-NET-1
blockList.addSubnet('192.168.0.0', 16, 'ipv4') // private
blockList.addSubnet('198.18.0.0', 15, 'ipv4') // benchmarking
blockList.addSubnet('198.51.100.0', 24, 'ipv4') // TEST-NET-2
blockList.addSubnet('203.0.113.0', 24, 'ipv4') // TEST-NET-3
blockList.addSubnet('224.0.0.0', 4, 'ipv4') // multicast
blockList.addSubnet('240.0.0.0', 4, 'ipv4') // reserved (incl. 255.255.255.255)

// ---- IPv6 -----------------------------------------------------------------
blockList.addAddress('::', 'ipv6') // unspecified
blockList.addAddress('::1', 'ipv6') // loopback
blockList.addSubnet('fc00::', 7, 'ipv6') // unique-local
blockList.addSubnet('fe80::', 10, 'ipv6') // link-local
blockList.addSubnet('ff00::', 8, 'ipv6') // multicast
blockList.addSubnet('64:ff9b::', 96, 'ipv6') // NAT64 (maps to IPv4)

/**
 * Pull the embedded IPv4 out of an IPv4-mapped / IPv4-compatible IPv6 address
 * (e.g. `::ffff:127.0.0.1` or `::ffff:7f00:1`). Returns null when the address
 * does not embed an IPv4 value.
 */
function embeddedIPv4(address: string): string | null {
  const lower = address.toLowerCase()
  const idx = lower.lastIndexOf(':')
  if (idx === -1) return null
  const tail = address.slice(idx + 1)
  // Dotted-quad tail, e.g. ::ffff:169.254.169.254
  if (isIP(tail) === 4 && (lower.startsWith('::ffff:') || lower.startsWith('::'))) {
    return tail
  }
  return null
}

/**
 * True when `address` (a resolved IP literal) falls inside any blocked range.
 * IPv4-mapped IPv6 forms are unwrapped so `::ffff:127.0.0.1` is caught too.
 */
export function isBlockedAddress(address: string): boolean {
  const family = isIP(address)
  if (family === 0) return true // not a valid IP literal → refuse

  if (family === 4) return blockList.check(address, 'ipv4')

  // IPv6: check directly, and also unwrap any embedded IPv4.
  if (blockList.check(address, 'ipv6')) return true
  const v4 = embeddedIPv4(address)
  if (v4 && blockList.check(v4, 'ipv4')) return true
  return false
}

/**
 * Only `http:` and `https:` may be fetched. Anything else (file:, ftp:,
 * gopher:, data:, ...) is refused outright.
 */
export function isAllowedProtocol(protocol: string): boolean {
  return protocol === 'http:' || protocol === 'https:'
}
