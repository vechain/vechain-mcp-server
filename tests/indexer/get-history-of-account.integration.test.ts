import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  IndexerGetHistoryOfAccountDataSchema,
  IndexerGetHistoryOfAccountResponseSchema,
} from '@/tools/get-history-of-account'

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

    expect(() => IndexerGetHistoryOfAccountResponseSchema.parse(response)).not.toThrow()
    const { content, structuredContent } = IndexerGetHistoryOfAccountResponseSchema.parse(response)

    expect(content).toBeInstanceOf(Array)
    expect(content).toHaveLength(1)
    expect(content[0]).toHaveProperty('type')
    expect(content[0]).toHaveProperty('text')

    expect(structuredContent.ok).toBe(true)
    expect(structuredContent.data).toBeInstanceOf(Array)
    expect(structuredContent.data?.length).toBeGreaterThan(0)

    expect(() => IndexerGetHistoryOfAccountDataSchema.parse(structuredContent.data)).not.toThrow()
    const outputData = IndexerGetHistoryOfAccountDataSchema.parse(structuredContent.data)
    const outputFirstItem = outputData[0]

    expect(outputData).toBeInstanceOf(Array)
    expect(outputFirstItem).toBeInstanceOf(Object)

    expect(outputFirstItem).toHaveProperty('id')
    expect(outputFirstItem).toHaveProperty('blockId')
    expect(outputFirstItem).toHaveProperty('blockNumber')
    expect(outputFirstItem).toHaveProperty('blockTimestamp')
    expect(outputFirstItem).toHaveProperty('txId')
    expect(outputFirstItem).toHaveProperty('origin')
    expect(outputFirstItem).toHaveProperty('gasPayer')
    expect(outputFirstItem).toHaveProperty('eventName')
    expect(outputFirstItem).toHaveProperty('from')
    expect(outputFirstItem).toHaveProperty('roundId')
    expect(outputFirstItem).toHaveProperty('appVotes')
    expect(outputFirstItem.appVotes).toBeInstanceOf(Array)

    for (const appVote of outputFirstItem.appVotes!) {
      expect(appVote).toBeInstanceOf(Object)
      expect(appVote).toHaveProperty('appId')
      expect(appVote).toHaveProperty('voteWeight')
    }
  })

  test('should get history of account for a VNS name (may be empty history)', async () => {
    const response = await client.callTool({
      name: 'getHistoryOfAccount',
      arguments: {
        address: 'test.vet',
      },
    })

    expect(() => IndexerGetHistoryOfAccountResponseSchema.parse(response)).not.toThrow()
    const { structuredContent } = IndexerGetHistoryOfAccountResponseSchema.parse(response)

    expect(structuredContent.ok).toBe(true)
    expect(Array.isArray(structuredContent.data)).toBe(true)
  })
})
