import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import express from 'express'
import { cleanupServer, initServer, server } from './server'

// Set up Express and HTTP transport
const app = express()
app.use(express.json())

app.post('/mcp', async (req, res) => {
  // Create a new transport for each request to prevent request ID collisions
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })

  res.on('close', () => {
    transport.close()
  })

  await server.connect(transport)
  await transport.handleRequest(req, res, req.body)
})

const port = parseInt(process.env.PORT || '4000', 10)

app
  .listen(port, async () => {
    console.log(`VeChain MCP Server running on http://localhost:${port}/mcp`)
    await initServer()
  })
  .on('error', error => {
    console.error('Server error:', error)
    cleanupServer()
    process.exit(1)
  })

process.on('SIGINT', cleanupServer)
process.on('SIGTERM', cleanupServer)
