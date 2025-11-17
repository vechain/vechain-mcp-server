#!/usr/bin/env node

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import cors from 'cors'
import express from 'express'
import { cleanupServer, initServer, server } from './server'
import { logger } from './utils/logger'

// Set up Express and HTTP transport
const app = express()
app.use(express.json())

app.get('/health', async (_, res) => {
  res.json({ status: 'ok' })
})

// Add CORS middleware handler
// This allows MCP inspector "direct" connection in browser
app.use(
  cors({
    origin: '*', // TODO: Configure appropriately for hosting
  }),
)

app.post('/mcp', async (req, res) => {
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    })
    res.on('close', () => {
      transport.close()
    })
    await server.connect(transport)
    await transport.handleRequest(req, res, req.body)
  } catch (error) {
    logger.error('Error handling MCP request:', error)
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      })
    }
  }
})

const port = parseInt(process.env.PORT || '4000', 10)

app
  .listen(port, async () => {
    await initServer()
    logger.info(`VeChain MCP Server running on http://localhost:${port}/mcp`)
  })
  .on('error', error => {
    logger.error('Server error:', error)
    cleanupServer()
    process.exit(1)
  })

process.on('SIGINT', () => cleanupServer())
process.on('SIGTERM', () => cleanupServer())
