import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type GetB3TRProposalsResultsResponse,
  ResponseSchema as GetB3TRProposalsResultsResponseSchema,
} from '@/tools/get-b3tr-proposals-results'

// Note: This test uses the custom proposals endpoint (mainnet.dead.prod.veworld.vechain.org)
// which is separate from the regular indexer until it's in production
describe('Indexer B3TR Proposals Results', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'b3tr-proposals-results', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test(
    'should fetch proposals results with default parameters',
    async () => {
      const response = await client.callTool({
        name: 'getB3TRProposalsResults',
        arguments: { page: 0, size: 5 },
      })
      const parsed: GetB3TRProposalsResultsResponse =
        GetB3TRProposalsResultsResponseSchema.parse(response)
      const { structuredContent } = parsed
      expect(structuredContent.network).toBeDefined()
      expect(typeof structuredContent.ok).toBe('boolean')
      
      if (structuredContent.ok && structuredContent.data) {
        expect(structuredContent.data).toHaveProperty('data')
        expect(structuredContent.data).toHaveProperty('pagination')
        expect(Array.isArray(structuredContent.data.data)).toBe(true)
      }
    },
    30000,
  )

  test(
    'should fetch proposals results filtered by states',
    async () => {
      const response = await client.callTool({
        name: 'getB3TRProposalsResults',
        arguments: { page: 0, size: 5, states: ['Pending', 'Active'] },
      })
      const parsed: GetB3TRProposalsResultsResponse =
        GetB3TRProposalsResultsResponseSchema.parse(response)
      const { structuredContent } = parsed
      expect(structuredContent.network).toBeDefined()
      expect(typeof structuredContent.ok).toBe('boolean')
      
      if (structuredContent.ok && structuredContent.data) {
        expect(structuredContent.data).toHaveProperty('data')
        expect(structuredContent.data).toHaveProperty('pagination')
        
        // Verify that all returned proposals have one of the requested states
        if (structuredContent.data.data.length > 0) {
          structuredContent.data.data.forEach((proposal: any) => {
            expect(['Pending', 'Active']).toContain(proposal.state)
          })
        }
      }
    },
    30000,
  )
})

