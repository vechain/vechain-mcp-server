import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { logger } from './utils/logger'

export enum UpstreamServerName {
  VECHAIN = 'vechain',
  VECHAIN_KIT = 'vechainkit',
  VEBETTER_DAO = 'vebetterdao',
  VEVOTE = 'vevote',
  STARGATE = 'stargate',
  DISCOURSE = 'discourse',
}

const UPSTREAM_SERVERS = {
  [UpstreamServerName.VECHAIN]: {
    url: 'https://docs.vechain.org/~gitbook/mcp',
  },
  [UpstreamServerName.VECHAIN_KIT]: {
    url: 'https://docs.vechainkit.vechain.org/~gitbook/mcp',
  },
  [UpstreamServerName.VEBETTER_DAO]: {
    url: 'https://docs.vebetterdao.org/~gitbook/mcp',
  },
  [UpstreamServerName.VEVOTE]: {
    url: 'https://docs.vevote.vechain.org/~gitbook/mcp',
  },
  [UpstreamServerName.STARGATE]: {
    url: 'https://docs.stargate.vechain.org/~gitbook/mcp',
  },
  [UpstreamServerName.DISCOURSE]: {
    url: process.env.DISCOURSE_MCP_URL || 'http://localhost:3000/mcp',
  }
}

export type UpstreamClients = Partial<Record<UpstreamServerName, Client>>

export async function connectAllUpstreamServers() {
  const upstreamClients: UpstreamClients = {}

  const serverNames = Object.keys(UPSTREAM_SERVERS) as UpstreamServerName[]

  for (const serverName of serverNames) {
    try {
      const client = await connectUpstreamServer(serverName)
      upstreamClients[serverName] = client
    } catch (error) {
      logger.warn(`Failed to connect to upstream ${serverName}: ${String(error)}`)
    }
  }

  return upstreamClients
}

async function connectUpstreamServer(serverName: UpstreamServerName): Promise<Client> {
  const client = new Client({
    name: `${serverName}-docs-client`,
    version: '1.0.0',
  })

  const serverConfig = UPSTREAM_SERVERS[serverName]
  const transport = new StreamableHTTPClientTransport(new URL(serverConfig.url))

  await client.connect(transport).catch(error => {
    throw error
  })

  logger.info(`Connected to ${serverName} MCP server`)

  return client
}
