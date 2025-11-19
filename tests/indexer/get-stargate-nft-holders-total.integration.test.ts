import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  type IndexerStargateNftHoldersTotalResponse,
  IndexerStargateNftHoldersTotalResponseSchema,
} from '../../src/tools/get-stargate-nft-holders-total'

describe('Indexer Stargate NFT Holders Total', () => {
  let client: Client

  beforeEach(async () => {
    client = new Client({ name: 'stargate-nft-holders-total', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/mcp'))
    await client.connect(transport)
  })

  afterEach(async () => {
    await client.close()
  })

  test('should fetch total holders', async () => {
    const response = await client.callTool({
      name: 'getStargateNftHoldersTotal',
      arguments: {},
    })
    const parsed: IndexerStargateNftHoldersTotalResponse =
      IndexerStargateNftHoldersTotalResponseSchema.parse(response)
    const structured = parsed.structuredContent
    expect(structured.network).toBeDefined()
    expect(typeof structured.ok).toBe('boolean')
    if (structured.ok) {
      expect(typeof structured.data).toBe('string')
    } else {
      expect(typeof structured.error).toBe('string')
    }
  }, 30000)
})


