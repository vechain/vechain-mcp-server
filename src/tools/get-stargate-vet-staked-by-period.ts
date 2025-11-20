import { createMetricsByPeriodTool } from './get-stargate-metrics-by-period'

export const getStargateVetStakedByPeriod = createMetricsByPeriodTool({
  name: 'getStargateVetStakedByPeriod',
  title: 'Indexer: Stargate VET staked by period',
  pathPrefix: '/api/v1/stargate/vet-staked',
  description:
    'Time‑series of VET staked (locked via Stargate) by period (DAY, WEEK, MONTH, YEAR, ALL). Each element is the total amount staked during that interval.',
})


