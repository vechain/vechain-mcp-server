import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'

import { upstreamClients } from '@/server'
import type { MCPTool } from '@/types'
import { UpstreamServerName } from '@/upstream-servers'
import { logger } from '@/utils/logger'

/**
 * Tool for searching VeBetterDAO Discourse forum (https://vechain.discourse.group)
 * NOTE: This is an OPTIONAL feature that requires the Discourse MCP server to be running separately.
 */
export const searchDiscourseForum: MCPTool = {
  name: 'searchDiscourseForum',
  title: 'Search Discourse Forum (Optional)',
  description: 'Search the VeBetterDAO Discourse forum (vechain.discourse.group) for topics, discussions, and community posts. Returns 10 results by default. **OPTIONAL FEATURE**: Requires Discourse MCP server running separately: `npx -y @discourse/mcp@latest --transport http --site https://vechain.discourse.group`. If not available, propose manually visiting forum links found in proposal descriptions. **USE CASE: If a proposal\'s IPFS description doesn\'t contain a direct Discourse link, search by proposal ID or title to find related forum discussions.**',
  inputSchema: {
    query: z.string().describe('Search query for the forum'),
    max_results: z.number().min(1).max(50).optional().describe('Optional: Override default to get more/fewer results (1-50, default: 10)'),
    with_private: z.boolean().optional().describe('Optional: Include private topics (default: false)'),
  },
  handler: async (params: { query: string; max_results?: number; with_private?: boolean }): Promise<CallToolResult> => {
    const content = await callDiscourseTool('discourse_search', {
      query: params.query,
      max_results: params.max_results,
      with_private: params.with_private,
    })
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
 * Tool for getting latest topics from Discourse forum
 * NOTE: This is an OPTIONAL feature that requires the Discourse MCP server to be running separately.
 */
export const getDiscourseLatestTopics: MCPTool = {
  name: 'getDiscourseLatestTopics',
  title: 'Get Latest Forum Topics (Optional)',
  description: 'Get the latest topics from the VeBetterDAO Discourse forum. Returns standard page size by default. **OPTIONAL FEATURE**: Requires Discourse MCP server running separately. If not available, suggest visiting https://vechain.discourse.group directly. Useful for browsing what the community is currently discussing, finding new proposal discussions, or monitoring general sentiment.',
  inputSchema: {
    category: z.string().optional().describe('Optional: Filter by category slug (e.g., "proposals", "general")'),
    page: z.number().min(1).optional().describe('Optional: Page number for pagination (default: 1)'),
    per_page: z.number().min(1).max(50).optional().describe('Optional: Override default page size (1-50) if more topics needed'),
  },
  handler: async (params: { category?: string; page?: number; per_page?: number }): Promise<CallToolResult> => {
    // Use discourse_filter_topics with 'latest' filter for latest topics
    const filter = params.category ? `category:${params.category} order:latest-post` : 'order:latest-post'
    const content = await callDiscourseTool('discourse_filter_topics', { 
      filter,
      page: params.page || 1,
      per_page: params.per_page,
    })
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
 * Tool for getting a specific topic from Discourse
 * NOTE: This is an OPTIONAL feature that requires the Discourse MCP server to be running separately.
 */
export const getDiscourseTopic: MCPTool = {
  name: 'getDiscourseTopic',
  title: 'Get Forum Topic (Optional)',
  description: 'Get detailed information about a specific Discourse forum topic, including posts and replies. Returns 5 posts by default. **OPTIONAL FEATURE**: Requires Discourse MCP server running separately. **CRITICAL FOR B3TR PROPOSALS: Proposal descriptions (fetched via getIPFSContent) often contain Discourse forum links in the format vechain.discourse.group/t/topic-name/TOPIC_ID. If this tool is not available, provide the direct forum URL for manual viewing.** Example: from URL "https://vechain.discourse.group/t/vebetterdao-proposal-auto-voting/559" extract topicId: 559.',
  inputSchema: {
    topicId: z.number().describe('The topic ID to fetch'),
    post_limit: z.number().min(1).max(20).optional().describe('Optional: Override default to get more posts (1-20, default: 5). Use higher values only when full discussion context is specifically needed.'),
  },
  handler: async (params: { topicId: number; post_limit?: number }): Promise<CallToolResult> => {
    const content = await callDiscourseTool('discourse_read_topic', { 
      topic_id: params.topicId,
      post_limit: params.post_limit,
    })
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
 * Tool for reading a specific post from Discourse
 * NOTE: This is an OPTIONAL feature that requires the Discourse MCP server to be running separately.
 */
export const getDiscoursePost: MCPTool = {
  name: 'getDiscoursePost',
  title: 'Get Forum Post (Optional)',
  description: 'Get a specific post from the VeBetterDAO Discourse forum by post ID. Useful for reading specific replies or comments in detail. **OPTIONAL FEATURE**: Requires Discourse MCP server running separately.',
  inputSchema: {
    postId: z.number().describe('The post ID to fetch'),
  },
  handler: async ({ postId }: { postId: number }): Promise<CallToolResult> => {
    const content = await callDiscourseTool('discourse_read_post', { post_id: postId })
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
 * Tool for listing categories in Discourse
 * NOTE: This is an OPTIONAL feature that requires the Discourse MCP server to be running separately.
 */
export const getDiscourseCategories: MCPTool = {
  name: 'getDiscourseCategories',
  title: 'Get Forum Categories (Optional)',
  description: 'Get all available categories from the VeBetterDAO Discourse forum. **OPTIONAL FEATURE**: Requires Discourse MCP server running separately. If not available, suggest visiting https://vechain.discourse.group/categories to browse categories.',
  inputSchema: {},
  handler: async (): Promise<CallToolResult> => {
    const content = await callDiscourseTool('discourse_list_categories', {})
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
 * Call a tool on the Discourse MCP server
 * @param toolName - The name of the tool to call
 * @param args - The arguments to pass to the tool
 * @returns The tool result
 */
async function callDiscourseTool(toolName: string, args: Record<string, unknown>): Promise<CallToolResult> {
  const client = upstreamClients[UpstreamServerName.DISCOURSE]
  if (!client) {
    const errorMessage = `Discourse forum integration is not available. This is an optional feature that requires running the Discourse MCP server separately.

To enable forum integration:
1. Install: npm install -g @discourse/mcp@latest
2. Run in a separate terminal with HTTP transport mode and site pre-configured:
   
   npx -y @discourse/mcp@latest --transport http --site https://vechain.discourse.group
   
   Or if installed globally:
   discourse-mcp --transport http --site https://vechain.discourse.group

3. Restart this MCP server to connect

IMPORTANT: 
- The --transport http flag is required for upstream server connection
- The --site flag pre-configures the Discourse forum URL so tools work immediately

For now, you can manually visit forum links found in proposal descriptions.
Forum URL: https://vechain.discourse.group`
    
    logger.warn(`Discourse MCP server not connected - returning helpful error message`)
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          ok: false,
          error: 'DISCOURSE_NOT_AVAILABLE',
          message: errorMessage,
          forumUrl: 'https://vechain.discourse.group',
          setupInstructions: {
            step1: 'npm install -g @discourse/mcp@latest',
            step2: 'npx -y @discourse/mcp@latest --transport http --site https://vechain.discourse.group',
            step2_alternative: 'discourse-mcp --transport http --site https://vechain.discourse.group',
            step3: 'Restart VeBetterDAO MCP server',
            note: 'The --transport http flag is REQUIRED for upstream server connection. The --site flag pre-configures the forum URL.'
          }
        })
      }]
    }
  }
  
  try {
    const response = await client.callTool({
      name: toolName,
      arguments: args,
    })
    
    const responseSchema = z.array(
      z.object({
        type: z.literal('text'),
        text: z.string(),
      }),
    )
    
    const result = responseSchema.safeParse(response.content)
    if (!result.success) {
      logger.error(`Failed to parse Discourse MCP response: ${JSON.stringify(result.error, null, 2)}`)
      throw new Error(`Failed to parse Discourse MCP response: ${JSON.stringify(result.error, null, 2)}`)
    }

    return { content: result.data }
  } catch (error) {
    logger.error(`Error calling Discourse tool ${toolName}: ${String(error)}`)
    throw new Error(`Error calling Discourse tool ${toolName}: ${String(error)}`)
  }
}

