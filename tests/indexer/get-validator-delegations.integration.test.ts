import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type IndexerGetValidatorDelegationsResponse,
  IndexerGetValidatorDelegationsResponseSchema,
} from '../../src/tools/get-validator-delegations'

describe('Indexer Get Validator Delegations', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'indexer-get-validator-delegations-client', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test(
    'should fetch delegations with pagination and optional status filter',
    async () => {
      const response = await client.callTool({
        name: 'getValidatorDelegations',
        arguments: {
          page: 0,
          size: 5,
          direction: 'DESC',
          statuses: ['ACTIVE'],
        },
      })
      expect(response.content).toBeDefined()
      const parsed: IndexerGetValidatorDelegationsResponse =
        IndexerGetValidatorDelegationsResponseSchema.parse(response)
      const structured = parsed.structuredContent
      expect(structured.network).toBeDefined()
      expect(typeof structured.ok).toBe('boolean')
      if (structured.ok) {
        expect(Array.isArray(structured.data)).toBe(true)
      } else {
        expect(typeof structured.error).toBe('string')
      }
    },
    60000,
  )
})


