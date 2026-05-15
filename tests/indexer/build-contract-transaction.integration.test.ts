import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const B3TR_MAINNET = '0x5ef79995FE8a89e0812330E4378eB2660ceDe699'
const VOT3_MAINNET = '0x76Ca782B59C74d088C7D2Cce2f211BC00836c602'

// keccak256("transfer(address,uint256)")[:8]
const TRANSFER_SELECTOR = '0xa9059cbb'
// keccak256("approve(address,uint256)")[:8]
const APPROVE_SELECTOR = '0x095ea7b3'

describe('buildContractTransaction tool', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'build-contract-transaction-client', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test(
    'encodes a single B3TR.transfer clause (no simulation)',
    async () => {
      const response = await client.callTool({
        name: 'buildContractTransaction',
        arguments: {
          simulate: false,
          clauses: [
            {
              name: 'b3tr',
              method: 'transfer',
              args: ['0x0000000000000000000000000000000000000001', '1000000000000000000'],
              comment: 'send 1 B3TR',
            },
          ],
        },
      })
      const sc = (response as any).structuredContent
      expect(sc.ok).toBe(true)
      const d = sc.data
      expect(d.clauses).toHaveLength(1)
      const c = d.clauses[0]
      expect(c.to.toLowerCase()).toBe(B3TR_MAINNET.toLowerCase())
      expect(c.data.toLowerCase().startsWith(TRANSFER_SELECTOR)).toBe(true)
      expect(c.value === '0x0' || c.value === '0x' || c.value === '0').toBe(true)
      expect(c.comment).toBe('send 1 B3TR')
      expect(d.simulation).toBeNull()
      expect(d.signingHints.note).toMatch(/server does not sign/i)
    },
    30000,
  )

  test(
    'bundles multiple clauses (approve + transfer on two different contracts)',
    async () => {
      const response = await client.callTool({
        name: 'buildContractTransaction',
        arguments: {
          simulate: false,
          clauses: [
            {
              name: 'b3tr',
              method: 'approve',
              args: ['0x0000000000000000000000000000000000000002', '1000000000000000000'],
            },
            {
              name: 'vot3',
              method: 'transfer',
              args: ['0x0000000000000000000000000000000000000003', '2000000000000000000'],
            },
          ],
        },
      })
      const sc = (response as any).structuredContent
      expect(sc.ok).toBe(true)
      const [c0, c1] = sc.data.clauses
      expect(c0.to.toLowerCase()).toBe(B3TR_MAINNET.toLowerCase())
      expect(c0.data.toLowerCase().startsWith(APPROVE_SELECTOR)).toBe(true)
      expect(c1.to.toLowerCase()).toBe(VOT3_MAINNET.toLowerCase())
      expect(c1.data.toLowerCase().startsWith(TRANSFER_SELECTOR)).toBe(true)
    },
    30000,
  )

  test(
    'returns simulation results when simulate=true',
    async () => {
      const response = await client.callTool({
        name: 'buildContractTransaction',
        arguments: {
          simulate: true,
          clauses: [
            { name: 'b3tr', method: 'name', args: [] },
            { name: 'b3tr', method: 'decimals', args: [] },
          ],
        },
      })
      const sc = (response as any).structuredContent
      expect(sc.ok).toBe(true)
      expect(sc.data.simulation).not.toBeNull()
      expect(sc.data.simulation.ok).toBe(true)
      expect(sc.data.simulation.results).toHaveLength(2)
      for (const r of sc.data.simulation.results) expect(r.success).toBe(true)
    },
    30000,
  )

  test(
    'rejects unknown methods before sending anything',
    async () => {
      const response = await client.callTool({
        name: 'buildContractTransaction',
        arguments: {
          simulate: false,
          clauses: [{ name: 'b3tr', method: 'doesNotExist' }],
        },
      })
      const sc = (response as any).structuredContent
      expect(sc.ok).toBe(false)
      expect(sc.error).toMatch(/not found|doesNotExist/i)
    },
    30000,
  )
})
