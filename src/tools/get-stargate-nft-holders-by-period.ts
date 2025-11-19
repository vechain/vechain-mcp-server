import { createMetricsByPeriodTool } from './get-stargate-metrics-by-period'

export const getStargateNftHoldersByPeriod = createMetricsByPeriodTool({
  name: 'getStargateNftHoldersByPeriod',
  title: 'Indexer: Stargate NFT holders by period',
  pathPrefix: '/api/v1/stargate/nft-holders',
  description:
    'Time‑series of total Stargate NFT holders by period (DAY, WEEK, MONTH, YEAR, ALL). Each element corresponds to an interval at the selected granularity.',
})


