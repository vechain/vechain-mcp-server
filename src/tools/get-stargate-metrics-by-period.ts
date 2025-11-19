import { z } from 'zod'
import { getThorNetworkType } from '@/services/thor'
import { veworldIndexerGetSingle } from '@/services/veworld-indexer'
import {
  IndexerGetStargateMetricsByPeriodParamsSchema,
  IndexerStargateMetricsByPeriodSchema,
} from '@/services/veworld-indexer/schemas'
import {
  createIndexerStructuredOutputSchema,
  createIndexerToolResponseSchema,
  indexerErrorResponse,
} from '@/services/veworld-indexer/utils'
import type { MCPTool } from '@/types'
import { logger } from '@/utils/logger'

// Shared output/response schema (used by all period tools)
export const IndexerStargateMetricsByPeriodOutputSchema =
  createIndexerStructuredOutputSchema(IndexerStargateMetricsByPeriodSchema)
export const IndexerStargateMetricsByPeriodResponseSchema =
  createIndexerToolResponseSchema(IndexerStargateMetricsByPeriodSchema)
export type IndexerStargateMetricsByPeriodResponse = z.infer<
  typeof IndexerStargateMetricsByPeriodResponseSchema
>

// Factory to build specific period tools; exported so each tool can live in its own file.
export function createMetricsByPeriodTool(config: {
  name: string
  title: string
  pathPrefix:
    | '/api/v1/stargate/vtho-generated'
    | '/api/v1/stargate/vtho-claimed'
    | '/api/v1/stargate/vet-staked'
    | '/api/v1/stargate/vet-delegated'
    | '/api/v1/stargate/nft-holders'
  description: string
}): MCPTool {
  const { name, title, pathPrefix, description } = config
  return {
    name,
    title,
    description,
    inputSchema: IndexerGetStargateMetricsByPeriodParamsSchema.shape,
    outputSchema: IndexerStargateMetricsByPeriodOutputSchema.shape,
    annotations: {
      idempotentHint: true,
      openWorldHint: true,
      readOnlyHint: true,
      destructiveHint: false,
    },
    handler: async (params: z.infer<typeof IndexerGetStargateMetricsByPeriodParamsSchema>) => {
      try {
        const { period } = IndexerGetStargateMetricsByPeriodParamsSchema.parse(params)
        const endpoint = `${pathPrefix}/${period}`
        const data = await veworldIndexerGetSingle<unknown[]>({
          endPoint: endpoint,
        })
        if (!data) {
          return indexerErrorResponse(`Failed to fetch ${endpoint} from VeWorld Indexer`)
        }
        IndexerStargateMetricsByPeriodSchema.parse(data)
        return {
          content: [{ type: 'text', text: JSON.stringify(data) }],
          structuredContent: {
            ok: true,
            network: getThorNetworkType(),
            data,
          },
        }
      } catch (error) {
        logger.warn(`Error fetching metrics by period (${pathPrefix}): ${String(error)}`)
        return indexerErrorResponse(
          `Error fetching metrics by period (${pathPrefix}): ${String(error)}`,
        )
      }
    },
  }
}


