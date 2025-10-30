import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { cleanupServer, initServer, server } from './server.js'

async function main() {
  await initServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch(error => {
  console.error('Server error:', error)
  cleanupServer()
  process.exit(1)
})

process.on('SIGINT', cleanupServer)
process.on('SIGTERM', cleanupServer)
