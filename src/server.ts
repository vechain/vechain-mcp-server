import type { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  initThor,
  NetworkInputSchema,
  runWithRequestNetwork,
  ThorNetworkType,
} from '@/services/thor'
import * as tools from '@/tools'
import { logger } from '@/utils/logger'
import { connectAllUpstreamServers, type UpstreamClients } from './upstream-servers'

export const server = new McpServer({
  name: 'vechain-mcp-server',
  version: '1.0.0',
})

export let upstreamClients: UpstreamClients = {}

const VALID_NETWORKS = new Set<string>(Object.values(ThorNetworkType))

function pickNetworkOverride(input: unknown): ThorNetworkType | undefined {
  if (!input || typeof input !== 'object') return undefined
  const raw = (input as Record<string, unknown>).network
  if (typeof raw !== 'string') return undefined
  if (!VALID_NETWORKS.has(raw)) return undefined
  return raw as ThorNetworkType
}

export async function initServer() {
  upstreamClients = await connectAllUpstreamServers()
  initThor()

  for (const tool of Object.values(tools)) {
    // Inject the optional per-request `network` override into every tool's
    // input shape so the JSON schema advertised to clients exposes it
    // uniformly. The existing tool input shape wins on collision so a tool
    // can override the description if needed.
    const enrichedInputSchema = {
      network: NetworkInputSchema.optional(),
      ...tool.inputSchema,
    }

    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: enrichedInputSchema,
        outputSchema: tool.outputSchema ?? undefined,
        annotations: tool.annotations,
      },
      // Wrap every tool handler so that, if `network` is present on the
      // input payload, it propagates as a per-request override via
      // AsyncLocalStorage. Tools that don't read on-chain state simply
      // ignore it.
      async (input: unknown, ...rest: unknown[]) => {
        const override = pickNetworkOverride(input)
        return runWithRequestNetwork(override, () =>
          // biome-ignore lint/suspicious/noExplicitAny: pass-through to MCP handler signature
          (tool.handler as (i: any, ...r: any[]) => Promise<any>)(input, ...rest),
        )
      },
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
