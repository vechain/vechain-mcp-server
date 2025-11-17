import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type IndexerGetHistoryOfAccountStructuredResponseType,
  IndexerGetHistoryOfAccountStructuredSchema,
} from '../../src/services/veworld-indexer/schemas'

describe('Indexer Get History of Account', () => {
  let client: Client

  beforeAll(async () => {
    client = new Client({
      name: 'indexer-get-history-of-account-client',
      version: '1.0.0',
    })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'), {
      reconnectionOptions: {
        maxReconnectionDelay: 1000,
        initialReconnectionDelay: 100,
        reconnectionDelayGrowFactor: 1.5,
        maxRetries: 0,
      },
    })
    await client.connect(transport)
  })

  afterAll(async () => {
    await client.close()
  })

  test('should get history of account with valid structured output', async () => {
    const response = await client.callTool({
      name: 'getHistoryOfAccount',
      arguments: {
        address: '0x311E811cd3fC29Ba17D45B04c882245FA69DC776',
      },
    })
    expect(response.content).toBeDefined()
    expect(response.structuredContent).toBeDefined()
    // parse the structured content
    const structuredData: IndexerGetHistoryOfAccountStructuredResponseType =
      IndexerGetHistoryOfAccountStructuredSchema.parse(response.structuredContent)
    expect(structuredData.ok).toBe(true)
    expect(structuredData.data).toBeDefined()
    expect(structuredData.data).not.toBeNull()
    expect(structuredData.data).toBeInstanceOf(Array)
    expect(structuredData.data?.length ?? 0).toBeGreaterThan(0)
    // check length of content
    expect((response.content as unknown as string).length).toBeGreaterThan(0)
  })
})
