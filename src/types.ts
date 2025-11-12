/** biome-ignore-all lint/suspicious/noExplicitAny: <generic type> */
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js'
import type { z } from 'zod'

/**
 * Interface for tools for auto discovery and registering
 */
export interface VeChainTool {
  name: string
  title: string
  description: string
  inputSchema: z.ZodRawShape
  outputSchema?: z.ZodRawShape
  handler: (input: any) => Promise<any>
  annotations: ToolAnnotations
}
