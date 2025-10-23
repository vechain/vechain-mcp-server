import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { add } from './tools/add'

export const server = new McpServer({
  name: 'vechain-mcp',
  version: '1.0.0',
})

export async function initServer() {
  // Addition tool for testing (to be removed)
  server.registerTool(add.name, add.config, add)
}

export async function cleanupServer() {
  console.error('Shutting down server...')
  await server.close()
  process.exit(0)
}
