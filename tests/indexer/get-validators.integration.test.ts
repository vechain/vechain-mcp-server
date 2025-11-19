import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type IndexerGetValidatorsResponse,
  IndexerGetValidatorsResponseSchema,
} from '../../src/tools/get-validators'

describe('Indexer Get Validators', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'indexer-get-validators-client', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test(
    'should fetch validators with pagination and sort',
    async () => {
      const response = await client.callTool({
        name: 'getValidators',
        arguments: {
          page: 0,
          size: 5,
          direction: 'DESC',
          sortBy: 'validatorTvl',
        },
      })
      expect(response.content).toBeDefined()
      const parsed: IndexerGetValidatorsResponse = IndexerGetValidatorsResponseSchema.parse(response)
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


