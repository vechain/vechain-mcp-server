import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { upstreamClients } from '@/server'
import type { VeChainTool } from '@/types'
import { UpstreamServerName } from '@/upstream-servers'
import { logger } from '@/utils/logger'

/**
 * Tool for searching VeChain documentation
 */
export const searchDocsVechain: VeChainTool = {
  name: 'searchDocsVechain',
  title: 'Search VeChain Documentation',
  description: 'Search the VeChain documentation',
  inputSchema: {
    query: z.string().describe('Search query for documentation'),
  },
  handler: async ({ query }: { query: string }): Promise<CallToolResult> => {
    const content = await searchDocumentation(UpstreamServerName.VECHAIN, query)
    return { content: [{ type: 'text' as const, text: JSON.stringify(content) }] }
  },
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
}

/**
 * Tool for searching VeChainKit documentation
 */
export const searchDocsVechainKit: VeChainTool = {
  name: 'searchDocsVechainKit',
  title: 'Search VeChain Kit Documentation',
  description: 'Search the VeChain Kit documentation',
  inputSchema: {
    query: z.string().describe('Search query for documentation'),
  },
  handler: async ({ query }: { query: string }): Promise<CallToolResult> => {
    const content = await searchDocumentation(UpstreamServerName.VECHAIN_KIT, query)
    return { content: [{ type: 'text' as const, text: JSON.stringify(content) }] }
  },
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
}

/**
 * Tool for searching VeBetterDao documentation
 */
export const searchDocsVebetterDao: VeChainTool = {
  name: 'searchDocsVebetterDao',
  title: 'Search VeBetterDao Documentation',
  description: 'Search the VeBetterDao documentation',
  inputSchema: {
    query: z.string().describe('Search query for documentation'),
  },
  handler: async ({ query }: { query: string }): Promise<CallToolResult> => {
    const content = await searchDocumentation(UpstreamServerName.VEBETTER_DAO, query)
    return { content: [{ type: 'text' as const, text: JSON.stringify(content) }] }
  },
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
}

/**
 * Tool for searching VeVote documentation
 */
export const searchDocsVevote: VeChainTool = {
  name: 'searchDocsVevote',
  title: 'Search VeVote Documentation',
  description: 'Search the VeVote documentation',
  inputSchema: {
    query: z.string().describe('Search query for documentation'),
  },
  handler: async ({ query }: { query: string }): Promise<CallToolResult> => {
    const content = await searchDocumentation(UpstreamServerName.VEVOTE, query)
    return { content: [{ type: 'text' as const, text: JSON.stringify(content) }] }
  },
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
}

/**
 * Tool for searching Stargate documentation
 */
export const searchDocsStargate: VeChainTool = {
  name: 'searchDocsStargate',
  title: 'Search Stargate Documentation',
  description: 'Search the Stargate documentation',
  inputSchema: {
    query: z.string().describe('Search query for documentation'),
  },
  handler: async ({ query }: { query: string }): Promise<CallToolResult> => {
    const content = await searchDocumentation(UpstreamServerName.STARGATE, query)
    return { content: [{ type: 'text' as const, text: JSON.stringify(content) }] }
  },
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
}

/**
 * Search documentation for a given upstream server
 * @param serverName - The name of the upstream server
 * @param query - The search query
 * @returns The search results
 */
async function searchDocumentation(serverName: UpstreamServerName, query: string): Promise<CallToolResult> {
  const client = upstreamClients[serverName]
  if (!client) {
    logger.error(`Upstream server ${serverName} not connected`)
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
    logger.error(`Failed to parse ${serverName} docs client response: ${JSON.stringify(result.error, null, 2)}`)
    throw new Error(`Failed to parse ${serverName} docs client response: ${JSON.stringify(result.error, null, 2)}`)
  }

  return { content: result.data }
}
