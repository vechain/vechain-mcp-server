import { createMetricsByPeriodTool } from './get-stargate-metrics-by-period'

export const getStargateVthoClaimedByPeriod = createMetricsByPeriodTool({
  name: 'getStargateVthoClaimedByPeriod',
  title: 'Indexer: Stargate VTHO claimed by period',
  pathPrefix: '/api/v1/stargate/vtho-claimed',
  description:
    'Time‑series of VTHO that users actually claimed from Stargate rewards by period (DAY, WEEK, MONTH, YEAR, ALL). Values represent the claimed subset of generated rewards per interval. Only take into account rewaerds that were claimed post hayabusa.',
})


