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

/**
 * Get Thor network config
 */
const getThorNetworkConfig = (): ThorNetworkConfig => {
  const network = (process.env.VECHAIN_NETWORK as ThorNetworkType) ?? ThorNetworkType.MAINNET
  logger.info(`Using ${network} Thor network`)
  return THOR_NETWORK_CONFIGS[network]
}

export { getThorNetworkConfig, ThorNetworkType }
