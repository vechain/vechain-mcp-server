import { ThorClient } from '@vechain/sdk-network'
import { logger } from '@/utils/logger'
import { getRequestNetwork } from './request-context'

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

const envNetwork = (process.env.VECHAIN_NETWORK as ThorNetworkType) ?? ThorNetworkType.MAINNET

/**
 * Per-network ThorClient cache. Lazily initialized on first use; subsequent
 * calls reuse the same instance so the SDK can pool sockets.
 */
const _thorClients: Map<ThorNetworkType, ThorClient> = new Map()

function getOrCreateThorClient(network: ThorNetworkType): ThorClient {
  const cached = _thorClients.get(network)
  if (cached) return cached
  const cfg = THOR_NETWORK_CONFIGS[network]
  logger.info(`Initializing ${network} Thor client`)
  const client = ThorClient.at(cfg.url)
  _thorClients.set(network, client)
  return client
}

/**
 * Resolve the active network for the current call. Resolution order:
 *   1. explicit `override` argument
 *   2. per-request override set via `runWithRequestNetwork(...)`
 *   3. env-configured default (`VECHAIN_NETWORK`)
 */
function resolveNetwork(override?: ThorNetworkType): ThorNetworkType {
  if (override) return override
  const fromContext = getRequestNetwork()
  if (fromContext) return fromContext
  return envNetwork
}

/**
 * Backwards-compatible warm-up. Pre-initializes the env-default client so the
 * first request doesn't pay the connection cost.
 */
const initThor = (): { client: ThorClient; networkConfig: ThorNetworkConfig } => {
  const client = getOrCreateThorClient(envNetwork)
  return { client, networkConfig: THOR_NETWORK_CONFIGS[envNetwork] }
}

/**
 * Get the Thor client for the active network (override > request context > env).
 */
const getThorClient = (override?: ThorNetworkType): ThorClient => {
  return getOrCreateThorClient(resolveNetwork(override))
}

/**
 * Get the network type for the active network (override > request context > env).
 */
const getThorNetworkType = (override?: ThorNetworkType): ThorNetworkType => {
  return resolveNetwork(override)
}

/**
 * Get the Thor node URL for the active network (override > request context > env).
 */
const getThorNodeUrl = (override?: ThorNetworkType): string => {
  return THOR_NETWORK_CONFIGS[resolveNetwork(override)].url
}

export { getThorClient, getThorNetworkType, getThorNodeUrl, initThor, ThorNetworkType }
