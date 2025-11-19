import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type VevoteProposalResultsToolResponse,
  VevoteProposalResultsToolResponseSchema,
} from '../../src/tools/get-vevote-proposal-results'

describe('VeVote Proposal Results', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'vevote-proposal-results', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test('should fetch results by support (requires at least one of proposalId or support)', async () => {
    const response = await client.callTool({
      name: 'getVevoteProposalResults',
      arguments: { support: 'AGAINST', page: 0, size: 5 },
    })
    const parsed: VevoteProposalResultsToolResponse =
      VevoteProposalResultsToolResponseSchema.parse(response)
    const s = parsed.structuredContent
    expect(typeof s.ok).toBe('boolean')
    if (s.ok) {
      expect(Array.isArray(s.data)).toBe(true)
    } else {
      expect(typeof s.error).toBe('string')
    }
  }, 60000)
})


