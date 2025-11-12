import { ABIEvent, Hex } from '@vechain/sdk-core'
import type { z } from 'zod'
import { fetchAbiBySignature } from '@/services/b32'
import {
  createThorStructuredOutputSchema,
  createThorToolResponseSchema,
  getThorNetworkType,
  ThorDecodedEventSchema,
  ThorRawEventSchema,
  thorErrorResponse,
} from '@/services/thor'
import type { VeChainTool } from '@/types'
import { logger } from '@/utils/logger'

/**
 * Schemas for decode event tool outputs
 */
const ThorDecodeEventOutputSchema = createThorStructuredOutputSchema(ThorDecodedEventSchema)
const ThorDecodeEventResponseSchema = createThorToolResponseSchema(ThorDecodedEventSchema)
type ThorDecodeEventResponse = z.infer<typeof ThorDecodeEventResponseSchema>

/**
 * Tool for decoding an event emitted by a contract on Thor network
 */
export const decodeEvent: VeChainTool = {
  name: 'thorDecodeEvent',
  title: 'Thor Decode Event',
  description: 'Decode an event emitted by a contract on Thor network',
  inputSchema: ThorRawEventSchema.shape,
  outputSchema: ThorDecodeEventOutputSchema.shape,
  annotations: {
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async ({ address, topics, data }: z.infer<typeof ThorRawEventSchema>): Promise<ThorDecodeEventResponse> => {
    try {
      logger.debug(`Decoding event from Thor network: ${JSON.stringify({ address, topics, data })}`)

      // Get the event signature from the first topic
      const [signature] = topics

      if (!signature) {
        return thorErrorResponse('No signature found in event topics')
      }

      // Fetch the ABI for this signature
      const abi = await fetchAbiBySignature(signature)

      if (!abi) {
        return thorErrorResponse(`No ABI found for event signature: ${signature}`)
      }

      // Find the matching event in the ABI and decode it
      for (const abiItem of abi) {
        if (abiItem.type === 'event') {
          try {
            const eventAbi = new ABIEvent(abiItem)

            if (eventAbi.signatureHash === signature) {
              const { args } = eventAbi.decodeEventLog({
                data: Hex.of(data),
                topics: topics.map(topic => Hex.of(topic)),
              })

              const decodedEvent = {
                address,
                signature: eventAbi.format(),
                signatureHash: eventAbi.signatureHash,
                name: eventAbi.signature.name,
                inputs: eventAbi.signature.inputs,
                args,
              }

              // Validate the decoded event
              const validatedEvent = ThorDecodedEventSchema.parse(decodedEvent)

              return {
                content: [{ type: 'text', text: JSON.stringify(validatedEvent, null, 2) }],
                structuredContent: {
                  ok: true,
                  network: getThorNetworkType(),
                  data: validatedEvent,
                },
              }
            }
          } catch (decodeError) {
            logger.warn(`Failed to decode with ABI item:`, decodeError)
          }
        }
      }

      // No matching event found in the ABI
      return {
        content: [
          {
            type: 'text',
            text: `Could not decode event - no matching event definition found in ABI for signature: ${signature}`,
          },
        ],
        structuredContent: {
          ok: true,
          network: getThorNetworkType(),
          data: null,
        },
      }
    } catch (error) {
      logger.warn(`Error decoding event from Thor network:`, error)
      return thorErrorResponse(`Error decoding event from Thor network: ${error}`)
    }
  },
}
