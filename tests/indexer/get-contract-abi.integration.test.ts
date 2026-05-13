import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

describe('getContractAbi tool', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'get-contract-abi-client', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test(
    'returns only the requested method fragments',
    async () => {
      const response = await client.callTool({
        name: 'getContractAbi',
        arguments: { name: 'b3tr', methodNames: ['balanceOf', 'transfer'] },
      })
      const sc = (response as any).structuredContent
      expect(sc.ok).toBe(true)
      const d = sc.data
      expect(d.name).toBe('b3tr')
      expect(d.abi.length).toBe(2)
      const names = new Set(d.abi.map((f: any) => f.name))
      expect(names.has('balanceOf')).toBe(true)
      expect(names.has('transfer')).toBe(true)
      const balanceOf = d.abi.find((f: any) => f.name === 'balanceOf')
      expect(balanceOf.stateMutability).toBe('view')
    },
    30000,
  )

  test(
    'filters by stateMutability=view',
    async () => {
      const response = await client.callTool({
        name: 'getContractAbi',
        arguments: { name: 'erc20', stateMutability: 'view' },
      })
      const sc = (response as any).structuredContent
      expect(sc.ok).toBe(true)
      const d = sc.data
      expect(d.abi.length).toBeGreaterThan(0)
      for (const f of d.abi) {
        expect(f.type).toBe('function')
        expect(f.stateMutability).toBe('view')
      }
    },
    30000,
  )

  test(
    'truncates large unfiltered ABIs and returns the method-name index instead',
    async () => {
      const response = await client.callTool({
        name: 'getContractAbi',
        arguments: { name: 'b3trGovernor' },
      })
      const sc = (response as any).structuredContent
      expect(sc.ok).toBe(true)
      const d = sc.data
      if (d.truncatedDueToSize) {
        expect(d.abi.length).toBe(0)
        expect(Array.isArray(d.methodNames)).toBe(true)
        expect(d.methodNames.length).toBeGreaterThan(0)
      } else {
        expect(d.abi.length).toBeGreaterThan(0)
      }
    },
    30000,
  )

  test(
    'returns an error for unknown contract names',
    async () => {
      const response = await client.callTool({
        name: 'getContractAbi',
        arguments: { name: 'not-a-real-contract' },
      })
      const sc = (response as any).structuredContent
      expect(sc.ok).toBe(false)
      expect(sc.error).toMatch(/unknown/i)
    },
    30000,
  )
})
