import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type GetB3TRProposalCommentsResponse,
  ResponseSchema as GetB3TRProposalCommentsResponseSchema,
} from '@/tools/get-b3tr-proposal-comments'

// Note: This test uses the custom proposals endpoint (mainnet.dead.prod.veworld.vechain.org)
// which is separate from the regular indexer until it's in production
describe('Indexer B3TR Proposal Comments', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'b3tr-proposal-comments', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test(
    'should fetch proposal comments with all parameters',
    async () => {
      // Using a known proposal ID from the example
      const proposalId = '97491073388384852746964012881263645574381426623597617966579755174256098885050'
      
      const response = await client.callTool({
        name: 'getB3TRProposalComments',
        arguments: { 
          proposalId,
          page: 0, 
          size: 5 
        },
      })
      
      const parsed: GetB3TRProposalCommentsResponse =
        GetB3TRProposalCommentsResponseSchema.parse(response)
      const { structuredContent } = parsed
      
      expect(structuredContent.network).toBeDefined()
      expect(typeof structuredContent.ok).toBe('boolean')
      
      if (structuredContent.ok && structuredContent.data) {
        expect(structuredContent.data).toHaveProperty('data')
        expect(structuredContent.data).toHaveProperty('pagination')
        expect(Array.isArray(structuredContent.data.data)).toBe(true)
        
        // Check structure of comments if any exist
        if (structuredContent.data.data.length > 0) {
          const comment = structuredContent.data.data[0]
          expect(comment).toHaveProperty('blockNumber')
          expect(comment).toHaveProperty('blockTimestamp')
          expect(comment).toHaveProperty('voter')
          expect(comment).toHaveProperty('proposalId')
          expect(comment).toHaveProperty('support')
          expect(comment).toHaveProperty('weight')
          expect(comment).toHaveProperty('power')
          expect(comment).toHaveProperty('reason')
          expect(['FOR', 'AGAINST', 'ABSTAIN']).toContain(comment.support)
        }
      }
    },
    30000,
  )

  test(
    'should filter comments by support type',
    async () => {
      const proposalId = '97491073388384852746964012881263645574381426623597617966579755174256098885050'
      
      const response = await client.callTool({
        name: 'getB3TRProposalComments',
        arguments: { 
          proposalId,
          support: 'AGAINST',
          page: 0, 
          size: 5 
        },
      })
      
      const parsed: GetB3TRProposalCommentsResponse =
        GetB3TRProposalCommentsResponseSchema.parse(response)
      const { structuredContent } = parsed
      
      expect(structuredContent.network).toBeDefined()
      expect(typeof structuredContent.ok).toBe('boolean')
      
      if (structuredContent.ok && structuredContent.data) {
        expect(structuredContent.data).toHaveProperty('data')
        
        // Verify all returned comments have the requested support type
        if (structuredContent.data.data.length > 0) {
          structuredContent.data.data.forEach((comment: any) => {
            expect(comment.support).toBe('AGAINST')
          })
        }
      }
    },
    30000,
  )
})

