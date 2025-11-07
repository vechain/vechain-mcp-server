import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import express from 'express'
import { cleanupServer, initServer, server } from './server'
import { logger } from './utils/logger'

// Set up Express and HTTP transport
const app = express()
app.use(express.json())

// Create transport once - it manages sessions internally
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
  enableJsonResponse: true,
})

app.get('/health', async (_, res) => {
  res.json({ status: 'ok' })
})

app.post('/mcp', async (req, res) => {
  await transport.handleRequest(req, res, req.body)
})

app.get('/mcp', async (req, res) => {
  await transport.handleRequest(req, res)
})

const port = parseInt(process.env.PORT || '4000', 10)

app
  .listen(port, async () => {
    await initServer()
    await server.connect(transport)
    logger.info(`VeChain MCP Server running on http://localhost:${port}/mcp`)
  })
  .on('error', error => {
    logger.error('Server error:', error)
    cleanupServer(transport)
    process.exit(1)
  })

process.on('SIGINT', () => cleanupServer(transport))
process.on('SIGTERM', () => cleanupServer(transport))
