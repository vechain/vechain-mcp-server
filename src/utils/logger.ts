// src/logger.ts
import { Logger } from 'tslog'

/**
 * Logger instance for the VeChain MCP Server
 * Log levels are: 0-6, default is 3 (info)
 * Log level default can be set with the LOG_LEVEL environment variable
 */
export const logger = new Logger({
  name: 'VeChain MCP Server',
  minLevel: parseInt(process.env.LOG_LEVEL || '3', 10),
})
