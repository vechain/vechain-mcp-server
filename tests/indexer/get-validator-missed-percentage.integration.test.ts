import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type IndexerGetValidatorMissedPercentageResponse,
  IndexerGetValidatorMissedPercentageResponseSchema,
} from '../../src/tools/get-validator-missed-percentage'

describe('Indexer Get Validator Missed Percentage', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'indexer-get-validator-missed-percentage-client', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test(
    'should return percentage for a validator between blocks',
    async () => {
      const response = await client.callTool({
        name: 'getValidatorMissedPercentage',
        arguments: {
          validator: '0x9624dc90c91e3d90fa9a7d3b15affec8f53e025b',
          startBlock: 1000000000,
        },
      })
      const parsed: IndexerGetValidatorMissedPercentageResponse =
        IndexerGetValidatorMissedPercentageResponseSchema.parse(response)
      const structured = parsed.structuredContent
      expect(structured.network).toBeDefined()
      expect(typeof structured.ok).toBe('boolean')
      if (structured.ok) {
        expect(typeof structured.data === 'number' || structured.data === null).toBe(true)
      } else {
        expect(typeof structured.error).toBe('string')
      }
    },
    60000,
  )
})


