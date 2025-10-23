import type { CallToolResult } from '@modelcontextprotocol/sdk/types'
import { z } from 'zod'
import { upstreamClients } from '../server'
import { UpstreamServerName } from '../upstream-servers'

export async function searchDocsVechain({ query }: { query: string }): Promise<CallToolResult> {
  const content = await searchDocumentation(UpstreamServerName.VECHAIN, query)
  return { content: [{ type: 'text' as const, text: JSON.stringify(content) }] }
}

searchDocsVechain.config = {
  title: 'Search VeChain Documentation',
  description: 'Search the VeChain documentation',
  inputSchema: {
    query: z.string().describe('Search query for documentation'),
  },
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
}

export async function searchDocsVechainKit({ query }: { query: string }): Promise<CallToolResult> {
  const content = await searchDocumentation(UpstreamServerName.VECHAIN_KIT, query)
  return { content: [{ type: 'text' as const, text: JSON.stringify(content) }] }
}

searchDocsVechainKit.config = {
  title: 'Search VeChain Kit Documentation',
  description: 'Search the VeChain Kit documentation',
  inputSchema: {
    query: z.string().describe('Search query for documentation'),
  },
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
}

export async function searchDocsVebetterDao({ query }: { query: string }): Promise<CallToolResult> {
  const content = await searchDocumentation(UpstreamServerName.VEBETTER_DAO, query)
  return { content: [{ type: 'text' as const, text: JSON.stringify(content) }] }
}

searchDocsVebetterDao.config = {
  title: 'Search VeBetterDao Documentation',
  description: 'Search the VeBetterDao documentation',
  inputSchema: {
    query: z.string().describe('Search query for documentation'),
  },
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
}

export async function searchDocsVevote({ query }: { query: string }): Promise<CallToolResult> {
  const content = await searchDocumentation(UpstreamServerName.VEVOTE, query)
  return { content: [{ type: 'text' as const, text: JSON.stringify(content) }] }
}

searchDocsVevote.config = {
  title: 'Search VeVote Documentation',
  description: 'Search the VeVote documentation',
  inputSchema: {
    query: z.string().describe('Search query for documentation'),
  },
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
}

export async function searchDocsStargate({ query }: { query: string }): Promise<CallToolResult> {
  const content = await searchDocumentation(UpstreamServerName.STARGATE, query)
  return { content: [{ type: 'text' as const, text: JSON.stringify(content) }] }
}

searchDocsStargate.config = {
  title: 'Search Stargate Documentation',
  description: 'Search the Stargate documentation',
  inputSchema: {
    query: z.string().describe('Search query for documentation'),
  },
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
}

async function searchDocumentation(serverName: UpstreamServerName, query: string): Promise<CallToolResult> {
  const client = upstreamClients[serverName]

  if (!client) {
    throw new Error(`Upstream server ${serverName} not connected`)
  }

  const response = await client.callTool({
    name: 'searchDocumentation',
    arguments: { query },
  })

  const gitbookMcpServerResponseContentSchema = z.array(
    z.object({
      type: z.literal('text'),
      text: z.string(),
    }),
  )

  const result = gitbookMcpServerResponseContentSchema.safeParse(response.content)

  if (!result.success) {
    throw new Error(`Failed to parse ${serverName} docs client response: ${JSON.stringify(result.error, null, 2)}`)
  }

  return { content: result.data }
}
