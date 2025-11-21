import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

describe('App Hub: official apps', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'app-hub-client', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test(
    'should fetch all apps',
    async () => {
      const response = await client.callTool({
        name: 'getAppHubApps',
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
    'should filter by VeWorld support (may be empty)',
    async () => {
      const response = await client.callTool({
        name: 'getAppHubApps',
        arguments: { isVeWorldSupported: true },
      })
      expect(response.content).toBeDefined()
      const sc = (response as any).structuredContent
      expect(typeof sc.ok).toBe('boolean')
        expect(Array.isArray(sc.data)).toBe(true)
    },
    30000,
  )
})




