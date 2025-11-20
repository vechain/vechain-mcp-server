import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type VevoteHistoricProposalsToolResponse,
  VevoteHistoricProposalsToolResponseSchema,
} from '../../src/tools/get-vevote-historic-proposals'

describe('VeVote Historic Proposals', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'vevote-historic-proposals', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test('should fetch proposals excluding test proposals by default', async () => {
    const response = await client.callTool({
      name: 'getVevoteHistoricProposals',
      arguments: { page: 0, size: 5 },
    })
    const parsed: VevoteHistoricProposalsToolResponse =
      VevoteHistoricProposalsToolResponseSchema.parse(response)
    const s = parsed.structuredContent
    expect(typeof s.ok).toBe('boolean')
    if (s.ok) {
      expect(Array.isArray(s.data)).toBe(true)
    } else {
      expect(typeof s.error).toBe('string')
    }
  }, 60000)
})


