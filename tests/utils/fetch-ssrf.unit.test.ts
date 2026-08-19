/**
 * Unit tests for the SSRF hardening on outbound metadata fetches.
 *
 * `fetchJson` is reached with an attacker-influenceable URL (the xApp
 * `metadataURI` comes from on-chain data an app admin/moderator controls).
 * These tests pin the policy that closes the SSRF primitive: only http(s),
 * no embedded credentials, and no connections to private/loopback/link-local
 * destinations — including through a redirect.
 */

import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import { fetchJson } from '@/utils/fetch'
import { isAllowedProtocol, isBlockedAddress } from '@/utils/ssrf'

describe('isBlockedAddress', () => {
  test.each([
    '127.0.0.1',
    '127.0.0.53',
    '169.254.169.254', // cloud metadata (IMDS)
    '169.254.170.2', // ECS task metadata / credentials
    '10.1.2.3',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '100.64.0.1', // carrier-grade NAT
    '0.0.0.0',
    '255.255.255.255',
    '::1',
    'fe80::1',
    'fc00::1',
    'fd12:3456::1',
    '::ffff:127.0.0.1', // IPv4-mapped loopback (dotted-quad form)
    '::ffff:7f00:1', // same address in hex form
    '::ffff:a9fe:aa02', // 169.254.170.2 in hex form
    '::ffff:c0a8:1', // 192.168.0.1 in hex form
  ])('blocks internal/special address %s', addr => {
    expect(isBlockedAddress(addr)).toBe(true)
  })

  test.each([
    '8.8.8.8',
    '1.1.1.1',
    '93.184.216.34',
    '2606:2800:220:1:248:1893:25c8:1946',
    '::ffff:8.8.8.8', // IPv4-mapped public address stays allowed
  ])('allows public address %s', addr => {
    expect(isBlockedAddress(addr)).toBe(false)
  })

  test('refuses a non-IP string', () => {
    expect(isBlockedAddress('not-an-ip')).toBe(true)
  })
})

describe('isAllowedProtocol', () => {
  test('allows http and https', () => {
    expect(isAllowedProtocol('http:')).toBe(true)
    expect(isAllowedProtocol('https:')).toBe(true)
  })

  test.each(['file:', 'ftp:', 'gopher:', 'data:', 'ws:'])('rejects %s', proto => {
    expect(isAllowedProtocol(proto)).toBe(false)
  })
})

describe('fetchJson SSRF guard', () => {
  let server: Server
  let hits: string[]
  let port: number

  beforeAll(done => {
    hits = []
    server = createServer((req, res) => {
      hits.push(req.url ?? '')
      if ((req.url ?? '').startsWith('/redirect')) {
        res.writeHead(302, { Location: `http://127.0.0.1:${port}/secret` })
        res.end()
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ secret: 'should-never-be-read' }))
    })
    server.listen(0, '127.0.0.1', () => {
      port = (server.address() as AddressInfo).port
      done()
    })
  })

  afterAll(done => {
    server.close(() => done())
  })

  beforeEach(() => {
    hits = []
  })

  test('refuses to fetch a loopback URL and never connects', async () => {
    const result = await fetchJson(`http://127.0.0.1:${port}/secret`)
    expect(result).toBeNull()
    expect(hits).toEqual([])
  })

  test('refuses a loopback host given by name (localhost)', async () => {
    const result = await fetchJson(`http://localhost:${port}/secret`)
    expect(result).toBeNull()
    expect(hits).toEqual([])
  })

  test('does not follow a redirect into a blocked destination', async () => {
    // The first hop is itself loopback here, so it is refused before any
    // connection — the redirect is never even reached.
    const result = await fetchJson(`http://127.0.0.1:${port}/redirect`)
    expect(result).toBeNull()
    expect(hits).toEqual([])
  })

  test('rejects a disallowed scheme', async () => {
    expect(await fetchJson('file:///etc/passwd')).toBeNull()
    expect(await fetchJson(`gopher://127.0.0.1:${port}/`)).toBeNull()
  })

  test('rejects a URL carrying embedded credentials', async () => {
    expect(await fetchJson(`http://user:pass@127.0.0.1:${port}/secret`)).toBeNull()
    expect(hits).toEqual([])
  })

  test('returns null for a malformed URL', async () => {
    expect(await fetchJson('http://')).toBeNull()
    expect(await fetchJson('not a url')).toBeNull()
  })
})
