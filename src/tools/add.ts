import type { CallToolResult } from '@modelcontextprotocol/sdk/types'
import { z } from 'zod'

export function add({ a, b }: { a: number; b: number }): CallToolResult {
  const output = { result: a + b }

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(output) }],
    structuredContent: output,
  }
}

add.config = {
  title: 'Addition Tool',
  description: 'Add two numbers',
  inputSchema: { a: z.number(), b: z.number() },
  outputSchema: { result: z.number() },
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
}
