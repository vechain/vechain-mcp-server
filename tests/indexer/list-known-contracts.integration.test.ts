import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

describe('listKnownContracts tool', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'list-known-contracts-client', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test(
    'returns the full registry with mainnet/testnet addresses and method counts',
    async () => {
      const response = await client.callTool({
        name: 'listKnownContracts',
        arguments: {},
      })
      const sc = (response as any).structuredContent
      expect(sc.ok).toBe(true)
      const d = sc.data
      expect(d.totalCount).toBeGreaterThanOrEqual(20)
      expect(Array.isArray(d.contracts)).toBe(true)

      const categories = new Set(d.contracts.map((c: any) => c.category))
      expect(categories.has('vebetterdao')).toBe(true)
      expect(categories.has('stargate')).toBe(true)
      expect(categories.has('standard')).toBe(true)

      const b3tr = d.contracts.find((c: any) => c.name === 'b3tr')
      expect(b3tr).toBeDefined()
      expect(b3tr.addresses.mainnet).toMatch(/^0x[0-9a-fA-F]{40}$/)
      expect(b3tr.requiresAddress).toBe(false)
      expect(b3tr.methodCount.read).toBeGreaterThan(0)
      expect(b3tr.methodCount.write).toBeGreaterThan(0)

      const erc20 = d.contracts.find((c: any) => c.name === 'erc20')
      expect(erc20).toBeDefined()
      expect(erc20.requiresAddress).toBe(true)
      expect(erc20.addresses.mainnet).toBeNull()

      // ABI must NOT be part of the payload (would be huge)
      for (const c of d.contracts) expect((c as any).abi).toBeUndefined()
    },
    30000,
  )

  test(
    'filters by category',
    async () => {
      const response = await client.callTool({
        name: 'listKnownContracts',
        arguments: { category: 'stargate' },
      })
      const sc = (response as any).structuredContent
      expect(sc.ok).toBe(true)
      const d = sc.data
      expect(d.contracts.length).toBeGreaterThan(0)
      for (const c of d.contracts) expect(c.category).toBe('stargate')
    },
    30000,
  )
})
