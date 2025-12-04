import { z } from 'zod'
import { fetchFromIPFS, IPFSCIDSchema } from '@/services/ipfs'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

const InputSchema = z
  .object({
    cid: IPFSCIDSchema.describe('IPFS Content Identifier (CID) to fetch'),
  })
  .describe('Parameters for fetching IPFS content')

const OutputSchema = z
  .object({
    ok: z.boolean().describe('Whether the fetch was successful'),
    cid: z.string().describe('The CID that was fetched'),
    content: z.unknown().optional().describe('The fetched content (JSON or text)'),
    error: z.string().optional().describe('Error message if fetch failed'),
  })
  .describe('IPFS content fetch result')

export type GetIPFSContentResponse = {
  content: Array<{ type: 'text'; text: string }>
  structuredContent: z.infer<typeof OutputSchema>
}

export const getIPFSContent: MCPTool = {
  name: 'getIPFSContent',
  title: 'IPFS: Fetch content by CID',
  description:
    'Fetch content from IPFS using the VeChain gateway proxy (api.gateway-proxy.vechain.org). Provide an IPFS Content Identifier (CID) to retrieve the associated data. Commonly used to fetch B3TR proposal descriptions. **IMPORTANT: Proposal descriptions often contain Discourse forum links (vechain.discourse.group/t/topic-name/TOPIC_ID or discourse.vebetterdao.org/t/topic-name/TOPIC_ID). After fetching IPFS content, search for these links and extract them. If getDiscourseTopic is available, use it with the topic ID. If not available (optional feature), provide the full forum URL for manual viewing to see community discussion and sentiment.**',
  inputSchema: InputSchema.shape,
  outputSchema: OutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async (params: z.infer<typeof InputSchema>): Promise<GetIPFSContentResponse> => {
    try {
      const parsed = InputSchema.parse(params)

      const content = await fetchFromIPFS(parsed.cid)

      if (content === null) {
        const errorResult = {
          ok: false,
          cid: parsed.cid,
          error: 'Failed to fetch content from IPFS',
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult) }],
          structuredContent: errorResult,
        }
      }

      const successResult = {
        ok: true,
        cid: parsed.cid,
        content,
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(successResult) }],
        structuredContent: successResult,
      }
    } catch (error) {
      logger.warn(`Error in getIPFSContent: ${String(error)}`)
      const errorResult = {
        ok: false,
        cid: params.cid,
        error: `Error fetching IPFS content: ${String(error)}`,
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(errorResult) }],
        structuredContent: errorResult,
      }
    }
  },
}

