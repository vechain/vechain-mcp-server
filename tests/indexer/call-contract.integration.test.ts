import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const B3TR_MAINNET = '0x5ef79995FE8a89e0812330E4378eB2660ceDe699'

describe('callContract tool', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'call-contract-client', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test(
    'reads B3TR name / symbol / decimals in a single multicall',
    async () => {
      const response = await client.callTool({
        name: 'callContract',
        arguments: {
          clauses: [
            { name: 'b3tr', method: 'name' },
            { name: 'b3tr', method: 'symbol' },
            { name: 'b3tr', method: 'decimals' },
          ],
        },
      })
      const sc = (response as any).structuredContent
      expect(sc.ok).toBe(true)
      const r = sc.data.results
      expect(r).toHaveLength(3)
      for (const item of r) expect(item.success).toBe(true)
      expect(r[0].decoded).toBe('B3TR')
      expect(r[1].decoded).toBe('B3TR')
      expect(String(r[2].decoded)).toBe('18')
    },
    30000,
  )

  test(
    'allows calling erc20 against an arbitrary address (B3TR via address override)',
    async () => {
      const response = await client.callTool({
        name: 'callContract',
        arguments: {
          clauses: [
            { name: 'erc20', address: B3TR_MAINNET, method: 'totalSupply' },
            { name: 'erc20', address: B3TR_MAINNET, method: 'symbol' },
          ],
        },
      })
      const sc = (response as any).structuredContent
      expect(sc.ok).toBe(true)
      const [totalSupply, symbol] = sc.data.results
      expect(totalSupply.success).toBe(true)
      expect(BigInt(totalSupply.decoded as string)).toBeGreaterThan(0n)
      expect(symbol.success).toBe(true)
      expect(symbol.decoded).toBe('B3TR')
    },
    30000,
  )

  test(
    'returns a controlled error for unknown method names',
    async () => {
      const response = await client.callTool({
        name: 'callContract',
        arguments: {
          clauses: [{ name: 'b3tr', method: 'doesNotExist' }],
        },
      })
      const sc = (response as any).structuredContent
      expect(sc.ok).toBe(false)
      expect(sc.error).toMatch(/not found|doesNotExist/i)
    },
    30000,
  )

  test(
    'rejects erc20 / erc721 without an explicit address',
    async () => {
      const response = await client.callTool({
        name: 'callContract',
        arguments: {
          clauses: [{ name: 'erc20', method: 'totalSupply' }],
        },
      })
      const sc = (response as any).structuredContent
      expect(sc.ok).toBe(false)
      expect(sc.error).toMatch(/explicit address/i)
    },
    30000,
  )
})
