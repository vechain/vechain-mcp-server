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

let _thorClient: ThorClient | null = null
let _thorNetworkConfig: ThorNetworkConfig | null = null

/**
 * Get the Thor client for the configured network
 */
const getThorClient = (): ThorClient => {
  if (_thorClient) {
    return _thorClient
  }
  const network = (process.env.VECHAIN_NETWORK as ThorNetworkType) ?? ThorNetworkType.MAINNET
  logger.info(`Using ${network} Thor network`)
  _thorNetworkConfig = THOR_NETWORK_CONFIGS[network]
  _thorClient = ThorClient.at(_thorNetworkConfig.url)
  return _thorClient
}

/**
 * Get the Thor network type for the configured network
 */
const getThorNetworkType = (): ThorNetworkType => {
  if (_thorNetworkConfig) {
    return _thorNetworkConfig.type
  }
  throw new Error('Thor network not configured')
}

export { getThorClient, getThorNetworkType, ThorNetworkType }
