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
 * Get Thor network config
 */
const getThorNetworkConfig = (): ThorNetworkConfig => {
  const network = (process.env.VECHAIN_NETWORK as ThorNetworkType) ?? ThorNetworkType.MAINNET
  logger.info(`Using ${network} Thor network`)
  if (network === ThorNetworkType.MAINNET || network === ThorNetworkType.TESTNET) {
    return {
      type: network,
      url: `https://${network}.vechain.org`,
    }
  }
  return {
    type: network,
    url: 'http://localhost:8669',
  }
}

/**
 * Config for Thor network
 */
const THOR_NETWORK_CONFIG: ThorNetworkConfig = getThorNetworkConfig()

export { ThorNetworkType, type ThorNetworkConfig, THOR_NETWORK_CONFIG }
