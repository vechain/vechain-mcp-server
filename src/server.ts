import type { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import * as tools from './tools'
import { connectAllUpstreamServers, type UpstreamClients } from './upstream-servers'
import { logger } from './utils/logger'

export const server = new McpServer({
  name: 'vechain-mcp-server',
  version: '1.0.0',
})

export let upstreamClients: UpstreamClients = {}

export async function initServer() {
  upstreamClients = await connectAllUpstreamServers()

  // Tools registration
  for (const tool of Object.values(tools)) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema ?? undefined,
        annotations: tool.annotations,
      },
      tool.handler,
    )
    logger.info(`Registered tool: ${tool.name}`)
  }
}

export async function cleanupServer() {
  logger.info('Shutting down server...')
  for (const [name, client] of Object.entries(upstreamClients) as [keyof UpstreamClients, Client][]) {
    try {
      await client.close()
      logger.info(`Closed connection to ${name}`)
    } catch (error) {
      logger.error(`Error closing ${name}:`, error)
    }
  }

  await server.close()
  process.exit(0)
}
