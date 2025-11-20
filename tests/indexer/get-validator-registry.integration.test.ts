import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

describe('Validator Registry', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({
      name: 'validator-registry-client',
      version: '1.0.0',
    })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test(
    'should fetch validator registry (all)',
    async () => {
      const response = await client.callTool({
        name: 'getValidatorRegistry',
        arguments: {},
      })
      expect(response.content).toBeDefined()
      const sc = (response as any).structuredContent
      expect(typeof sc.ok).toBe('boolean')
      if (sc.ok) {
        expect(Array.isArray(sc.data)).toBe(true)
      } else {
        expect(typeof sc.error).toBe('string')
      }
    },
    30000,
  )

  test(
    'should allow filtering by address (may return empty)',
    async () => {
      const response = await client.callTool({
        name: 'getValidatorRegistry',
        arguments: { address: '0x0000000000000000000000000000000000000000' },
      })
      expect(response.content).toBeDefined()
      const sc = (response as any).structuredContent
      expect(typeof sc.ok).toBe('boolean')
      if (sc.ok) {
        expect(Array.isArray(sc.data)).toBe(true)
      } else {
        expect(typeof sc.error).toBe('string')
      }
    },
    30000,
  )
})


