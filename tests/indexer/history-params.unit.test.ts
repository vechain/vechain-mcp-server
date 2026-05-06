/**
 * Unit tests for IndexerGetHistoryParamsSchema validation.
 *
 * These tests verify that the history endpoint params schema correctly validates
 * inputs, including the `after`/`before` Unix timestamp fields (seconds).
 */

import {
  IndexerGetHistoryParamsSchema,
} from '@/services/veworld-indexer/schemas'

const VALID_ADDRESS = '0x311E811cd3fC29Ba17D45B04c882245FA69DC776'

describe('IndexerGetHistoryParamsSchema', () => {
  test('accepts minimal valid input (address only)', () => {
    expect(() => IndexerGetHistoryParamsSchema.parse({ address: VALID_ADDRESS })).not.toThrow()
  })

  test('accepts valid Unix second timestamps', () => {
    expect(() =>
      IndexerGetHistoryParamsSchema.parse({
        address: VALID_ADDRESS,
        after: 1754179200, // 2025-08-03T00:00:00Z
        before: 1754265600, // 2025-08-04T00:00:00Z
      }),
    ).not.toThrow()
  })

  test('accepts null after/before (explicitly nullable)', () => {
    expect(() =>
      IndexerGetHistoryParamsSchema.parse({
        address: VALID_ADDRESS,
        after: null,
        before: null,
      }),
    ).not.toThrow()
  })

  test('rejects negative after timestamp', () => {
    expect(() =>
      IndexerGetHistoryParamsSchema.parse({ address: VALID_ADDRESS, after: -1 }),
    ).toThrow()
  })

  test('rejects non-integer (float) timestamps', () => {
    expect(() =>
      IndexerGetHistoryParamsSchema.parse({ address: VALID_ADDRESS, after: 1754179200.5 }),
    ).toThrow()
  })

  test('rejects missing address', () => {
    expect(() =>
      IndexerGetHistoryParamsSchema.parse({ after: 1754179200 }),
    ).toThrow()
  })

  test('accepts VNS name as address', () => {
    expect(() =>
      IndexerGetHistoryParamsSchema.parse({ address: 'alice.vet' }),
    ).not.toThrow()
  })

  test('accepts single event name as string', () => {
    expect(() =>
      IndexerGetHistoryParamsSchema.parse({
        address: VALID_ADDRESS,
        eventName: 'TRANSFER_VET',
      }),
    ).not.toThrow()
  })

  test('accepts array of event names', () => {
    expect(() =>
      IndexerGetHistoryParamsSchema.parse({
        address: VALID_ADDRESS,
        eventName: ['TRANSFER_VET', 'TRANSFER_FT', 'STARGATE_STAKE'],
      }),
    ).not.toThrow()
  })

  test('rejects unknown event names', () => {
    expect(() =>
      IndexerGetHistoryParamsSchema.parse({
        address: VALID_ADDRESS,
        eventName: 'INVALID_EVENT',
      }),
    ).toThrow()
  })

  test('accepts B3TR_PROPOSAL_WITHDRAW event name', () => {
    expect(() =>
      IndexerGetHistoryParamsSchema.parse({
        address: VALID_ADDRESS,
        eventName: 'B3TR_PROPOSAL_WITHDRAW',
      }),
    ).not.toThrow()
  })

  test('accepts valid searchBy values', () => {
    for (const searchBy of ['to', 'from', 'origin', 'gasPayer'] as const) {
      expect(() =>
        IndexerGetHistoryParamsSchema.parse({ address: VALID_ADDRESS, searchBy }),
      ).not.toThrow()
    }
  })

  test('rejects invalid searchBy value', () => {
    expect(() =>
      IndexerGetHistoryParamsSchema.parse({ address: VALID_ADDRESS, searchBy: 'sender' }),
    ).toThrow()
  })

  test('after/before description specifies seconds, not milliseconds', () => {
    const shape = IndexerGetHistoryParamsSchema.shape
    expect(shape.after._def.description ?? shape.after.description).toMatch(/seconds/i)
    expect(shape.before._def.description ?? shape.before.description).toMatch(/seconds/i)
    expect(shape.after._def.description ?? shape.after.description).toMatch(/NOT milliseconds/i)
    expect(shape.before._def.description ?? shape.before.description).toMatch(/NOT milliseconds/i)
  })
})
