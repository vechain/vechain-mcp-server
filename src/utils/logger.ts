import { Logger } from 'tslog'

/**
 * Logger instance for the VeChain MCP Server
 * Log levels are: 0-6, default is 3 (info)
 * Log level default can be set with the LOG_LEVEL environment variable
 *
 * IMPORTANT: For MCP stdio transport, logs MUST go to stderr, not stdout
 * stdout is reserved exclusively for JSON-RPC messages
 */
export const logger = new Logger({
  name: 'VeChain MCP Server',
  minLevel: parseInt(process.env.LOG_LEVEL || '3', 10),
  overwrite: {
    transportFormatted: (...args) => {
      // Force all logs to stderr for MCP stdio compatibility
      process.stderr.write(`${args.join(' ')}\n`)
    },
  },
})
