import type { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { add } from './tools/add'
import {
  searchDocsStargate,
  searchDocsVebetterDao,
  searchDocsVechain,
  searchDocsVechainKit,
  searchDocsVevote,
} from './tools/search-docs'
import { connectAllUpstreamServers, type UpstreamClients } from './upstream-servers'

export const server = new McpServer({
  name: 'vechain-mcp',
  version: '1.0.0',
})

export let upstreamClients: UpstreamClients = {}

export async function initServer() {
  upstreamClients = await connectAllUpstreamServers()
  // Addition tool for testing (to be removed)
  server.registerTool(add.name, add.config, add)

  // Tools registration
  server.registerTool(searchDocsVechain.name, searchDocsVechain.config, searchDocsVechain) // Docs search for VeChain documentation
  server.registerTool(searchDocsVechainKit.name, searchDocsVechainKit.config, searchDocsVechainKit) // Docs search for VeChain Kit documentation
  server.registerTool(searchDocsVebetterDao.name, searchDocsVebetterDao.config, searchDocsVebetterDao) // Docs search for VeBetterDao documentation
  server.registerTool(searchDocsVevote.name, searchDocsVevote.config, searchDocsVevote) // Docs search for VeVote documentation
  server.registerTool(searchDocsStargate.name, searchDocsStargate.config, searchDocsStargate) // Docs search for Stargate documentation
}

export async function cleanupServer() {
  console.error('Shutting down server...')
  for (const [name, client] of Object.entries(upstreamClients) as [keyof UpstreamClients, Client][]) {
    try {
      await client.close()
      console.error(`Closed connection to ${name}`)
    } catch (error) {
      console.error(`Error closing ${name}:`, error)
    }
  }

  await server.close()
  process.exit(0)
}
