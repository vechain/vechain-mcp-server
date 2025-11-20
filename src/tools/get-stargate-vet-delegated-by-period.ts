import { createMetricsByPeriodTool } from './get-stargate-metrics-by-period'

export const getStargateVetDelegatedByPeriod = createMetricsByPeriodTool({
  name: 'getStargateVetDelegatedByPeriod',
  title: 'Indexer: Stargate VET delegated by period',
  pathPrefix: '/api/v1/stargate/vet-delegated',
  description:
    'Time‑series of VET delegated to validators via Stargate by period (DAY, WEEK, MONTH, YEAR, ALL). Useful for tracking delegation flows over time.',
})


