import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type IndexerGetValidatorBlockRewardsResponse,
  IndexerGetValidatorBlockRewardsResponseSchema,
} from '../../src/tools/get-validator-block-rewards'

describe('Indexer Get Validator Block Rewards', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'indexer-get-validator-block-rewards-client', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test(
    'should fetch validator block rewards with optional filters',
    async () => {
      const response = await client.callTool({
        name: 'getValidatorBlockRewards',
        arguments: {
          page: 0,
          size: 5,
          direction: 'DESC',
          status: 'VALIDATED',
        },
      })
      expect(response.content).toBeDefined()
      const parsed: IndexerGetValidatorBlockRewardsResponse =
        IndexerGetValidatorBlockRewardsResponseSchema.parse(response)
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

  test(
    'should fetch MISSED blocks when status=MISSED',
    async () => {
      const response = await client.callTool({
        name: 'getValidatorBlockRewards',
        arguments: {
          page: 0,
          size: 5,
          direction: 'DESC',
          status: 'MISSED',
        },
      })
      const parsed: IndexerGetValidatorBlockRewardsResponse =
        IndexerGetValidatorBlockRewardsResponseSchema.parse(response)
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


