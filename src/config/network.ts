import { ThorClient } from '@vechain/sdk-network'
import { logger } from '../utils/logger'

/**
 * Enum for Thor network
 */
enum ThorNetworkType {
  MAINNET = 'mainnet',
  TESTNET = 'testnet',
  SOLO = 'solo',
}

/**
 * Interface for Thor network config
 */
interface ThorNetworkConfig {
  type: ThorNetworkType
  url: string
}

/**
 * All Thor network configs keyed by network type
 */
const THOR_NETWORK_CONFIGS: Record<ThorNetworkType, ThorNetworkConfig> = {
  [ThorNetworkType.MAINNET]: {
    type: ThorNetworkType.MAINNET,
    url: 'https://mainnet.vechain.org',
  },
  [ThorNetworkType.TESTNET]: {
    type: ThorNetworkType.TESTNET,
    url: 'https://testnet.vechain.org',
  },
  [ThorNetworkType.SOLO]: {
    type: ThorNetworkType.SOLO,
    url: 'http://localhost:8669',
  },
}

const network = (process.env.VECHAIN_NETWORK as ThorNetworkType) ?? ThorNetworkType.MAINNET

let _thorClient: ThorClient | null = null
let _thorNetworkConfig: ThorNetworkConfig | null = null

/**
 * Set the Thor network config and client
 * @param network
 */
const initThor = (): { client: ThorClient; networkConfig: ThorNetworkConfig } => {
  if (_thorClient && _thorNetworkConfig) {
    return { client: _thorClient, networkConfig: _thorNetworkConfig }
  }

  logger.info(`Initializing ${network} Thor client`)
  _thorNetworkConfig = THOR_NETWORK_CONFIGS[network]
  _thorClient = ThorClient.at(_thorNetworkConfig.url)

  return { client: _thorClient, networkConfig: _thorNetworkConfig }
}

/**
 * Get the Thor client for the configured network
 */
const getThorClient = (): ThorClient => {
  const { client } = initThor()
  return client
}

/**
 * Get the Thor network type for the configured network
 */
const getThorNetworkType = (): ThorNetworkType => {
  const { networkConfig } = initThor()
  return networkConfig.type
}

export { getThorClient, getThorNetworkType, initThor, ThorNetworkType }
